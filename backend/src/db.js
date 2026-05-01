/**
 * Database module — initialises SQLite via better-sqlite3.
 *
 * Design decisions:
 * - SQLite: zero-config, single-file, perfect for a small personal finance
 *   tool. No external DB server to manage. Render's persistent disk makes it
 *   viable in production.
 * - Amount is stored as INTEGER (paise / smallest currency unit) to avoid
 *   floating-point precision bugs. All arithmetic is done in integers and
 *   converted to rupees only at the API boundary.
 * - Idempotency keys are stored in a dedicated table so that duplicate
 *   POST /expenses requests (e.g., from retries / double-clicks) are safely
 *   detected and return the original response without creating duplicate rows.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (e) {
  console.warn(`Warning: could not create DATA_DIR at ${DATA_DIR}:`, e.message);
}

const DB_PATH =
  process.env.NODE_ENV === 'test'
    ? ':memory:'
    : path.join(DATA_DIR, 'expenses.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id          TEXT PRIMARY KEY,
    amount_paise INTEGER NOT NULL CHECK(amount_paise > 0),
    category    TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    date        TEXT    NOT NULL,          -- stored as YYYY-MM-DD
    created_at  TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
  CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses(date DESC);

  CREATE TABLE IF NOT EXISTS idempotency_keys (
    key         TEXT PRIMARY KEY,
    expense_id  TEXT NOT NULL,
    created_at  TEXT NOT NULL
  );
`);

module.exports = db;
