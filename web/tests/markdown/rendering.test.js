import { expect, test } from 'vitest';
import {
  extractThinkingBlocks,
  mdToHtml,
  processWithThinking,
} from '$lib/legacy/markdown';
import {} from '../../lib/legacy/emojiShortcodes';

globalThis.window = { location: { origin: 'http://localhost' }, katex: null };

function runCase(markdown, expr = 'mod.mdToHtml(input)', withKatex = false) {
  let res = '';
  if (expr == null){
    expr = 'mod.mdToHtml(input)';
  }
  if (withKatex) {
    // Minimal stand-in for the CDN katex global: wraps the source so tests
    // can assert what was (or wasn't) handed to KaTeX.
    const katexStub = {
      renderToString(src, opts) {
        const display = !!(opts && opts.displayMode);
        return `<span class="katex" data-display="${display}">${src}</span>`;
      },
    };
    globalThis.window.katex = katexStub;
    globalThis.katex = katexStub;
  }
  let exprResult = '';
  switch (expr) {
    case 'mod.mdToHtml(input)':
      exprResult = mdToHtml(markdown);
      break;
    case 'mod.processWithThinking(input)':
      exprResult = processWithThinking(markdown);
      break;
    case 'mod.extractThinkingBlocks(input)':
      exprResult = extractThinkingBlocks(markdown);
      break;
    default:
      break;
  }
  return JSON.stringify({ html: exprResult });
}
globalThis.document = {
  readyState: 'loading',
  addEventListener() {},
  createElement(tag) {
    if (tag !== 'template') throw new Error(`unsupported element: ${tag}`);
    return {
      _html: '',
      content: {
        querySelectorAll() {
          return [];
        },
      },
      set innerHTML(value) {
        this._html = value;
      },
      get innerHTML() {
        return this._html;
      },
    };
  },
};
globalThis.MutationObserver = class {
  observe() {}
};

test('firstTest', () => {
  let html = runCase(
    'Before\n\n' +
      "1. **Check against the home page** — that's the visual reference for how things should feel.\n" +
      '2. **Open DevTools** and inspect the element — check fonts, colors, and spacing against this guide.\n' +
      "3. **Flag it** — note the page, the section, what's wrong, and what CSS rule you suspect.\n" +
      '4. **Small fixes** — if you know the fix (e.g. wrong CSS variable, wrong font), go ahead and change it in the CSS Module file.\n' +
      '5. **Big changes** — Talk it through before making wide changes across many pages.\n\n' +
      'After',
  );

  expect([...html.matchAll('<ol>')]).toHaveLength(1);
  expect([...html.matchAll('<li>')]).toHaveLength(5);
  expect(html).not.contains('<ul>');
  expect(html).not.contains('<oli>');
  expect(html).not.contains('<uli>');
  expect(html).not.contains('<p><ol>');
  expect(html).not.contains('<p><li>');
  expect(html).contains('<p>Before</p>');
  expect(html).contains('<p>After</p>');
});

test('testTwo', () => {
  let html = runCase('| A | B |\n|---|---|\n| 1 | 2 |');

  expect([...html.matchAll('<tr>')]).toHaveLength(2);
  expect(html).contains('<th');
  expect(html).contains('<td');
  expect(html).not.contains('---');
});

test('test_process_with_thinking_handles_gemma4_thought_channel', () => {
  let html = runCase(
    '<|channel>thought\ninternal reasoning<channel|>Final answer.',
    'mod.processWithThinking(input)',
  );

  expect(html).contains('thinking-section');
  expect(html).contains('internal reasoning');
  expect(html).contains('Final answer.');
  expect(html).not.contains('&lt;|channel&gt;');
  expect(html).not.contains('<|channel>');
});

test('test_process_with_thinking_strips_empty_gemma4_thought_channel', () => {
  let html = runCase(
    '<|channel>thought\n<channel|>Final answer.',
    'mod.processWithThinking(input)',
  );

  expect(html).not.contains('thinking-section');
  expect(html).contains('Final answer.');
  expect(html).not.contains('&lt;|channel&gt;');
  expect(html).not.contains('<|channel>');
});

