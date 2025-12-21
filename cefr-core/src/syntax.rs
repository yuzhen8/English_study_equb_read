use regex::Regex;
use lazy_static::lazy_static;
use serde::Serialize;
use std::collections::HashSet;
use crate::pos::TaggedToken;

#[derive(Serialize, Default, Debug)]
pub struct SyntaxMetrics {
    pub clause_density: f64,
    pub passive_ratio: f64,
    pub average_tree_depth: f64,
}

/// Clause types for stack-based nesting detection
#[derive(Debug, Clone, Copy, PartialEq)]
enum ClauseType {
    Explicit,   // who, which, that, because, if, etc.
    Implicit,   // Zero-pronoun: "The book I read"
    Reduced,    // Participle: "The man standing there"
}

pub struct SyntacticAnalyzer;

lazy_static! {
    // Coordinating conjunctions (low complexity impact)
    static ref COORDINATING_CONJUNCTIONS: Regex = Regex::new(r"(?i)\b(and|but|or|so)\b").unwrap();
    
    // Irregular past participles for passive voice and reduced clause detection
    static ref IRREGULAR_PAST_PARTICIPLES: HashSet<&'static str> = {
        let mut s = HashSet::new();
        let words = vec![
            "sold", "told", "made", "built", "left", "kept", "slept", "felt", "dealt", "meant",
            "broken", "chosen", "frozen", "spoken", "stolen", "woken", "woven", "written",
            "driven", "ridden", "risen", "bitten", "hidden", "eaten", "beaten", "fallen",
            "seen", "known", "thrown", "flown", "grown", "shown", "drawn", "gone", "done",
            "found", "bought", "caught", "taught", "thought", "brought", "fought", "said", "paid", "laid",
            "heard", "read", "cut", "put", "set", "hit", "let", "cost", "hurt", "shut", "quit"
        ];
        for w in words {
            s.insert(w);
        }
        s
    };
    
    // Subject pronouns for implicit clause detection
    static ref SUBJECT_PRONOUNS: HashSet<&'static str> = {
        let mut s = HashSet::new();
        for w in &["i", "you", "he", "she", "it", "we", "they"] {
            s.insert(*w);
        }
        s
    };
}

impl SyntacticAnalyzer {
    pub fn analyze(text: &str, sentences: &[Vec<TaggedToken>]) -> SyntaxMetrics {
        let num_sentences = sentences.len() as f64;
        if num_sentences == 0.0 { return SyntaxMetrics::default(); }

        // Calculate clause density: count subordinating + coordinating conjunctions
        let sub_count = Self::count_subordinating_conjunctions(sentences);
        let coord_count = COORDINATING_CONJUNCTIONS.find_iter(text).count() as f64;
        
        let clauses_count = sub_count + coord_count;
        let clause_density = clauses_count / num_sentences;

        let passive_count = Self::count_passives(sentences);
        let passive_ratio = passive_count as f64 / num_sentences;

        let average_tree_depth = Self::calculate_average_depth(sentences);

        SyntaxMetrics {
            clause_density,
            passive_ratio,
            average_tree_depth,
        }
    }
    
    /// Count subordinating conjunctions from tagged tokens
    fn count_subordinating_conjunctions(sentences: &[Vec<TaggedToken>]) -> f64 {
        let mut count = 0;
        for sent in sentences {
            for token in sent {
                if Self::is_subordinating_conjunction(&token.word) {
                    count += 1;
                }
            }
        }
        count as f64
    }

