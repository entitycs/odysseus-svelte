import fs from "fs";
import path from "path";

const INDEX = "static/css/index.css";
const OUTPUT = "static/css/combined.css";

// Read index.css
const indexContent = fs.readFileSync(INDEX, "utf8");

// Match: @import url("…");
const importRegex = /@import url\("([^"]+)"\);/g;

let combined = "";

// Loop through each @import in order
for (const match of indexContent.matchAll(importRegex)) {
  // Extract the path inside the import
  const importPath = match[1].replace(/^\/static\//, "static/");
  const filePath = path.resolve(importPath);

  // Read the module file
  const css = fs.readFileSync(filePath, "utf8");

  // Add START/END markers
  combined += `/* ===== START ${importPath} ===== */\n`;
  combined += css + "\n";
  combined += `/* ===== END ${importPath} ===== */\n\n`;
}

// Write the combined output
fs.writeFileSync(OUTPUT, combined);

console.log("Combined CSS written to:", OUTPUT);

