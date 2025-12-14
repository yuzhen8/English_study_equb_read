
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

// Note: This script is intended to be run via ts-node or similar during build/setup,
// OR executed by the main process if we want to build it on first run.
// For now, let's make it a standalone script we can run to generate the DB.

const CSV_PATH = path.join(__dirname, '../stardict/stardict.csv');
const DB_PATH = path.join(__dirname, '../resources/dict.db');

// Ensure resources dir exists
const resourcesDir = path.dirname(DB_PATH);
if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
}

console.log(`Source CSV: ${CSV_PATH}`);
console.log(`Target DB: ${DB_PATH}`);

if (fs.existsSync(DB_PATH)) {
    console.log('Database already exists. Deleting...');
    fs.unlinkSync(DB_PATH);
}

const db = new Database(DB_PATH);

// ECDICT Schema
// word,phonetic,definition,translation,pos,collins,oxford,tag,bnc,frq,exchange,detail,audio
const createTableQuery = `
    CREATE TABLE IF NOT EXISTS stardict (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL UNIQUE,
        phonetic TEXT,
        definition TEXT,
        translation TEXT,
        pos TEXT,
        collins INTEGER,
        oxford INTEGER,
        tag TEXT,
        bnc INTEGER,
        frq INTEGER,
        exchange TEXT,
        detail TEXT,
        audio TEXT
    );
`;

const createIndexQuery = `
    CREATE INDEX IF NOT EXISTS idx_stardict_word ON stardict(word);
`;

db.exec(createTableQuery);

const insertStmt = db.prepare(`
    INSERT INTO stardict (
        word, phonetic, definition, translation, pos, collins, oxford, tag, bnc, frq, exchange, detail, audio
    ) VALUES (
        @word, @phonetic, @definition, @translation, @pos, @collins, @oxford, @tag, @bnc, @frq, @exchange, @detail, @audio
    )
`);

const BATCH_SIZE = 10000;
let batch = [];
let count = 0;

console.log('Starting import...');

const runBatch = db.transaction((rows) => {
    for (const row of rows) {
        try {
            insertStmt.run(row);
        } catch (err) {
            // Duplicate word or constraint error, skip
            // console.warn(`Skipping duplicate/error: ${row.word}`);
        }
    }
});

fs.createReadStream(CSV_PATH)
    .pipe(csv())
    .on('data', (row) => {
        // Map CSV headers to DB columns if necessary.
        // Assuming CSV headers match: word,phonetic,definition,translation,pos,collins,oxford,tag,bnc,frq,exchange,detail,audio
        // We might need to handle empty strings or type conversion if better-sqlite3 is strict, but usually it's fine.

        batch.push({
            word: row.word,
            phonetic: row.phonetic,
            definition: row.definition,
            translation: row.translation,
            pos: row.pos,
            collins: row.collins ? parseInt(row.collins) : 0,
            oxford: row.oxford ? parseInt(row.oxford) : 0,
            tag: row.tag,
            bnc: row.bnc ? parseInt(row.bnc) : 0,
            frq: row.frq ? parseInt(row.frq) : 0,
            exchange: row.exchange,
            detail: row.detail,
            audio: row.audio
        });

        if (batch.length >= BATCH_SIZE) {
            runBatch(batch);
            count += batch.length;
            if (count % 100000 === 0) console.log(`Imported ${count} rows...`);
            batch = [];
        }
    })
    .on('end', () => {
        if (batch.length > 0) {
            runBatch(batch);
            count += batch.length;
        }
        console.log(`Import finished. Total rows: ${count}`);

        console.log('Creating index...');
        db.exec(createIndexQuery);
        console.log('Done.');
        db.close();
    });
