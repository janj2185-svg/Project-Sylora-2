import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync('public/app.js', 'utf8');
const spa = app.match(/SPA_SHELL_VIEWS\s*=\s*new Set\(\[([^\]]+)\]\)/);
console.log('=== SPA_SHELL_VIEWS ===');
console.log(spa?.[1]?.replace(/['"`]/g, '').replace(/\s+/g, ' '));

const renders = [...app.matchAll(/function (render\w+)\(/g)].map((m) => m[1]);
console.log('\n=== render functions ===');
console.log(renders.join('\n'));

const navTargets = [...app.matchAll(/nav\((['"`])(\w+)\1\)/g)].map((m) => m[2]);
console.log('\n=== nav() targets ===');
console.log([...new Set(navTargets)].sort().join(', '));

const dataViews = [...app.matchAll(/data-view=(['"`])(\w+)\1/g)].map((m) => m[2]);
console.log('\n=== data-view attrs in app.js ===');
console.log([...new Set(dataViews)].sort().join(', '));

const index = fs.readFileSync('public/index.html', 'utf8');
const navButtons = [...index.matchAll(/data-view=(['"`])(\w+)\1/g)].map((m) => m[2]);
console.log('\n=== nav data-view in index.html ===');
console.log([...new Set(navButtons)].sort().join(', '));

const apiCalls = [...app.matchAll(/api\((['"`])([^'"`]+)\1/g)].map((m) => m[2]);
const fetchCalls = [...app.matchAll(/fetch\((['"`])([^'"`]+)\1/g)].map((m) => m[2]);
console.log('\n=== frontend api() calls ===');
console.log([...new Set(apiCalls)].sort().join('\n'));
console.log('\n=== frontend fetch() paths ===');
console.log([...new Set(fetchCalls)].sort().join('\n'));

const files = [
  'src/server.mjs',
  'src/ecosystem/routes.mjs',
  'src/companion.mjs'
];
const routes = new Map();
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  for (const m of t.matchAll(/(?:p\s*===\s*|route\()\s*(['"`])(\/api\/[^'"`]+)\1/g)) {
    const p = m[2];
    if (!routes.has(p)) routes.set(p, new Set());
    routes.get(p).add(f);
  }
  for (const m of t.matchAll(/method\s*===\s*(['"`])(GET|POST|PATCH|PUT|DELETE)\1[\s\S]{0,120}?p\s*===\s*(['"`])(\/api\/[^'"`]+)\3/g)) {
    // ignore; covered above
  }
}
console.log('\n=== API route strings count ===', routes.size);
[...routes.keys()].sort().forEach((p) => console.log(p, '::', [...routes.get(p)].join(',')));

// Method+path extraction more carefully from server
function extractMethodRoutes(file) {
  const t = fs.readFileSync(file, 'utf8');
  const out = [];
  const re = /req\.method\s*===\s*['"`](GET|POST|PATCH|PUT|DELETE)['"`]\s*&&\s*(?:p\s*===\s*['"`](\/api\/[^'"`]+)['"`]|(\w+)\s*=\s*route\(\s*['"`](\/api\/[^'"`]+)['"`])/g;
  let m;
  while ((m = re.exec(t))) {
    out.push({ method: m[1], path: m[2] || m[4], file });
  }
  // also if(req.method==='X'&&p==='/api/...') compact style
  const re2 = /if\s*\(\s*req\.method\s*===\s*['"`](GET|POST|PATCH|PUT|DELETE)['"`]\s*&&\s*p\s*===\s*['"`](\/api\/[^'"`]+)['"`]/g;
  while ((m = re2.exec(t))) out.push({ method: m[1], path: m[2], file });
  const re3 = /if\s*\(\s*req\.method\s*===\s*['"`](GET|POST|PATCH|PUT|DELETE)['"`]\s*&&\s*\w+\s*\)/g;
  return out;
}

const methodRoutes = [...extractMethodRoutes('src/server.mjs'), ...extractMethodRoutes('src/ecosystem/routes.mjs')];
console.log('\n=== METHOD ROUTES (partial regex) ===', methodRoutes.length);
methodRoutes.forEach((r) => console.log(r.method, r.path));

// Avatar / three.js usage
console.log('\n=== Avatar clues in public ===');
for (const f of fs.readdirSync('public').filter((x) => x.endsWith('.js') || x.endsWith('.css') || x.endsWith('.html'))) {
  const t = fs.readFileSync(path.join('public', f), 'utf8');
  if (/three|gltf|fbx|blendshape|lipsync|avatar|WebGL|canvas/i.test(t)) {
    const hits = [...t.matchAll(/gltf|fbx|blendshape|lipsync|avatar|THREE|WebGL|getUserMedia|RTCPeerConnection/gi)].map((x) => x[0]);
    console.log(f, 'hits:', [...new Set(hits)].join(', '));
  }
}

console.log('\n=== Gift assets ===');
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}
const gifts = walk('public/gift-v2').concat(walk('public/assets').filter((p) => /gift|phoenix/i.test(p)));
console.log(gifts.map((p) => p.replace(/^public\//, '')).join('\n'));
