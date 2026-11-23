// Standalone Koolo TTS lab. Do not import guest-trial or Pages Functions.
const MODELS = Object.freeze({ en: '@cf/deepgram/aura-2-en', es: '@cf/deepgram/aura-2-es' });
const SPEAKERS = Object.freeze({ en: ['luna', 'apollo', 'asteria'], es: ['aquila', 'javier', 'selena'] });
const DEFAULT_SPEAKERS = Object.freeze({ en: 'luna', es: 'aquila' });
const LANGS = new Set(Object.keys(MODELS));
const ORIGINS = new Set(['https://koolo.app', 'https://www.3sssi.com']);
const MAX_BODY_BYTES = 4096;
const CACHE_TTL_SECONDS = 86400;

function allowedOrigin(origin) {
  if (!origin) return false;
  if (ORIGINS.has(origin)) return true;
  try {
    const url = new URL(origin);
    return url.origin === origin &&
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch { return false; }
}

function corsHeaders(origin) {
  const headers = new Headers({ Vary: 'Origin' });
  if (allowedOrigin(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    headers.set('Access-Control-Expose-Headers', 'X-TTS-Cache');
  }
  return headers;
}

function json(data, status, origin) {
  const headers = corsHeaders(origin);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(data), { status, headers });
}

async function cacheKeyFor(request, lang, speaker, text) {
  const bytes = new TextEncoder().encode(JSON.stringify([lang, speaker, text]));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = [...new Uint8Array(digest)].map((n) => n.toString(16).padStart(2, '0')).join('');
  return new Request(new URL(`/__tts_cache/${hash}`, request.url).toString());
}

function audioResponse(body, origin, cacheStatus) {
  const headers = corsHeaders(origin);
  headers.set('Content-Type', 'audio/mpeg');
  headers.set('Cache-Control', `public, max-age=${CACHE_TTL_SECONDS}`);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-TTS-Cache', cacheStatus);
  return new Response(body, { status: 200, headers });
}

// Read small clips before advertising audio/mpeg: reject an error body masquerading as MP3.
async function asAudio(value) {
  if (value instanceof Response) {
    const type = value.headers.get('Content-Type') || '';
    if (!value.ok || !type.startsWith('audio/')) return null;
    value = value.body;
  }
  let bytes;
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value) || value instanceof ReadableStream) {
    bytes = new Uint8Array(await new Response(value).arrayBuffer());
  } else if (value && typeof value.audio === 'string') {
    const base64 = value.audio.replace(/^data:audio\/[^;]+;base64,/, '');
    bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  } else {
    return null;
  }
  // MP3 files begin with ID3 or an MPEG audio frame sync.
  if (bytes.byteLength < 4) return null;
  const isId3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
  const isFrame = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
  return isId3 || isFrame ? bytes : null;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/health' && request.method === 'GET') {
      return json({ ok: true, models: MODELS, note: 'Health does not test inference.' }, 200, null);
    }
    if (url.pathname !== '/tts') return json({ error: 'NOT_FOUND' }, 404, null);

    const origin = request.headers.get('Origin');
    if (origin && !allowedOrigin(origin)) return json({ error: 'ORIGIN_NOT_ALLOWED' }, 403, null);
    if (request.method === 'OPTIONS') {
      if (!origin) return json({ error: 'ORIGIN_REQUIRED' }, 403, null);
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405, origin);
    if (!/^application\/json(?:\s*;|\s*$)/i.test(request.headers.get('Content-Type') || '')) {
      return json({ error: 'JSON_REQUIRED' }, 415, origin);
    }
    if (Number(request.headers.get('Content-Length')) > MAX_BODY_BYTES) {
      return json({ error: 'BODY_TOO_LARGE' }, 413, origin);
    }

    let payload;
    try {
      const body = await request.text();
      if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) return json({ error: 'BODY_TOO_LARGE' }, 413, origin);
      payload = JSON.parse(body);
    } catch { return json({ error: 'INVALID_JSON' }, 400, origin); }
    const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
    const lang = payload?.lang;
    if (!LANGS.has(lang)) return json({ error: 'INVALID_LANG' }, 400, origin);
    const speaker = payload?.speaker === undefined ? DEFAULT_SPEAKERS[lang] : payload.speaker;
    if (!SPEAKERS[lang].includes(speaker)) return json({ error: 'INVALID_SPEAKER' }, 400, origin);
    if (!text || Array.from(text).length > 300) return json({ error: 'INVALID_TEXT', maxCharacters: 300 }, 400, origin);
    // Rate limiting is approximate per Cloudflare location, not a global quota.
    if (!env.TTS_RATE_LIMITER?.limit) return json({ error: 'RATE_LIMITER_UNAVAILABLE' }, 503, origin);
    try {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const { success } = await env.TTS_RATE_LIMITER.limit({ key: `tts:${ip}` });
      if (!success) return json({ error: 'RATE_LIMITED', retryAfterSeconds: 60 }, 429, origin);
    } catch { return json({ error: 'RATE_LIMITER_UNAVAILABLE' }, 503, origin); }

    const cache = typeof caches !== 'undefined' ? caches.default : null;
    const cacheKey = await cacheKeyFor(request, lang, speaker, text);
    if (cache) {
      const cached = await cache.match(cacheKey);
      if (cached) return audioResponse(cached.body, origin, 'HIT');
    }
    if (!env.AI?.run) return json({ error: 'AI_UNAVAILABLE' }, 503, origin);
    try {
      const result = await env.AI.run(MODELS[lang], { text, speaker, encoding: 'mp3' });
      const audio = await asAudio(result);
      if (!audio) return json({ error: 'INVALID_AUDIO' }, 502, origin);
      const response = audioResponse(audio, origin, 'MISS');
      if (cache && ctx?.waitUntil) {
        const stored = new Response(response.clone().body, {
          headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}` },
        });
        ctx.waitUntil(cache.put(cacheKey, stored).catch(() => {}));
      }
      return response;
    } catch (error) {
      console.error('Aura-2 inference failed:', error?.message || String(error));
      return json({ error: 'TTS_UNAVAILABLE', message: 'Aura-2 is temporarily unavailable. Please try again later.' }, 503, origin);
    }
  },
};
