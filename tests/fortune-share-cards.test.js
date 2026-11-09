const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
test("reading and identity exports delegate to one model and one Canvas renderer",()=>{
 const reading=read("web-spa/src/fortune/shareCard.ts");
 const identity=read("web-spa/src/fortune/identityShare.ts");
 const canvas=read("web-spa/src/fortune/fortuneCardCanvas.ts");
 for(const source of [reading,identity]){
  assert.match(source,/buildFortuneCardModel/);
  assert.match(source,/renderCollectibleCard/);
  assert.match(source,/nativeCollectibleShare/);
  assert.doesNotMatch(source,/ctx\.fillText\("命盤重點"/);
 }
 assert.match(canvas,/canvas\.width=1080;canvas\.height=1350/);
 assert.match(canvas,/ctx\.drawImage\(art/);
 assert.match(canvas,/Math\.min\(w\/art\.naturalWidth,h\/art\.naturalHeight\)/);
 assert.match(canvas,/model\.chips\.slice\(0,3\)/);
 assert.match(canvas,/model\.cta/);
 assert.match(canvas,/copy\.headings\[2\]/);
 assert.match(canvas,/drawFrame\(ctx,paint\)/);
 assert.doesNotMatch(canvas,/#fff6e5|#f5e2c9/);
 assert.doesNotMatch(canvas,/birthDate|birthTime|reading\.profile|Gemini/);
});
test("public PNG excludes private reading summary and date is generation time",()=>{
 const model=read("web-spa/src/fortune/fortuneCardModel.ts");
 const canvas=read("web-spa/src/fortune/fortuneCardCanvas.ts");
 const wrapper=read("web-spa/src/fortune/shareCard.ts");
 assert.match(model,/safeOneLine/);
 assert.match(model,/buildFortuneIdentity\(mode,result,locale\)/);
 assert.match(wrapper,/renderCollectibleCard\(model,art,new Date\(\),locale\)/);
 assert.doesNotMatch(wrapper,/reading\.summary\|\|mode/);
 assert.match(canvas,/Intl\.DateTimeFormat\(locale/);
});
test("daily card maintains its own privacy allowlist but stronger return URL",()=>{
 const wrapper=read("web-spa/src/fortune/shareCard.ts");
 assert.match(wrapper,/DailyShareLabels/);
 assert.match(wrapper,/buildDailyShareFile\(card:import\("\.\/dailyCard"\)\.DailyCard,labels:DailyShareLabels\)/);
 assert.match(wrapper,/3sssi\.com\/fortune/);
 assert.doesNotMatch(wrapper.slice(wrapper.indexOf("/** Daily sharing")),/birthDate|birthTime|reading\.profile/);
});
