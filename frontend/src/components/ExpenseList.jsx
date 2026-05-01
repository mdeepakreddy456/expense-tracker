/**
 * ExpenseList.jsx
 *
 * Renders the filtered/sorted list of expenses with:
 * - A total summary row
 * - Category filter (populated from distinct DB categories)
 * - Sort selector
 * - Per-category colour dots
 * - Loading / empty states
 * - Category breakdown summary
 */

import { getCategoryColor, formatRupees, formatDate } from '../utils/categoryUtils';
import { CATEGORIES } from '../utils/categoryUtils';

export default function ExpenseList({
  expenses,
  total,
  count,
  loading,
  error,
  categoryFilter,
  setCategoryFilter,
  sort,
  setSort,
  dbCategories,
}) {
  // Build category summary (only for visible expenses)
  const catSummary = buildCategorySummary(expenses, total);

  return (
    <div className="card">
      <h2 className="card-title">
        <span className="card-title-icon">📋</span>
        Expenses
      </h2>

      {/* ── Filter & Sort Bar ── */}
      <div className="filter-bar">
        <span className="filter-label">Filter:</span>
        <select
          id="category-filter"
          className="filter-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {/* Show DB categories first (what actually exists), then the canonical list */}
          {Array.from(new Set([...dbCategories, ...CATEGORIES])).sort().map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <span className="filter-label" style={{ marginLeft: 'auto' }}>Sort:</span>
        <select
          id="sort-select"
          className="filter-select"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Sort expenses"
        >
          <option value="date_desc">Newest first</option>
          <option value="date_asc">Oldest first</option>
          <option value="amount_desc">Highest amount</option>
          <option value="amount_asc">Lowest amount</option>
        </select>
      </div>

      {/* ── Total Row ── */}
      <div className="total-row" aria-live="polite" aria-label={`Total: ${formatRupees(total)}`}>
        <span className="total-row-label">
          {categoryFilter ? `Total · ${categoryFilter}` : 'Total · All'}
        </span>
        <span className="total-row-amount">{formatRupees(total)}</span>
      </div>
      <p className="total-count">{count} expense{count !== 1 ? 's' : ''}</p>

      {/* ── List ── */}
      <div style={{ marginTop: '1rem' }}>
        {loading ? (
          <div className="spinner-wrap">
            <div className="spinner" role="status" aria-label="Loading expenses" />
          </div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>
            <p className="empty-title">Could not load expenses</p>
            <p style={{ fontSize: 'var(--text-sm)', marginTop: '0.25rem' }}>{error}</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🧾</div>
            <p className="empty-title">No expenses yet</p>
            <p>Add your first expense using the form.</p>
          </div>
        ) : (
          <div className="expense-list">
            {expenses.map((exp) => (
              <ExpenseItem key={exp.id} expense={exp} />
            ))}
          </div>
        )}
      </div>

      {/* ── Category Breakdown ── */}
      {catSummary.length > 1 && !loading && (
        <div className="cat-summary">
          <p className="cat-summary-title">Breakdown by category</p>
          {catSummary.map(({ category, amount, pct }) => (
            <div className="cat-summary-row" key={category}>
              <span
                className="cat-dot"
                style={{ background: getCategoryColor(category) }}
              />
              <span className="cat-name">{category}</span>
              <div className="cat-bar-wrap">
                <div
                  className="cat-bar"
                  style={{
                    width: `${pct}%`,
                    background: getCategoryColor(category),
                  }}
                />
              </div>
              <span className="cat-amount">{formatRupees(amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExpenseItem({ expense }) {
  const color = getCategoryColor(expense.category);

  return (
    <div className="expense-item" role="listitem">
      <span
        className="expense-cat-dot"
        style={{ background: color }}
        aria-hidden="true"
      />
      <div className="expense-main">
        <p className="expense-desc">
          {expense.description || expense.category}
        </p>
        <div className="expense-meta">
          <span
            className="expense-badge"
            style={{ color, borderColor: color, border: `1px solid ${color}22` }}
          >
            {expense.category}
          </span>
        </div>
      </div>
      <span className="expense-date">{formatDate(expense.date)}</span>
      <span className="expense-amount">{formatRupees(expense.amount)}</span>
    </div>
  );
}

function buildCategorySummary(expenses, totalStr) {
  if (!expenses.length) return [];
  const map = {};
  let totalPaise = 0;
  expenses.forEach((e) => {
    const p = Math.round(parseFloat(e.amount) * 100);
    map[e.category] = (map[e.category] || 0) + p;
    totalPaise += p;
  });
  if (totalPaise === 0) return [];
  return Object.entries(map)
    .map(([category, paise]) => ({
      category,
      amount: (paise / 100).toFixed(2),
      pct: Math.round((paise / totalPaise) * 100),
    }))
    .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
}
