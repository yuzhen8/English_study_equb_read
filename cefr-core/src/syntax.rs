use regex::Regex;
use lazy_static::lazy_static;
use serde::Serialize;
use crate::pos::TaggedToken;

#[derive(Serialize, Default, Debug)]
pub struct SyntaxMetrics {
    pub clause_density: f64,
    pub passive_ratio: f64,
    pub average_tree_depth: f64,
}

pub struct SyntacticAnalyzer;

lazy_static! {
    static ref PASSIVE_REGEX: Regex = Regex::new(r"(?i)\b(am|is|are|was|were|be|been|being)\s+(\w+ed|\w+en)\b").unwrap();
    static ref CLAUSE_MARKERS: Regex = Regex::new(r"(?i)\b(because|although|if|after|before|since|unless|until|who|which|that|whom|whose)\b").unwrap();
}

impl SyntacticAnalyzer {
    pub fn analyze(text: &str, sentences: &[Vec<TaggedToken>]) -> SyntaxMetrics {
        let num_sentences = sentences.len() as f64;
        if num_sentences == 0.0 { return SyntaxMetrics::default(); }

        let clauses_count = CLAUSE_MARKERS.find_iter(text).count() as f64;
        let clause_density = clauses_count / num_sentences;

        let passive_matches = PASSIVE_REGEX.find_iter(text).count() as f64;
        let passive_ratio = passive_matches / num_sentences;

        // Heuristic Tree Depth
        // Estimate based on commas and conjunctions per sentence
        let mut total_depth = 0.0;
        for sent in sentences {
            let mut depth = 1.0;
            for token in sent {
                if token.word == "," || CLAUSE_MARKERS.is_match(&token.word) {
                    depth += 0.5; // Heuristic increment
                }
            }
            total_depth += depth;
        }
        let average_tree_depth = total_depth / num_sentences;

        SyntaxMetrics {
            clause_density,
            passive_ratio,
            average_tree_depth,
        }
    }
}
