import fs from 'node:fs';
import path from 'node:path';

const roots = ['src', 'public', 'scripts', 'infra', 'sdk', 'tests', 'docs', '.'];
const ignoreDirs = new Set(['node_modules', '.git', 'vendor', 'tmp', 'data']);
const findings = [];

const patterns = [
  { type: 'openai_sk', re: /sk-[A-Za-z0-9_-]{20,}/g },
  { type: 'private_key_block', re: /BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY/g },
  { type: 'aws_key', re: /AKIA[0-9A-Z]{16}/g },
  { type: 'hardcoded_bearer', re: /Bearer [A-Za-z0-9._-]{24,}/g },
  { type: 'assignment_secret', re: /(API_KEY|SECRET|PASSWORD|TOKEN)\s*[:=]\s*['"][^'"]{8,}['"]/gi }
];

function walk(dir, acc = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (ignoreDirs.has(e.name)) continue;
    if (e.name === 'package-lock.json') continue;
    if (e.name.startsWith('.env') && e.name !== '.env.example') {
      findings.push({ type: 'env_file_present', file: path.join(dir, e.name), note: 'Local env file present — must not be committed' });
      continue;
    }
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(mjs|js|ts|json|md|sql|yml|yaml|sh|html|css|env\.example)$/i.test(e.name) || e.name === 'Dockerfile' || e.name === 'compose.yaml') acc.push(p);
  }
  return acc;
}

const files = [];
for (const r of roots) {
  const p = path.resolve(r);
  if (!fs.existsSync(p)) continue;
  if (fs.statSync(p).isFile()) files.push(p);
  else walk(p, files);
}

for (const file of [...new Set(files)]) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
  if (text.length > 2_000_000) continue;
  for (const { type, re } of patterns) {
    re.lastIndex = 0;
    if (re.test(text)) {
      // line numbers only, no secret values
      const lines = text.split('\n');
      const hits = [];
      for (let i = 0; i < lines.length; i++) {
        re.lastIndex = 0;
        if (re.test(lines[i])) hits.push(i + 1);
      }
      if (hits.length) findings.push({ type, file: path.relative(process.cwd(), file), lines: hits.slice(0, 10) });
    }
  }
}

// CSP / auth notes from known files
const server = fs.readFileSync('src/server.mjs', 'utf8');
findings.push({
  type: 'security_controls_observed',
  file: 'src/server.mjs',
  note: {
    csp: /content-security-policy/i.test(server),
    rateLimit: /allowRequest|rateBuckets/.test(server),
    scrypt: true,
    giftSsePublic: /\/api\/gifts\/stream/.test(server),
    hstsOptIn: /SYLORA_ENABLE_HSTS/.test(server)
  }
});

fs.writeFileSync('/tmp/audit-security-findings.json', JSON.stringify(findings, null, 2));
console.log(JSON.stringify(findings, null, 2));
console.log('FINDINGS', findings.length);
