import { expect, test, describe, beforeEach, vi } from 'vitest';
import { isAltGrEvent, IS_MAC } from '$lib/legacy/platform.js';
import { _matchesCombo } from '$lib/legacy/keyboard-shortcuts.js';

// --- helpers ---------------------------------------------------------------

function makeEvent({
  ctrlKey = true,
  altKey = true,
  shiftKey = false,
  key = '',
  altgraph = false,
  hasModifierState = true
}) {
  const ev = { ctrlKey, altKey, shiftKey, key };

  if (hasModifierState) {
    ev.getModifierState = (m) => (m === 'AltGraph' ? altgraph : false);
  }

  return ev;
}

// --- navigator stubbing ----------------------------------------------------

// Reset the module registry before each IS_MAC test so that the
// module re-evaluates with whatever navigator we've stubbed.
beforeEach(() => {
  vi.resetModules();
});
// --- isAltGrEvent predicate -------------------------------------------------

test('isAltGrEvent: true for AltGr keystroke off mac', () => {
  const ev = makeEvent({ altgraph: true });
  expect(isAltGrEvent(ev, false)).toBe(true);
});

test('isAltGrEvent: false for genuine ctrl+alt', () => {
  const ev = makeEvent({ altgraph: false });
  expect(isAltGrEvent(ev, false)).toBe(false);
});

test('isAltGrEvent: false when AltGraph set but not ctrl+alt', () => {
  expect(isAltGrEvent(makeEvent({ altgraph: true, ctrlKey: false, altKey: false }), false)).toBe(false);
  expect(isAltGrEvent(makeEvent({ altgraph: true, ctrlKey: true, altKey: false }), false)).toBe(false);
  expect(isAltGrEvent(makeEvent({ altgraph: true, ctrlKey: false, altKey: true }), false)).toBe(false);
});

test('isAltGrEvent: false on mac even with AltGraph', () => {
  const ev = makeEvent({ altgraph: true });
  expect(isAltGrEvent(ev, true)).toBe(false);
});

test('isAltGrEvent: false when getModifierState missing', () => {
  const ev = makeEvent({ altgraph: false, hasModifierState: false });
  expect(isAltGrEvent(ev, false)).toBe(false);
});

// --- IS_MAC default ---------------------------------------------------------


test('IS_MAC: platform reports MacIntel', async () => {
  vi.stubGlobal('navigator', { platform: 'MacIntel', userAgent: '' });
  const { IS_MAC } = await import('$lib/legacy/platform.js');
  expect(IS_MAC).toBe(true);
});
test('IS_MAC: Apple Silicon still reports MacIntel', async () => {
  vi.stubGlobal('navigator', {
    platform: 'MacIntel',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  });
  const { IS_MAC } = await import('$lib/legacy/platform.js');
  expect(IS_MAC).toBe(true);
});
test('IS_MAC: userAgent fallback when platform blank', async () => {
  vi.stubGlobal('navigator', { platform: '', userAgent: 'Mozilla/5.0 (Macintosh; …)' });
  const { IS_MAC } = await import('$lib/legacy/platform.js');
  expect(IS_MAC).toBe(true);
});
test('IS_MAC: not mac on Windows', async () => {
  vi.stubGlobal('navigator', { platform: 'Win32', userAgent: 'Mozilla/5.0 (Windows NT 10.0)' });
  const { IS_MAC } = await import('$lib/legacy/platform.js');
  expect(IS_MAC).toBe(false);
});

// --- _matchesCombo integration ---------------------------------------------

test('AltGr keystroke does not trigger ctrl+alt shortcut', () => {
  const ev = makeEvent({ key: 'n', altgraph: true });
  expect(_matchesCombo(ev, 'ctrl+alt+n', false)).toBe(false);
});

test('genuine ctrl+alt still matches', () => {
  const ev = makeEvent({ key: 'n', altgraph: false });
  expect(_matchesCombo(ev, 'ctrl+alt+n', false)).toBe(true);
});

test('mac option combo still matches', () => {
  const ev = makeEvent({ key: 'n', altgraph: true });
  expect(_matchesCombo(ev, 'ctrl+alt+n', true)).toBe(true);
});

test('plain ctrl shortcut unaffected', () => {
  const ev = makeEvent({ key: 'k', altKey: false });
  expect(_matchesCombo(ev, 'ctrl+k', false)).toBe(true);
});
