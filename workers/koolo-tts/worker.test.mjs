import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';

const origin = 'https://koolo.app';
const req = (body, opts = {}) => new Request('https://example.workers.dev/tts', {
  method: 'POST', headers: { 'Origin': origin, 'Content-Type': 'application/json', ...opts.headers },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});
const tts = (extra = {}) => ({
  AI: { run: async (_model, { prompt, lang }) => {
    assert.ok(prompt); assert.equal(lang, 'en'); return new Uint8Array([73, 68, 51, 3, 4, 0]);
  } },
  TTS_RATE_LIMITER: { limit: async () => ({ success: true }) },
  ...extra,
});
const payload = { text: 'Hello', lang: 'en' };

test('generates MP3 and attaches exact-origin CORS', async () => {
  const res = await worker.fetch(req(payload), tts(), {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Content-Type'), 'audio/mpeg');
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), origin);
  assert.deepEqual([...new Uint8Array(await res.arrayBuffer())], [73, 68, 51, 3, 4, 0]);
});

test('CORS rejects other sites and allows localhost dev', async () => {
  assert.equal((await worker.fetch(req(payload, { headers: { Origin: 'https://evil.example' } }), tts(), {})).status, 403);
  const preflight = await worker.fetch(new Request('https://example.workers.dev/tts', {
    method: 'OPTIONS', headers: { Origin: 'http://localhost:5173' },
  }), tts(), {});
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'http://localhost:5173');
});

test('enforces 300 Unicode code points and language allowlist', async () => {
  assert.equal((await worker.fetch(req({ text: '🦊'.repeat(301), lang: 'en' }), tts(), {})).status, 400);
  assert.equal((await worker.fetch(req({ text: 'Hi', lang: 'ru' }), tts(), {})).status, 400);
  assert.equal((await worker.fetch(req('{not json'), tts(), {})).status, 400);
});

test('refuses a missing or rejecting rate limit binding', async () => {
  assert.equal((await worker.fetch(req(payload), { AI: tts().AI }, {})).status, 503);
  assert.equal((await worker.fetch(req(payload), tts({ TTS_RATE_LIMITER: { limit: async () => ({ success: false }) } }), {})).status, 429);
});

test('handles retired model and exposes a safe error', async () => {
  const result = await worker.fetch(req(payload), tts({ AI: { run: async () => { throw Error('model deprecated'); } } }), {});
  assert.equal(result.status, 503);
  assert.equal((await result.json()).error, 'TTS_UNAVAILABLE');
});
