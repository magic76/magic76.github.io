const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const fortune=p=>"web-spa/src/fortune/"+p;
function load(file,names,bindings={}){
 const code=stripTypeScriptTypes(read(fortune(file)),{mode:"strip"})
  .replace(/^\s*import\s+[^\n]*;\s*$/gm,"")
  .replace(/^\s*export\s+/gm,"");
 return Function(...Object.keys(bindings),code+"\nreturn {"+names.join(",")+"};")(...Object.values(bindings));
}
const i18n=load("fortuneJourneyI18n.ts",["fortuneCopy","fortuneLocale","fortuneTrait","fortuneInvitation","fortuneChallenge","fortuneTextShareLabels","assertFortuneCopyComplete","fortuneModeLabel"]);
const identity=load("identity.ts",["buildFortuneIdentity"]);
const artwork=load("identityArtwork.ts",["identityArtworkUrl"]);
const model=load("fortuneCardModel.ts",["buildFortuneCardModel","FORTUNE_ARCHETYPE_TRAITS"],{
 buildFortuneIdentity:identity.buildFortuneIdentity,identityArtworkUrl:artwork.identityArtworkUrl,
 fortuneCopy:i18n.fortuneCopy,fortuneLocale:i18n.fortuneLocale,fortuneModeLabel:i18n.fortuneModeLabel,fortuneTrait:i18n.fortuneTrait
});
const invite=load("fortuneInvite.ts",["fortuneInviteUrl","parseFortuneInvite","publicFortuneCard","fortuneInviteNextUrl"],{
 buildFortuneIdentity:identity.buildFortuneIdentity,FORTUNE_ARCHETYPE_TRAITS:model.FORTUNE_ARCHETYPE_TRAITS,
 buildFortuneCardModel:model.buildFortuneCardModel,fortuneLocale:i18n.fortuneLocale
});
const examples=[
 ["bazi",{dayMaster:"辛"}, "bazi-辛"],
 ["tarot",{personalityCardNumber:22},"tarot-22"],
 ["vedic",{lagnaSign:"Virgo"},"vedic-virgo"]
];
test("all eleven locales provide complete, meaningful challenge and two sourced traits",()=>{
 assert.equal(i18n.assertFortuneCopyComplete(),true);
 for(const locale of ["zh-TW","en","ja","es","pt-BR","id","fr","de","ko","vi","th"]){
  const labels=i18n.fortuneCopy(locale);
  assert.ok(labels.question&&labels.mine&&labels.copyInvite&&labels.download);
  for(const [mode,result,id] of examples){
   const card=model.buildFortuneCardModel(mode,result,locale);
   assert.equal(card.id,id);
   assert.equal(card.chips.length,2);
   assert.ok(card.chips.every(x=>x.length>0));
   assert.ok(card.title&&card.tagline&&card.modeLabel&&card.cta);
   assert.ok(card.cta.includes("3sssi.com/fortune"));
  }
 }
 assert.notEqual(model.buildFortuneCardModel("bazi",{dayMaster:"辛"},"ja").chips[0],
  model.buildFortuneCardModel("bazi",{dayMaster:"辛"},"en").chips[0]);
 assert.equal(model.buildFortuneCardModel("bazi",{dayMaster:"辛"},"zh-TW").title,"精準鑑賞家");
 assert.equal(model.buildFortuneCardModel("tarot",{personalityCardNumber:22},"en").title,"Free-Spirit Adventurer");
});
test("all eleven languages invite a comparison, not just a bare link",()=>{
 for(const locale of ["zh-TW","en","ja","es","pt-BR","id","fr","de","ko","vi","th"]){
  const title="Test archetype";
  const url=invite.fortuneInviteUrl("bazi","bazi-丙",locale);
  const invitation=i18n.fortuneInvitation(locale,title,url);
  assert.ok(invitation.includes(title),locale);
  assert.ok(invitation.length>100,locale);
  assert.ok(invitation.trim().endsWith(url),locale);
  assert.equal(invitation.split(url).length-1,1,locale);
  assert.ok(invitation.split("\n").length>=4,locale);
  const challenge=i18n.fortuneChallenge(locale);
  assert.ok(challenge.question&&challenge.action,locale);
 }
 const identity=model.buildFortuneCardModel("bazi",{dayMaster:"丙",careerProfile:{officerCount:1,resourceCount:0,outputCount:3}},"zh-TW");
 assert.ok(identity.identity?.tension);
 const personalized=i18n.fortuneInvitation("zh-TW",identity.title,"https://www.3sssi.com/fortune",identity.identity.tension);
 assert.match(personalized,/點子一多/);
 assert.match(personalized,/耀眼領航者/);
 const secret="出生：1985-07-06，姓名私人";
 assert.doesNotMatch(i18n.fortuneInvitation("zh-TW",identity.title,"https://www.3sssi.com/fortune",secret),/1985|私人/);
 const japanese=i18n.fortuneInvitation("ja",identity.title,"https://www.3sssi.com/fortune",identity.identity.tension);
 assert.doesNotMatch(japanese,/點子一多/,"do not leak Chinese body into Japanese invitation");
});
test("identity, missing identity and missing art keep a private-data-free fallback",()=>{
 assert.equal(Object.keys(model.FORTUNE_ARCHETYPE_TRAITS).length,44);
 const result={dayMaster:"辛",birthDate:"1990-03-04",birthTime:"14:30",name:"private"};
 const card=model.buildFortuneCardModel("bazi",result,"zh-TW","出生：1990-03-04");
 assert.equal(card.id,"bazi-辛");assert.ok(card.artSrc);
 assert.equal(card.symbol,"✦","PNG fallback cannot reveal the raw day-master symbol");
 for(const secret of ["1990-03-04","14:30","private"])assert.ok(!JSON.stringify(card).includes(secret));
 const empty=model.buildFortuneCardModel("bazi",{},"en","A quieter and steadier approach.");
 assert.equal(empty.id,null);assert.equal(empty.artSrc,null);
 assert.equal(empty.tagline,"A quieter and steadier approach.");
 assert.notEqual(model.buildFortuneCardModel("bazi",{},"en","Born on 1990-03-04").tagline,"Born on 1990-03-04");
});
test("allowlisted invitations exclude date, history and arbitrary user text",()=>{
 for(const [mode,result,id] of examples){
  const url=invite.fortuneInviteUrl(mode,id,"en");
  assert.match(url,/^https:\/\/www\.3sssi\.com\/en\/fortune\?/);
  const params=new URL(url).searchParams;
  assert.deepEqual([...params.keys()].sort(),["a","m","src","theme"]);
  assert.deepEqual(invite.parseFortuneInvite(params),{mode,archetype:id,theme:"identity",src:"card"});
  assert.equal(invite.publicFortuneCard(invite.parseFortuneInvite(params),"en").id,id);
  assert.equal(invite.fortuneInviteNextUrl(invite.parseFortuneInvite(params)),"/fortune/reading?mode=tarot&src=card");
 }
 const valid=new URL(invite.fortuneInviteUrl("tarot","tarot-21")).searchParams;
 for(const extra of ["birthDate","token","report","history","utm"]) {
  const altered=new URLSearchParams(valid);altered.set(extra,"secret");
  assert.equal(invite.parseFortuneInvite(altered),null,extra);
 }
 for(const payload of ["m=tarot&a=tarot-99&theme=identity&src=card",
  "m=tarot&a=bazi-%E7%94%B2&theme=identity&src=card",
  "m=tarot&a=tarot-21&a=tarot-22&theme=identity&src=card",
  "m=tarot&a=%3Cscript%3E&theme=identity&src=card","m=vedic&a=vedic-aries&theme=evil&src=card",
  "m=tarot&a=tarot-22&theme=identity&src=card&x="+("a".repeat(350))])
  assert.equal(invite.parseFortuneInvite(payload),null,payload.slice(0,40));
 assert.equal(invite.fortuneInviteUrl("tarot","not-an-id"),"https://www.3sssi.com/fortune");
});
function makeCanvas(){
 const calls=[],ctx={
  createLinearGradient(){return {addColorStop:(_x,v)=>calls.push(["color",v])}},
  createRadialGradient(){return {addColorStop:(_x,v)=>calls.push(["color",v])}},
  fillRect(...args){calls.push(["fillRect",...args])},beginPath(){},roundRect(){},closePath(){},fill(){},stroke(){},moveTo(){},lineTo(){},arc(){},clip(){calls.push(["clip"])},save(){},restore(){},
  measureText(s){return {width:Array.from(s).length*16}},
  fillText(text,x,y){calls.push(["text",text,x,y])},
  drawImage(){calls.push(["image"])}
 };
 return {calls,document:{createElement:tag=>{
  assert.equal(tag,"canvas");
  return {width:0,height:0,getContext:()=>ctx,toDataURL:()=>"data:image/png;base64,aGVsbG8="};
 }}};
}
test("shared renderer produces 1080x1350 illustrated collectible with no birth facts or article header",()=>{
 const env=makeCanvas();
 const render=load("fortuneCardCanvas.ts",["renderCollectibleCard"],{document:env.document,fortuneLocale:i18n.fortuneLocale,fortuneCopy:i18n.fortuneCopy,fortuneChallenge:i18n.fortuneChallenge}).renderCollectibleCard;
 for(const [mode,result] of examples){
  const card=model.buildFortuneCardModel(mode,result,"zh-TW");
  const art={complete:true,naturalWidth:1536,naturalHeight:864};
  env.calls.length=0;
  const canvas=render(card,art,new Date("2026-11-08T11:00:00Z"),"zh-TW");
  assert.equal(canvas.width,1080);assert.equal(canvas.height,1350);
  assert.ok(env.calls.some(x=>x[0]==="image"));
  // Transparent PNG: the full-canvas background can only be painted AFTER
  // clipping to the beveled card silhouette.
  const background=env.calls.findIndex(x=>x[0]==="fillRect"&&x[1]===0&&x[2]===0&&x[3]===1080&&x[4]===1350);
  const firstClip=env.calls.findIndex(x=>x[0]==="clip");
  assert.ok(firstClip>=0&&background>firstClip,"outer PNG canvas remains transparent");
  // Date and CTA share a baseline safely INSIDE the white card (bottom y=1269),
  // not on the outer polygon border (bottom y=1315).
  const footer=env.calls.filter(x=>x[0]==="text"&&x[3]===1249);
  assert.equal(footer.length,2);
  assert.deepEqual(footer.map(x=>x[2]),[101,982]);
  assert.ok(env.calls.some(x=>x[1]==="CREW FORTUNE"));
  assert.ok(env.calls.some(x=>String(x[1]).includes("3sssi.com/fortune")));
  assert.ok(env.calls.some(x=>x[1]==="命格輪廓"));
  assert.ok(env.calls.some(x=>x[1]==="行動線索"));
  assert.ok(env.calls.some(x=>x[1]==="成長提醒"));
  assert.ok(env.calls.some(x=>String(x[1]).includes("你遇到事情是先衝")));
  assert.ok(env.calls.some(x=>String(x[1]).includes("換你測測看")));
  assert.ok(!env.calls.some(x=>/命盤重點|birthDate|1985-07-06/.test(String(x[1]))));
  env.calls.length=0;
  render(card,null,new Date("2026-11-08"),"en");
  assert.ok(!env.calls.some(x=>x[0]==="image"));
 }
});
test("text-first sharing is localized and keeps image attachment user-controlled",()=>{
 for(const locale of ["zh-TW","en","ja","es","pt-BR","id","fr","de","ko","vi","th"]){
  const text=i18n.fortuneTextShareLabels(locale);
  assert.ok(text.textOnly&&text.copyPost&&text.downloadCard&&text.help,locale);
 }
 const dialog=read(fortune("FortuneShareDialog.tsx"));
 assert.match(dialog,/await navigator\.share\(\{text:invitation\}\)/);
 assert.match(dialog,/onClick=\{\(\)=>void shareTextOnly\(\)\}/);
 assert.match(dialog,/onClick=\{\(\)=>void copy\(invitation\)\}/);
 assert.match(dialog,/onClick=\{download\}/);
 assert.match(dialog,/shareLabels\.copyPost/);
 assert.match(dialog,/shareLabels\.downloadCard/);
 assert.match(dialog,/shareLabels\.help/);
 assert.match(dialog,/if\(!navigator\.share\)/);
 assert.doesNotMatch(dialog,/navigator\.share\(\{files:/);
 assert.ok(dialog.indexOf("copy(invitation)")<dialog.indexOf("shareTextOnly()}"));
});
test("native sharing detects files, URL fallback, cancellation, errors and no Web Share",async()=>{
 const build=nav=>load("fortuneCardCanvas.ts",["nativeCollectibleShare"],{navigator:nav}).nativeCollectibleShare;
 let payload;
 const native=build({share:async value=>{payload=value},canShare:()=>true});
 assert.equal(await native({name:"card.png"},"invitation\nhttps://example.com","https://example.com"),"shared");
 assert.ok(payload.files?.length);assert.match(payload.text,/example.com/);
 const urlOnly=build({share:async value=>{payload=value},canShare:()=>false});
 assert.equal(await urlOnly({},"invitation","https://example.com"),"shared");
 assert.equal(payload.url,"https://example.com");assert.equal(payload.files,undefined);
 assert.equal(await build({})({},"message","https://example.com"),"unsupported");
 assert.equal(await build({share:async()=>{throw Object.assign(Error("cancelled"),{name:"AbortError"})}})({},"x","x"),"cancelled");
 await assert.rejects(build({share:async()=>{throw Error("denied")}})({},"x","x"),/denied/);
});
test("reading flow and manual share preview remain connected without automatic reveal",()=>{
 const reading=read(fortune("ReadingPage.tsx"));
 const dialog=read(fortune("FortuneShareDialog.tsx"));
 const home=read(fortune("HomePage.tsx"));
 assert.match(reading,/fortune-collectible-hero/);
 assert.match(reading,/\{showInput&&<section className="hero">/,"generic top hero should not precede results");
 assert.match(reading,/fortune-deep-exploration/);
 assert.match(reading,/scrollIntoView/);
 assert.match(reading,/onHeadline=\{setOneLine\}/);
 assert.match(reading,/setReading\(item\);setShareOpen\(false\)/);
 assert.match(reading,/onClick=\{\(\)=>setShareOpen\(true\)\}/);
 assert.match(reading,/FortuneShareDialog reading=\{reading\}/);
 assert.match(home,/parseFortuneInvite\(searchParams\)/);
 assert.match(home,/FortuneInviteLanding invite=\{invite\}/);
 assert.match(dialog,/navigator\.clipboard\?\.writeText/);
 assert.match(dialog,/onCancel=\{event=>\{event\.preventDefault\(\);onClose\(\)\}\}/);
 assert.match(dialog,/nativeCollectibleShare\(file,invitation,url\)/);
 assert.match(dialog,/URL\.createObjectURL\(file\)/);
 assert.match(dialog,/role="status"/);
 assert.doesNotMatch(dialog,/await fetch\(/);
});
