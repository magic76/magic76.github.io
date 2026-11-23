// Standalone Koolo TTS lab. Do not import guest-trial or Pages Functions.
const MODEL = '@cf/myshell-ai/melotts';
const LANGS = new Set(['en', 'zh', 'ja', 'ko', 'es', 'fr']);
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

async function cacheKeyFor(request, lang, text) {
  const bytes = new TextEncoder().encode(JSON.stringify([lang, text]));
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

function asAudio(value) {
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value) || value instanceof ReadableStream) return value;
  if (value && typeof value.audio === 'string') {
    const base64 = value.audio.replace(/^data:audio\/[^;]+;base64,/, '');
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return bytes;
  }
  return null;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/health' && request.method === 'GET') {
      return json({ ok: true, model: MODEL, note: 'Health does not test inference.' }, 200, null);
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
    if (!text || Array.from(text).length > 300) return json({ error: 'INVALID_TEXT', maxCharacters: 300 }, 400, origin);
    // Rate limiting is approximate per Cloudflare location, not a global quota.
    if (!env.TTS_RATE_LIMITER?.limit) return json({ error: 'RATE_LIMITER_UNAVAILABLE' }, 503, origin);
    try {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const { success } = await env.TTS_RATE_LIMITER.limit({ key: `tts:${ip}` });
      if (!success) return json({ error: 'RATE_LIMITED', retryAfterSeconds: 60 }, 429, origin);
    } catch { return json({ error: 'RATE_LIMITER_UNAVAILABLE' }, 503, origin); }

    const cache = typeof caches !== 'undefined' ? caches.default : null;
    const cacheKey = await cacheKeyFor(request, lang, text);
    if (cache) {
      const cached = await cache.match(cacheKey);
      if (cached) return audioResponse(cached.body, origin, 'HIT');
    }
    if (!env.AI?.run) return json({ error: 'AI_UNAVAILABLE' }, 503, origin);
    try {
      const result = await env.AI.run(MODEL, { prompt: text, lang });
      const audio = asAudio(result);
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
      console.error('MeloTTS inference failed:', error?.message || String(error));
      return json({ error: 'TTS_UNAVAILABLE', message: 'MeloTTS is unavailable. The model may have been retired.' }, 503, origin);
    }
  },
};
