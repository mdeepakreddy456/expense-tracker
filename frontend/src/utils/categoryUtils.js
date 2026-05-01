/**
 * categoryUtils.js
 *
 * Canonical category list and colour mappings.
 * Using a centralised map ensures the UI and badge colours are consistent
 * across the form, filter bar, and expense list.
 */

export const CATEGORIES = [
  'Food',
  'Travel',
  'Health',
  'Shopping',
  'Entertainment',
  'Education',
  'Utilities',
  'Other',
];

const CATEGORY_COLORS = {
  food:          'var(--cat-food)',
  travel:        'var(--cat-travel)',
  health:        'var(--cat-health)',
  shopping:      'var(--cat-shopping)',
  entertainment: 'var(--cat-entertainment)',
  education:     'var(--cat-education)',
  utilities:     'var(--cat-utilities)',
  other:         'var(--cat-other)',
};

export function getCategoryColor(category) {
  if (!category) return CATEGORY_COLORS.other;
  return CATEGORY_COLORS[category.toLowerCase()] ?? CATEGORY_COLORS.other;
}

/** Format a rupee amount string for display */
export function formatRupees(amount) {
  const num = parseFloat(amount);
  if (isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Format a YYYY-MM-DD date for display */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
