/**
 * App.jsx — root component
 *
 * Orchestrates:
 * - Fetching expenses (with filter + sort state)
 * - Fetching distinct categories for the filter dropdown
 * - Optimistic list update after a new expense is created
 * - Stats bar (total, count, top category)
 * - Toast notifications
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchExpenses, fetchCategories } from './api';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import ToastContainer from './components/ToastContainer';
import { useToast } from './hooks/useToast';
import { formatRupees } from './utils/categoryUtils';

export default function App() {
  const [expenses, setExpenses]         = useState([]);
  const [total, setTotal]               = useState('0.00');
  const [count, setCount]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  // Filter & sort state
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sort, setSort]                     = useState('date_desc');

  // Distinct categories from the DB (for the filter dropdown)
  const [dbCategories, setDbCategories] = useState([]);

  const { toasts, addToast } = useToast();

  /* ── Load expenses ─────────────────────────────────────────── */
  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchExpenses({ category: categoryFilter, sort });
      setExpenses(data.expenses);
      setTotal(data.total);
      setCount(data.count);
    } catch (err) {
      setError(err.message);
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  /* ── Load DB categories once ────────────────────────────────── */
  useEffect(() => {
    fetchCategories()
      .then((d) => setDbCategories(d.categories))
      .catch(() => {}); // non-critical
  }, [expenses]); // refresh when expenses change

  /* ── Handle new expense created ─────────────────────────────── */
  function handleCreated(newExpense) {
    // Immediately reload the full list so sort order and total are correct
    loadExpenses();
  }

  /* ── Stats bar data ─────────────────────────────────────────── */
  const topCategory = useMemo(() => {
    if (!expenses.length) return '—';
    const map = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + parseFloat(e.amount);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  }, [expenses]);

  const monthlyTotal = useMemo(() => {
    const now = new Date();
    const thisMonth = expenses.filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const paise = thisMonth.reduce((acc, e) => acc + Math.round(parseFloat(e.amount) * 100), 0);
    return (paise / 100).toFixed(2);
  }, [expenses]);

  return (
    <>
      {/* ── Header ── */}
      <div className="app-wrapper">
        <header className="app-header">
          <div className="logo">
            <div className="logo-icon" aria-hidden="true">₹</div>
            <span className="logo-text">Expense <span>Tracker</span></span>
          </div>
          <p className="header-subtitle">Personal Expense Tracker</p>
        </header>

        {/* ── Stats Bar ── */}
        <section className="stats-bar" aria-label="Summary statistics">
          <div className="stat-card">
            <p className="stat-label">Visible Total</p>
            <p className="stat-value highlight" aria-live="polite">
              {formatRupees(total)}
            </p>
            <p className="stat-sub">{count} expense{count !== 1 ? 's' : ''}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">This Month</p>
            <p className="stat-value">{formatRupees(monthlyTotal)}</p>
            <p className="stat-sub">{new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Top Category</p>
            <p className="stat-value" style={{ fontSize: 'var(--text-xl)' }}>{topCategory}</p>
            <p className="stat-sub">by spend</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Categories</p>
            <p className="stat-value">{dbCategories.length}</p>
            <p className="stat-sub">tracked</p>
          </div>
        </section>

        {/* ── Main Grid ── */}
        <main className="main-grid">
          <aside>
            <ExpenseForm onCreated={handleCreated} addToast={addToast} />
          </aside>

          <section aria-label="Expense list">
            <ExpenseList
              expenses={expenses}
              total={total}
              count={count}
              loading={loading}
              error={error}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              sort={sort}
              setSort={setSort}
              dbCategories={dbCategories}
            />
          </section>
        </main>
      </div>

      {/* ── Toasts ── */}
      <ToastContainer toasts={toasts} />
    </>
  );
}
