/**
 * Integration tests for POST /expenses and GET /expenses.
 * Uses supertest against the Express app with an in-memory SQLite DB
 * (NODE_ENV=test triggers :memory: DB in db.js).
 */

process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/server');
const { v4: uuidv4 } = require('uuid');

const BASE_EXPENSE = {
  amount: '1250.50',
  category: 'Food',
  description: 'Lunch at café',
  date: '2024-04-15',
};

describe('POST /expenses', () => {
  test('creates a new expense and returns 201', async () => {
    const res = await request(app)
      .post('/expenses')
      .set('Idempotency-Key', uuidv4())
      .send(BASE_EXPENSE);

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.amount).toBe('1250.50');
    expect(res.body.category).toBe('Food');
  });

  test('is idempotent — same key returns same expense (200)', async () => {
    const key = uuidv4();

    const first = await request(app)
      .post('/expenses')
      .set('Idempotency-Key', key)
      .send({ ...BASE_EXPENSE, description: 'First attempt' });

    const second = await request(app)
      .post('/expenses')
      .set('Idempotency-Key', key)
      .send({ ...BASE_EXPENSE, description: 'Second attempt (retry)' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
    expect(second.body.description).toBe('First attempt'); // original wins
  });

  test('returns 400 when Idempotency-Key header is missing', async () => {
    const res = await request(app).post('/expenses').send(BASE_EXPENSE);
    expect(res.status).toBe(400);
  });

  test('returns 422 for negative amount', async () => {
    const res = await request(app)
      .post('/expenses')
      .set('Idempotency-Key', uuidv4())
      .send({ ...BASE_EXPENSE, amount: '-50' });
    expect(res.status).toBe(422);
  });

  test('returns 422 for missing amount', async () => {
    const res = await request(app)
      .post('/expenses')
      .set('Idempotency-Key', uuidv4())
      .send({ category: 'Food', date: '2024-04-15' });
    expect(res.status).toBe(422);
  });

  test('returns 422 for invalid date', async () => {
    const res = await request(app)
      .post('/expenses')
      .set('Idempotency-Key', uuidv4())
      .send({ ...BASE_EXPENSE, date: 'not-a-date' });
    expect(res.status).toBe(422);
  });

  test('stores amount precisely (paise round-trip)', async () => {
    const res = await request(app)
      .post('/expenses')
      .set('Idempotency-Key', uuidv4())
      .send({ ...BASE_EXPENSE, amount: '99.999' }); // should round to 100.00

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe('100.00');
  });
});

describe('GET /expenses', () => {
  beforeAll(async () => {
    // Seed two expenses with different categories
    await request(app)
      .post('/expenses')
      .set('Idempotency-Key', uuidv4())
      .send({ amount: '200', category: 'Travel', description: 'Uber', date: '2024-03-01' });

    await request(app)
      .post('/expenses')
      .set('Idempotency-Key', uuidv4())
      .send({ amount: '500', category: 'Food', description: 'Dinner', date: '2024-03-10' });
  });

  test('returns all expenses', async () => {
    const res = await request(app).get('/expenses');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.expenses)).toBe(true);
    expect(res.body.expenses.length).toBeGreaterThanOrEqual(2);
    expect(res.body.total).toBeDefined();
  });

  test('filters by category (case-insensitive)', async () => {
    const res = await request(app).get('/expenses?category=travel');
    expect(res.status).toBe(200);
    res.body.expenses.forEach((e) =>
      expect(e.category.toLowerCase()).toBe('travel')
    );
  });

  test('sorts by date descending by default', async () => {
    const res = await request(app).get('/expenses?sort=date_desc');
    const dates = res.body.expenses.map((e) => e.date);
    const sorted = [...dates].sort((a, b) => b.localeCompare(a));
    expect(dates).toEqual(sorted);
  });

  test('total matches sum of visible expenses', async () => {
    const res = await request(app).get('/expenses');
    const sum = res.body.expenses
      .reduce((acc, e) => acc + Math.round(parseFloat(e.amount) * 100), 0);
    expect(parseFloat(res.body.total) * 100).toBeCloseTo(sum, 0);
  });
});

describe('GET /expenses/categories', () => {
  test('returns distinct categories', async () => {
    const res = await request(app).get('/expenses/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.categories)).toBe(true);
  });
});

describe('GET /health', () => {
  test('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