test('test_process_with_thinking_unwraps_gemma4_response_channel', () => {
  let html = runCase(
    '<|channel>thought\ninternal reasoning<channel|><|channel>response\nFinal answer.<channel|>',
    'mod.processWithThinking(input)',
  );

  expect(html).contains('thinking-section');
  expect(html).contains('internal reasoning');
  expect(html).contains('Final answer.');
  expect(html).not.contains('&lt;|channel&gt;');
  expect(html).not.contains('<|channel>');
});

test('test_extract_thinking_blocks_handles_thought_tag', () => {
  let result = JSON.parse(
    runCase(
      '<thought>internal reasoning</thought>Final answer.',
      'mod.extractThinkingBlocks(input)',
    ),
  );
  console.log('test extract', result);
  expect(result.html['thinkingBlocks'][0] == 'internal reasoning').toBe(true);
  expect(result.html['content'] == 'Final answer.').toBe(true);
});

test('test_url_inside_inline_code_is_not_autolinked', () => {
  //  A URL inside a backtick span is preceded by a space, so the bare-URL
  //  autolink used to wrap it in an <a> tag (then swap it for an
  //  ___ALLOWED_HTML_ placeholder), corrupting the command shown to the user.
  let html = runCase('Run `$j = irm http://127.0.0.1:3000/x` to fetch.');

  expect(html).contains('<code>$j = irm http://127.0.0.1:3000/x</code>');
  expect(html).not.contains('___ALLOWED_HTML_');
  expect(html).not.contains('<a ');
  expect(html).not.contains('href="http://127.0.0.1:3000/x"');
});

test('test_url_outside_inline_code_is_still_autolinked', () => {
  // Inline code must not disable autolinking for bare URLs elsewhere in the
  // same line.
  let html = runCase('Use `irm` then visit https://example.com/page now.');
  console.log('check for href: ', html);
  expect(html).contains('<code>irm</code>');
  expect(html).contains('href=\\"https://example.com/page\\"');
});

// Inline code is now extracted before the global escape pass, so it must be
// escaped at extraction time (matching the fenced-code-block handling).
test('test_inline_code_content_is_html_escaped', () => {
  let html = runCase("Render `<b>$1 & 'q'</b>` literally.");

  expect(html).contains('<code>&lt;b&gt;$1 &amp; &#39;q&#39;&lt;/b&gt;</code>');
  expect(html).not.contains('<b>');
});

// `` $` `` and `$'` splice the text before/after the placeholder into the
// block. Unlike `$&` these leave no placeholder behind — the characters just
// vanish — so assert the content survives verbatim.
test('test_fenced_code_keeps_dollar_backtick_and_quote', () => {
  let html = runCase('```sh\nsed "s/$`/x/" && sed "s/$\'/y/"\n```');

  expect(html).not.contains('___CODE_BLOCK_');
  expect(html).contains('s/$`/x/');
  expect(html).contains('s/$&#39;/y/');
});

// `$$` collapsed to a single `$` in the restored block.
test('test_fenced_code_keeps_double_dollar', () => {
  let html = runCase('```sh\necho "$$USD and $$"\n```');

  expect(html).contains('$$USD and $$');
});

// The mermaid restore site had the same hazard: a node label containing `$&`
// re-inserted the ___MERMAID_BLOCK_n___ placeholder into the diagram source,
// which then fails to parse. The math and allowed-HTML sites are fixed the
// same way; they need KaTeX/sanitizer conditions this harness doesn't set up.
test('test_mermaid_block_keeps_dollar_ampersand', () => {
  let html = runCase('```mermaid\ngraph TD; A["$&"] --> B;\n```');

  expect(html).not.contains('___MERMAID_BLOCK_');
  expect(html).contains('$&amp;');
});

