mod dictionary;
mod pos;
mod syntax;
mod discourse;

use std::collections::HashSet;
use wasm_bindgen::prelude::*;
use serde::Serialize;
use rust_stemmers::{Algorithm, Stemmer};
use dictionary::{DICT, CEFRLevel};
use pos::tag_sentence;
use syntax::{SyntacticAnalyzer, SyntaxMetrics};
use discourse::{DiscourseAnalyzer, DiscourseMetrics, is_common_name};

// Weights for adjusted score
const WEIGHT_CLAUSE_DENSITY: f64 = 0.5;
const WEIGHT_CONNECTIVE_SOPHISTICATION: f64 = 0.5;

#[derive(Serialize)]
struct AnalysisResult {
    cefr_level: String,
    lexical_score: f64,    // New: Base score from words
    adjusted_score: f64,   // New: Final score after syntax/discourse
    metrics: CombinedMetrics,
    details: Vec<TokenDetail>,
}

#[derive(Serialize)]
struct CombinedMetrics {
    sentence_count: usize,
    word_count: usize,
    unique_word_count: usize,
    avg_sentence_length: f64,
    syntax: SyntaxMetrics,
    discourse: DiscourseMetrics,
}

#[derive(Serialize)]
struct TokenDetail {
    text: String,
    lemma: String,
    pos: String,
    level: String,
    is_phrase: bool,
}

#[wasm_bindgen]
pub fn analyze(text: &str) -> JsValue {
    set_panic_hook();

    let sentences_text: Vec<&str> = text.split(|c| c == '.' || c == '!' || c == '?')
                                        .filter(|s| !s.trim().is_empty())
                                        .collect();
    
    let mut all_sentences_tokens = Vec::new();
    let mut details = Vec::new();
    let mut unique_lemmas = HashSet::new(); // Track unique lemmas (lowercase)
    
    let mut total_level_score = 0.0;
    let mut scored_items = 0.0;
    let mut word_count = 0;

    let en_stemmer = Stemmer::create(Algorithm::English);
    
    for sent_text in &sentences_text {
        // Smart Tokenization with contraction handling
        let tokens = tokenize_sentence(sent_text);
        word_count += tokens.len();
        
        // Tagging
        let tagged = tag_sentence(&tokens);
        all_sentences_tokens.push(tagged);
    }

    // Phrase Matching (Aho-Corasick)
    let matches = DICT.phrase_matcher.find_iter(text);
    for mat in matches {
        let pattern_id = mat.pattern();
        // Safe casting as per Aho-Corasick docs for 1.1 (usize is implied for pattern id)
        if let Some((phrase, level)) = DICT.phrases.get(pattern_id.as_usize()) {
            // Add phrase level to score logic
            let score = level_to_score(level);
            if score > 0.0 {
                total_level_score += score;
                scored_items += 1.0;
            }
            unique_lemmas.insert(phrase.to_lowercase());
        }
    }

    // Process tokens for details and single word scores
    for sent in &all_sentences_tokens {
        for token in sent {
            let mut level_str = "Unknown".to_string();
            let mut lemma = token.word.to_lowercase();
            let is_phrase = false; 
            
            // PRIORITY 1: Check if it's a common name (capitalized and in name database)
            // Names should not be counted as "Unknown" words
            let is_capitalized = token.word.chars().next().map_or(false, |c| c.is_uppercase());
            if is_capitalized && is_common_name(&token.word) {
                level_str = "Entity".to_string();
                lemma = token.word.clone(); // Keep original form for names
                // Don't add to scored_items - names don't affect CEFR level
                unique_lemmas.insert(lemma.clone());
                details.push(TokenDetail {
                    text: token.word.clone(),
                    lemma,
                    pos: token.tag.clone(),
                    level: level_str,
                    is_phrase,
                });
                continue; // Skip dictionary lookup for names
            }
            
            // PRIORITY 2: Dictionary lookup
            let mut found_in_dict = false;
            if let Some(entry) = DICT.lookup(&token.word, Some(&token.tag)) {
                level_str = format!("{:?}", entry.level);
                lemma = entry.lemma.clone(); // Use dictionary lemma
                found_in_dict = true;
                
                let score = level_to_score(&entry.level);
                if score > 0.0 {
                    total_level_score += score;
                    scored_items += 1.0;
                }
            }
            
            // If not found in dictionary, try stemming
            if !found_in_dict {
                let stemmed = en_stemmer.stem(&token.word);
                // Try looking up the stemmed version
                if let Some(entry) = DICT.lookup(&stemmed, Some(&token.tag)) {
                     level_str = format!("{:?}", entry.level);
                     lemma = entry.lemma.clone();
                     
                     let score = level_to_score(&entry.level);
                     if score > 0.0 {
                        total_level_score += score;
                        scored_items += 1.0;
                     }
                } else {
                    // Just use the stem as the lemma if still nothing
                    lemma = stemmed.to_string();
                }
            }

            // PRIORITY 3: Heuristic for proper nouns not in name database
            // If still "Unknown" and capitalized, it's likely a proper noun (name/place/etc.)
            // This catches names like "Sherlock", "Holmes", "Zanzibar" that aren't in our database
            if level_str == "Unknown" && is_capitalized {
                level_str = "Entity".to_string();
                lemma = token.word.clone(); // Keep original form for entities
                // Don't count as unknown - it's a proper noun
            }

            unique_lemmas.insert(lemma.clone());

            details.push(TokenDetail {
                text: token.word.clone(),
                lemma,
                pos: token.tag.clone(),
                level: level_str,
                is_phrase,
            });
        }
    }

    // Metrics
    let syntax_metrics = SyntacticAnalyzer::analyze(text, &all_sentences_tokens);
    let discourse_metrics = DiscourseAnalyzer::analyze(&all_sentences_tokens);

    // Final CEFR Calculation (Heuristic)
    let avg_score = if scored_items > 0.0 { total_level_score / scored_items } else { 0.0 };
    // Adjust based on syntax (e.g., complicate syntax -> higher level)
    let adjusted_score = avg_score 
        + (syntax_metrics.clause_density * WEIGHT_CLAUSE_DENSITY) 
        + (discourse_metrics.connective_sophistication * WEIGHT_CONNECTIVE_SOPHISTICATION);
    
    let final_level = score_to_level(adjusted_score);

    let result = AnalysisResult {
        cefr_level: final_level,
        lexical_score: avg_score,
        adjusted_score,
        metrics: CombinedMetrics {
            sentence_count: sentences_text.len(),
            word_count,
            unique_word_count: unique_lemmas.len(),
            avg_sentence_length: if !sentences_text.is_empty() { word_count as f64 / sentences_text.len() as f64 } else { 0.0 },
            syntax: syntax_metrics,
            discourse: discourse_metrics,
        },
        details,
    };

    serde_wasm_bindgen::to_value(&result).unwrap()
}

