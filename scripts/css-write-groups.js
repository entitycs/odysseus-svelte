import * as csstree from 'css-tree';
import fs from 'fs';
import path from 'path';

const FILE = 'static/style.css';
const OUTPUT_DIR = 'static/css/grouped';
const CLEANED_FILE = 'static/css/style.css';
const THRESHOLD = 250;

const css = fs.readFileSync(FILE, 'utf8');
const ast = csstree.parse(css, { positions: true });

function captureLeadingComments(css, startOffset) {
  let i = startOffset;

  // Move upward while we see whitespace or comments
  while (i > 0) {
    // Look backward for a comment ending at i
    const commentEnd = css.lastIndexOf('*/', i);
    if (commentEnd !== -1) {
      const commentStart = css.lastIndexOf('/*', commentEnd);
      if (commentStart !== -1 && commentStart < startOffset) {
        // Check if everything between commentEnd and startOffset is whitespace
        const between = css.slice(commentEnd + 2, startOffset);
        if (/^\s*$/.test(between)) {
          startOffset = commentStart;
          i = commentStart;
          continue;
        }
      }
    }

    // If the character before startOffset is whitespace, include it
    if (/\s/.test(css[startOffset - 1])) {
      startOffset--;
      i--;
      continue;
    }

    break;
  }

  return startOffset;
}

// Collect all comment nodes with offsets
const comments = [];
csstree.walk(ast, {
  visit: 'Comment',
  enter(node) {
    comments.push(node.loc);
  },
});

function countLines(loc) {
  return loc.end.line - loc.start.line + 1;
}

function extractSource(loc) {
  return css.slice(loc.start.offset, loc.end.offset);
}

const results = [];

// ------------------------------
// TOP-LEVEL RULE DETECTION
// ------------------------------
function isTopLevel(node) {
  return ast.children.toArray().includes(node);
}

// ------------------------------
// ANALYSIS
// ------------------------------
function analyzeRule(node) {
  if (!isTopLevel(node)) return; // skip nested rules

  const selector = csstree.generate(node.prelude);

  let declarations = 0;
  let nestedRules = 0;

  csstree.walk(node.block, {
    visit: 'Declaration',
    enter() {
      declarations++;
    },
  });

  csstree.walk(node.block, {
    visit: 'Rule',
    enter() {
      nestedRules++;
    },
  });

  results.push({
    selector,
    declarations,
    nestedRules,
    lines: countLines(node.loc),
    type: 'Rule',
    loc: node.loc,
    source: extractSource(node.loc),
  });
}

function analyzeAtrule(node) {
  if (!isTopLevel(node)) return; // skip nested at-rules

  const name =
    `@${node.name} ${node.prelude ? csstree.generate(node.prelude) : ''}`.trim();

  results.push({
    selector: name,
    declarations: 0,
    nestedRules: 0,
    lines: countLines(node.loc),
    type: 'Atrule',
    loc: node.loc,
    source: extractSource(node.loc),
  });
}

// Top-level analysis
for (const node of ast.children) {
  if (node.type === 'Rule') analyzeRule(node);
  if (node.type === 'Atrule') analyzeAtrule(node);
}

// ------------------------------
// GROUPING LOGIC
// ------------------------------
function getPrefix(selector) {
  if (!(selector.startsWith('.') || selector.startsWith('#'))) return null;

  const clean = selector.split(':')[0].split('::')[0];
  const first = clean.split(',')[0];
  const name = first.slice(1);

  const dashIndex = name.indexOf('-');
  if (dashIndex === -1) return name;

  return name.slice(0, dashIndex);
}

const groups = {};

for (const r of results) {
  const prefix = getPrefix(r.selector);
  if (!prefix) continue;

  if (!groups[prefix]) groups[prefix] = [];
  groups[prefix].push(r);
}

// ------------------------------
// COMMENT-AWARE REMOVAL RANGES
// ------------------------------
let removalRanges = [];

for (const [prefix, items] of Object.entries(groups)) {
  const totalLines = items.reduce((sum, r) => sum + r.lines, 0);
  if (totalLines <= THRESHOLD) continue;

  for (const item of items) {
    let startOffset = item.loc.start.offset;

    // ⭐ STEP 1 — extend upward to include comments
    const extendedStart = captureLeadingComments(css, startOffset);

    // Save extended start for grouped output
    item.extendedStart = extendedStart;

    // Use extended start for removal
    removalRanges.push({
      start: extendedStart,
      end: item.loc.end.offset,
    });
  }
}

removalRanges.sort((a, b) => a.start - b.start);

// ------------------------------
// BUILD CLEANED CSS
// ------------------------------
let cleanedCSS = '';
let cursor = 0;

for (const range of removalRanges) {
  cleanedCSS += css.slice(cursor, range.start);
  cursor = range.end;
}

cleanedCSS += css.slice(cursor);

// ------------------------------
// INSERT IMPORTS
// ------------------------------
let importStatements = [];

for (const [prefix, items] of Object.entries(groups)) {
  const totalLines = items.reduce((sum, r) => sum + r.lines, 0);
  if (totalLines > THRESHOLD) {
    importStatements.push(`@import "./grouped/${prefix}.css";`);
  }
}

cleanedCSS = importStatements.join('\n') + '\n\n' + cleanedCSS;

// ------------------------------
// WRITE EXTRACTED FILES
// ------------------------------
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

for (const [prefix, items] of Object.entries(groups)) {
  const totalLines = items.reduce((sum, r) => sum + r.lines, 0);
  if (totalLines <= THRESHOLD) continue;

  const filePath = path.join(OUTPUT_DIR, `${prefix}.css`);
  const combined = items
    .map(
      (item) =>
        css.slice(item.extendedStart, item.loc.end.offset).trim() + '\n',
    )
    .join('\n');

  fs.writeFileSync(filePath, combined, 'utf8');
  console.log(`Extracted ${prefix} → ${filePath} (${totalLines} lines)`);
}

// ------------------------------
// WRITE CLEANED FILE
// ------------------------------
fs.writeFileSync(CLEANED_FILE, cleanedCSS, 'utf8');
console.log(`\nWrote cleaned CSS → ${CLEANED_FILE}`);
console.log('Extraction + strict top-level + comment-aware cleaning complete.');