    fn count_passives(sentences: &[Vec<TaggedToken>]) -> usize {
        let mut count = 0;
        for sent in sentences {
            let mut i = 0;
            while i < sent.len() {
                // Check for 'be' verb
                if Self::is_be_verb(&sent[i].word) {
                    // Look ahead 1 or 2 tokens
                    let mut found = false;
                    // Check next (i+1)
                    if i + 1 < sent.len() {
                        if Self::is_past_participle(&sent[i+1].word, &sent[i+1].tag) {
                            found = true;
                        } 
                        // Allow 1 adverb in between (i+2), e.g. "was 'always' done"
                        else if (sent[i+1].tag == "RB" || sent[i+1].word.ends_with("ly")) && i + 2 < sent.len() {
                             if Self::is_past_participle(&sent[i+2].word, &sent[i+2].tag) {
                                found = true;
                            }
                        }
                    }
                    
                    if found {
                        count += 1;
                        i += 1; // Advance to avoid double counting overlap
                    }
                }
                i += 1;
            }
        }
        count
    }
    
    fn is_be_verb(word: &str) -> bool {
        matches!(word.to_lowercase().as_str(), "am" | "is" | "are" | "was" | "were" | "be" | "been" | "being" | "'m" | "'re" | "'s")
    }
    
    /// Enhanced past participle detection with POS tag awareness
    fn is_past_participle(word: &str, tag: &str) -> bool {
        let lower = word.to_lowercase();
        
        // 1. Check irregular list first (most reliable)
        if IRREGULAR_PAST_PARTICIPLES.contains(lower.as_str()) {
            return true;
        }
        
        // 2. Check suffix with POS tag validation to avoid false positives
        // VBN = Past Participle, VBG = Gerund, JJ = Adjective (can be participial)
        let is_verb_or_adj_tag = tag.starts_with("VB") || tag.starts_with("JJ");
        
        if is_verb_or_adj_tag {
            // Check -ed suffix (but exclude short words like "bed", "red", "fed")
            if lower.ends_with("ed") && lower.len() > 3 {
                return true;
            }
            // Check -en suffix (written, broken) - also exclude short words
            if lower.ends_with("en") && lower.len() > 4 {
                return true;
            }
        }
        
        false
    }
    
    // ==================== CLAUSE DEPTH ANALYSIS ====================
    
    /// Calculate average clause nesting depth using stack-based detection
    /// Fixes: zero-pronoun clauses, reduced relative clauses, comma ambiguity
    fn calculate_average_depth(sentences: &[Vec<TaggedToken>]) -> f64 {
        let mut total_max_depth = 0.0;
        
        for sent in sentences {
            let mut stack: Vec<ClauseType> = Vec::new();
            let mut max_depth: usize = 1; // Root clause = depth 1
            
            for i in 0..sent.len() {
                let token = &sent[i];
                let prev = if i > 0 { Some(&sent[i-1]) } else { None };
                let next = if i + 1 < sent.len() { Some(&sent[i+1]) } else { None };
                
                // ============ PUSH CONDITIONS (Enter Clause) ============
                
                // 1. Explicit subordinating conjunction: who, which, that, because, etc.
                if Self::is_subordinating_conjunction(&token.word) {
                    stack.push(ClauseType::Explicit);
                    max_depth = max_depth.max(stack.len() + 1);
                    continue;
                }
                
                // 2. Implicit zero-pronoun clause: Noun + Subject Pronoun
                //    e.g., "The book I read" → "book" (NN) + "I" (PRP)
                if let Some(prev_tok) = prev {
                    if Self::is_noun_tag(&prev_tok.tag) && Self::is_subject_pronoun(&token.word) {
                        // Don't push if prev was a comma (likely enumeration or explicit clause ended)
                        if prev_tok.word != "," {
                            stack.push(ClauseType::Implicit);
                            max_depth = max_depth.max(stack.len() + 1);
                            continue;
                        }
                    }
                }
                
                // 3. Reduced relative clause: Noun + V-ing / V-ed (participle)
                //    e.g., "The man standing there", "The book written by him"
                if let Some(prev_tok) = prev {
                    if Self::is_noun_tag(&prev_tok.tag) && Self::is_participle_for_clause(&token.word, &token.tag) {
                        stack.push(ClauseType::Reduced);
                        max_depth = max_depth.max(stack.len() + 1);
                        continue;
                    }
                }
                
                // ============ POP CONDITIONS (Exit Clause) ============
                
                // Smart comma handling
                if token.word == "," {
                    // Check if this is an enumeration comma (followed by and/or or adjective)
                    let is_enumeration = if let Some(next_tok) = next {
                        Self::is_enumeration_context(&next_tok.word, &next_tok.tag)
                    } else {
                        false
                    };
                    
                    if !is_enumeration && !stack.is_empty() {
                        // Pop the stack - comma can close any clause type
                        // For Explicit clauses (non-restrictive): comma often marks boundary
                        // For Implicit/Reduced: comma almost always ends them
                        stack.pop();
                    }
                    continue;
                }
                
                // Period, semicolon, question mark: clear all clauses
                if token.word == "." || token.word == ";" || token.word == "?" || token.word == "!" {
                    stack.clear();
                    continue;
                }
                
                // Main verb detection: can close implicit/reduced clauses
                // If we see a finite verb after an implicit clause, it might be the main clause verb
                if Self::is_main_clause_verb_signal(&token.word, &token.tag) {
                    // Pop only Implicit/Reduced, not Explicit
                    if let Some(clause_type) = stack.last() {
                        if *clause_type != ClauseType::Explicit {
                            // Could be end of implicit clause - conservative approach
                        }
                    }
                }
            }
            
            total_max_depth += max_depth as f64;
        }
        
        total_max_depth / (sentences.len() as f64).max(1.0)
    }
    