fn level_to_score(l: &CEFRLevel) -> f64 {
    match l {
        CEFRLevel::A1 => 1.0,
        CEFRLevel::A2 => 2.0,
        CEFRLevel::B1 => 3.0,
        CEFRLevel::B2 => 4.0,
        CEFRLevel::C1 => 5.0,
        CEFRLevel::C2 => 6.0,
        CEFRLevel::Unknown => 0.0,
    }
}

fn score_to_level(s: f64) -> String {
    if s < 1.5 { "A1".to_string() }
    else if s < 2.5 { "A2".to_string() }
    else if s < 3.5 { "B1".to_string() }
    else if s < 4.5 { "B2".to_string() }
    else if s < 5.5 { "C1".to_string() }
    else { "C2".to_string() }
}

pub fn set_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

fn tokenize_sentence(text: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    // Split by whitespace first
    for raw_word in text.split_whitespace() {
        // Remove surrounding punctuation but keep internal apostrophes for now
        let clean = raw_word.trim_matches(|c: char| !c.is_alphanumeric());
        if clean.is_empty() { continue; }
        
        // Handle contractions
        let expanded = expand_contraction(clean);
        tokens.extend(expanded);
    }
    tokens
}

fn expand_contraction(word: &str) -> Vec<String> {
    let lower = word.to_lowercase();
    match lower.as_str() {
        "don't" => vec!["do".to_string(), "not".to_string()],
        "doesn't" => vec!["does".to_string(), "not".to_string()],
        "didn't" => vec!["did".to_string(), "not".to_string()],
        "can't" => vec!["can".to_string(), "not".to_string()],
        "cannot" => vec!["can".to_string(), "not".to_string()],
        "won't" => vec!["will".to_string(), "not".to_string()],
        "shan't" => vec!["shall".to_string(), "not".to_string()],
        "isn't" => vec!["is".to_string(), "not".to_string()],
        "aren't" => vec!["are".to_string(), "not".to_string()],
        "wasn't" => vec!["was".to_string(), "not".to_string()],
        "weren't" => vec!["were".to_string(), "not".to_string()],
        "couldn't" => vec!["could".to_string(), "not".to_string()],
        "shouldn't" => vec!["should".to_string(), "not".to_string()],
        "wouldn't" => vec!["would".to_string(), "not".to_string()],
        "haven't" => vec!["have".to_string(), "not".to_string()],
        "hasn't" => vec!["has".to_string(), "not".to_string()],
        "hadn't" => vec!["had".to_string(), "not".to_string()],
        
        // Pronoun + be/have/will
        // 'm -> am
        // 're -> are
        // 've -> have
        // 'll -> will
        s if s.ends_with("'m") && s.len() > 2 => {
            vec![word[..word.len()-2].to_string(), "am".to_string()]
        },
        s if s.ends_with("'re") && s.len() > 3 => {
            vec![word[..word.len()-3].to_string(), "are".to_string()]
        },
        s if s.ends_with("'ve") && s.len() > 3 => {
            vec![word[..word.len()-3].to_string(), "have".to_string()]
        },
        s if s.ends_with("'ll") && s.len() > 3 => {
            vec![word[..word.len()-3].to_string(), "will".to_string()]
        },
        // 's is ambiguous: is/has/possession. 
        // For simplicity, we splits if it's likely "it's", "he's" etc
        "it's" => vec!["it".to_string(), "is".to_string()],
        "he's" => vec!["he".to_string(), "is".to_string()], 
        "she's" => vec!["she".to_string(), "is".to_string()],
        "that's" => vec!["that".to_string(), "is".to_string()],
        "let's" => vec!["let".to_string(), "us".to_string()], 
        
        // 'd is ambiguous: would/had. Default to would for now? Or better leave it?
        // Let's leave 'd and 's attached for non-pronouns to avoid breaking possessives.
        
        _ => vec![word.to_string()],
    }
}
