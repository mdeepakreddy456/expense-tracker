const express = require('express');
const cors = require('cors');
const expensesRouter = require('./routes/expenses');

const app = express();
const PORT = process.env.PORT || 3001;

/* ─── Middleware ─────────────────────────────────────────────────────────── */

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Idempotency-Key'],
}));

app.use(express.json());

// Basic request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

/* ─── Routes ─────────────────────────────────────────────────────────────── */

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use('/expenses', expensesRouter);

/* ─── 404 handler ────────────────────────────────────────────────────────── */
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

/* ─── Global error handler ───────────────────────────────────────────────── */
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

/* ─── Start ──────────────────────────────────────────────────────────────── */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Expense Tracker API listening on port ${PORT}`);
  });
}

module.exports = app; // exported for testing
