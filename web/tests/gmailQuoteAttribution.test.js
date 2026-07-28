import { expect, test, describe, beforeEach } from 'vitest';
import { _extractQuoteMeta } from '$lib/legacy/emailLibrary/signatureFold.js';

// Gmail attribution parsing tests
// These mirror the Python+Node tests exactly.

// --- minimal DOM stub ------------------------------------------------------
// The legacy module uses document.createElement('div').textContent to escape HTML.
// We stub only what it touches.

beforeEach(() => {
  globalThis.document = {
    createElement() {
      return {
        _text: '',
        set textContent(v) {
          this._text = v;
        },
        get innerHTML() {
          return this._text || '';
        }
      };
    }
  };
});

// --- helpers ---------------------------------------------------------------

function meta(html) {
  return _extractQuoteMeta(html);
}

// --- tests -----------------------------------------------------------------

test('US Gmail attribution with weekday extracts sender and date', () => {
  const m = meta(
    'On Mon, Apr 18, 2026 at 9:31 AM, Jane Doe &lt;jane@example.com&gt; wrote:'
  );

  expect(m.startsWith('Jane Doe jane@example.com')).toBe(true);
  expect(m.includes('Mon, Apr 18, 2026')).toBe(true);
});

test('Gmail attribution without time extracts sender', () => {
  const m = meta('On Wed, Jan 1, 2025, Jane wrote:');
  expect(m).toBe('Jane · Wed, Jan 1, 2025');
});

test('previously working formats still match', () => {
  // No weekday (single comma before the year)
  let m = meta('On Apr 18, 2026 at 9:31 AM, Jane Doe wrote:');
  expect(m.startsWith('Jane Doe · Apr 18, 2026')).toBe(true);

  // UK/intl day-before-month order
  m = meta(
    'On Mon, 18 Apr 2026 at 09:31, Jane Doe &lt;jane@example.com&gt; wrote:'
  );
  expect(m.startsWith('Jane Doe jane@example.com')).toBe(true);
});
