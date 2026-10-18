const test=require("node:test");
const assert=require("node:assert/strict");
const path=require("node:path");
const contract=require("../contracts/crew-timeline/v1.json");
const {check,dimensions}=require("../scripts/check-mira-photo-assets.cjs");
const root=path.resolve(__dirname,"..");
const clone=()=>JSON.parse(JSON.stringify(contract));

test("current Mira release inventory contains only reviewed published portraits",()=>{
 assert.deepEqual(check(root,contract),[]);
 assert.equal(contract.character.fullBodyPhotoPlan.length,contract.character.ages.length);
});

test("image cannot be marked approved without all five manual identity/composition checks",()=>{
 const copy=clone();
 copy.character.fullBodyPhotoPlan[0].status="approved";
 assert.match(check(root,copy).join(" "),/manual review is not fully approved/);
});

test("even human-approved entries require a real standalone WebP file",()=>{
 const copy=clone();
 const first=copy.character.fullBodyPhotoPlan[0];
 first.status="approved";
 first.review={onePerson:true,sameIdentity:true,ageAppearance:true,fullBodyAndFeet:true,noTextOrCollage:true};
 assert.match(check(root,copy).join(" "),/full-body asset missing/);
});

test("rejects non-WebP images as official stage photographs",()=>{
 assert.throws(()=>dimensions(Buffer.from("not a photo")),/not a RIFF WebP/);
});
