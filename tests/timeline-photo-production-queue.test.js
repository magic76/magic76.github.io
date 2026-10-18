const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const canon=require("../contracts/crew-timeline/v1.json");
const queue=require("../contracts/crew-timeline/fullbody-photo-queue-v1.json");

test("all twelve Mira ages have distinct standalone full-body production tasks",()=>{
 const ages=canon.character.ages;
 assert.deepEqual(queue.ages,ages);
 assert.deepEqual(queue.tasks.map(x=>x.age),ages);
 assert.equal(new Set(queue.tasks.map(x=>x.prompt)).size,12);
 for(const task of queue.tasks){
  assert.equal(task.reviewStatus,"not-generated",String(task.age));
  assert.deepEqual(task.targetPixels,[900,1200]);
  assert.equal(task.aspectRatio,"3:4");
  assert.equal(task.maxBytes,350000);
  assert.match(task.prompt,/ONE independent camera photograph ONLY/);
  assert.match(task.prompt,/BOTH complete shoes visible/);
  assert.match(task.prompt,/NO text, titles, letters, numerals, panels, grids/);
  assert.match(task.prompt,/OFFICIAL six age-specific Mira portrait files/);
  assert.equal(task.qc.sourceIsStandalone,false);
  assert.equal(task.qc.faceConsistent,false);
  assert.equal(task.qc.webpValidated,false);
 }
});

test("every supplied character reference is a real published Mira portrait, not a collage",()=>{
 const approved=new Set(canon.character.portraits.map(x=>x.webPath));
 for(const task of queue.tasks)for(const ref of task.references){
  assert.ok(approved.has(ref.repoPath),"Unapproved reference for age "+task.age+": "+ref.repoPath);
  assert.ok(fs.existsSync(path.resolve(__dirname,"..",ref.repoPath)));
 }
});

test("photo queue is mirrored across Android and Web paths",()=>{
 for(const task of queue.tasks){
  assert.equal(task.targetWebPath,"assets/timeline/fullbody/mira-"+task.age+".webp");
  assert.equal(task.targetAndroidPath,"app/src/main/assets/timeline/fullbody/mira-"+task.age+".webp");
 }
});
