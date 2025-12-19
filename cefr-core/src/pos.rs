use crate::dictionary::DICT;

// Placeholder for the actual crate usage. 
// Since we don't have the exact API of viterbi_pos_tagger verified, 
// we will structure this to be easily adaptable.
// For now, we will assume a simple function or generic tagger.

pub struct TaggedToken {
    pub word: String,
    pub tag: String,
}

pub fn tag_sentence(tokens: &[String]) -> Vec<TaggedToken> {
    // ideal: let tagged = viterbi_pos_tagger::tag(tokens);
    // fallback: dictionary lookup
    
    let mut results = Vec::new();
    for token in tokens {
        // Simple lookup fallback if Viterbi is not fully set up
        let tag = if let Some(entries) = DICT.words.get(token) {
            // Pick most common? or just first
            entries[0].pos.clone()
        } else {
            "Unknown".to_string()
        };
        
        results.push(TaggedToken {
            word: token.clone(),
            tag: transform_tag(&tag),
        });
    }
    results
}

fn transform_tag(t: &str) -> String {
    // Map internal dictionary tags to standard Penn Treebank if needed
    // or vice versa.
    // My dict uses "noun", "verb".
    match t {
        "noun" => "NN".to_string(),
        "verb" => "VB".to_string(),
        "adj" => "JJ".to_string(),
        "adv" => "RB".to_string(),
        "prep" => "IN".to_string(),
        "conj" => "CC".to_string(),
        _ => "NN".to_string(), // Default
    }
}
