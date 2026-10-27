const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
function loadPure(file,names){
 const code=stripTypeScriptTypes(fs.readFileSync(path.join(root,file),"utf8"),{mode:"strip"})
  .replace(/^import\s+type\s+.*?;\s*$/gm,"").replace(/^export\s+/gm,"");
 return Function(code+"\nreturn {"+names.join(",")+"};")();
}
const {buildFortuneQuestionPrompt}=loadPure("web-spa/src/fortune/aiReading.ts",["buildFortuneQuestionPrompt"]);
const {buildTimingHighlights}=loadPure("web-spa/src/fortune/yearHighlights.ts",["buildTimingHighlights"]);

test("B1 history prompt keeps only three bounded turns and strips all sensitive chart keys",()=>{
 const history=Array.from({length:6},(_,i)=>({q:"Question "+i+"x".repeat(700),a:"Answer "+i+"x".repeat(700)}));
 const prompt=buildFortuneQuestionPrompt({fourPillars:"甲子",birthDate:"1985-01-01",birthTime:"03:00",
  nested:{latitude:24.5,longitude:121.5,utcOffset:"+08:00",timeZoneId:"Asia/Taipei"}},"Grounded summary","2026-10-27","English","A specific question",history);
 assert.match(prompt,/A specific question/);
 assert.match(prompt,/Question 3/);assert.match(prompt,/Question 4/);assert.match(prompt,/Question 5/);
 assert.doesNotMatch(prompt,/Question [012]/);
 assert.doesNotMatch(prompt,/birthDate|birthTime|latitude|longitude|utcOffset|timeZoneId|121\.5/);
 assert.equal((prompt.match(/\n問：/g)||[]).length,3);
 assert.ok(prompt.indexOf("Question 3")+420>prompt.indexOf("\n答："));
 const legacy=buildFortuneQuestionPrompt({fourPillars:"甲子"},"Summary","2026-10-27","English","Hi");
 assert.ok(!legacy.includes("最近對話"));
});

test("B4 actual cycle transition is first in all three modes, with only three entries",()=>{
 const now=new Date().getFullYear();
 const annual=Array.from({length:6},(_,i)=>({year:now+i,ganZhi:"乙卯",stemTenGod:"正官",luckPillar:"甲子"}));
 const b=buildTimingHighlights("bazi",{currentLuckPillar:{ganZhi:"甲子",endYear:now},
  luckPillars:[{ganZhi:"甲子",startYear:now-9,endYear:now},{ganZhi:"乙丑",startYear:now+1,endYear:now+10}],annualTimeline:annual});
 assert.equal(b[0].year,now+1);assert.match(b[0].label,/大運轉折/);assert.match(b[0].evidence,/大運/);assert.ok(b.length<=3);
 const tarot=buildTimingHighlights("tarot",{personalYearTimeline:Array.from({length:7},(_,i)=>({year:now+i,personalYear:(i%9)+1}))},
  {age:40,current:"3",next:"4",promptLine:"",transitionYear:now+3});
 assert.equal(tarot[0].year,now+3);assert.match(tarot[0].label,/巔峰期/);assert.ok(tarot.length<=3);
 const vedic=buildTimingHighlights("vedic",{currentMahadasha:{lord:"Saturn"},
  mahadashaTimeline:[{lord:"Saturn",startDate:(now-10)+"-01-01"},{lord:"Mercury",startDate:(now+2)+"-05-03"}],
  majorTransitTimeline:[{date:(now+1)+"-01-15",planet:"Jupiter",fromSign:"Aries",toSign:"Taurus"}]});
 assert.equal(vedic[0].year,now+2);assert.match(vedic[0].label,/Mahadasha/);assert.ok(vedic.length<=3);
});

