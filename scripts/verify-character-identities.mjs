#!/usr/bin/env node
// Validate official identity references and source integrity; no image API calls.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
const root=process.cwd();
const dir=join(root,"content/character-identities");
const m=JSON.parse(readFileSync(join(dir,"manifest.json"),"utf8"));
const expectedCounts={friend:16,teacher:16};
assert.equal(m.schemaVersion,2);
assert.equal(m.version,'v2');
assert.equal(m.characters.length,32);
assert.equal(new Set(m.characters.map(x=>x.role+":"+x.id)).size,32);
for(const role of ["friend","teacher"]){
 const members=m.characters.filter(x=>x.role===role);
 assert.equal(members.length,expectedCounts[role],role+" count");
 const portraitDir=join(root,role==="friend"?"assets/friends":"assets/teacher");
 const paths=readdirSync(portraitDir).filter(x=>role==="friend"?/^crew_friend_[a-z]+\.webp$/.test(x):/^teacher-[a-z]+\.(webp|jpg)$/.test(x));
 assert.equal(paths.length,expectedCounts[role],role+" official portrait count");
 for(const entry of members){
  const file=resolve(dir,entry.identityPath);
  assert.ok(file.startsWith(dir+"/"),"identity path escapes directory");
  const identity=JSON.parse(readFileSync(file,"utf8"));
  assert.equal(identity.schemaVersion,2);
  assert.equal(identity.identityId,"crew-"+role+"-"+entry.id+"-v2");
  assert.equal(identity.role,role);
  assert.equal(identity.characterId,entry.id);
  assert.equal(identity.state,"canonical_master_bound_not_trained");
  assert.equal(identity.externalCharacterModel.status,"not_created");
  assert.equal(identity.generation.masterImageAttachmentRequired,true);
  assert.equal(identity.generation.promptOnlyGenerationForbidden,true);
  assert.ok(identity.visualIdentity.block.length>250);
  assert.ok(identity.visualIdentity.negativeIdentity.length>80);
  assert.equal(identity.generation.masterImageAttachmentRequired,true);
  for(const key of m.visualIdentityFields){
    assert.ok(typeof identity.visualIdentity.features?.[key]==='string'&&identity.visualIdentity.features[key].length>=30,entry.id+" missing "+key);
  }
  assert.ok(identity.identitySource?.authority.includes('portrait pixels'),entry.id+" authority");
  const v1=JSON.parse(readFileSync(join(dir,"v1",role==="friend"?"friends":"teachers",entry.id+".json"),"utf8"));
  assert.equal(v1.source.path,identity.source.path,entry.id+" source changed");
  assert.equal(v1.source.gitBlobSha,identity.source.gitBlobSha,entry.id+" master SHA changed");
  assert.equal(v1.referenceSet.master.sourcePath,identity.referenceSet.master.sourcePath,entry.id+" reference modified");
  assert.equal(identity.referenceSet.master.status,"canonical_verified");
  assert.equal(identity.referenceSet.master.sourcePath,identity.source.path);
  for(const perspective of ["threeQuarter","sideProfile","naturalSmile","candid"]){
    assert.equal(identity.referenceSet[perspective].status,"needs_human_review");
  }
  assert.ok(paths.includes(identity.source.path.split("/").at(-1)),"portrait path must exist");
  const raw=readFileSync(join(root,identity.source.path));
  const realSha=createHash("sha1").update(Buffer.concat([Buffer.from("blob "+raw.length),Buffer.from([0]),raw])).digest("hex");
  assert.equal(realSha,identity.source.gitBlobSha,entry.id+" master portrait unexpectedly changed");
  assert.ok(identity.source.pinnedRawUrl.includes("/"+m.referenceBaseCommit+"/"),entry.id+" pinned source version");
 }
}
console.log("PASS: 32 identities (16 Friends + 16 Teachers), official portrait Git blob SHA integrity, all generation gates.");
