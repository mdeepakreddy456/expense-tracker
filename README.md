# Personal Expense Tracker

A minimal, production-quality full-stack expense tracker.

**🌐 Live demo**: [https://expense-tracker-urtj.onrender.com](https://expense-tracker-urtj.onrender.com)  
**🔌 Backend API**: [https://expense-tracker-backend-pbpl.onrender.com](https://expense-tracker-backend-pbpl.onrender.com)  
**📦 Repository**: [https://github.com/mdeepakreddy456/expense-tracker](https://github.com/mdeepakreddy456/expense-tracker)


---

## Features

- ✅ Add expenses with amount, category, description, and date
- ✅ View and filter expenses by category
- ✅ Sort by date (newest first) or amount
- ✅ Live total for the visible filtered list
- ✅ Category-wise spending breakdown
- ✅ This-month summary stat card
- ✅ Fully idempotent POST — safe for browser retries, double-clicks, and page refreshes
- ✅ Loading and error states with toast notifications
- ✅ Basic validation on both client and server

---

## Architecture

```
expense-tracker/
├── backend/          Express API + SQLite
│   ├── src/
│   │   ├── server.js          Express app setup
│   │   ├── db.js              SQLite initialisation
│   │   └── routes/expenses.js All expense endpoints
│   └── tests/
│       └── expenses.test.js   Integration tests (Jest + Supertest)
└── frontend/         React + Vite SPA
    └── src/
        ├── api.js             Centralised fetch layer
        ├── App.jsx            Root component
        ├── components/
        │   ├── ExpenseForm.jsx
        │   ├── ExpenseList.jsx
        │   └── ToastContainer.jsx
        ├── hooks/
        │   ├── useIdempotencyKey.js
        │   └── useToast.js
        └── utils/
            └── categoryUtils.js
```

---

## Key Design Decisions

### Money handling — Integer paise storage
Floating-point arithmetic is unsuitable for money. `0.1 + 0.2 !== 0.3` in IEEE 754.  
All amounts are stored as **integer paise** (1 rupee = 100 paise) in SQLite. Conversion to rupees happens only at the API boundary, meaning all internal arithmetic is lossless integer math.

### Idempotency
The client generates a UUID (`Idempotency-Key` header) once per "intent to submit" and persists it in `sessionStorage`. A page refresh before the server responds re-uses the same key. On the backend, the key is stored in a dedicated `idempotency_keys` table inside the same SQLite transaction as the expense insert. If the key is seen again, the stored expense is returned with HTTP 200 — no duplicate rows are ever created.

### Persistence — SQLite
SQLite was chosen because:
- Zero-config, single-file — perfect for a small personal tool
- WAL journal mode gives better concurrent read throughput
- On Render, pairing it with a persistent disk keeps data across deploys

Trade-off: doesn't scale horizontally (multi-process writes would contend). For a personal finance tool used by a single user, this is entirely acceptable.

### Category filter — case-insensitive
`GET /expenses?category=food` and `?category=Food` return the same rows via `LOWER(category) = LOWER(?)`.

### Total calculation — integer accumulation
The API accumulates totals in integer paise before dividing once, preventing floating-point drift across large numbers of rows.

---

## Trade-offs (due to timebox)

- **No auth** — assumed single-user personal tool; adding JWT/session auth would be the first extension.
- **No soft-delete** — a DELETE endpoint was omitted; implementing it would require a recycled idempotency key strategy.
- **SQLite on Render** — requires a persistent disk add-on. A hosted PostgreSQL (e.g., Render Postgres) would be the production upgrade path.
- **No pagination** — acceptable for personal scale; a `limit`/`offset` query param would be the natural extension.

---

## Running Locally

### Prerequisites
- Node.js ≥ 18

### Backend
```bash
cd backend
npm install
npm run dev        # starts on http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # starts on http://localhost:5173
```

The Vite dev server proxies `/expenses` → `http://localhost:3001` so no CORS config is needed locally.

### Tests
```bash
cd backend
npm test
```

---

## API Reference

### `POST /expenses`
Create a new expense.

**Headers:** `Idempotency-Key: <uuid>` (required)  
**Body:**
```json
{
  "amount": "1250.50",
  "category": "Food",
  "description": "Lunch at café",
  "date": "2024-04-15"
}
```
**Response 201/200:**
```json
{
  "id": "...",
  "amount": "1250.50",
  "category": "Food",
  "description": "Lunch at café",
  "date": "2024-04-15",
  "created_at": "..."
}
```

### `GET /expenses`
List expenses.

**Query params:**
- `category` — filter by category (case-insensitive)
- `sort` — `date_desc` (default) | `date_asc` | `amount_desc` | `amount_asc`

**Response 200:**
```json
{
  "expenses": [...],
  "total": "4500.00",
  "count": 3
}
```

### `GET /expenses/categories`
Returns all distinct categories that exist.

### `GET /health`
Health check.

---

## Deployment on Render

See the step-by-step guide below (shared separately).  
`render.yaml` in the repo root configures both services automatically.
