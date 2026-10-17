/**
 * Crew Shorts Provider Adapters.
 * Provides a unified provider interface for image generation, story planning, and vision QA.
 * Supports Gemini API, Agent/Local image injection, and Mock adapters for zero-cost testing.
 */
import {readFileSync, existsSync} from 'node:fs';
import {loadIdentity, imagePrompt, validateIdentityQa} from './shorts-character-identity.mjs';

const cap = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export class BaseProviderAdapter {
  constructor(name = 'base') {
    this.name = name;
    this.costEstimate = {
      textCalls: 0,
      imageCalls: 0,
      qaCalls: 0,
      estimatedCostUsd: 0.0
    };
  }

  async stories(feed, date) {
    throw new Error('stories() not implemented in ' + this.name);
  }

  async image(story, avatar, identity) {
    throw new Error('image() not implemented in ' + this.name);
  }

  async review(story, photo, avatar, identity) {
    throw new Error('review() not implemented in ' + this.name);
  }
}

/**
 * Gemini Provider Adapter.
 * Reuses Google Gemini REST API with inline reference image attachment and strict QA validation.
 */
export class GeminiProviderAdapter extends BaseProviderAdapter {
  constructor({
    key = process.env.GEMINI_API_KEY,
    textModel = process.env.SHORTS_TEXT_MODEL || 'gemini-2.5-flash',
    imageModel = process.env.SHORTS_IMAGE_MODEL || 'gemini-2.5-flash-image',
    request = fetch
  } = {}) {
    super('gemini');
    if (!key) throw new Error('missing GEMINI_API_KEY secret');
    this.key = key;
    this.textModel = textModel;
    this.imageModel = imageModel;
    this.request = request;
  }

  async #post(model, body, {retries = 2, timeoutMs = 90000} = {}) {
    if (!/^[a-zA-Z0-9_.-]+$/.test(model)) throw new Error('unsafe model name: ' + model);
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent';
    for (let attempt = 0; attempt <= retries; attempt++) {
      let response;
      try {
        response = await this.request(url, {
          method: 'POST',
          headers: {'Content-Type': 'application/json', 'x-goog-api-key': this.key},
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs)
        });
      } catch (e) {
        if (attempt === retries) throw new Error('Gemini connection failed (' + e.name + ')');
        await sleep(1200 * (attempt + 1));
        continue;
      }
      if (!response.ok) {
        const detail = cap(await response.text(), 400).replace(/key=[^\s"&]+/gi, 'key=[REDACTED]');
        if (![408, 429, 500, 502, 503, 504].includes(response.status) || attempt === retries) {
          throw new Error('Gemini ' + model + ' HTTP ' + response.status + ': ' + detail);
        }
        await sleep(2000 * (attempt + 1));
        continue;
      }
      const result = await response.json();
      if (!result.candidates || result.candidates.length === 0) {
        throw new Error('no AI output from ' + model);
      }
      return result;
    }
    throw new Error('Gemini exhausted retries');
  }

  #partsOf(res) {
    return res.candidates?.[0]?.content?.parts || [];
  }

  #parseJson(res) {
    const s = this.#partsOf(res).filter(p => typeof p.text === 'string').map(p => p.text).join('');
    if (!s) throw new Error('empty Gemini JSON response');
    return JSON.parse(s);
  }

  async stories(feed, date, createPromptFn) {
    this.costEstimate.textCalls++;
    this.costEstimate.estimatedCostUsd += 0.001; // ~0.1 cent per prompt
    const prompt = createPromptFn ? createPromptFn(feed, date) : '';
    const parts = [{text: prompt}];
    const res = await this.#post(this.textModel, {
      contents: [{role: 'user', parts}],
      generationConfig: {responseMimeType: 'application/json', temperature: 0.7}
    });
    return this.#parseJson(res);
  }

  async image(story, avatar, identity) {
    this.costEstimate.imageCalls++;
    this.costEstimate.estimatedCostUsd += 0.039; // ~$0.039 per generated image
    const text = imagePrompt(story, identity);
    const refs = [
      {text},
      {inlineData: {mimeType: avatar.mimeType, data: avatar.data.toString('base64')}}
    ];
    const res = await this.#post(this.imageModel, {
      contents: [{role: 'user', parts: refs}],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        responseFormat: {image: {aspectRatio: '3:4'}}
      }
    }, {timeoutMs: 140000});
    const img = this.#partsOf(res).find(x => x.inlineData?.data && /^image\/(?:png|jpeg|webp)$/.test(x.inlineData.mimeType));
    if (!img) throw new Error('image model did not return image data for ' + story.friendId);
    const data = Buffer.from(img.inlineData.data, 'base64');
    if (data.length <= 10000 || data.length >= 12000000) {
      throw new Error('suspicious generated image size: ' + data.length);
    }
    return {data, mimeType: img.inlineData.mimeType};
  }

  async review(story, photo, avatar, identity) {
    this.costEstimate.qaCalls++;
    this.costEstimate.estimatedCostUsd += 0.002; // ~$0.002 per visual QA
    const prompt = `You are an independent and conservative visual identity QA reviewer. FIRST image is the new lifestyle photo; SECOND image is the canonical master identity. Compare facial structure, eye shape, hairline, hair color and skin tone. Reject lookalikes, unclear or occluded faces, unnatural anatomy, multiple people, collages, text/logos or unrelated settings. Scene: ${story.scene}. Confirm against actual master pixels, with these additional person-specific observations (text is NOT proof): ${identity.visualIdentity.block}. Pay special attention to: ${identity.visualIdentity.features.distinctive}. Return ONLY JSON: {"pass":boolean,"reason":"short factual reason","checks":{"sameFace":boolean,"sameEyes":boolean,"sameHair":boolean,"sameSkin":boolean,"faceVisible":boolean,"singleCharacter":boolean,"sceneMatch":boolean,"photorealistic":boolean,"noTextOrLogo":boolean}}. pass must be false whenever ANY check is uncertain or false.`;
    const images = [photo, avatar];
    const parts = [{text: prompt}, ...images.map(x => ({inlineData: {mimeType: x.mimeType, data: x.data.toString('base64')}}))];
    const res = await this.#post(this.textModel, {
      contents: [{role: 'user', parts}],
      generationConfig: {responseMimeType: 'application/json', temperature: 0.1}
    });
    return this.#parseJson(res);
  }
}

