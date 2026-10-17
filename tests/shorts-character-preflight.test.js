'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const script='scripts/inspect-shorts-character.mjs';

test('Bella v2 preflight checks actual immutable master and outputs the complete scene prompt without Gemini',()=>{
 const result=JSON.parse(execFileSync(process.execPath,[script,'--friend','bella','--date','2026-10-17'],{cwd:root,encoding:'utf8',env:{...process.env,GEMINI_API_KEY:''}}));
 assert.equal(result.identityId,'crew-friend-bella-v2');
 assert.equal(result.master.path,'assets/friends/crew_friend_bella.webp');
 assert.equal(result.master.gitBlobSha,'5f81b2852e9105497250e1290045231273dec21a');
 assert.equal(result.master.integrity,'verified');
 assert.ok(result.master.byteLength>1000);
 assert.match(result.prompt,/blue-green eyes/i);
 assert.match(result.prompt,/golden-blonde/i);
 assert.match(result.prompt,/nose:.*tip/i);
 assert.match(result.prompt,/Identity-specific changes to forbid/);
 assert.match(result.prompt,/picnic/i);
 assert.equal(result.matchingPosts,2);
 assert.equal(result.caption,'I stopped for one scoop. The second scoop made a very convincing argument.');
 assert.equal(result.paidApiCalls,0);
 assert.equal(result.imagesGenerated,0);
 assert.equal(result.imagesPublished,0);
 assert.equal(result.previousShortsImageUsedAsReference,false);
});

test('preflight refuses unknown people and dates with no approved story',()=>{
 assert.throws(()=>execFileSync(process.execPath,[script,'--friend','unknown'],{cwd:root,stdio:'pipe'}),/Command failed/);
 assert.throws(()=>execFileSync(process.execPath,[script,'--date','2044-01-01'],{cwd:root,stdio:'pipe'}),/Command failed/);
});
