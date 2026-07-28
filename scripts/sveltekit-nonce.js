// scripts/patch-sveltekit-nonce.js
// Post-build: inject nonce="%sveltekit.nonce%" into the SvelteKit bootstrap
// <script> tag inside web-build/index.html so FastAPI can replace it at
// serve time (same pattern as {{CSP_NONCE}} in the legacy shell).

// Notice (nonce):
// If the bootstrap script format changes across SvelteKit versions,
// the regex won't match and the script will be blocked

import { readFileSync, writeFileSync } from 'node:fs';

const path = 'web-build/200.html';
const html = readFileSync(path, 'utf8');

// SvelteKit emits exactly one bare <script> block containing __sveltekit_
const patched = html.replace(
  /<script>\s*\{[\s\S]*?__sveltekit_/,
  (match) => match.replace('<script>', '<script nonce="%sveltekit.nonce%">'),
  // replaced in backend. see app.py _serve_html_with_nonce
);

if (patched === html) {
  console.error(
    '[patch-sveltekit-nonce] ERROR: Bootstrap script not found — build aborted.',
  );
  process.exit(1); // <-- fail loudly so CI/CD catches it
} else {
  writeFileSync(path, patched, 'utf8');
  console.log(
    '[patch-sveltekit-nonce] Patched web-build/index.html with nonce placeholder.',
  );
}
