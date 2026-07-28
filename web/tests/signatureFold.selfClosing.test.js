import { expect, test, beforeEach } from 'vitest';
import { _foldSignature } from '$lib/legacy/emailLibrary/signatureFold.js';

// Minimal DOM stub — identical behavior to the Python harness
beforeEach(() => {
  globalThis.document = {
    createElement() {
      let t = '';
      return {
        set textContent(v) {
          t = String(v);
        },
        get innerHTML() {
          return t;
        }
      };
    }
  };
});

// Helper to mirror the Python _folds() function
function folds(html) {
  const out = _foldSignature(html, null);
  return out.includes('email-sig-fold');
}

// Long signature used in the Python test
const SIG = 'X'.repeat(250);

// --- tests -----------------------------------------------------------------

test('self-closing <br/> delimiter folds', () => {
  expect(
    folds(`Hello, please review.<br />-- <br />John Smith<br />Acme<br />${SIG}`)
  ).toBe(true);

  expect(
    folds(`Hi.<br/>-- <br/>Jane Doe<br/>${SIG}`)
  ).toBe(true);
});

test('classic <br> delimiter still folds', () => {
  expect(
    folds(`Hello.<br>-- <br>John Smith<br>${SIG}`)
  ).toBe(true);
});

test('short signature is not folded', () => {
  expect(
    folds(`Hello.<br />-- <br />JS`)
  ).toBe(false);
});
