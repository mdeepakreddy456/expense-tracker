/**
 * useIdempotencyKey.js
 *
 * Returns a stable UUID for the current "submission attempt".
 * Call `refresh()` after a successful submission to get a new key
 * for the next attempt.
 *
 * Storing the key in sessionStorage means a page-reload does NOT reset
 * it — a refreshed page with the same intent will carry the same key,
 * preventing duplicate submissions if the user refreshed mid-flight.
 */

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'expense_tracker_idempotency_key';

function getOrCreate() {
  let key = sessionStorage.getItem(STORAGE_KEY);
  if (!key) {
    key = uuidv4();
    sessionStorage.setItem(STORAGE_KEY, key);
  }
  return key;
}

export function useIdempotencyKey() {
  const [key, setKey] = useState(() => getOrCreate());

  const refresh = () => {
    const next = uuidv4();
    sessionStorage.setItem(STORAGE_KEY, next);
    setKey(next);
  };

  return [key, refresh];
}
