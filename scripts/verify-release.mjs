const baseUrl = String(process.argv[2] || '').replace(/\/+$/, '');
const expectedCommit = String(process.argv[3] || '').trim().toLowerCase();
const timeoutSeconds = Math.max(1, Math.min(300, Number(process.argv[4]) || 90));

if (!/^https?:\/\//.test(baseUrl)) {
  console.error('Usage: node scripts/verify-release.mjs <base-url> <40-char-commit-sha> [timeout-seconds]');
  process.exit(2);
}
if (!/^[a-f0-9]{40}$/.test(expectedCommit)) {
  console.error('Expected release commit must be a full 40-character Git SHA.');
  process.exit(2);
}

const deadline = Date.now() + timeoutSeconds * 1_000;
let lastFailure = 'release endpoint was not checked';
let attempt = 0;

while (Date.now() < deadline) {
  attempt += 1;
  const url = `${baseUrl}/api/version?release-check=${Date.now()}-${attempt}`;
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json', 'cache-control': 'no-cache' },
      cache: 'no-store',
      redirect: 'follow'
    });
    if (!response.ok) {
      lastFailure = `${url} returned HTTP ${response.status}`;
    } else {
      const payload = await response.json();
      const observed = String(payload.commit || '').toLowerCase();
      if (observed === expectedCommit) {
        console.log(`Release verified: ${baseUrl} serves ${expectedCommit}`);
        process.exit(0);
      }
      lastFailure = `${url} serves ${observed || 'no commit'}; expected ${expectedCommit}`;
    }
  } catch (error) {
    lastFailure = `${url} failed: ${error?.message || error}`;
  }
  await new Promise(resolve => setTimeout(resolve, 2_000));
}

console.error(`Release verification failed after ${timeoutSeconds}s: ${lastFailure}`);
process.exit(1);
