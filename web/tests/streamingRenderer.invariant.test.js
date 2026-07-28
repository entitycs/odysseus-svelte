import { beforeAll, describe, expect, test } from 'vitest';
import {
  mdToHtml,
  processWithThinking,
  squashOutsideCode,
} from '$lib/legacy/markdown.js';
import { splitFinalized } from '$lib/legacy/streamingSegmenter.js';

// --- renderer setup ---------------------------------------------------------

let render;
let renderLiveReply;
let renderMain;
function normalizeRender(html) {
  return String(html)
    .replace(/>\s*\n\s*</g, '><')
    .trim()
    .replace(/(mermaid|thinking)-\d+-\d+/g, '$1-X');
}
let RENDERERS = [];

// --- helpers ---------------------------------------------------------------

function simulate(text, prefixLengths, renderFn) {
  let committed = 0;
  let finalizedHtml = '';

  for (const len of prefixLengths) {
    const prefix = text.slice(0, len);
    const next = splitFinalized(prefix, renderFn, committed);

    expect(next).toBeGreaterThanOrEqual(committed);
    expect(next).toBeLessThanOrEqual(prefix.length);

    if (next > committed) {
      finalizedHtml += renderFn(prefix.slice(committed, next));
      committed = next;
    }

    const got = normalizeRender(
      finalizedHtml + renderFn(prefix.slice(committed)),
    );
    const want = normalizeRender(renderFn(prefix));

    expect(got).toEqual(want);
  }
}

const everyPrefix = (t) => Array.from({ length: t.length + 1 }, (_, i) => i);

function chunkAtWhitespace(t) {
  const lens = [];
  for (let i = 1; i <= t.length; i++) {
    if (i === t.length || /\s/.test(t[i - 1])) lens.push(i);
  }
  return lens.length ? lens : [t.length];
}

// --- main corpus tests -----------------------------------------------------

const CORPUS = [
  ['plain paragraph', 'Just a single sentence of text.'],
  ['two paragraphs', 'First paragraph here.\n\nSecond paragraph here.'],
  ['three paragraphs', 'Alpha block.\n\nBravo block.\n\nCharlie block.'],
  ['atx headings', '# Title\n\nIntro line.\n\n## Section\n\nBody text.'],
  ['setext heading', 'The Title\n=========\n\nA paragraph under it.'],
  [
    'inline formatting',
    'Some **bold**, *italic*, `code`, and a [link](https://x.com).',
  ],
  ['tight unordered list', '- one\n- two\n- three\n\ndone'],
  [
    'ordered list then text',
    'Before\n\n1. first\n2. second\n3. third\n\nAfter',
  ],
  ['loose list then paragraph', '- a\n\n- b\n\n- c\n\nClosing paragraph.'],
  [
    'nested list',
    '- top\n  - nested one\n  - nested two\n- back to top\n\nend',
  ],
  ['blockquote', '> quoted line one\n> quoted line two\n\nplain after'],
  ['thematic break', 'above the line\n\n---\n\nbelow the line'],
  [
    'python code fence',
    'Run this:\n\n```python\nprint("hi")\nfor i in range(3):\n    print(i)\n```\n\nThat prints numbers.',
  ],
  [
    'fence with blank lines inside',
    '```js\nconst a = 1;\n\nconst b = 2;\n```\n\nafter the code',
  ],
  [
    'two consecutive fences',
    '```\nfirst block\n```\n\n```\nsecond block\n```\n\ntail',
  ],
  [
    'mermaid diagram',
    'Diagram:\n\n```mermaid\ngraph TD\nA-->B\n```\n\nafter diagram',
  ],
  [
    'gfm table',
    'Data:\n\n| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n\nafter table',
  ],
  [
    'mixed document',
    '# Report\n\nIntro paragraph with a `symbol`.\n\n```python\nx = 1\n```\n\n- bullet one\n- bullet two\n\n> a quote\n\nFinal words.',
  ],
];

describe('streaming segmenter invariants', () => {
  render = (t) => mdToHtml(t);
  renderLiveReply = (t) => mdToHtml(squashOutsideCode(t));
  renderMain = (t) => processWithThinking(squashOutsideCode(t));

  RENDERERS = [
    ['mdToHtml', render],
    ['mdToHtml∘squashOutsideCode (live-reply path)', renderLiveReply],
    ['processWithThinking∘squashOutsideCode (main path)', renderMain],
  ];
  for (const [rname, renderFn] of RENDERERS) {
    for (const [name, text] of CORPUS) {
      test(`invariant — ${rname} — char-by-char — ${name}`, () => {
        simulate(text, everyPrefix(text), renderFn);
      });

      test(`invariant — ${rname} — whitespace-chunked — ${name}`, () => {
        simulate(text, chunkAtWhitespace(text), renderFn);
      });
    }
  }
});

// --- thinking corpus -------------------------------------------------------

const THINKING_CORPUS = [
  [
    'leading think then answer',
    '<think>Let me reason about it.</think>\n\nThe answer is 42.',
  ],
  [
    'think with internal blank lines',
    '<think>Step one.\n\nStep two.\n\nStep three.</think>\n\nDone — the result follows.',
  ],
  [
    'think then several paragraphs',
    '<thinking>analyzing the request</thinking>\n\nFirst point made here.\n\nSecond point made here.\n\nThird and final point.',
  ],
  [
    'think then code block',
    '<think>I should show code.</think>\n\nHere:\n\n```python\nprint("hi")\n```\n\nThat is the snippet.',
  ],
];

describe('thinking corpus invariants', () => {
  for (const [name, text] of THINKING_CORPUS) {
    test(`invariant (processWithThinking) — char-by-char — ${name}`, () => {
      simulate(text, everyPrefix(text), renderMain);
    });
  }
});

// --- final-output check ----------------------------------------------------

test('streamed-to-completion output equals full render for whole corpus', () => {
  for (const [_, text] of CORPUS) {
    let committed = 0;
    let html = '';

    for (let len = 1; len <= text.length; len++) {
      const next = splitFinalized(text.slice(0, len), render, committed);
      if (next > committed) {
        html += render(text.slice(committed, next));
        committed = next;
      }
    }

    html += render(text.slice(committed));

    expect(normalizeRender(html)).toEqual(normalizeRender(render(text)));
  }
});
