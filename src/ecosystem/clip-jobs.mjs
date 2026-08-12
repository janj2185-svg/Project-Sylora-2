import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CLEANUP_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const CLIP_JOB_STATUS = Object.freeze(['queued', 'processing', 'completed', 'failed']);

export function createClipJob({
  id, userId, liveId = null, mediaId = null, title = 'Clip', maxAttempts = 3
} = {}) {
  return {
    id,
    userId,
    liveId,
    mediaId,
    title: String(title || 'Clip').slice(0, 120),
    status: 'queued',
    outputPath: null,
    outputMetadata: {},
    error: null,
    attempts: 0,
    maxAttempts,
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    updatedAt: new Date().toISOString()
  };
}

export async function ffmpegAvailable() {
  return new Promise(resolve => {
    const proc = spawn('ffmpeg', ['-version'], { stdio: 'ignore' });
    proc.on('error', () => resolve(false));
    proc.on('close', code => resolve(code === 0));
  });
}

/**
 * Process one clip job. Returns honest failure when no source media exists.
 */
export async function processClipJob(job, { mediaRoot, repo = null } = {}) {
  if (!job || job.status === 'completed') return job;
  const hasFfmpeg = await ffmpegAvailable();
  if (!hasFfmpeg) {
    return failJob(job, 'FFMPEG_NOT_AVAILABLE', repo);
  }

  let sourcePath = null;
  if (job.mediaId && mediaRoot) {
    const candidate = path.join(mediaRoot, job.mediaId);
    if (fs.existsSync(candidate)) sourcePath = candidate;
  }
  if (!sourcePath) {
    return failJob(job, 'SOURCE_MEDIA_NOT_FOUND', repo);
  }

  const processing = {
    ...job,
    status: 'processing',
    attempts: (job.attempts || 0) + 1,
    startedAt: job.startedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (repo?.updateClipJob) await repo.updateClipJob(processing);

  const outDir = path.join(mediaRoot, 'clips');
  fs.mkdirSync(outDir, { recursive: true });
  const outputPath = path.join(outDir, `${job.id}.mp4`);

  const ok = await runFfmpeg(sourcePath, outputPath, 30);
  if (!ok) {
    const err = (job.attempts || 0) + 1 >= (job.maxAttempts || 3) ? 'RENDER_FAILED_MAX_RETRIES' : 'RENDER_FAILED';
    return failJob({ ...processing, attempts: processing.attempts }, err, repo);
  }

  const completed = {
    ...processing,
    status: 'completed',
    outputPath,
    outputMetadata: {
      format: 'mp4',
      durationSec: 30,
      sourceMediaId: job.mediaId,
      renderedAt: new Date().toISOString()
    },
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    error: null
  };
  if (repo?.updateClipJob) await repo.updateClipJob(completed);
  return completed;
}

function failJob(job, error, repo) {
  const failed = {
    ...job,
    status: job.attempts >= (job.maxAttempts || 3) ? 'failed' : 'queued',
    error,
    updatedAt: new Date().toISOString(),
    completedAt: job.status === 'failed' ? new Date().toISOString() : null
  };
  if (repo?.updateClipJob) repo.updateClipJob(failed).catch(() => {});
  return failed;
}

function runFfmpeg(input, output, durationSec = 30) {
  return new Promise(resolve => {
    const args = ['-y', '-i', input, '-t', String(durationSec), '-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac', output];
    const proc = spawn('ffmpeg', args, { stdio: 'ignore' });
    proc.on('error', () => resolve(false));
    proc.on('close', code => resolve(code === 0));
  });
}

export function cleanupStaleClips(jobs = [], { now = Date.now() } = {}) {
  return jobs.filter(j => {
    if (j.status !== 'completed' || !j.completedAt) return true;
    const age = now - new Date(j.completedAt).getTime();
    if (age > CLEANUP_AGE_MS && j.outputPath && fs.existsSync(j.outputPath)) {
      try { fs.unlinkSync(j.outputPath); } catch {}
      return false;
    }
    return true;
  });
}