test("B5 ingress date is resolved to one UTC day; retrograde changes are not skipped",()=>{
 const file=fs.readFileSync(path.join(root,"features/fortune/vedic/enrich.js"),"utf8");
 const inject=file.replace("global.CrewFortuneVedicEnrich={enrich:enrich};","global.CrewFortuneVedicEnrich={enrich:enrich,majorTimeline:majorTimeline};");
 const start=Date.UTC(2026,0,1),day=86400000;
 function longitude(name,date){
  const d=(new Date(date).getTime()-start)/day,ayanamsa=24.22;
  if(name==="Jupiter")return ayanamsa+28+d*0.1;
  if(name==="Saturn")return ayanamsa+29+3*Math.sin(d*0.15);
  return ayanamsa+100+d*0.03;
 }
 const astronomy={
  SunPosition:date=>({elon:longitude("Sun",date)}),
  EclipticGeoMoon:date=>({lon:longitude("Moon",date)}),
  GeoVector:(name,date)=>({name,date}),
  Ecliptic:vector=>({elon:longitude(vector.name,vector.date)})
 };
 const window={Astronomy:astronomy};
 vm.runInNewContext(inject,{window,Date,Math});
 const entries=window.CrewFortuneVedicEnrich.majorTimeline({lagnaSignIndex:0},new Date(start));
 const j=entries.find(x=>x.planet==="Jupiter"&&String(x.toSign).includes("金牛"));
 assert.ok(j,"Jupiter must cross from sidereal Aries to Taurus");
 assert.ok(Math.abs(new Date(j.exactAt).getTime()-(start+20*day))<=day,"Jupiter crossing should be within one UTC day");
 assert.equal(j.date,new Date(j.exactAt).toISOString().slice(0,10));
 const sat=entries.filter(x=>x.planet==="Saturn");
 assert.ok(sat.some(x=>x.direction==="direct")&&sat.some(x=>x.direction==="retrograde"),
  "five-day subdivision must detect both forward and retrograde sign crossings");
});

test("B2 handoff keeps legacy expiry and no raw birth coordinates in speaking module",()=>{
 const src=fs.readFileSync(path.join(root,"web-spa/src/teacher/fortuneSpeaking.ts"),"utf8");
 assert.match(src,/30\*60\*1000/);
 assert.match(src,/sessionStorage\.setItem\(STORAGE_KEY/);
 assert.doesNotMatch(src,/birthDate|birthTime|latitude|longitude/);
 assert.match(src,/aiSummary/);assert.match(src,/phase/);
});


test("B3 lazy fortuneReport namespace has exactly the same keys across all eleven locales",()=>{
 const langs=["zh-TW","en","ja","es","pt-BR","id","ko","fr","de","vi","th"];
 const obj=langs.map(lang=>JSON.parse(fs.readFileSync(path.join(root,"web-spa/src/i18n/locales",lang,"fortuneReport.json"),"utf8")));
 const flatten=(v,prefix="")=>Object.entries(v).flatMap(([key,x])=>typeof x==="object"&&x!==null?flatten(x,prefix+key+"."):[prefix+key]);
 const keys=flatten(obj[0]).sort();
 for(let i=0;i<langs.length;i++){
  assert.deepEqual(flatten(obj[i]).sort(),keys,"missing or extra key in "+langs[i]);
  for(const val of Object.values(obj[i].chapter))assert.match(val,/\{\{facts\}\}/,"chapter missing fact placeholder in "+langs[i]);
 }
 const index=fs.readFileSync(path.join(root,"web-spa/src/i18n/index.ts"),"utf8");
 assert.match(index,/games,mate,lesson,voice,magic,fortuneReport/);
 assert.match(index,/\|"fortuneReport"/);
 assert.doesNotMatch(index,/const eagerNamespaces[^\n]*fortuneReport/);
});

test("B6 Vedic terms use shared display mapping and weighted elements are the only overview group",()=>{
 const bazi=fs.readFileSync(path.join(root,"web-spa/src/fortune/result/BaZiTabs.tsx"),"utf8");
 const overview=fs.readFileSync(path.join(root,"web-spa/src/fortune/ReadingOverview.tsx"),"utf8");
 const terms=fs.readFileSync(path.join(root,"web-spa/src/fortune/fortuneTerminology.ts"),"utf8");
 assert.doesNotMatch(bazi,/Object\.entries\(r\.visibleFiveElements/);
 assert.match(overview,/weightedFiveElements/);
 assert.match(terms,/Mahadasha/);
 assert.match(terms,/Jupiter/);
 assert.match(terms,/Taurus/);
 assert.match(terms,/H\(\\d/);
});
