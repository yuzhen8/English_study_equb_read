const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Configuration
const RESOURCES_DIR = path.join(__dirname, '../resources');
const DB_PATH = path.join(RESOURCES_DIR, 'dict.db');
const OUTPUT_PATH = path.join(RESOURCES_DIR, 'dict_dump.jsonl');

if (!fs.existsSync(DB_PATH)) {
    console.error(`Database not found at ${DB_PATH}`);
    process.exit(1);
}

console.log(`Opening database: ${DB_PATH}`);
const db = new Database(DB_PATH, { readonly: true });

// Get total count
const count = db.prepare('SELECT COUNT(*) as c FROM stardict').get().c;
console.log(`Total entries to export: ${count}`);

// Query all entries, sorted by word (required for FST)
// We select all fields that we need in the final data
const stmt = db.prepare(`
    SELECT word, phonetic, definition, translation, pos, collins, oxford, tag, bnc, frq, exchange 
    FROM stardict 
    ORDER BY word ASC
`);

const stream = fs.createWriteStream(OUTPUT_PATH, { flags: 'w', encoding: 'utf8' });

let processed = 0;
const reportInterval = 10000;

console.log('Starting export...');
const startTime = Date.now();

for (const row of stmt.iterate()) {
    // Clean data if necessary
    // Ensure word is present
    if (!row.word) continue;

    // Write as JSON line
    const jsonLine = JSON.stringify(row) + '\n';

    // Check for write backpressure (optional for simple script, but good practice)
    if (!stream.write(jsonLine)) {
        // In synchronous iteration we can't easily wait for drain without async iterator
        // But better-sqlite3 iterate is synchronous. Node streams buffer. 
        // For local file write it's usually fine.
    }

    processed++;
    if (processed % reportInterval === 0) {
        process.stdout.write(`\rExported: ${processed} / ${count} (${Math.round(processed / count * 100)}%)`);
    }
}

stream.end();
console.log('\nExport complete.');
const duration = (Date.now() - startTime) / 1000;
console.log(`Finished in ${duration.toFixed(2)}s. Output: ${OUTPUT_PATH}`);

db.close();
