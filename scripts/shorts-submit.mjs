#!/usr/bin/env node
/**
 * Crew Shorts Submit CLI.
 * After human review of the generated preview batch, promotes approved content,
 * verifies tests, commits to a branch, and creates a GitHub PR.
 *
 * Usage:
 *   node scripts/shorts-submit.mjs --date YYYY-MM-DD [--approve] [--dry-run]
 */
import {readFileSync, existsSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {taipeiDay, FRIENDS} from './generate-shorts-daily.mjs';

function getArg(key, fallback) {
  const i = process.argv.indexOf('--' + key);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const hasFlag = flag => process.argv.includes('--' + flag);
const date = getArg('date', taipeiDay());
const dryRun = hasFlag('dry-run');
const approve = hasFlag('approve');
const root = process.cwd();
const previewDir = resolve(root, 'crew-shorts-preview', date);
const manifestPath = join(previewDir, 'manifest.json');

if (!existsSync(manifestPath)) {
  console.error(`\n[!] No preview manifest found for date: ${date}`);
  console.error(`    Run "npm run shorts:preview -- --date ${date}" first.\n`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

console.log('\n======================================================');
console.log(`  Crew Shorts PR Submission: ${date}`);
console.log('======================================================');

if (!manifest.stories || manifest.stories.length === 0) {
  console.error('[!] Manifest has no generated stories. Cannot submit.');
  process.exit(1);
}

const qaFields = ['sameFace','sameEyes','sameHair','sameSkin','faceVisible','singleCharacter','sceneMatch','photorealistic','noTextOrLogo'];
const uniqueFriends = new Set(manifest.stories.map(s => s.friendId));
if (manifest.stories.length !== FRIENDS.length || uniqueFriends.size !== FRIENDS.length || FRIENDS.some(id => !uniqueFriends.has(id))) {
  console.error('[!] Submit requires exactly ' + FRIENDS.length + ' distinct canonical Friends; incomplete preview cannot publish.');
  process.exit(1);
}
const unverified = manifest.stories.filter(s => s.qa?.pass !== true || qaFields.some(key => s.qa?.checks?.[key] !== true));
if (unverified.length > 0) {
  console.error(`[!] QA not passed for: ${unverified.map(s => s.friendId).join(', ')}`);
  console.error('    Cannot submit batch with unverified QA.');
  process.exit(1);
}

console.log(`Found ${manifest.stories.length} verified character stories for ${date}.`);
for (const s of manifest.stories) {
  console.log(`  ✓ ${s.friendName || s.friendId}: "${s.caption.slice(0, 50)}..."`);
}

if (!approve && !dryRun) {
  console.log('\n------------------------------------------------------');
  console.log('Human review required before publishing or opening PR.');
  console.log(`Please inspect: file://${join(previewDir, 'index.html')}`);
  console.log(`To confirm and open GitHub PR, run:`);
  console.log(`  npm run shorts:submit -- --date ${date} --approve`);
  console.log('------------------------------------------------------\n');
  process.exit(0);
}

if (dryRun) {
  console.log('\n[DRY RUN] Verification successful. Would stage, commit, and create PR.');
  process.exit(0);
}

console.log('\nProceeding with approved batch promotion...');

// 1. Promote images to approved directory
const approvedDir = resolve(root, 'content/crew-shorts/approved');
const approvedFeedFile = join(approvedDir, 'posts.json');
const approvedFeed = JSON.parse(readFileSync(approvedFeedFile, 'utf8'));

// Preserve the full canonical roster in submitted batches.
if (manifest.stories.length !== FRIENDS.length) {
  console.error(`[!] Batch contains only ${manifest.stories.length} stories. Full publication requires all canonical Friends.`);
  console.error('    For single-character previews, keep them in preview mode until every Friend is ready.');
  process.exit(1);
}

// Re-run generateDaily in publish mode using the staged preview images/stories
const {generateDaily} = await import('./generate-shorts-daily.mjs');
const {LocalAgentProviderAdapter} = await import('./shorts-provider-adapter.mjs');

const imageMap = Object.fromEntries(
  manifest.stories.map(s => [s.friendId, join(previewDir, s.friendId + '.webp')])
);

const adapter = new LocalAgentProviderAdapter({
  imageMap,
  storyGenerator: () => ({stories: manifest.stories}),
  // A reviewed manifest is evidence; the default local adapter must never self-approve QA.
  qaReviewer: story => {
    const candidate = manifest.stories.find(s => s.friendId === story.friendId);
    if (!candidate || candidate.qa?.pass !== true || qaFields.some(key => candidate.qa?.checks?.[key] !== true))
      throw Error('Missing approved visual QA for ' + story.friendId);
    return candidate.qa;
  }
});

await generateDaily({
  root,
  date,
  mode: 'publish',
  client: adapter
});

console.log('✓ Approved posts and media updated.');

// 2. Publish Pages
console.log('Updating Cloudflare Pages shorts feed...');
execFileSync('node', ['scripts/publish-shorts-pages.mjs', '--as-of', date], {cwd: root, stdio: 'inherit'});

// 3. Run validation tests
console.log('Running regression and client tests...');
execFileSync('npm', ['test'], {cwd: root, stdio: 'inherit'});

// 4. Git Branch, Commit, and PR
const branch = `feat/shorts-${date}`;
console.log(`Creating branch: ${branch}`);
try {
  execFileSync('git', ['checkout', '-b', branch], {cwd: root, stdio: 'inherit'});
} catch {
  execFileSync('git', ['checkout', branch], {cwd: root, stdio: 'inherit'});
}

execFileSync('git', ['add', '-A', 'content/crew-shorts/approved', 'features/teacher/shorts'], {cwd: root, stdio: 'inherit'});

const commitMsg = `content(shorts): publish approved daily stories for ${date}`;
execFileSync('git', ['commit', '-m', commitMsg], {cwd: root, stdio: 'inherit'});
console.log('✓ Committed changes.');

// 5. Open GitHub PR via gh CLI
console.log('Pushing branch and creating GitHub PR...');
execFileSync('git', ['push', '-u', 'origin', branch], {cwd: root, stdio: 'inherit'});

const prTitle = `content(shorts): approved daily stories for ${date}`;
const prBody = `## Crew Shorts Daily Update — ${date}

### Included Stories
${manifest.stories.map(s => `- **${s.friendName || s.friendId}**: ${s.caption} (ZH: ${s.translationZh})`).join('\n')}

### Quality Checklist
- [x] All ${FRIENDS.length} characters pass Character Identity v2 SHA check
- [x] 3:4 portrait aspect ratio verified
- [x] WebP size ≤ 350 KiB
- [x] Visual QA 9/9 checks passed
- [x] Human review confirmed
`;

const prResult = execFileSync('gh', ['pr', 'create', '--title', prTitle, '--body', prBody, '--head', branch, '--base', 'master'], {cwd: root, encoding: 'utf8'});
console.log(`\n🎉 GitHub PR created successfully!\n${prResult.trim()}\n`);
