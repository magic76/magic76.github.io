const test=require("node:test");
const assert=require("node:assert/strict");
const crypto=require("node:crypto");
const fs=require("node:fs");
const path=require("node:path");
const contract=require("../contracts/crew-timeline/v1.json");
const manifest=require("../contracts/crew-timeline/fullbody-approved-images-v1.json");
const {check,dimensions}=require("../scripts/check-mira-photo-assets.cjs");
const root=path.resolve(__dirname,"..");
const AGES=[7,10,13,16,19,22,25,35,40,50,55,70];
const clone=()=>JSON.parse(JSON.stringify(contract));

test("current Mira release inventory contains only reviewed published portraits",()=>{
 assert.deepEqual(check(root,contract),[]);
 assert.equal(contract.character.fullBodyPhotoPlan.length,contract.character.ages.length);
});

test("all twelve standalone WebPs match the approved 900x1200 image fingerprints",()=>{
 assert.deepEqual(contract.character.ages,AGES);
 assert.deepEqual(contract.character.fullBodyPhotoPlan.map(p=>p.age),AGES);
 assert.deepEqual(manifest.images.map(image=>image.age),AGES);
 assert.equal(manifest.userApproval.status,"accepted");
 for(const image of manifest.images){
  const photo=fs.readFileSync(path.join(root,image.webTarget));
  assert.equal(photo.length,image.sizeBytes,"age "+image.age+" byte size");
  assert.equal(crypto.createHash("sha256").update(photo).digest("hex"),image.sha256,"age "+image.age+" SHA-256");
  assert.deepEqual(dimensions(photo),{w:900,h:1200},"age "+image.age+" exact dimensions");
  const plan=contract.character.fullBodyPhotoPlan.find(p=>p.age===image.age);
  assert.equal(plan.status,"approved","age "+image.age+" status");
  assert.ok(["onePerson","sameIdentity","ageAppearance","fullBodyAndFeet","noTextOrCollage"].every(key=>plan.review?.[key]===true),"age "+image.age+" manual review");
 }
});

test("image cannot be marked approved without all five manual identity/composition checks",()=>{
 const copy=clone();
 const first=copy.character.fullBodyPhotoPlan[0];
 first.status="approved";
 first.review={onePerson:true,sameIdentity:false,ageAppearance:true,fullBodyAndFeet:true,noTextOrCollage:true};
 assert.match(check(root,copy).join(" "),/manual review is not fully approved/);
});

test("even human-approved entries require a real standalone WebP file",()=>{
 const copy=clone();
 const first=copy.character.fullBodyPhotoPlan[0];
 first.status="approved";
 first.review={onePerson:true,sameIdentity:true,ageAppearance:true,fullBodyAndFeet:true,noTextOrCollage:true};
 assert.match(check(path.join(root,"tests"),copy).join(" "),/full-body asset missing/);
});

test("rejects non-WebP images as official stage photographs",()=>{
 assert.throws(()=>dimensions(Buffer.from("not a photo")),/not a RIFF WebP/);
});
