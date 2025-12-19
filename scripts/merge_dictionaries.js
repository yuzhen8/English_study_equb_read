const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const sourceDir = path.join(__dirname, '../stardict');
const targetFile = path.join(__dirname, '../cefr-core/assets/dictionary.csv');

const files = [
    'cefrj-vocabulary-profile-1.5.csv',
    'octanove-vocabulary-profile-c1c2-1.0.csv'
];

const results = [];

// Helper to normalized POS if needed, or keep as is.
// The Rust engine expects: "noun", "verb", "adj", "adv".
// The input has: "noun", "verb", "adjective", "adverb".
// Let's normalize to match common tags but the Rust code actually checks:
// if tag.starts_with("N") { "noun" }
// And stores whatever is in CSV in `entry.pos`.
// And compares `entry.pos == simple_pos`.
// So if Rust logic produces "adj", `entry.pos` must be "adj".
// Input has "adjective".
// Let's check `dictionary.rs` again.
/*
            let simple_pos = if tag.starts_with("N") { "noun" }
                            else if tag.starts_with("V") { "verb" }
                            else if tag.starts_with("J") { "adj" }
                            else if tag.starts_with("R") { "adv" } 
                            else { "other" };
            
            if let Some(entry) = entries.iter().find(|e| e.pos == simple_pos) {
*/
// So "adjective" in CSV will NOT match "adj" from POS tagger.
// I MUST normalize:
// adjective -> adj
// adverb -> adv
// noun -> noun
// verb -> verb

function normalizePos(pos) {
    if (!pos) return 'other';
    const p = pos.toLowerCase().trim();
    if (p.includes('noun')) return 'noun';
    if (p.includes('adverb') || p === 'adv') return 'adv'; // Check adverb BEFORE verb
    if (p.includes('verb')) return 'verb';
    if (p.includes('adjective') || p === 'adj') return 'adj';
    return p; // Keep others as is for now
}

async function processFile(filename) {
    return new Promise((resolve, reject) => {
        fs.createReadStream(path.join(sourceDir, filename))
            .pipe(csv())
            .on('data', (data) => {
                // Determine column names based on file content observation
                // cefrj: headword, pos, CEFR
                // octanove: headword, pos, CEFR

                const lemma = data['headword'];
                const rawPos = data['pos'];
                const level = data['CEFR'];

                if (lemma && rawPos && level) {
                    results.push({
                        lemma: lemma.trim(),
                        pos: normalizePos(rawPos),
                        level: level.trim(),
                        is_abstract: false // Default to false
                    });
                }
            })
            .on('end', () => {
                console.log(`Processed ${filename}`);
                resolve();
            })
            .on('error', reject);
    });
}

async function main() {
    try {
        for (const file of files) {
            await processFile(file);
        }

        // CSV Header
        let csvContent = "lemma,pos,level,is_abstract\n";

        // Rows
        csvContent += results.map(r =>
            `${r.lemma},${r.pos},${r.level},${r.is_abstract}`
        ).join('\n');

        fs.writeFileSync(targetFile, csvContent);
        console.log(`Successfully wrote ${results.length} entries to ${targetFile}`);

    } catch (error) {
        console.error("Error processing dictionaries:", error);
    }
}

main();
