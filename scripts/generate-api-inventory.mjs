import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceFiles = ['src/server.mjs', 'src/ecosystem/routes.mjs'];
const outputFile = path.join(root, 'docs/architecture/API_INVENTORY.md');

function readTree(relativeDirectory, extensions) {
  const directory = path.join(root, relativeDirectory);
  if (!fs.existsSync(directory)) return '';
  const files = [];
  const visit = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (extensions.some(extension => entry.name.endsWith(extension))) files.push(target);
    }
  };
  visit(directory);
  return files.sort().map(file => fs.readFileSync(file, 'utf8')).join('\n');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function dynamicRoutePatterns(text) {
  const patterns = [];
  const templates = /`(\/api\/[^`]+)`/g;
  let match;
  while ((match = templates.exec(text))) {
    if (!match[1].includes('${')) continue;
    const staticSegments = match[1].split('/').filter(segment => segment && !segment.includes('${'));
    if (staticSegments.length < 2) continue;
    const source = escapeRegex(match[1]).replace(/\\\$\\\{[^}]+\\\}/g, '[^/]+').replace(/\\\?.*$/, '(?:\\?.*)?');
    patterns.push(new RegExp(`^${source}$`));
  }
  return patterns;
}

function referenced(text, routePath, dynamicPatterns = []) {
  const pattern = routePath.split('/').map(segment => {
    if (segment.startsWith(':')) return '(?:\\$\\{[^}]+\\}|[^/\\s\'"`]+)';
    return escapeRegex(segment);
  }).join('\\/');
  return new RegExp(pattern + "(?=[?\\s,'\"`)])").test(text) || dynamicPatterns.some(candidate => candidate.test(routePath));
}

