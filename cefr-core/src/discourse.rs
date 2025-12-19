use serde::Serialize;
use crate::dictionary::{DICT, CEFRLevel};
use crate::pos::TaggedToken;

#[derive(Serialize, Default, Debug)]
pub struct DiscourseMetrics {
    pub connective_sophistication: f64, // Ratio of B2/C1 connectives
    pub abstract_noun_ratio: f64,
    pub entity_density: f64,
}

pub struct DiscourseAnalyzer;

impl DiscourseAnalyzer {
    pub fn analyze(sentences: &[Vec<TaggedToken>]) -> DiscourseMetrics {
        let mut total_words = 0.0;
        let mut high_level_connectives = 0.0;
        let mut abstract_nouns = 0.0;
        let mut entity_count = 0.0;

        for (sent_idx, sent) in sentences.iter().enumerate() {
            for (word_idx, token) in sent.iter().enumerate() {
                total_words += 1.0;
                let word = &token.word;

                // 1. Connective Sophistication
                // Simplified: check if word is a cohesive device and has high level
                if let Some(entry) = DICT.lookup(&token.word, None) {
                     // Heuristic: if it's an adverb/conjunction and level >= B2
                     if (entry.pos == "conj" || entry.pos == "adv") && matches!(entry.level, CEFRLevel::B2 | CEFRLevel::C1 | CEFRLevel::C2) {
                         high_level_connectives += 1.0;
                     }
                     
                     // 2. Abstractness
                     if entry.is_abstract {
                         abstract_nouns += 1.0;
                     }
                } else {
                     // Check suffixes for abstractness if not in dict
                     if word.ends_with("tion") || word.ends_with("ment") || word.ends_with("ness") || word.ends_with("ity") || word.ends_with("ism") {
                         abstract_nouns += 1.0;
                     }
                }

                // 3. NER Heuristic
                // Capitalized + Not Sentence Start + Not in Dict (as simple word)
                let is_capitalized = word.chars().next().map(|c| c.is_uppercase()).unwrap_or(false);
                let is_sentence_start = word_idx == 0;
                // If it's a known proper noun or just unknown
                let is_known_common = DICT.lookup(&word.to_lowercase(), None).is_some();
                
                if is_capitalized && !is_sentence_start && !is_known_common {
                    entity_count += 1.0;
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
