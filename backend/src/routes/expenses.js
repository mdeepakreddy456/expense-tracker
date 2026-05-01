/**
 * Expense routes — POST /expenses, GET /expenses, GET /expenses/categories
 *
 * Key behaviours:
 * 1. Idempotency: clients must send an `Idempotency-Key` header (UUID).
 *    If we have already processed that key we return the stored expense
 *    (HTTP 200) without inserting a duplicate row.
 * 2. Money: `amount` arrives as a decimal string (e.g., "1234.50") and is
 *    converted to integer paise before storage. The reverse conversion is
 *    applied on read so the API always speaks in rupees.
 * 3. Validation: handled by express-validator; errors return 422 with a
 *    structured body.
 */

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

/* ─── helpers ────────────────────────────────────────────────────────────── */

/** Convert a decimal rupee string/number → integer paise (round half-up). */
const toPaise = (rupees) => Math.round(parseFloat(rupees) * 100);

/** Convert integer paise → decimal rupee string (2 dp). */
const toRupees = (paise) => (paise / 100).toFixed(2);

/** Format a DB row for the API response. */
const formatExpense = (row) => ({
  id: row.id,
  amount: toRupees(row.amount_paise),
  category: row.category,
  description: row.description,
  date: row.date,
  created_at: row.created_at,
});

/* ─── validation rules ───────────────────────────────────────────────────── */

const createExpenseValidators = [
  body('amount')
    .notEmpty().withMessage('amount is required')
    .isFloat({ gt: 0 }).withMessage('amount must be a positive number')
    .customSanitizer((v) => parseFloat(parseFloat(v).toFixed(2))),
  body('category')
    .trim()
    .notEmpty().withMessage('category is required')
    .isLength({ max: 100 }).withMessage('category max length is 100'),
  body('description')
    .trim()
    .isLength({ max: 500 }).withMessage('description max length is 500')
    .default(''),
  body('date')
    .notEmpty().withMessage('date is required')
    .isISO8601().withMessage('date must be a valid ISO 8601 date (YYYY-MM-DD)')
    .customSanitizer((v) => v.substring(0, 10)),
];

/* ─── POST /expenses ─────────────────────────────────────────────────────── */

router.post(
  '/',
  createExpenseValidators,
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const idempotencyKey = req.headers['idempotency-key'];
    if (!idempotencyKey) {
      return res.status(400).json({ error: 'Idempotency-Key header is required' });
    }

    const handleRequest = db.transaction(() => {
      const existing = db
        .prepare('SELECT expense_id FROM idempotency_keys WHERE key = ?')
        .get(idempotencyKey);

      if (existing) {
        const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(existing.expense_id);
        return { status: 200, body: formatExpense(expense) };
      }

      const { amount, category, description, date } = req.body;
      const id = uuidv4();
      const created_at = new Date().toISOString();

      db.prepare(`
        INSERT INTO expenses (id, amount_paise, category, description, date, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, toPaise(amount), category, description, date, created_at);

      db.prepare(`
        INSERT INTO idempotency_keys (key, expense_id, created_at) VALUES (?, ?, ?)
      `).run(idempotencyKey, id, created_at);

      return { status: 201, body: formatExpense(db.prepare('SELECT * FROM expenses WHERE id = ?').get(id)) };
    });

    try {
      const result = handleRequest();
      return res.status(result.status).json(result.body);
    } catch (err) {
      console.error('POST /expenses error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/* ─── GET /expenses ──────────────────────────────────────────────────────── */
// Supports optional ?category (case-insensitive) and ?sort query params.
// Total is accumulated in integer paise to prevent floating-point drift.

const getExpensesValidators = [
  query('category').optional().trim().isLength({ max: 100 }),
  query('sort').optional().isIn(['date_desc', 'date_asc', 'amount_desc', 'amount_asc']),
];

router.get('/', getExpensesValidators, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { category, sort } = req.query;
  const conditions = [];
  const params = [];

  if (category) {
    conditions.push('LOWER(category) = LOWER(?)');
    params.push(category);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const ORDER_MAP = {
    date_desc:   'date DESC, created_at DESC',
    date_asc:    'date ASC,  created_at ASC',
    amount_desc: 'amount_paise DESC',
    amount_asc:  'amount_paise ASC',
  };
  const orderClause = `ORDER BY ${ORDER_MAP[sort] || ORDER_MAP.date_desc}`;

  try {
    const rows = db
      .prepare(`SELECT * FROM expenses ${whereClause} ${orderClause}`)
      .all(...params);

    const expenses = rows.map(formatExpense);
    // Accumulate total in paise to avoid float-point errors across many rows
    const totalPaise = rows.reduce((acc, r) => acc + r.amount_paise, 0);

    return res.json({ expenses, total: toRupees(totalPaise), count: expenses.length });
  } catch (err) {
    console.error('GET /expenses error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/* ─── GET /expenses/categories ───────────────────────────────────────────── */
// Returns all distinct categories that currently exist in the DB,
// sorted alphabetically. Used by the frontend filter dropdown so it
// only shows categories that actually have expenses — no hardcoded list.

router.get('/categories', (_req, res) => {
  try {
    const rows = db
      .prepare('SELECT DISTINCT category FROM expenses ORDER BY category ASC')
      .all();
    return res.json({ categories: rows.map((r) => r.category) });
  } catch (err) {
    console.error('GET /expenses/categories error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
