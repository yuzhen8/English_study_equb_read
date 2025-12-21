use serde::Serialize;
use std::collections::HashSet;
use lazy_static::lazy_static;
use phf::phf_set;
use crate::dictionary::{DICT, CEFRLevel};
use crate::pos::TaggedToken;

#[derive(Serialize, Default, Debug)]
pub struct DiscourseMetrics {
    pub connective_sophistication: f64, // Ratio of B2/C1 connectives
    pub abstract_noun_ratio: f64,
    pub entity_density: f64,
}

pub struct DiscourseAnalyzer;

// Include the high-performance PHF name database (generated from names_code.rs)
include!("names_code.rs");

/// Public function to check if a word is a common name (case-sensitive)
/// Used by lib.rs to filter names from "Unknown" words
pub fn is_common_name(word: &str) -> bool {
    COMMON_NAMES.contains(word)
}

lazy_static! {
    static ref TITLES: HashSet<&'static str> = {
        let mut s = HashSet::new();
        // Tokens are stripped of punctuation by default tokenization, so "Mr." -> "Mr"
        for t in &["Mr", "Mrs", "Ms", "Dr", "Prof", "Capt", "Gen", "Sen", "Rep", "St", "Mt"] {
            s.insert(*t);
        }
        s
    };
}

impl DiscourseAnalyzer {
    pub fn analyze(sentences: &[Vec<TaggedToken>]) -> DiscourseMetrics {
        let mut total_words = 0.0;
        let mut high_level_connectives = 0.0;
        let mut abstract_nouns = 0.0;
        let mut entity_count = 0.0;

        for (_sent_idx, sent) in sentences.iter().enumerate() {
            for (word_idx, token) in sent.iter().enumerate() {
                total_words += 1.0;
                let word = &token.word;
                let lower_word = word.to_lowercase();

                // 1. Connective Sophistication & Abstractness
                // We use the best entry for this (first one)
                if let Some(entry) = DICT.lookup(word, None) {
                     // Heuristic: if it's an adverb/conjunction and level >= B2
                     if (entry.pos == "conj" || entry.pos == "adv") && matches!(entry.level, CEFRLevel::B2 | CEFRLevel::C1 | CEFRLevel::C2) {
                         high_level_connectives += 1.0;
                     }
                     
                     if entry.is_abstract {
                         abstract_nouns += 1.0;
                     }
                } else {
                     // Check suffixes for abstractness if not in dict
                     if word.ends_with("tion") || word.ends_with("ment") || word.ends_with("ness") || word.ends_with("ity") || word.ends_with("ism") {
                         abstract_nouns += 1.0;
                     }
                }

                // 2. NER Heuristic (Upgraded with PHF name database)
                // Capitalized?
                let is_capitalized = word.chars().next().map_or(false, |c| c.is_uppercase());
                
                if is_capitalized {
                    // PRIORITY 1: Check PHF name database first (case-sensitive, original word)
                    // The database contains names like "James", "London", etc.
                    if COMMON_NAMES.contains(word) {
                        entity_count += 1.0;
                        continue; // Skip further checks, this is definitely a name
                    }
                    
                    // PRIORITY 2: Fallback to dictionary-based heuristics
                    // Check if word exists in dictionary (case-insensitive)
                    let in_dict = DICT.lookup_all(&lower_word).is_some();
                    
                    if word_idx == 0 {
                        // Sentence Start
                        // If NOT in dictionary -> Likely Entity (e.g. "Zanzibar is...")
                        if !in_dict {
                            entity_count += 1.0;
                        }
                        // If in dict at sentence start, could be functional word or name
                        // Conservative: Assume not entity if in dict at start (unless in COMMON_NAMES, handled above)
                    } else {
                        // Mid-Sentence
                        // If NOT in dict -> Entity (e.g. "... in Zanzibar")
                        if !in_dict {
                            entity_count += 1.0;
                        } else {
                            // In dictionary (e.g. "Brown", "Bush", "Park")
                            // Check Context triggers
                            
                            // Title trigger: "Mr. Brown"
                            if word_idx > 0 {
                                let prev = &sent[word_idx - 1].word;
                                // Simple check on previous word
                                if TITLES.contains(prev.as_str()) {
                                    entity_count += 1.0;
                                }
                            }
                        }
                    }
                }
            }
        }

        if total_words == 0.0 {
            return DiscourseMetrics::default();
        }

        DiscourseMetrics {
            connective_sophistication: high_level_connectives / total_words,
            abstract_noun_ratio: abstract_nouns / total_words,
            entity_density: entity_count / total_words,
        }
    }
}
