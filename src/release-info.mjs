import fs from 'node:fs';

const UNKNOWN = 'unknown';
const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const REF_PATTERN = /^[A-Za-z0-9._/-]{1,160}$/;

function packageVersion() {
  try {
    const manifest = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    return typeof manifest.version === 'string' && manifest.version.trim()
      ? manifest.version.trim().slice(0, 40)
      : UNKNOWN;
  } catch {
    return UNKNOWN;
  }
}

function releaseCommit(value) {
  const commit = String(value || '').trim();
  return SHA_PATTERN.test(commit) ? commit.toLowerCase() : UNKNOWN;
}

function releaseRef(value) {
  const ref = String(value || '').trim();
  return REF_PATTERN.test(ref) ? ref : UNKNOWN;
}

function releaseTimestamp(value) {
  const timestamp = String(value || '').trim();
  if (!timestamp || !Number.isFinite(Date.parse(timestamp))) return null;
  return new Date(timestamp).toISOString();
}

export function buildReleaseInfo(env = process.env, version = packageVersion()) {
  const commit = releaseCommit(env.SYLORA_RELEASE_SHA);
  return Object.freeze({
    service: 'sylora-core',
    version,
    commit,
    shortCommit: commit === UNKNOWN ? UNKNOWN : commit.slice(0, 12),
    ref: releaseRef(env.SYLORA_RELEASE_REF),
    deployedAt: releaseTimestamp(env.SYLORA_RELEASED_AT)
  });
}

export const releaseInfo = buildReleaseInfo();
