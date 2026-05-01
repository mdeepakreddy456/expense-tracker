/**
 * ExpenseForm.jsx
 *
 * Handles the "Add Expense" form with:
 * - Client-side validation
 * - Idempotency key management (via useIdempotencyKey)
 * - Disabled submit during in-flight request to prevent double-click
 * - Error display per field
 */

import { useState } from 'react';
import { createExpense, ApiError } from '../api';
import { useIdempotencyKey } from '../hooks/useIdempotencyKey';
import { CATEGORIES } from '../utils/categoryUtils';

const today = () => new Date().toISOString().substring(0, 10);

const INITIAL_STATE = {
  amount: '',
  category: '',
  description: '',
  date: today(),
};

export default function ExpenseForm({ onCreated, addToast }) {
  const [form, setForm] = useState(INITIAL_STATE);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, refreshKey] = useIdempotencyKey();

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function validate() {
    const errors = {};
    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      errors.amount = 'Enter a valid positive amount';
    }
    if (!form.category) errors.category = 'Select a category';
    if (!form.date) errors.date = 'Pick a date';
    if (form.description.length > 500) {
      errors.description = 'Description must be 500 characters or fewer';
    }
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const expense = await createExpense(
        {
          amount: form.amount,
          category: form.category,
          description: form.description.trim(),
          date: form.date,
        },
        idempotencyKey
      );

      // Success — reset form and refresh idempotency key for next submission
      setForm({ ...INITIAL_STATE, date: today() });
      setFieldErrors({});
      refreshKey();
      onCreated(expense);
      addToast('Expense added successfully!', 'success');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422 && err.body?.errors) {
          // Map server validation errors to fields
          const serverErrors = {};
          err.body.errors.forEach((e) => {
            serverErrors[e.path] = e.msg;
          });
          setFieldErrors(serverErrors);
        } else {
          addToast(err.message, 'error');
        }
      } else {
        addToast('Something went wrong. Please try again.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <h2 className="card-title">
        <span className="card-title-icon">＋</span>
        Add Expense
      </h2>

      <form onSubmit={handleSubmit} noValidate id="add-expense-form">
        {/* Amount */}
        <div className="form-group">
          <label htmlFor="amount">Amount</label>
          <div className="input-prefix-wrap">
            <span className="input-prefix">₹</span>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={handleChange}
              disabled={submitting}
              aria-describedby={fieldErrors.amount ? 'amount-error' : undefined}
            />
          </div>
          {fieldErrors.amount && (
            <p className="field-error" id="amount-error" role="alert">
              {fieldErrors.amount}
            </p>
          )}
        </div>

        {/* Category */}
        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={form.category}
            onChange={handleChange}
            disabled={submitting}
            aria-describedby={fieldErrors.category ? 'category-error' : undefined}
          >
            <option value="">Select a category…</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {fieldErrors.category && (
            <p className="field-error" id="category-error" role="alert">
              {fieldErrors.category}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="description">Description <span style={{ fontWeight: 400 }}>(optional)</span></label>
          <input
            id="description"
            name="description"
            type="text"
            placeholder="e.g. Lunch at Café Coffee Day"
            value={form.description}
            onChange={handleChange}
            disabled={submitting}
            maxLength={500}
            aria-describedby={fieldErrors.description ? 'description-error' : undefined}
          />
          {fieldErrors.description && (
            <p className="field-error" id="description-error" role="alert">
              {fieldErrors.description}
            </p>
          )}
        </div>

        {/* Date */}
        <div className="form-group">
          <label htmlFor="date">Date</label>
          <input
            id="date"
            name="date"
            type="date"
            value={form.date}
            onChange={handleChange}
            disabled={submitting}
            aria-describedby={fieldErrors.date ? 'date-error' : undefined}
          />
          {fieldErrors.date && (
            <p className="field-error" id="date-error" role="alert">
              {fieldErrors.date}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          id="submit-expense"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? (
            <>
              <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              Saving…
            </>
          ) : (
            'Add Expense'
          )}
        </button>
      </form>
    </div>
  );
}
