import fs from "fs";
import path from "path";

const INDEX = "static/css/index.css";
const COMBINED = "static/css/combined.css";
const DRY_RUN = process.argv.includes("--dry-run");

// Read index.css to get ordered module list
const indexContent = fs.readFileSync(INDEX, "utf8");
const importRegex = /@import url\("([^"]+)"\);/g;

const modules = [...indexContent.matchAll(importRegex)].map(match =>
  match[1].replace(/^\/static\//, "static/")
);

if (modules.length === 0) {
  console.error("ERROR: No @import statements found in index.css");
  process.exit(1);
}

console.log("Modules detected in index.css:");
modules.forEach(m => console.log("  -", m));

// Read combined.css
const combined = fs.readFileSync(COMBINED, "utf8");

// Helper to extract a block between START/END markers
function extractBlock(content, modulePath) {
  const startMarker = `/* ===== START ${modulePath} ===== */`;
  const endMarker = `/* ===== END ${modulePath} ===== */`;

  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    throw new Error(
      `Missing markers for ${modulePath}\n` +
      `Expected:\n${startMarker}\n${endMarker}`
    );
  }

  const blockStart = startIndex + startMarker.length;
  const blockEnd = endIndex;

  return content.slice(blockStart, blockEnd).trim() + "\n";
}

// Process each module in order
for (const modulePath of modules) {
  console.log(`\nProcessing: ${modulePath}`);

  const cssChunk = extractBlock(combined, modulePath);

  const targetFile = path.resolve(modulePath);

  if (DRY_RUN) {
    console.log(`DRY RUN: Would write ${cssChunk.length} chars → ${targetFile}`);
  } else {
    fs.writeFileSync(targetFile, cssChunk);
    console.log(`Updated: ${targetFile}`);
  }
}

console.log("\nReverse merge complete.");
if (DRY_RUN) console.log("Dry run mode: no files were written.");

