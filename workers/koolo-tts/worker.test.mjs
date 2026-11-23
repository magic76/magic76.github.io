import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';

const origin = 'https://koolo.app';
const req = (body, opts = {}) => new Request('https://example.workers.dev/tts', {
  method: 'POST',
  headers: { Origin: origin, 'Content-Type': 'application/json', ...opts.headers },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});
const mp3 = new Uint8Array([73, 68, 51, 3, 4, 0, 1, 2, 3, 4, 5]);
const env = (run = async () => mp3) => ({
  AI: { run },
  TTS_RATE_LIMITER: { limit: async () => ({ success: true }) },
});

test('Aura-2 English speaker and MP3 output', async () => {
  const result = await worker.fetch(req({ text: 'Hello Zoe!', lang: 'en', speaker: 'apollo' }),
    env(async (model, input) => {
      assert.equal(model, '@cf/deepgram/aura-2-en');
      assert.deepEqual(input, { text: 'Hello Zoe!', speaker: 'apollo', encoding: 'mp3' });
      return new ReadableStream({
        start(controller) { controller.enqueue(mp3); controller.close(); },
      });
    }), {});
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('Content-Type'), 'audio/mpeg');
  assert.equal(result.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(result.headers.get('X-TTS-Cache'), 'MISS');
  assert.deepEqual([...new Uint8Array(await result.arrayBuffer())], [...mp3]);
});

test('Aura-2 Spanish selects Spanish voice and default speaker', async () => {
  const res = await worker.fetch(req({ text: '¡Hola!', lang: 'es' }),
    env(async (model, input) => {
      assert.equal(model, '@cf/deepgram/aura-2-es');
      assert.deepEqual(input, { text: '¡Hola!', speaker: 'aquila', encoding: 'mp3' });
      return new Response(mp3, { headers: { 'Content-Type': 'audio/mpeg' } });
    }), {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Content-Type'), 'audio/mpeg');
});

test('rejects other languages and speakers mismatched with language', async () => {
  for (const lang of ['zh', 'ja', 'ko', 'fr', 'ru']) {
    const r = await worker.fetch(req({ text: 'Hello', lang }), env(), {});
    assert.equal(r.status, 400);
    assert.equal((await r.json()).error, 'INVALID_LANG');
  }
  for (const bad of [
    { lang: 'en', speaker: 'aquila' },
    { lang: 'es', speaker: 'luna' },
    { lang: 'en', speaker: 'fake' },
    { lang: 'en', speaker: '' },
  ]) {
    const r = await worker.fetch(req({ text: 'Hello', ...bad }), env(), {});
    assert.equal(r.status, 400);
    assert.equal((await r.json()).error, 'INVALID_SPEAKER');
  }
});

test('enforces 300 Unicode characters, JSON syntax and body size', async () => {
  assert.equal((await worker.fetch(req({ text: '🦊'.repeat(301), lang: 'en' }), env(), {})).status, 400);
  assert.equal((await worker.fetch(req('{not json'), env(), {})).status, 400);
  assert.equal((await worker.fetch(req('X'.repeat(4100)), env(), {})).status, 413);
});

test('CORS rejects external sites and allows localhost OPTIONS', async () => {
  assert.equal((await worker.fetch(req({ text: 'Hello', lang: 'en' }, { headers: { Origin: 'https://evil.example' } }), env(), {})).status, 403);
  const preflight = await worker.fetch(new Request('https://example.workers.dev/tts', {
    method: 'OPTIONS', headers: { Origin: 'http://localhost:5173' },
  }), env(), {});
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'http://localhost:5173');
});

test('rate limit fails closed without binding and returns 429 when exceeded', async () => {
  const body = req({ text: 'Hello', lang: 'en' });
  assert.equal((await worker.fetch(body, { AI: env().AI }, {})).status, 503);
  const deniedEnv = env();
  deniedEnv.TTS_RATE_LIMITER.limit = async () => ({ success: false });
  const result = await worker.fetch(req({ text: 'Hello', lang: 'en' }), deniedEnv, {});
  assert.equal(result.status, 429);
  assert.equal((await result.json()).error, 'RATE_LIMITED');
});

test('does not mislabel JSON errors or empty output as MP3', async () => {
  for (const returned of [
    new Response('{"error":"bad"}', { headers: { 'Content-Type': 'application/json' } }),
    new TextEncoder().encode('{"error":"not mp3"}'),
    new Uint8Array(),
  ]) {
    const r = await worker.fetch(req({ text: 'Hello', lang: 'en' }), env(async () => returned), {});
    assert.equal(r.status, 502);
    assert.equal((await r.json()).error, 'INVALID_AUDIO');
  }
});

test('reports inference errors rather than fabricating audio', async () => {
  const result = await worker.fetch(req({ text: 'Hello', lang: 'en' }), env(async () => { throw Error('provider unavailable'); }), {});
  assert.equal(result.status, 503);
  assert.equal((await result.json()).error, 'TTS_UNAVAILABLE');
});

test('health announces both Aura models without attempting inference', async () => {
  const r = await worker.fetch(new Request('https://example.workers.dev/health'), {}, {});
  assert.equal(r.status, 200);
  assert.deepEqual((await r.json()).models, {
    en: '@cf/deepgram/aura-2-en',
    es: '@cf/deepgram/aura-2-es',
  });
});