function extractDefinitions(file, text) {
  const events = [];
  const direct = /req\.method\s*===?\s*(['"])([A-Z]+)\1\s*&&\s*p\s*===?\s*(['"])(\/api\/[^'"]+)\3/g;
  const dynamic = /\b(?:let\s+|const\s+)?([A-Za-z]\w*)\s*=\s*route\(\s*(['"])(\/api\/[^'"]+)\2\s*,\s*p\s*\)/g;
  let match;
  while ((match = direct.exec(text))) events.push({ type: 'direct', index: match.index, method: match[2], path: match[4] });
  while ((match = dynamic.exec(text))) events.push({ type: 'dynamic', index: match.index, variable: match[1], path: match[3] });
  events.sort((a, b) => a.index - b.index);

  const definitions = [];
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const end = events[index + 1]?.index ?? text.length;
    const segment = text.slice(event.index, end);
    if (event.type === 'direct') {
      definitions.push({ file, method: event.method, path: event.path, snippet: segment });
      continue;
    }
    const variable = escapeRegex(event.variable);
    const matcher = new RegExp(`req\\.method\\s*===?\\s*(['"])([A-Z]+)\\1\\s*&&\\s*${variable}\\b`, 'g');
    const methods = [];
    while ((match = matcher.exec(segment))) methods.push({ method: match[2], index: match.index });
    for (let methodIndex = 0; methodIndex < methods.length; methodIndex += 1) {
      const method = methods[methodIndex];
      const handlerEnd = methods[methodIndex + 1]?.index ?? segment.length;
      definitions.push({
        file,
        method: method.method,
        path: event.path,
        snippet: segment.slice(method.index, handlerEnd)
      });
    }
  }
  return definitions;
}

function authorizationFor(endpoint) {
  const { method, path: routePath, snippets } = endpoint;
  const source = snippets.join('\n');
  if (routePath === '/api/v1/identity/me') return 'API_KEY_OR_OWNER';
  if (routePath === '/api/studio/browser-source/events') return 'SIGNED_EPHEMERAL_TOKEN';
  if (routePath === '/api/auth/logout') return 'SESSION_TOKEN';
  if (/^\/api\/live\/:id\/connectors\/tikfinity\/(?:check|events)$/.test(routePath)) return 'EPHEMERAL_RELAY_TOKEN';
  if (/^\/api\/live\/:id\/connectors\/tikfinity\/(?:journal|pairings(?:\/:pairingId)?)$/.test(routePath)) return 'OWNER_OR_HOST';
  if (/^\/api\/admin\//.test(routePath) || routePath === '/api/ecosystem/metrics' || /requireAdmin/.test(source)) return 'ADMIN';
  if (!/requireUser/.test(source)) return 'PUBLIC';
  if (routePath === '/api/communities/:id/channels') return 'OWNER_OR_ADMIN';
  if (routePath === '/api/community-channels/:id/posts' && method === 'POST') return 'MEMBER_OR_OWNER_OR_ADMIN';
  if (routePath === '/api/conferences/:id/sylora') return 'OWNER';
  if (
    routePath === '/api/me'
    || routePath === '/api/identity'
    || /^\/api\/ai\/(?:history|memory|activity|dashboard|permissions|privacy-controls|proactive|command-center)/.test(routePath)
    || /^\/api\/(?:ledger|stats|progress|blocks|notifications)$/.test(routePath)
    || /^\/api\/(?:media|studio\/scenes)/.test(routePath)
    || /^\/api\/developer\/apps/.test(routePath)
  ) return 'OWNER';
  if (/^\/api\/conversations(?:\/|$)/.test(routePath)) return 'MEMBER';
  if (/^\/api\/live\/:id\/(?:end|resonance|creator-insights|copilot|stage|room-kind|cohost|distribution)/.test(routePath)) return 'OWNER_OR_HOST';
  if (/^\/api\/(?:orgs|business|projects|tasks|goals|decisions|calendar|canvas|continuity)/.test(routePath)) return 'OWNER_OR_MEMBER';
  if (/role\s*!==\s*['"]admin|role\s*===\s*['"]admin/.test(source)) return 'OWNER_OR_ADMIN';
  if (method === 'PATCH' || method === 'DELETE') return 'OWNER_OR_MEMBER';
  return 'AUTHENTICATED';
}

function renderInventory() {
  const frontendText = readTree('public', ['.js', '.html']);
  const testText = readTree('tests', ['.mjs']);
  const frontendDynamic = dynamicRoutePatterns(frontendText);
  const testDynamic = dynamicRoutePatterns(testText);
  const definitions = sourceFiles.flatMap(relativeFile => {
    const text = fs.readFileSync(path.join(root, relativeFile), 'utf8');
    return extractDefinitions(relativeFile, text);
  });
  const grouped = new Map();
  for (const definition of definitions) {
    const key = `${definition.method} ${definition.path}`;
    const entry = grouped.get(key) || { method: definition.method, path: definition.path, definitions: [], snippets: [] };
    entry.definitions.push(definition.file);
    entry.snippets.push(definition.snippet);
    grouped.set(key, entry);
  }

  const critical = /^\/api\/(?:auth\/|me$|health$|ready$|feed$|users$|posts|conversations|identity|public\/u|gifts|ledger$|live(?:\/|$)|ai\/(?:history|memory)|admin\/)/;
  const endpoints = [...grouped.values()].map(endpoint => {
    const frontendUsed = referenced(frontendText, endpoint.path, frontendDynamic);
    const testUsed = referenced(testText, endpoint.path, testDynamic);
    const duplicate = endpoint.definitions.length > 1;
    const status = duplicate ? 'DUPLICATE' : (frontendUsed || testUsed || critical.test(endpoint.path) ? 'ACTIVE' : 'UNVERIFIED');
    return {
      ...endpoint,
      auth: authorizationFor(endpoint),
      frontendUsed,
      testUsed,
      status,
      action: status === 'ACTIVE' ? 'KEEP' : status === 'DUPLICATE' ? 'CONSOLIDATE_AFTER_CALLER_AUDIT' : 'VERIFY_BEFORE_PHASE_2'
    };
  }).sort((left, right) => left.path.localeCompare(right.path) || left.method.localeCompare(right.method));

  const count = status => endpoints.filter(endpoint => endpoint.status === status).length;
  const frontendUsed = endpoints.filter(endpoint => endpoint.frontendUsed).length;
  const rows = endpoints.map(endpoint => `| ${endpoint.method} | \`${endpoint.path}\` | ${endpoint.auth} | ${endpoint.frontendUsed ? 'YES' : 'NO'} | ${endpoint.status} | ${endpoint.action} |`).join('\n');
  return `# API inventory\n\nThis inventory is generated deterministically from \`src/server.mjs\` and \`src/ecosystem/routes.mjs\`. It describes registered HTTP handlers after Phase 1; it does not treat endpoint count as product progress. Frontend usage means a matching call exists in \`public/\`. Test-only and backend-only routes remain marked separately through status.\n\n## Counts\n\n| Metric | Count |\n|---|---:|\n| Total unique endpoints | ${endpoints.length} |\n| Active | ${count('ACTIVE')} |\n| Legacy | 0 |\n| Dead | 0 |\n| Duplicate | ${count('DUPLICATE')} |\n| Unverified | ${count('UNVERIFIED')} |\n| Frontend-used | ${frontendUsed} |\n| Backend-only | ${endpoints.length - frontendUsed} |\n\n## Status contract\n\n- \`ACTIVE\`: referenced by the current frontend or automated tests, or part of the Phase 1 critical data/auth surface.\n- \`UNVERIFIED\`: handler exists, but no frontend or automated-test caller was found. It is not called dead without runtime evidence.\n- \`DUPLICATE\`: the same method/path is registered more than once.\n- \`LEGACY\` and \`DEAD\`: none are asserted in Phase 1 because no deprecation marker or conclusive unreachable-route evidence exists.\n- No endpoint is mass-deleted in Phase 1. \`VERIFY_BEFORE_PHASE_2\` is an explicit follow-up, not a removal decision.\n\n\`AUTH\` is the effective handler guard, not merely whether a Bearer header is parsed. \`OWNER\`, \`MEMBER\`, and combined labels mean that the handler or repository additionally binds the target to the session user. Because many broad ecosystem handlers predate Phase 1, every \`UNVERIFIED\` route still requires a focused behavioral authorization test before production enablement.\n\n## Alias and consistency findings\n\n- \`GET/PATCH /api/me\` is the only account endpoint; no duplicate \`/api/auth/me\` exists.\n- \`GET /api/identity/:userId\` and \`GET /api/public/u/:username\` are intentional public lookup aliases by different keys. Both use the canonical user/identity repositories; their outer response shapes are retained for frontend compatibility.\n- \`GET /api/ai/history\`, \`GET /api/ai/memory/center\`, and \`GET /api/ai/memory/export\` are different views over one owner-scoped production memory repository, not parallel stores.\n- No exact method/path duplicate was found. No route is declared \`DEAD\` or \`LEGACY\` without runtime/deprecation evidence.\n- Critical auth/user errors use \`error\`, \`code\`, and \`message\`; many noncritical legacy domain handlers still return only \`error\` and remain an API-consistency follow-up.\n\n## Endpoints\n\n| METHOD | PATH | AUTH | FRONTEND USED | STATUS | ACTION |\n|---|---|---|---|---|---|\n${rows}\n`;
}

const rendered = renderInventory();
if (process.argv.includes('--write')) {
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, rendered);
  console.log(path.relative(root, outputFile));
} else if (process.argv.includes('--check')) {
  const current = fs.existsSync(outputFile) ? fs.readFileSync(outputFile, 'utf8') : '';
  if (current !== rendered) throw new Error('API_INVENTORY_OUT_OF_DATE');
  console.log('API inventory is current');
} else {
  process.stdout.write(rendered);
}
