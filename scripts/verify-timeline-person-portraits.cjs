#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),canonical='contracts/crew-timeline/person-portraits-v1.json';
const bytes=fs.readFileSync(path.join(root,canonical));
const manifest=JSON.parse(bytes),ages=[7,10,13,16,19,22,25,35,40,50,55,70];
assert.equal(manifest.schemaVersion,1);assert.equal(manifest.images.length,24);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const isHash=h=>typeof h==='string'&&/^[0-9a-f]{64}$/.test(h);
function dimensions(b){
 assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');
 switch(b.toString('ascii',12,16)){
  case 'VP8X':return [1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)];
  case 'VP8 ':assert.equal(b.toString('hex',23,26),'9d012a');return [b.readUInt16LE(26)&16383,b.readUInt16LE(28)&16383];
  case 'VP8L':assert.equal(b[20],47);return [1+(((b[22]&63)<<8)|b[21]),1+(((b[24]&15)<<10)|(b[23]<<2)|((b[22]&192)>>6))];
  default:throw Error('unsupported WebP');
 }
}
let pending=0,approved=0,present=0;
for(const id of ['ethan','hana']){
 const anchor=manifest.anchors[id];assert.equal(anchor.age,25);assert.ok(anchor.sha256===null||isHash(anchor.sha256));
 const entries=manifest.images.filter(e=>e.characterId===id);assert.deepEqual(entries.map(e=>e.age),ages);
 for(const entry of entries){
  assert.ok(['pending-human-review','approved','rejected'].includes(entry.status));
  const allow=entry.status==='approved';allow?approved++:pending++;
  if(allow){
   assert.equal(anchor.status,'approved','identity anchor must be human-approved first');
   assert.ok(entry.humanApproval?.reviewer.trim());assert.ok(Number.isFinite(Date.parse(entry.humanApproval.reviewedAt)));
   assert.equal(entry.humanApproval.fullbodySha256,entry.fullbody.sha256);
   assert.equal(entry.humanApproval.avatarSha256,entry.avatar.sha256);
   assert.equal(entry.anchorSha256,anchor.sha256);assert.ok(isHash(entry.anchorSha256));
  }else assert.equal(entry.humanApproval,null,'unapproved entry must not claim human approval');
  let pair=0;
  for(const [kind,w,h,max] of [['fullbody',900,1200,350000],['avatar',320,320,80000]]){
   const asset=entry[kind],expected=`timeline/${kind==='avatar'?'avatars':kind}/${id}-${entry.age}.webp`;
   assert.equal(asset.path,expected);assert.equal(asset.width,w);assert.equal(asset.height,h);
   const file=path.join(root,'assets',expected);
   if(!fs.existsSync(file)){
    assert.ok(!allow,'approved file is missing');assert.equal(asset.sha256,null);assert.equal(asset.sizeBytes,null);continue;
   }
   const data=fs.readFileSync(file);assert.ok(data.length>0&&data.length<max);assert.equal(data.length,asset.sizeBytes);
   assert.equal(hash(data),asset.sha256);assert.deepEqual(dimensions(data),[w,h]);present++;pair++;
  }
  assert.ok(pair===0||pair===2,'fullbody and same-source avatar must arrive together');
  if(pair===2){
   assert.equal(entry.avatar.sourceSha256,entry.fullbody.sha256);assert.equal(entry.anchorSha256,anchor.sha256);
   const c=entry.avatar.crop;assert.ok(c&&[c.x,c.y,c.width,c.height].every(Number.isInteger));
   assert.ok(c.x>=0&&c.y>=0&&c.width>0&&c.width===c.height&&c.x+c.width<=900&&c.y+c.height<=1200);
   if(entry.age===25)assert.equal(entry.fullbody.sha256,anchor.sha256,'25-year anchor must identify the canonical fullbody');
  }
 }
}
console.log(`Timeline person portraits: ${approved} human-approved, ${pending} held as placeholders, ${present} validated files.`);
