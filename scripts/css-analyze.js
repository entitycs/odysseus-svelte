import * as csstree from 'css-tree';
import fs from 'fs';

const FILE = 'static/style.css';
const css = fs.readFileSync(FILE, 'utf8');

const ast = csstree.parse(css, { positions: true });

function countLines(loc) {
  if (!loc || !loc.start || !loc.end) return 0;
  return loc.end.line - loc.start.line + 1;
}

const results = [];

// Analyze a normal CSS rule
function analyzeRule(node) {
  const selector = csstree.generate(node.prelude);

  let declarations = 0;
  let nestedRules = 0;

  // Count declarations
  csstree.walk(node.block, {
    visit: 'Declaration',
    enter() {
      declarations++;
    },
  });

  // Count nested rules
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
  });
}

// Analyze an at-rule (and its children)
function analyzeAtrule(node) {
  const name =
    `@${node.name} ${node.prelude ? csstree.generate(node.prelude) : ''}`.trim();

  results.push({
    selector: name,
    declarations: 0,
    nestedRules: 0,
    lines: countLines(node.loc),
    type: 'Atrule',
  });

  if (node.block && node.block.children) {
    for (const child of node.block.children) {
      if (child.type === 'Rule') analyzeRule(child);
      if (child.type === 'Atrule') analyzeAtrule(child);
    }
  }
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
  // Only group class and ID selectors
  if (!(selector.startsWith('.') || selector.startsWith('#'))) return null;

  // Remove pseudo-classes/elements
  const clean = selector.split(':')[0].split('::')[0];

  // Handle comma-separated selectors: take first
  const first = clean.split(',')[0];

  // Remove leading . or #
  const name = first; //first.slice(1);

  // Prefix = everything before first dash
  const dashIndex = name.indexOf('-');
  if (dashIndex === -1) return name;

  return name.slice(0, dashIndex);
}

const groups = {};

for (const r of results) {
  const prefix = getPrefix(r.selector);
  if (!prefix) continue; // skip non-class/ID selectors

  if (!groups[prefix]) groups[prefix] = [];
  groups[prefix].push(r);
}

// Sort groups by total lines
const sortedGroups = Object.entries(groups).sort((a, b) => {
  const totalA = a[1].reduce((sum, r) => sum + r.lines, 0);
  const totalB = b[1].reduce((sum, r) => sum + r.lines, 0);
  return totalB - totalA;
});

// ------------------------------
// OUTPUT
// ------------------------------

console.log('=== Grouped CSS Rule Analysis ===\n');

for (const [prefix, items] of sortedGroups) {
  const totalLines = items.reduce((sum, r) => sum + r.lines, 0);

  console.log(`\n## Group: ${prefix}  (total lines: ${totalLines})`);
  console.log('----------------------------------------');

  for (const r of items) {
    if (r.declarations > 30)
      console.log(
        `${r.selector} (${r.type})\n` +
          `  lines: ${r.lines}\n` +
          `  declarations: ${r.declarations}\n` +
          `  nested rules: ${r.nestedRules}\n`,
      );
  }
}
