import test from 'node:test';
import assert from 'node:assert/strict';
import { createClipJob, processClipJob } from '../src/ecosystem/clip-jobs.mjs';

test('clip job returns honest error without source media', async () => {
  const job = createClipJob({ id: 'clip-1', userId: 'user-1', title: 'Test' });
  const result = await processClipJob(job, { mediaRoot: '/tmp/nonexistent-media-root' });
  assert.ok(['SOURCE_MEDIA_NOT_FOUND', 'FFMPEG_NOT_AVAILABLE'].includes(result.error));
  assert.notEqual(result.status, 'completed');
});
