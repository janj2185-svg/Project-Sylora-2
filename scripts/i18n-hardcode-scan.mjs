#!/usr/bin/env node
/**
 * Heuristic scanner for hardcoded user-facing strings in public/*.js
 * Helps catch mixed UA/PL/EN/DE leftovers outside i18n catalogs.
 * Exit 0 always (advisory) unless --strict and findings > 0.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('public');
const files = ['app.js', 'create-hub.js', 'command-palette.js']
  .map(f => path.join(root, f))
  .filter(f => fs.existsSync(f));

const cyrillic = /[А-Яа-яІіЇїЄєҐґ]/;
const polish = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
// UI string literals assigned to textContent/innerHTML/toast/placeholder roughly
const literalRe = /(?:=|>|\(|,)\s*[`'"]([^`'"]{8,120})[`'"]/g;

const findings = [];
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    if (line.includes("t('") || line.includes('t("') || line.includes('esc(t(')) return;
    if (line.includes('//') && line.trim().startsWith('//')) return;
    let m;
    const re = new RegExp(literalRe);
    while ((m = re.exec(line))) {
      const s = m[1];
      if (!cyrillic.test(s) && !polish.test(s)) continue;
      if (/^[A-Z_]+$/.test(s)) continue;
      findings.push({ file: path.relative(process.cwd(), file), line: i + 1, sample: s.slice(0, 80) });
    }
  });
}

const byFile = findings.reduce((acc, f) => {
  acc[f.file] = (acc[f.file] || 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify({
  advisory: true,
  total: findings.length,
  byFile,
  sample: findings.slice(0, 40),
  note: 'Migrate findings into public/i18n.js locale catalogs (UA/PL/EN/DE first).'
}, null, 2));

if (process.argv.includes('--strict') && findings.length) process.exit(1);
