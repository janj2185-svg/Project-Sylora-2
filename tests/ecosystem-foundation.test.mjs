import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeAiPermissions, canAiPermission, ACTION_LEVELS } from '../src/ecosystem/permissions.mjs';
import { requiredActionLevel, canExecuteAction } from '../src/ecosystem/action-engine.mjs';
import { defaultIdentityProfile, mergeIdentityProfile } from '../src/ecosystem/identity.mjs';
import { buildNode } from '../src/ecosystem/knowledge-graph.mjs';

test('AI permissions normalize with safe defaults', () => {
  const perms = normalizeAiPermissions({ posts_write: true, messages_read: true });
  assert.equal(perms.posts_write, true);
  assert.equal(perms.messages_read, true);
  assert.equal(perms.profile_read, true);
  assert.equal(canAiPermission(perms, 'posts_write'), true);
  assert.equal(canAiPermission(perms, 'tools_execute'), false);
});

test('action engine enforces confirmation for critical actions', () => {
  assert.equal(requiredActionLevel('wallet.transfer'), ACTION_LEVELS.REQUEST_CONFIRMATION);
  assert.equal(canExecuteAction({ level: ACTION_LEVELS.REQUEST_CONFIRMATION, permissionGranted: true, userConfirmed: false }), false);
  assert.equal(canExecuteAction({ level: ACTION_LEVELS.REQUEST_CONFIRMATION, permissionGranted: true, userConfirmed: true }), true);
});

test('identity profile merges visibility without breaking sections', () => {
  const user = { id: 'u1', username: 'demo', displayName: 'Demo', bio: '', locale: 'uk' };
  const base = defaultIdentityProfile(user);
  const merged = mergeIdentityProfile(base, { professionalTitle: 'Designer', visibility: { education: 'private' } });
  assert.equal(merged.professionalTitle, 'Designer');
  assert.equal(merged.visibility.education, 'private');
});

test('knowledge graph node builder validates type', () => {
  const node = buildNode({ id: 'n1', type: 'project', ownerId: 'u1', label: 'SYLORA', visibility: 'private' });
  assert.equal(node.type, 'project');
  assert.throws(() => buildNode({ id: 'n2', type: 'invalid', ownerId: 'u1', label: 'x' }));
});

test('avatar rig CSS disables duplicate gesture sprites on assembled rig', async () => {
  const css = await readFile(new URL('../public/design-living-horizon.css', import.meta.url), 'utf8');
  assert.match(css, /\.sylora-ai-hero\.avatar-rig \.sylora-avatar-gesture\{display:none/);
  assert.match(css, /\.sylora-ai-hero\.avatar-rig \.sylora-avatar-motion\{display:block/);
});

test('app.js uses avatar-rig and rig-only gesture path', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /avatar-rig/);
  assert.match(app, /useRig=hero\.classList\.contains\('avatar-rig'\)/);
});
