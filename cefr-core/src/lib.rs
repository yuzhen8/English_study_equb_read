mod dictionary;
mod pos;
mod syntax;
mod discourse;

use std::collections::HashSet;
use wasm_bindgen::prelude::*;
use serde::Serialize;
use dictionary::{DICT, CEFRLevel};
use pos::tag_sentence;
use syntax::{SyntacticAnalyzer, SyntaxMetrics};
use discourse::{DiscourseAnalyzer, DiscourseMetrics};

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

    for sent_text in &sentences_text {
        // Simple tokenization (naive)
        // Keep apostrophes for now (can improve later)
        let tokens: Vec<String> = sent_text.split_whitespace() 
                                           .map(|s| s.trim_matches(|c: char| !c.is_alphanumeric()).to_string())
                                           .filter(|s| !s.is_empty())
                                           .collect();
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
            
            // Lookup
            if let Some(entry) = DICT.lookup(&token.word, Some(&token.tag)) {
                level_str = format!("{:?}", entry.level);
                lemma = entry.lemma.clone(); // Use dictionary lemma
                
                let score = level_to_score(&entry.level);
                if score > 0.0 {
                    total_level_score += score;
                    scored_items += 1.0;
                }
            }

            // Improve "Unknown" filtering
            // If it's a number or overly simple stopword not in dict, maybe ignore?
            // For now, keep as is.

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
    let adjusted_score = avg_score + (syntax_metrics.clause_density * 0.5) + (discourse_metrics.connective_sophistication * 0.5);
    
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
