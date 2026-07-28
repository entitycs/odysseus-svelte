import { expect, test, beforeEach } from 'vitest';
import { _extractQuoteMeta } from '$lib/legacy/emailLibrary/signatureFold.js';

// Minimal DOM stub — identical behavior to the Python harness
beforeEach(() => {
  globalThis.document = {
    createElement() {
      return {
        _text: '',
        set textContent(value) {
          this._text = value;
        },
        get innerHTML() {
          return this._text || '';
        }
      };
    }
  };
});

// --- helpers ---------------------------------------------------------------

function extract(html) {
  return _extractQuoteMeta(html);
}

// --- tests -----------------------------------------------------------------

test('extractQuoteMeta ignores non-string inputs', () => {
  const values = {
    nullValue: extract(null),
    objectValue: extract({ bad: true })
  };

  expect(values).toEqual({
    nullValue: '',
    objectValue: ''
  });
});

test('extractQuoteMeta keeps Outlook headers', () => {
  const html =
    'From: Alice <alice@example.com> Sent: Monday, May 4, 2026 To: Bob Subject: hi';

  const meta = extract(html);

  expect(meta).toBe('Alice · Monday, May 4, 2026');
});
