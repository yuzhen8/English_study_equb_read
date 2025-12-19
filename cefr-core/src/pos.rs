use crate::dictionary::DICT;

pub struct TaggedToken {
    pub word: String,
    pub tag: String,
}

pub fn tag_sentence(tokens: &[String]) -> Vec<TaggedToken> {
    let mut results = Vec::new();
    let mut last_tag = "START".to_string();

    for (_i, token) in tokens.iter().enumerate() {
        let candidates = get_candidates(token);
        
        // Heuristic fallback for unknown words
        let candidates = if candidates.is_empty() {
             guess_candidates(token)
        } else {
            candidates
        };

        // Disambiguation
        let best_pos = disambiguate(token, &candidates, &last_tag);
        
        let final_tag = transform_tag(best_pos);
        results.push(TaggedToken {
            word: token.clone(),
            tag: final_tag.clone(),
        });
        
        // Pass the simplified POS (not PTB) to next step for easier rules
        last_tag = best_pos.to_string();
    }
    results
}

fn get_candidates(token: &str) -> Vec<&str> {
    let mut candidates = Vec::new();
    if let Some(entries) = DICT.lookup_all(token) {
        for e in entries {
            candidates.push(e.pos.as_str());
        }
    }
    candidates.dedup(); // remove duplicates
    candidates
}

fn guess_candidates(token: &str) -> Vec<&str> {
    // Basic morphology guessing
    if token.ends_with("ly") { vec!["adv"] }
    else if token.ends_with("ed") { vec!["verb"] } // Past/Participle
    else if token.ends_with("ing") { vec!["verb"] } // Gerund
    else if token.ends_with("tion") || token.ends_with("ment") { vec!["noun"] }
    else if token.chars().next().map_or(false, |c| c.is_uppercase()) { vec!["noun"] } // Proper noun likely
    else { vec!["noun"] } // Default to noun
}

fn disambiguate<'a>(_token: &str, candidates: &'a [&str], last_tag: &str) -> &'a str {
    if candidates.len() == 1 {
        return candidates[0];
    }

    // Rule 1: Determiner (DT) -> Noun
    // e.g. "a book" (book: noun/verb) -> noun
    if last_tag == "determiner" || last_tag == "adj" {
        if candidates.contains(&"noun") { return "noun"; }
    }

    // Rule 2: "to" -> Verb
    // e.g. "to book" (book: noun/verb) -> verb
    if last_tag == "to" { // We might need to detect 'to' specifically
         if candidates.contains(&"verb") { return "verb"; }
    }

    // Rule 3: Modal (can/will) -> Verb
    // e.g. "can book" -> verb
    if last_tag == "modal" {
        if candidates.contains(&"verb") { return "verb"; }
    }
    
    // Rule 4: Pronoun -> Verb (Subject-Verb)
    if last_tag == "pronoun" || last_tag == "noun" {
        if candidates.contains(&"verb") { return "verb"; }
    }

    // Default: Prefer Noun if available, else first
    if candidates.contains(&"noun") { "noun" }
    else { candidates[0] }
}

fn transform_tag(t: &str) -> String {
    match t.to_lowercase().as_str() {
        "noun" | "n" => "NN".to_string(),
        "verb" | "v" => "VB".to_string(), // General verb
        "adj" | "adjective" | "j" => "JJ".to_string(),
        "adv" | "adverb" | "r" => "RB".to_string(),
        "prep" | "preposition" => "IN".to_string(),
        "conj" | "conjunction" => "CC".to_string(),
        "determiner" | "det" => "DT".to_string(),
        "pronoun" | "pron" => "PRP".to_string(),
        "modal" => "MD".to_string(),
        "to" => "TO".to_string(), // Special handling for infinitive 'to'?
        _ => "NN".to_string(),
    }
}

