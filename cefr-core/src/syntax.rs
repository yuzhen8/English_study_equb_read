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

pub struct SyntacticAnalyzer;

lazy_static! {
    // Subordinating conjunctions (high complexity impact)
    static ref SUBORDINATING_CONJUNCTIONS: Regex = Regex::new(r"(?i)\b(because|although|if|after|before|since|unless|until|who|which|that|whom|whose)\b").unwrap();
    // Coordinating conjunctions (low complexity impact)
    static ref COORDINATING_CONJUNCTIONS: Regex = Regex::new(r"(?i)\b(and|but|or|so)\b").unwrap();
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
}

impl SyntacticAnalyzer {
    pub fn analyze(text: &str, sentences: &[Vec<TaggedToken>]) -> SyntaxMetrics {
        let num_sentences = sentences.len() as f64;
        if num_sentences == 0.0 { return SyntaxMetrics::default(); }

        // Calculate clause density using both types but mostly subordinating ones matter for complex clauses
        let sub_count = SUBORDINATING_CONJUNCTIONS.find_iter(text).count() as f64;
        let coord_count = COORDINATING_CONJUNCTIONS.find_iter(text).count() as f64;
        
        // We can just sum them for density or weight them? 
        // Standard "Clause Density" usually means total clauses / sentences.
        // A coordinate clause is still a clause.
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
    
    fn is_past_participle(word: &str, _tag: &str) -> bool {
        let lower = word.to_lowercase();
        // 1. Check irregular list
        if IRREGULAR_PAST_PARTICIPLES.contains(lower.as_str()) {
            return true;
        }
        // 2. Check suffix 'ed'/'en'
        // Avoid "sadden", "happen", "open" (usually VBP/VB) - naive check is risky but better than nothing
        if lower.ends_with("ed") || lower.ends_with("en") {
            // Refine: if tag is VB or J (Adjective), assume participle if it looks like one?
            // "tired" -> J. "bored" -> J.
            // We want to avoid "is tired" (Adj) counting as Passive?
            // Actually, "tired" IS a participle, often used adjectivally. 
            // In CEFR, passive constructions count. "I am bored" is functionally passive structure (state).
            // But strict grammar distinguishes.
            // Let's allow 'ed'/'en' generally for now to catch "regular" passives.
            return true; 
        }
        false
    }
    
    fn calculate_average_depth(sentences: &[Vec<TaggedToken>]) -> f64 {
        let mut total_depth = 0.0;
        for sent in sentences {
            let mut depth = 1.0; // Root
            for token in sent {
                // Subordinating Conjunctions: High weight (nesting)
                if SUBORDINATING_CONJUNCTIONS.is_match(&token.word) {
                   depth += 1.0; 
                }
                // Coordinating conjunctions: Low weight (branching)
                else if COORDINATING_CONJUNCTIONS.is_match(&token.word) {
                    depth += 0.2;
                }
                
                // Punctuation
                if token.word == ";" || token.word == ":" {
                    depth += 0.5;
                }
            }
            total_depth += depth;
        }
        total_depth / (sentences.len() as f64).max(1.0)
    }
}
