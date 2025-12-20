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
        // Pass the simplified POS (not PTB) to next step for easier rules
        last_tag = best_pos.to_string();
    }
    
    // Apply Brill Tagger transformation rules (Second Pass)
    apply_context_rules(&mut results);
    
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


fn apply_context_rules(tokens: &mut [TaggedToken]) {
    // Brill-style rules. We operate on PTB tags directly or mapped ones.
    // transform_tag maps to: NN, VB, JJ, RB, IN, CC, DT, PRP, MD, TO
    
    let len = tokens.len();
    if len < 2 { return; }

    // We can't mutate while looking at neighbors easily with standard iter.
    // Use indexing.
    for i in 1..len {
        let prev = tokens[i-1].tag.clone();
        // let next = if i + 1 < len { Some(&tokens[i+1].tag) } else { None };
        
        let curr_word = tokens[i].word.to_lowercase();
        // let curr_tag = tokens[i].tag.clone(); 
        
        // Rule 1: TO -> VB
        // If previous is TO, current is likely VB (infinitive), unless it's a known noun?
        // Our 'disambiguate' does this for ambig words, but what if it was guessed as NN?
        if prev == "TO" {
             // Force VB if it can be a verb ideally, but here we force statistically
             tokens[i].tag = "VB".to_string();
        }
        
        // Rule 2: MD -> VB
        // Modal (can/will) -> Force VB (base form)
        if prev == "MD" {
            tokens[i].tag = "VB".to_string();
        }

        // Rule 3: DT -> NN/JJ
        // If prev is DT, current should probably not be VB.
        if prev == "DT" {
            if tokens[i].tag == "VB" || tokens[i].tag == "VBP" { // If wrongly tagged as verb
                 // Simple heuristic: change to NN. 
                 // (Could be JJ, but NN is safer default after DT if V was wrong)
                 tokens[i].tag = "NN".to_string();
            }
        }
        
        // Rule 4: "help" special case? "to help" -> help is VB. "a help" -> help is NN.
        // Handled by above rules.
        
        // Rule 5: IN (Preposition) -> NN (Object) or VBG (Gerund)
        // e.g. "by running" -> running is VBG (which we map to VB or keep VBG if we had it, but we map V->VB)
        // If we have "by walk", "walk" is likely NN here? "by the walk".
        // If "by walk" (grammatically poor but possible) -> NN.
        if prev == "IN" {
             if tokens[i].tag == "VB" {
                  // "after run" -> run is NN.
                  // "after eating" (eating is VB in our set) -> leave as VB (VBG)
                  if !curr_word.ends_with("ing") {
                      tokens[i].tag = "NN".to_string();
                  }
             }
        }
    }
    
    // Look ahead rules (Reverse loop or just index access)
    for i in 0..len-1 {
        // let curr = &tokens[i].tag;
        let next_word = tokens[i+1].word.to_lowercase();
        
        // If current is NN but next is "the" -> likely VB?
        // e.g. "book the flight" -> book is VB. 
        if tokens[i].tag == "NN" && (next_word == "the" || next_word == "a" || next_word == "an") {
             // Highly likely a verb
             tokens[i].tag = "VB".to_string();
        }
    }
}
