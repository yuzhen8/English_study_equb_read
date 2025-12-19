use std::collections::HashMap;
use lazy_static::lazy_static;
use aho_corasick::AhoCorasick;

#[derive(Debug, Clone, PartialEq)]
pub enum CEFRLevel {
    A1, A2, B1, B2, C1, C2, Unknown
}

impl CEFRLevel {
    pub fn from_str(s: &str) -> Self {
        match s.trim().to_uppercase().as_str() {
            "A1" => CEFRLevel::A1,
            "A2" => CEFRLevel::A2,
            "B1" => CEFRLevel::B1,
            "B2" => CEFRLevel::B2,
            "C1" => CEFRLevel::C1,
            "C2" => CEFRLevel::C2,
            _ => CEFRLevel::Unknown,
        }
    }
}

#[derive(Debug, Clone)]
pub struct WordEntry {
    pub lemma: String,
    pub pos: String,
    pub level: CEFRLevel,
    pub is_abstract: bool,
}

pub struct Dictionary {
    pub words: HashMap<String, Vec<WordEntry>>,
    pub phrases: Vec<(String, CEFRLevel)>,
    pub phrase_matcher: AhoCorasick,
}

impl Dictionary {
    pub fn new() -> Self {
        // In a real scenario, we might want to load this from an external file at runtime
        // or embed a larger file. 
        let csv_content = include_str!("../assets/dictionary.csv");
        let mut words = HashMap::new();
        let mut phrases = Vec::new();
        let mut patterns = Vec::new();

        for line in csv_content.lines().skip(1) { // Skip header
            let parts: Vec<&str> = line.split(',').collect();
            if parts.len() < 3 { continue; } // Relaxed check, abstract might be missing

            let lemma = parts[0].trim().to_string();
            let pos = parts[1].trim().to_string();
            let level = CEFRLevel::from_str(parts[2]);
            let is_abstract = if parts.len() > 3 { parts[3].trim() == "true" } else { false };

            // Logic to handle Phrases
            if lemma.contains(' ') {
                phrases.push((lemma.clone(), level.clone()));
                patterns.push(lemma.clone());
            }

            let entry = WordEntry {
                lemma: lemma.clone(),
                pos,
                level,
                is_abstract,
            };

            // key is original casing from CSV, but usually CSV is lowercased.
            // We store it as is, lookup handles casing.
            words.entry(lemma).or_insert_with(Vec::new).push(entry);
        }

        let phrase_matcher = AhoCorasick::new(&patterns).unwrap();

        Dictionary {
            words,
            phrases,
            phrase_matcher,
        }
    }

    pub fn lookup_all(&self, word: &str) -> Option<&Vec<WordEntry>> {
        // 1. Exact match
        if let Some(entries) = self.words.get(word) {
            return Some(entries);
        }

        // 2. Case-insensitive
        let lower = word.to_lowercase();
        if let Some(entries) = self.words.get(&lower) {
            return Some(entries);
        }

        // 3. Simple Morphology Fallback
        if lower.ends_with('s') {
            let lemma = &lower[0..lower.len()-1];
            if let Some(entries) = self.words.get(lemma) {
                return Some(entries);
            }
            if lower.ends_with("es") {
                let lemma = &lower[0..lower.len()-2];
                 if let Some(entries) = self.words.get(lemma) {
                    return Some(entries);
                }
            }
        }
        
        if lower.ends_with("ed") {
             let lemma = &lower[0..lower.len()-2];
             if let Some(entries) = self.words.get(lemma) {
                return Some(entries);
            }
        }

        None
    }

    pub fn lookup(&self, word: &str, pos_tag: Option<&str>) -> Option<&WordEntry> {
        // 1. Exact match
        if let Some(entries) = self.words.get(word) {
            return self.select_best_entry(entries, pos_tag);
        }

        // 2. Case-insensitive
        let lower = word.to_lowercase();
        if let Some(entries) = self.words.get(&lower) {
            return self.select_best_entry(entries, pos_tag);
        }

        // 3. Simple Morphology Fallback (Naive Lemmatization)
        // If word ends with 's', try removing it
        if lower.ends_with('s') {
            let lemma = &lower[0..lower.len()-1];
            if let Some(entries) = self.words.get(lemma) {
                return self.select_best_entry(entries, pos_tag);
            }
            // 'es' check? e.g. buses -> bus
            if lower.ends_with("es") {
                let lemma = &lower[0..lower.len()-2];
                 if let Some(entries) = self.words.get(lemma) {
                    return self.select_best_entry(entries, pos_tag);
                }
            }
        }
        
        // 'ed'
        if lower.ends_with("ed") {
             let lemma = &lower[0..lower.len()-2];
             if let Some(entries) = self.words.get(lemma) {
                return self.select_best_entry(entries, pos_tag);
            }
            // 'd' (loved -> love) - naive, might be problematic for 'bed' -> 'be' (false pos)
            // safer to skip for now or verify dict existence
        }

        None
    }

    fn select_best_entry<'a>(&self, entries: &'a Vec<WordEntry>, pos_tag: Option<&str>) -> Option<&'a WordEntry> {
        if let Some(tag) = pos_tag {
            let simple_pos = if tag.starts_with("N") { "noun" }
                            else if tag.starts_with("V") { "verb" }
                            else if tag.starts_with("J") { "adj" }
                            else if tag.starts_with("R") { "adv" } 
                            else { "other" };
            
            if let Some(entry) = entries.iter().find(|e| e.pos == simple_pos) {
                return Some(entry);
            }
        }
        // Fallback to first
        entries.first()
    }
}

lazy_static! {
    pub static ref DICT: Dictionary = Dictionary::new();
}
