# Fenmo — Frontend

React + Vite SPA for the Fenmo personal expense tracker.

## Quick Start

```bash
npm install
cp .env.example .env.production   # fill in VITE_API_URL
npm run dev        # http://localhost:5173
```

The Vite dev server proxies `/expenses` → `http://localhost:3001` automatically — no manual env var needed locally.

## Features

- Add expenses with amount (₹), category, description, and date
- Filter by category (populated from DB in real time)
- Sort by date or amount
- Live total for visible expenses (integer-paise accumulation, no float drift)
- Category breakdown bar chart
- This-month and top-category stat cards
- Toast notifications for success/error
- Idempotency: page refresh mid-submit won't create duplicates
- Loading and error states throughout

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Base URL of the backend API (empty = use Vite proxy in dev) |

## Build for Production

```bash
npm run build     # outputs to dist/
```
