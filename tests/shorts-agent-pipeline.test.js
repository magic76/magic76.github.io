const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

const script = path.resolve(__dirname, '../scripts/generate-shorts-daily.mjs');
const adapterScript = path.resolve(__dirname, '../scripts/shorts-provider-adapter.mjs');
const htmlReportScript = path.resolve(__dirname, '../scripts/shorts-html-report.mjs');
const friends = ['zoe', 'bella', 'hugo', 'theo', 'yuna'];

function setup(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'crew-shorts-pipeline-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const approved = path.join(root, 'content/crew-shorts/approved');
  fs.mkdirSync(path.join(approved, 'media'), {recursive: true});
  const avatars = path.join(root, 'assets/friends');
  fs.mkdirSync(avatars, {recursive: true});
  const day = '2026-10-14';
  const posts = friends.map(friend => ({
    id: friend + '-seed',
    friendId: friend,
    friendName: friend[0].toUpperCase() + friend.slice(1),
    caption: 'Prior day story for ' + friend,
    translationZh: '之前的故事',
    image: 'media/' + friend + '.webp',
    imageAlt: 'At home with familiar objects',
    publishedAt: day + 'T08:00:00+08:00',
    language: 'en',
    storyId: friend + '-arc'
  }));
  fs.writeFileSync(path.join(approved, 'posts.json'), JSON.stringify({schema: 1, kind: 'crew-shorts', source: 'seed', posts}));

  const identities = path.join(root, 'content/character-identities');
  fs.mkdirSync(path.join(identities, 'v2/friends'), {recursive: true});
  fs.copyFileSync(path.join(__dirname, '../content/character-identities/manifest.json'), path.join(identities, 'manifest.json'));

  for (const friend of friends) {
    fs.copyFileSync(path.join(__dirname, '../assets/friends/crew_friend_' + friend + '.webp'), path.join(avatars, 'crew_friend_' + friend + '.webp'));
    fs.copyFileSync(path.join(__dirname, '../content/character-identities/v2/friends/' + friend + '.json'), path.join(identities, 'v2/friends/' + friend + '.json'));
  }
  const encode = (src, dst) => {
    fs.copyFileSync(path.join(__dirname, '../content/crew-shorts/approved/media/zoe-day1.webp'), dst);
    return fs.readFileSync(dst);
  };
  return {root, approved, encode};
}

test('LocalAgentProviderAdapter and retry loop recovers from a transient QA failure', async t => {
  const {root, encode} = setup(t);
  const {generateDaily} = await import(pathToFileURL(script));
  const {LocalAgentProviderAdapter} = await import(pathToFileURL(adapterScript));

  const dummyImage = fs.readFileSync(path.join(__dirname, '../content/crew-shorts/approved/media/zoe-day1.webp'));
  let reviewCalls = 0;

  const adapter = new LocalAgentProviderAdapter({
    imageMap: {
      zoe: dummyImage
    },
    qaReviewer: async (story) => {
      reviewCalls++;
      // First attempt fails QA, second attempt passes QA
      if (reviewCalls === 1) {
        return {
          pass: false,
          reason: 'simulated transient occlusion in first attempt',
          checks: {sameFace: false, sameEyes: true, sameHair: true, sameSkin: true, faceVisible: true, singleCharacter: true, sceneMatch: true, photorealistic: true, noTextOrLogo: true}
        };
      }
      return {
        pass: true,
        reason: 'same face and verified features',
        checks: Object.fromEntries(['sameFace','sameEyes','sameHair','sameSkin','faceVisible','singleCharacter','sceneMatch','photorealistic','noTextOrLogo'].map(k => [k, true]))
      };
    }
  });

  const draft = {
    friendId: 'zoe',
    caption: 'I rescued that vintage lamp. It works, but only if I compliment it first.',
    translationZh: '我把那盞復古檯燈帶回家了。它會亮，但好像得先稱讚它。',
    scene: 'Zoe in her cozy London apartment checking a vintage brass desk lamp.',
    imageAlt: 'Zoe adjusting a vintage brass desk lamp in her London apartment.',
    storyContext: 'Yesterday Zoe found the lamp in a thrift shop.'
  };

  const report = await generateDaily({
    root,
    date: '2026-10-20',
    mode: 'preview',
    friend: 'zoe',
    previewStory: draft,
    client: adapter,
    encode,
    maxRetries: 2
  });

  assert.equal(report.status, 'preview-ready');
  assert.equal(reviewCalls, 2);
  assert.equal(report.stories[0].attempts, 2);
  assert.equal(report.stories[0].qa.pass, true);
  assert.ok(fs.existsSync(path.join(root, 'crew-shorts-preview/2026-10-20/index.html')));
});

test('renderHtmlReport produces responsive review dashboard with official avatar and QA checklist', async t => {
  const {root} = setup(t);
  const {renderHtmlReport} = await import(pathToFileURL(htmlReportScript));

  const manifest = {
    date: '2026-10-20',
    mode: 'preview',
    status: 'preview-ready',
    costEstimate: {estimatedCostUsd: 0.041},
    stories: [
      {
        friendId: 'zoe',
        friendName: 'Zoe',
        caption: 'Rescued a vintage lamp.',
        translationZh: '帶回一盞復古檯燈。',
        image: 'media/zoe-2026-10-20.webp',
        imageAlt: 'Zoe inspecting a brass lamp',
        scene: 'Cozy London apartment with warm light',
        attempts: 1,
        qa: {
          pass: true,
          reason: 'Identical facial contours and styling',
          checks: {sameFace: true, sameEyes: true, sameHair: true, sameSkin: true, faceVisible: true, singleCharacter: true, sceneMatch: true, photorealistic: true, noTextOrLogo: true}
        }
      }
    ]
  };

  const dir = path.join(root, 'crew-shorts-preview/2026-10-20');
  const reportPath = renderHtmlReport(manifest, dir, root);
  assert.ok(fs.existsSync(reportPath));
  const content = fs.readFileSync(reportPath, 'utf8');

  assert.match(content, /Crew Shorts Quality Inspection Report/);
  assert.match(content, /Zoe/);
  assert.match(content, /Rescued a vintage lamp/);
  assert.match(content, /帶回一盞復古檯燈/);
  assert.match(content, /Official Master Identity/);
  assert.match(content, /Visual Identity QA Breakdown/);
  assert.match(content, /sameFace/);
  assert.match(content, /Estimated Cost: <strong>\$0\.0410/);
});