    // ==================== HELPER FUNCTIONS ====================
    
    /// Check if word is a subordinating conjunction or relative pronoun
    fn is_subordinating_conjunction(word: &str) -> bool {
        matches!(word.to_lowercase().as_str(),
            "who" | "which" | "that" | "whom" | "whose" | "where" | "when" |
            "because" | "although" | "though" | "if" | "after" | "before" |
            "since" | "unless" | "until" | "while" | "whereas" | "whether"
        )
    }
    
    /// Check if POS tag indicates a noun
    fn is_noun_tag(tag: &str) -> bool {
        tag.starts_with("NN")  // NN, NNS, NNP, NNPS
    }
    
    /// Check if word is a subject pronoun (can start implicit clause)
    fn is_subject_pronoun(word: &str) -> bool {
        SUBJECT_PRONOUNS.contains(word.to_lowercase().as_str())
    }
    
    /// Enhanced participle detection for reduced clauses (stricter than passive detection)
    fn is_participle_for_clause(word: &str, tag: &str) -> bool {
        let lower = word.to_lowercase();
        
        // Must have verb-like POS tag
        let is_verb_tag = tag.starts_with("VB") || tag == "JJ";
        if !is_verb_tag {
            return false;
        }
        
        // Check irregular participles
        if IRREGULAR_PAST_PARTICIPLES.contains(lower.as_str()) {
            return true;
        }
        
        // Check -ing (present participle/gerund)
        if lower.ends_with("ing") && lower.len() > 4 {
            return true;
        }
        
        // Check -ed (past participle) - exclude short words
        if lower.ends_with("ed") && lower.len() > 4 {
            return true;
        }
        
        false
    }
    
    /// Check if context suggests enumeration (comma followed by and/or/adjective)
    fn is_enumeration_context(word: &str, tag: &str) -> bool {
        let lower = word.to_lowercase();
        // Enumeration: followed by coordinating conjunction or another adjective
        lower == "and" || lower == "or" || tag == "JJ" || tag == "NN"
    }
    
    /// Detect potential main clause verb (helps close implicit clauses)
    fn is_main_clause_verb_signal(word: &str, tag: &str) -> bool {
        // Modal verbs or finite verbs that likely signal main clause
        let lower = word.to_lowercase();
        tag == "MD" || // Modal
        (tag.starts_with("VB") && matches!(lower.as_str(), "is" | "are" | "was" | "were" | "has" | "have" | "had"))
    }
}
