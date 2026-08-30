import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Writable } from 'node:stream';
import { createBoundedSseWriter } from '../src/sse-backpressure.mjs';

class FakeResponse extends EventEmitter {
  constructor(writeResults = []) {
    super();
    this.writeResults = [...writeResults];
    this.writes = [];
    this.writableEnded = false;
    this.destroyed = false;
  }

  write(payload) {
    if (this.writableEnded || this.destroyed) throw new Error('STREAM_CLOSED');
    this.writes.push(String(payload));
    return this.writeResults.length ? this.writeResults.shift() : true;
  }

  end(payload = '') {
    if (payload) this.writes.push(String(payload));
    this.writableEnded = true;
    this.emit('close');
  }

  destroy() {
    this.destroyed = true;
    this.emit('close');
  }
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

test('bounded SSE writer accepts one queued signal and flushes it only after drain', () => {
  const writer = createBoundedSseWriter({ maxQueuedBytes: 64, drainTimeoutMs: 100 });
  const response = new FakeResponse([false, true]);
  assert.equal(writer.write(response, 'signal-one'), true);
  assert.equal(writer.write(response, 'signal-two'), true);
  assert.deepEqual(response.writes, ['signal-one']);
  response.emit('drain');
  assert.deepEqual(response.writes, ['signal-one', 'signal-two']);
  assert.equal(response.destroyed, false);
});

test('bounded SSE writer follows real Writable backpressure and drain events', async () => {
  const chunks = [];
  const response = new Writable({
    highWaterMark: 1,
    write(chunk, _encoding, callback) {
      chunks.push(chunk.toString());
      setTimeout(callback, 15);
    }
  });
  const writer = createBoundedSseWriter({ maxQueuedBytes: 64, drainTimeoutMs: 250 });
  assert.equal(writer.write(response, 'signal-one'), true);
  assert.equal(writer.write(response, 'signal-two'), true);
  assert.equal(writer.write(response, 'signal-three'), false);
  assert.deepEqual(chunks, ['signal-one']);
  await wait(80);
  assert.deepEqual(chunks, ['signal-one', 'signal-two']);
  assert.equal(response.destroyed, false);
  response.destroy();
});

test('bounded SSE writer rejects overflow instead of acknowledging an unbounded queue', () => {
  const writer = createBoundedSseWriter({ maxQueuedBytes: 64, drainTimeoutMs: 1_000 });
  const response = new FakeResponse([false, true]);
  assert.equal(writer.write(response, 'signal-one'), true);
  assert.equal(writer.write(response, 'signal-two'), true);
  assert.equal(writer.write(response, 'signal-three'), false);
  assert.deepEqual(response.writes, ['signal-one']);
  assert.equal(response.destroyed, false);
  response.emit('drain');
  assert.deepEqual(response.writes, ['signal-one', 'signal-two']);
});

test('bounded SSE writer enforces the queued byte ceiling', () => {
  const writer = createBoundedSseWriter({ maxQueuedBytes: 12, drainTimeoutMs: 1_000 });
  const response = new FakeResponse([false, true]);
  assert.equal(writer.write(response, '123456789012'), true);
  assert.equal(writer.write(response, 'payload-too-large'), false);
  assert.equal(response.destroyed, false);
  response.emit('drain');
});

test('bounded SSE writer closes a stream that misses the drain deadline', async () => {
  const writer = createBoundedSseWriter({ maxQueuedBytes: 64, drainTimeoutMs: 20 });
  const response = new FakeResponse([false]);
  assert.equal(writer.write(response, 'signal-one'), true);
  await wait(60);
  assert.equal(response.destroyed, true);
});

test('terminal SSE replaces a queued signal and ends immediately after drain', () => {
  const writer = createBoundedSseWriter({ maxQueuedBytes: 128, drainTimeoutMs: 100 });
  const response = new FakeResponse([false]);
  assert.equal(writer.write(response, 'signal-one'), true);
  assert.equal(writer.write(response, 'signal-two'), true);
  assert.equal(writer.end(response, 'event: room-closed\n\n'), true);
  assert.deepEqual(response.writes, ['signal-one']);
  response.emit('drain');
  assert.deepEqual(response.writes, ['signal-one', 'event: room-closed\n\n']);
  assert.equal(response.writableEnded, true);
  assert.equal(response.destroyed, false);
});

test('disposing a signaling response cancels its pending drain deadline', async () => {
  const writer = createBoundedSseWriter({ maxQueuedBytes: 64, drainTimeoutMs: 20 });
  const response = new FakeResponse([false]);
  assert.equal(writer.write(response, 'signal-one'), true);
  writer.dispose(response);
  await wait(60);
  assert.equal(response.destroyed, false);
});
