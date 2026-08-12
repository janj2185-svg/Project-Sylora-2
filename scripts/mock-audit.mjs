#!/usr/bin/env node
/** Scan repository for mock/stub/demo markers — classification aid, not a linter. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const patterns = [
  { re: /\bmock\b/i, kind: 'mock' },
  { re: /\bstub\b/i, kind: 'stub' },
  { re: /\bfake\b/i, kind: 'fake' },
  { re: /\bdemo\b/i, kind: 'demo' },
  { re: /\bplaceholder\b/i, kind: 'placeholder' },
  { re: /\bTODO\b/, kind: 'todo' },
  { re: /\bFIXME\b/, kind: 'fixme' },
  { re: /BLOCKED_EXTERNAL|architecture_stub|blocked_provider/i, kind: 'blocked' }
];
const skip = new Set(['node_modules', '.git', 'public/vendor', 'data', '.deploy-backup']);
const exts = new Set(['.mjs', '.js', '.ts', '.tsx', '.jsx', '.html', '.css', '.md']);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (skip.has(name) || name.startsWith('.deploy-backup')) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (exts.has(path.extname(name))) out.push(p);
  }
  return out;
}

const hits = [];
for (const file of walk(root)) {
  const rel = path.relative(root, file);
  if (rel.startsWith('tests/') && rel.includes('mock')) continue;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const { re, kind } of patterns) {
      if (re.test(line)) {
        hits.push({ file: rel, line: i + 1, kind, text: line.trim().slice(0, 120) });
        break;
      }
    }
  });
}

const byKind = {};
for (const h of hits) (byKind[h.kind] = byKind[h.kind] || []).push(h);
console.log(JSON.stringify({ total: hits.length, byKind: Object.fromEntries(Object.entries(byKind).map(([k, v]) => [k, v.length])) }, null, 2));
for (const [kind, list] of Object.entries(byKind).sort()) {
  console.log(`\n## ${kind} (${list.length})`);
  for (const h of list.slice(0, 15)) console.log(`${h.file}:${h.line}  ${h.text}`);
  if (list.length > 15) console.log(`... +${list.length - 15} more`);
}
