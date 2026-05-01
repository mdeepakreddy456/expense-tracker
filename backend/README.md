# Fenmo — Backend API

Express + SQLite REST API for the Fenmo personal expense tracker.

**🔌 Live API**: [https://expense-tracker-backend-pbpl.onrender.com](https://expense-tracker-backend-pbpl.onrender.com)  
**🌐 Frontend**: [https://expense-tracker-urtj.onrender.com](https://expense-tracker-urtj.onrender.com)

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev        # http://localhost:3001
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/expenses` | Create a new expense |
| `GET` | `/expenses` | List expenses (with filter & sort) |
| `GET` | `/expenses/categories` | Distinct categories |
| `GET` | `/health` | Health check |

### POST /expenses

**Required header:** `Idempotency-Key: <uuid>`

```json
{
  "amount": "1250.50",
  "category": "Food",
  "description": "Lunch",
  "date": "2024-04-15"
}
```

Returns **201** on creation, **200** if the same `Idempotency-Key` was already processed (safe retry).

### GET /expenses

Query params:
- `category` — filter (case-insensitive)
- `sort` — `date_desc` (default) | `date_asc` | `amount_desc` | `amount_asc`

## Key Design Decisions

### Money — Integer Paise Storage
All amounts stored as **integer paise** (100 paise = 1 rupee). This avoids IEEE 754 floating-point precision bugs. Conversion to rupees happens only at the API boundary.

### Idempotency
Clients send a UUID in `Idempotency-Key` header. This is stored in a dedicated `idempotency_keys` table inside the same SQLite transaction as the expense insert. Duplicate requests return the original expense — no double entries.

### SQLite
Zero-config, single-file DB. WAL journal mode for better concurrent reads. Perfect for a personal finance tool. On Render, mount a persistent disk at `/var/data`.

## Running Tests

```bash
npm test
```

13 tests covering all endpoints, idempotency, validation, and money precision.