test('editTextOnly updates captions without invoking image generator', async t => {
  const {root, encode} = setup(t);
  const {generateDaily} = await import(pathToFileURL(script));

  const dir = path.join(root, 'crew-shorts-preview/2026-10-20');
  fs.mkdirSync(dir, {recursive: true});
  fs.copyFileSync(path.join(__dirname, '../content/crew-shorts/approved/media/zoe-day1.webp'), path.join(dir, 'zoe.webp'));

  let imageGenerated = false;
  const client = {
    image: async () => {
      imageGenerated = true;
      throw new Error('image() should not be called when editTextOnly is true and image exists');
    },
    review: async () => ({
      pass: true,
      reason: 'confirmed',
      checks: Object.fromEntries(['sameFace','sameEyes','sameHair','sameSkin','faceVisible','singleCharacter','sceneMatch','photorealistic','noTextOrLogo'].map(k => [k, true]))
    })
  };

  const draft = {
    friendId: 'zoe',
    caption: 'New edited witty caption that was refined without re-rendering.',
    translationZh: '未重新繪圖的修訂文字說明。',
    scene: 'Zoe in London examining a brass lamp.',
    imageAlt: 'Zoe inspecting a desk lamp in her apartment.'
  };

  const report = await generateDaily({
    root,
    date: '2026-10-20',
    mode: 'preview',
    friend: 'zoe',
    previewStory: draft,
    client,
    encode,
    editTextOnly: true
  });

  assert.equal(report.status, 'preview-ready');
  assert.equal(imageGenerated, false);
  assert.equal(report.stories[0].caption, draft.caption);
});

test('full 5-character batch pipeline generates stories, photos and review report', async t => {
  const {root, encode} = setup(t);
  const {generateDaily, taipeiDay} = await import(pathToFileURL(script));
  const {MockProviderAdapter} = await import(pathToFileURL(adapterScript));

  const mockStories = {
    stories: [
      {
        friendId: 'zoe',
        caption: 'Rescued a vintage lamp. It works if complimented.',
        translationZh: '帶回一盞復古檯燈。稱讚它才會亮。',
        scene: 'Zoe inspecting a desk lamp in her London flat.',
        imageAlt: 'Zoe adjusting a brass desk lamp.'
      },
      {
        friendId: 'bella',
        caption: 'Spontaneous ceramic pottery class. My mug is leaning.',
        translationZh: '突發奇想的陶藝課。我的馬克杯有點歪。',
        scene: 'Bella at a pottery wheel laughing with clay-covered hands.',
        imageAlt: 'Bella shaping pottery on a wheel.'
      },
      {
        friendId: 'hugo',
        caption: 'Tried sourdough focaccia today. Olive oil everywhere.',
        translationZh: '今天試做酸種佛卡夏。橄欖油到處都是。',
        scene: 'Hugo in a bright kitchen dimpling rosemary focaccia dough.',
        imageAlt: 'Hugo preparing focaccia dough with rosemary.'
      },
      {
        friendId: 'theo',
        caption: 'Found an old Walkman at the market. Time to replace belts.',
        translationZh: '在市集找到舊隨身聽。該換皮帶了。',
        scene: 'Theo at his workbench examining a vintage cassette player.',
        imageAlt: 'Theo repairing a cassette player with precision screwdrivers.'
      },
      {
        friendId: 'yuna',
        caption: 'Repotting my monstera into ceramic. It needed more room.',
        translationZh: '把龜背芋換到陶盆裡。它需要更多空間生長。',
        scene: 'Yuna on a sunny balcony potting a lush green plant.',
        imageAlt: 'Yuna pressing soil into a terracotta pot with a monstera.'
      }
    ]
  };

  const today = taipeiDay();
  const dummyImage = fs.readFileSync(path.join(__dirname, '../content/crew-shorts/approved/media/zoe-day1.webp'));
  const adapter = new MockProviderAdapter({
    mockStories,
    mockImageData: dummyImage
  });

  const report = await generateDaily({
    root,
    date: today,
    mode: 'preview',
    client: adapter,
    encode
  });

  assert.equal(report.status, 'preview-ready');
  assert.equal(report.stories.length, 5);
  for (const s of report.stories) {
    assert.equal(s.qa.pass, true);
    assert.ok(fs.existsSync(path.join(root, 'crew-shorts-preview', today, s.friendId + '.webp')));
  }
  const htmlPath = path.join(root, 'crew-shorts-preview', today, 'index.html');
  assert.ok(fs.existsSync(htmlPath));
  const html = fs.readFileSync(htmlPath, 'utf8');
  for (const id of ['zoe', 'bella', 'hugo', 'theo', 'yuna']) {
    assert.match(html, new RegExp(id, 'i'));
  }
});