// Issue #5663: the block-restore pass used a string replacement, so `$&` in a
// restored block was read as "the matched text" and re-inserted the
// placeholder. `perl -pe 's/world/$& again/'` rendered as
// "s/world/___CODE_BLOCK_0___amp; again/" — the trailing "amp;" is the orphan
// left behind after `$&` consumed the `$&` of the escaped `$&amp;`.
test('test_fenced_code_keeps_dollar_ampersand', () => {
  let html = JSON.parse(
    runCase('```sh\necho "hello world" | perl -pe \'s/world/$& again/\'\n```'),
  ).html;
  expect(html).not.contains('___CODE_BLOCK_');
  expect(html).contains('s/world/$&amp; again/');
  let dollaramp = html.replaceAll('$&amp; again', '');
  console.log('test fenced', dollaramp);
  expect(dollaramp).not.contains('amp; again');
});

// `` $` `` and `$'` splice the text before/after the placeholder into the
// block. Unlike `$&` these leave no placeholder behind — the characters just
// vanish — so assert the content survives verbatim.
test('test_fenced_code_keeps_dollar_backtick_and_quote', () => {
  let html = runCase('```sh\nsed "s/$`/x/" && sed "s/$\'/y/"\n```');

  expect(html).not.contains('___CODE_BLOCK_');
  expect(html).contains('s/$`/x/');
  expect(html).contains('s/$&#39;/y/');
});

// `$$` collapsed to a single `$` in the restored block.
test('test_fenced_code_keeps_double_dollar', () => {
  let html = runCase('```sh\necho "$$USD and $$"\n```');

  expect(html).contains('$$USD and $$');
});

// The mermaid restore site had the same hazard: a node label containing `$&`
// re-inserted the ___MERMAID_BLOCK_n___ placeholder into the diagram source,
// which then fails to parse. The math and allowed-HTML sites are fixed the
// same way; they need KaTeX/sanitizer conditions this harness doesn't set up.
test('test_mermaid_block_keeps_dollar_ampersand', () => {
  let html = runCase('```mermaid\ngraph TD; A["$&"] --> B;\n```');

  expect(html).not.contains('___MERMAID_BLOCK_');
  expect(html).contains('$&amp;');
});

// "$5 to $10" used to pair the two dollar signs as inline-math delimiters
// and render "5 to" through KaTeX. Pandoc-style rules now reject it: the
// closing $ is preceded by a space and followed by a digit.
test('test_currency_dollar_amounts_are_not_rendered_as_math', () => {
  let html = runCase('The price rose from $5 to $10 overnight.', null, true);
  console.log('test concurrency', html);
  expect(html).not.contains('class="katex"');
  expect(html).contains('$5');
  expect(html).contains('$10');
});

test('test_inline_math_still_renders_through_katex', () => {
  let html = JSON.parse  (runCase('Pythagoras: $x^2 + y^2 = z^2$ holds.', null, true)).html;
    console.log("test inline math", html);
  expect(html).contains(
    '<span class="katex" data-display="false">x^2 + y^2 = z^2</span>',
  );
  expect(html).not.contains('$');
});

test('test_display_math_still_renders_through_katex', () => {
  let html = JSON.parse  (runCase('$$\\frac{a}{b}$$', null, true)).html;

  expect(html).contains('data-display="true"');
  expect(html).not.contains('$$');
});

test('test_dotted_python_import_paths_are_not_autolinked', () => {
  let html = JSON.parse  (
    runCase(
      'from imblearn.combine import SMOTETomek\n' +
        'from sklearn.metrics import f1_score\n' +
        'from sklearn.compose import ColumnTransformer\n\n' +
        'See example.com/docs for normal domain autolinking.',
    ),
  ).html;

  expect(html).not.contains('___ALLOWED_HTML_');
  expect(html).contains('imblearn.combine');
  expect(html).contains('sklearn.metrics');
  expect(html).contains('sklearn.compose');
  expect(html).not.contains('href="https://imblearn.com');
  expect(html).not.contains('href="https://sklearn.me');
  expect(html).contains('href="https://example.com/docs"');
});
