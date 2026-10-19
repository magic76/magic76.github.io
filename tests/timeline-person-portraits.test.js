const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const policy=import('../web-spa/src/timeline/portraitAssetPolicy.mjs');
const manifest=require('../contracts/crew-timeline/person-portraits-v1.json');
test('committed portrait inventory passes file/hash/dimension and same-source provenance verification',()=>{
 require('node:child_process').execFileSync(process.execPath,['scripts/verify-timeline-person-portraits.cjs'],{cwd:require('node:path').resolve(__dirname,'..')});
});
function fixture(){
 const data=Buffer.alloc(30);data.write('RIFF');data.writeUInt32LE(22,4);data.write('WEBPVP8X',8);data.writeUIntLE(899,24,3);data.writeUIntLE(1199,27,3);
 const sha=crypto.createHash('sha256').update(data).digest('hex');
 const row={characterId:'ethan',age:25,status:'approved',anchorSha256:sha,humanApproval:{reviewer:'human-reviewer',reviewedAt:'2026-10-19T12:00:00Z',fullbodySha256:sha,avatarSha256:'b'.repeat(64)},fullbody:{path:'timeline/fullbody/ethan-25.webp',width:900,height:1200,sizeBytes:30,sha256:sha},avatar:{path:'timeline/avatars/ethan-25.webp',width:320,height:320,sizeBytes:20,sha256:'b'.repeat(64),sourceSha256:sha,crop:{x:300,y:30,width:200,height:200}}};
 return {data,row,contract:{schemaVersion:1,anchors:{ethan:{age:25,status:'approved',sha256:sha}},images:[row]}};
}
test('all 24 new stages remain blocked until explicit human approval',async()=>{
 const {approvedPortrait}=await policy;
 assert.equal(manifest.images.length,24);
 const pending=structuredClone(manifest);
 for(const row of pending.images){row.status='pending-human-review';row.humanApproval=null;}
 for(const row of pending.images)for(const kind of ['fullbody','avatar'])assert.equal(approvedPortrait(pending,row.characterId,row.age,kind),null);
});
test('human review must bind both files, anchor, exact paths and a real crop',async()=>{
 const {approvedPortrait}=await policy;
 for(const mutate of [r=>r.status='pending-human-review',r=>r.humanApproval=null,r=>r.humanApproval.reviewer='',r=>r.humanApproval.fullbodySha256='c'.repeat(64),r=>r.anchorSha256=null,r=>r.avatar.sourceSha256=null,r=>r.avatar.crop=null,r=>r.avatar.crop.x=900,r=>r.fullbody.path='timeline/fullbody/mira-25.webp',r=>r.fullbody.width=899,r=>r.avatar.sizeBytes=80000]){
  const {row,contract}=fixture();mutate(row);assert.equal(approvedPortrait(contract,'ethan',25,'fullbody'),null);
 }
 const {row,contract}=fixture();assert.equal(approvedPortrait(contract,'ethan',25,'fullbody'),row.fullbody);
 assert.equal(approvedPortrait(contract,'hana',25,'fullbody'),null);
 contract.images.push(row);assert.equal(approvedPortrait(contract,'ethan',25,'fullbody'),null);
});
test('only verified bytes become image blobs; missing, wrong size, dimensions and hashes fail closed',async()=>{
 const {verifiedPortraitBlob}=await policy;const {data,row}=fixture();
 const fetcher=async()=>new Response(data);
 assert.ok(await verifiedPortraitBlob(row.fullbody,fetcher));
 assert.equal(await verifiedPortraitBlob(row.fullbody,async()=>new Response('not found',{status:404})),null);
 assert.equal(await verifiedPortraitBlob({...row.fullbody,sizeBytes:999},fetcher),null);
 assert.equal(await verifiedPortraitBlob({...row.fullbody,width:320},fetcher),null);
 assert.equal(await verifiedPortraitBlob({...row.fullbody,sha256:'c'.repeat(64)},fetcher),null);
 assert.equal(await verifiedPortraitBlob(row.fullbody,async()=>{throw Error('offline')}),null);
});
