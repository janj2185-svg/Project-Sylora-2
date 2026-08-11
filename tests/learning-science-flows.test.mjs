import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createStreamSession,
  appendStreamChunk,
  toolRegistry,
  toolsForPermissions,
  aiFallbackState,
  routeLanguage,
  providerSnapshot
} from '../src/ecosystem/providers.mjs';

async function startServer() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-learn-'));
  process.env.SYLORA_DATA_FILE = path.join(dir, 'data.json');
  process.env.DATABASE_URL = '';
  process.env.REDIS_URL = '';
  process.env.OPENAI_API_KEY = '';
  process.env.NODE_ENV = 'test';
  const { server } = await import(`../src/server.mjs?learn=${Date.now()}`);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}`, dir };
}

async function req(base, pathname, { method = 'GET', token, body } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${pathname}`, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

test('AI provider-independent architecture (no hardcoded replies)', () => {
  const snap = providerSnapshot();
  assert.equal(snap.ai.status, 'blocked_provider');
  assert.ok(toolRegistry().length >= 5);
  assert.ok(!toolsForPermissions({ memory_write: false }).some(t => t.permission === 'memory_write'));
  const stream = createStreamSession({ userId: 'u1' });
  assert.equal(stream.status, 'setup_required');
  appendStreamChunk(stream, 'should not invent');
  assert.equal(stream.chunks.length, 0);
  assert.equal(aiFallbackState().hardcodeForbidden, true);
  assert.equal(routeLanguage('uk').replyLanguage, 'uk');
  assert.equal(routeLanguage('xx', 'pl').replyLanguage, 'pl');
});

test('Learning: teacher course → student enroll → lesson → quiz; tutor bound to lesson', async () => {
  const { server, base, dir } = await startServer();
  try {
    const teacher = await req(base, '/api/auth/register', {
      method: 'POST',
      body: { username: 'teacher1', email: 'teacher1@ex.com', password: 'password12' }
    });
    const student = await req(base, '/api/auth/register', {
      method: 'POST',
      body: { username: 'student1', email: 'student1@ex.com', password: 'password12' }
    });
    const tToken = teacher.data.token;
    const sToken = student.data.token;

    const course = await req(base, '/api/courses', {
      method: 'POST',
      token: tToken,
      body: { title: 'Intro Physics', description: 'Basics', price: 0 }
    });
    assert.equal(course.status, 201);
    const lesson = await req(base, `/api/courses/${course.data.course.id}/lessons`, {
      method: 'POST',
      token: tToken,
      body: { title: 'Forces', content: 'F = ma. Force equals mass times acceleration.' }
    });
    assert.equal(lesson.status, 201);
    await req(base, `/api/courses/${course.data.course.id}/publish`, { method: 'POST', token: tToken });

    const enroll = await req(base, `/api/courses/${course.data.course.id}/enroll`, {
      method: 'POST',
      token: sToken,
      body: {}
    });
    assert.equal(enroll.status, 200);

    const open = await req(base, `/api/courses/${course.data.course.id}`, { token: sToken });
    assert.equal(open.status, 200);
    assert.equal(open.data.locked, false);
    assert.ok(open.data.lessons[0].content);

    const progress = await req(base, `/api/lessons/${lesson.data.lesson.id}/progress`, {
      method: 'POST',
      token: sToken,
      body: {}
    });
    assert.equal(progress.status, 200);
    assert.ok(progress.data.courseProgress > 0);

    const quiz = await req(base, `/api/lessons/${lesson.data.lesson.id}/quiz`, { token: sToken });
    assert.equal(quiz.status, 200);
    assert.ok(quiz.data.quiz?.questions?.length);

    const tutor = await req(base, '/api/learning/tutor', {
      method: 'POST',
      token: sToken,
      body: {
        subject: 'Physics',
        mode: 'teach_me',
        courseId: course.data.course.id,
        lessonId: lesson.data.lesson.id
      }
    });
    assert.equal(tutor.status, 201);
    assert.equal(tutor.data.session.lessonId, lesson.data.lesson.id);
    assert.ok(tutor.data.session.lessonContext?.excerpt);
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Science: library → paper reader → notes → ask context (no invented citations)', async () => {
  const { server, base, dir } = await startServer();
  try {
    const reg = await req(base, '/api/auth/register', {
      method: 'POST',
      body: { username: 'sciuser', email: 'sciuser@ex.com', password: 'password12' }
    });
    const token = reg.data.token;

    const item = await req(base, '/api/science/library', {
      method: 'POST',
      token,
      body: {
        type: 'paper',
        title: 'Sample Methods Note',
        authors: ['Doe J'],
        abstract: 'We measured X under controlled conditions. No external DOI claimed.',
        doi: null
      }
    });
    assert.equal(item.status, 201);

    const list = await req(base, '/api/science/library', { token });
    assert.ok(list.data.items.some(i => i.id === item.data.item.id));

    const note = await req(base, `/api/science/library/${item.data.item.id}/notes`, {
      method: 'POST',
      token,
      body: { text: 'Key: controlled conditions only.' }
    });
    assert.equal(note.status, 201);

    const reader = await req(base, '/api/science/paper-reader', {
      method: 'POST',
      token,
      body: { paperId: item.data.item.id }
    });
    assert.equal(reader.status, 200);
    assert.equal(reader.data.view.metadata.doi, null);
    assert.equal(reader.data.view.notes.length, 1);
    assert.equal(reader.data.view.askSylora.context.contentType, 'paper');

    const cite = await req(base, '/api/science/citations', {
      method: 'POST',
      token,
      body: { title: 'Fake', doi: '10.9999/invented', sourceVerified: false }
    });
    assert.equal(cite.status, 200);
    assert.equal(cite.data.citation.error, 'doi_not_verified');

    const ds = await req(base, '/api/science/datasets', {
      method: 'POST',
      token,
      body: {
        name: 'Trial',
        columns: [{ name: 'x', type: 'number' }, { name: 'y', type: 'number' }],
        previewRows: [{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 6 }],
        rowCount: 3
      }
    });
    assert.equal(ds.status, 201);
    assert.ok(ds.data.dataset.analysis?.basics?.length);
    const dslist = await req(base, '/api/science/datasets', { token });
    assert.ok(dslist.data.datasets.length >= 1);
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
