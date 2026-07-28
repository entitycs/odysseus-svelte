import { expect, test } from 'vitest';
import { _matchesCombo } from '$lib/legacy/keyboard-shortcuts.js';

// The fixed event used in the Python test
const EVENT = {
  key: 'k',
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false
};

// Helper to mirror the Python harness
function match(combo) {
  return _matchesCombo(EVENT, combo);
}

// --- tests -----------------------------------------------------------------

test('non-string combo is no match', () => {
  expect(match(123)).toBe(false);
  expect(match({})).toBe(false);
  expect(match(null)).toBe(false);
});

test('matching combo still fires', () => {
  expect(match('k')).toBe(true);
});
