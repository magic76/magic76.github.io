#!/usr/bin/env node
/**
 * Crew Shorts Review CLI.
 * Inspects generated preview artifacts, prints terminal summary, and shows HTML review report.
 *
 * Usage:
 *   node scripts/shorts-review.mjs [--date YYYY-MM-DD]
 */
import {readFileSync, existsSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {taipeiDay} from './generate-shorts-daily.mjs';

function getArg(key, fallback) {
  const i = process.argv.indexOf('--' + key);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const date = getArg('date', taipeiDay());
const root = process.cwd();
const previewDir = resolve(root, 'crew-shorts-preview', date);
const manifestPath = join(previewDir, 'manifest.json');
const htmlPath = join(previewDir, 'index.html');

if (!existsSync(manifestPath)) {
  console.error(`\n[!] No preview manifest found for date: ${date}`);
  console.error(`    Looked at: ${manifestPath}`);
  console.error(`    Run "npm run shorts:preview -- --date ${date}" first.\n`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

console.log('\n======================================================');
console.log(`  Crew Shorts Quality & Review Report: ${date}`);
console.log('======================================================');
console.log(`Status        : ${manifest.status}`);
console.log(`Mode          : ${manifest.mode}`);
console.log(`Characters    : ${manifest.stories?.length || 0}`);
if (manifest.costEstimate?.estimatedCostUsd !== undefined) {
  console.log(`Estimated Cost: $${manifest.costEstimate.estimatedCostUsd.toFixed(4)} USD`);
}
console.log('------------------------------------------------------');

for (const story of manifest.stories || []) {
  const name = story.friendName || story.friendId.toUpperCase();
  const qaPass = story.qa?.pass ? 'PASS ✓' : 'FAIL ✗';
  console.log(`\n[${name}] QA: ${qaPass} (Attempts: ${story.attempts || 1})`);
  console.log(`  EN: "${story.caption}"`);
  console.log(`  ZH: "${story.translationZh}"`);
  console.log(`  Photo: ${story.image || story.friendId + '.webp'}`);
  if (story.qa?.reason) {
    console.log(`  Reason: ${story.qa.reason}`);
  }
  if (story.qa?.checks) {
    const failedChecks = Object.entries(story.qa.checks).filter(([, v]) => !v).map(([k]) => k);
    if (failedChecks.length > 0) {
      console.log(`  Unverified checks: ${failedChecks.join(', ')}`);
    }
  }
}

console.log('\n------------------------------------------------------');
if (existsSync(htmlPath)) {
  console.log(`HTML Review Report: file://${htmlPath}`);
}
console.log(`Manifest File     : file://${manifestPath}`);
console.log('======================================================');
console.log(`\nNext step to submit PR after human review:`);
console.log(`  npm run shorts:submit -- --date ${date}\n`);