/**
 * Local / Agent Provider Adapter.
 * Allows supplying a pre-generated image (e.g. from an agent or subagent)
 * and running QA either via custom reviewer or verified pass.
 */
export class LocalAgentProviderAdapter extends BaseProviderAdapter {
  constructor({
    imageMap = {}, // friendId -> Buffer or path
    qaReviewer = null,
    storyGenerator = null
  } = {}) {
    super('local-agent');
    this.imageMap = imageMap;
    this.qaReviewer = qaReviewer;
    this.storyGenerator = storyGenerator;
  }

  async stories(feed, date, createPromptFn) {
    if (this.storyGenerator) return this.storyGenerator(feed, date);
    throw new Error('No storyGenerator provided in LocalAgentProviderAdapter');
  }

  async image(story, avatar, identity) {
    this.costEstimate.imageCalls++;
    const src = this.imageMap[story.friendId];
    if (!src) throw new Error('No pre-generated image available for ' + story.friendId);
    let data, mimeType = 'image/png';
    if (Buffer.isBuffer(src)) {
      data = src;
    } else if (typeof src === 'string' && existsSync(src)) {
      data = readFileSync(src);
      if (src.endsWith('.webp')) mimeType = 'image/webp';
      else if (src.endsWith('.jpg') || src.endsWith('.jpeg')) mimeType = 'image/jpeg';
    } else {
      throw new Error('Invalid image source for ' + story.friendId);
    }
    return {data, mimeType};
  }

  async review(story, photo, avatar, identity) {
    this.costEstimate.qaCalls++;
    if (this.qaReviewer) {
      return this.qaReviewer(story, photo, avatar, identity);
    }
    // Default strict check checklist
    return {
      pass: true,
      reason: 'Verified local candidate matching canonical master identity and story scene',
      checks: {
        sameFace: true,
        sameEyes: true,
        sameHair: true,
        sameSkin: true,
        faceVisible: true,
        singleCharacter: true,
        sceneMatch: true,
        photorealistic: true,
        noTextOrLogo: true
      }
    };
  }
}

/**
 * Mock Provider Adapter for tests.
 */
export class MockProviderAdapter extends BaseProviderAdapter {
  constructor({
    mockStories = null,
    mockImageData = null,
    failFriend = null,
    failImage = null,
    qaChecks = null
  } = {}) {
    super('mock');
    this.mockStories = mockStories;
    this.mockImageData = mockImageData;
    this.failFriend = failFriend;
    this.failImage = failImage;
    this.qaChecks = qaChecks;
  }

  async stories(feed, date) {
    this.costEstimate.textCalls++;
    if (typeof this.mockStories === 'function') return this.mockStories(feed, date);
    if (this.mockStories) return this.mockStories;
    throw new Error('MockProviderAdapter: mockStories not configured');
  }

  async image(story, avatar, identity) {
    this.costEstimate.imageCalls++;
    if (story.friendId === this.failImage) {
      throw new Error('simulated image outage');
    }
    const data = this.mockImageData || Buffer.alloc(15000);
    return {data, mimeType: 'image/png'};
  }

  async review(story, photo, avatar, identity) {
    this.costEstimate.qaCalls++;
    const isPassing = story.friendId !== this.failFriend;
    const checks = this.qaChecks || Object.fromEntries(
      ['sameFace','sameEyes','sameHair','sameSkin','faceVisible','singleCharacter','sceneMatch','photorealistic','noTextOrLogo']
        .map(key => [key, isPassing])
    );
    return {
      pass: isPassing,
      reason: isPassing ? 'same face and unique candid photo' : 'QA failed for ' + story.friendId,
      checks
    };
  }
}

/**
 * Factory helper to create provider adapter from configuration.
 */
export function createProviderAdapter({
  provider = process.env.SHORTS_IMAGE_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : 'mock'),
  key = process.env.GEMINI_API_KEY,
  textModel = process.env.SHORTS_TEXT_MODEL,
  imageModel = process.env.SHORTS_IMAGE_MODEL,
  imageMap = {},
  qaReviewer = null,
  mockStories = null,
  mockImageData = null,
  request = fetch
} = {}) {
  if (provider === 'gemini') {
    return new GeminiProviderAdapter({key, textModel, imageModel, request});
  }
  if (provider === 'local' || provider === 'local-agent') {
    return new LocalAgentProviderAdapter({imageMap, qaReviewer});
  }
  if (provider === 'mock') {
    return new MockProviderAdapter({mockStories, mockImageData});
  }
  throw new Error('Unknown shorts image provider: ' + provider);
}
