const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
function loadPure(file,names){
 const source=fs.readFileSync(path.join(root,file),"utf8");
 const js=stripTypeScriptTypes(source,{mode:"strip"})
  .replace(/^import\s+type\s+.*?;\s*$/gm,"")
  .replace(/^export\s+/gm,"");
 return Function(js+"\nreturn {"+names.join(",")+"};")();
}
const {utcOffsetForBirth,resolveBirthOffset}=loadPure("web-spa/src/fortune/birthPlaceSearch.ts",["utcOffsetForBirth","resolveBirthOffset"]);
const {computeCurrentPhase}=loadPure("web-spa/src/fortune/currentPhase.ts",["computeCurrentPhase"]);
const {parseAiReading,isCurrentRequest,buildFortuneQuestionPrompt}=loadPure("web-spa/src/fortune/aiReading.ts",["parseAiReading","isCurrentRequest","buildFortuneQuestionPrompt"]);
test("birth timezone honors historical DST and recalculates after birth date changes",()=>{
 assert.equal(utcOffsetForBirth("1975-07-01","12:00","Asia/Taipei"),"+09:00");
 assert.equal(utcOffsetForBirth("1990-05-15","12:00","Asia/Taipei"),"+08:00");
 assert.equal(utcOffsetForBirth("2021-07-01","12:00","America/New_York"),"-04:00");
 assert.equal(utcOffsetForBirth("2021-01-15","12:00","America/New_York"),"-05:00");
 assert.equal(utcOffsetForBirth("2021-01-15","12:00","Asia/Tokyo"),"+09:00");
 const profile={birthDate:"2021-07-01",birthTime:"12:00",timeZoneId:"America/New_York",utcOffset:"-05:00"};
 assert.equal(resolveBirthOffset(profile),"-04:00");
 assert.equal(resolveBirthOffset({...profile,birthDate:"2021-01-15"}),"-05:00");
 assert.equal(resolveBirthOffset({...profile,timeZoneId:"",utcOffset:"+08:00"}),"+08:00");
 assert.equal(resolveBirthOffset({...profile,timeZoneId:"",utcOffset:"8"}),"");
 assert.equal(resolveBirthOffset({...profile,timeZoneId:"",utcOffset:"+99:99"}),"");
});
test("current phase is grounded for all three modes and uses true age",()=>{
 const today=new Date("2026-10-27T12:00:00Z");
 const bazi=computeCurrentPhase("bazi",{
  currentLuckPillar:{ganZhi:"甲申",startYear:2017,endYear:2026},
  luckPillars:[{ganZhi:"甲申",startYear:2017,endYear:2026},{ganZhi:"乙酉",startYear:2027,endYear:2036}],
  nominalAge:43,annualTimeline:[{year:2026,stemTenGod:"正財"},{year:2027,stemTenGod:"偏財"}]
 },"1985-11-05",today);
 assert.equal(bazi.age,40);assert.equal(bazi.remainingYears,1);
 assert.equal(bazi.current,"甲申");assert.equal(bazi.next,"乙酉");
 assert.match(bazi.promptLine,/虛歲 43/);assert.match(bazi.promptLine,/正財/);assert.match(bazi.promptLine,/偏財/);
 const tarot=computeCurrentPhase("tarot",{
  pinnacleTiming:["0–35","36–44","45–53","54+"],pinnacles:[1,2,3,4],
  personalYearTimeline:[{year:2026,personalYear:5},{year:2027,personalYear:6}]
 },"1985-07-06",today);
 assert.equal(tarot.age,41);assert.equal(tarot.current,"2");assert.equal(tarot.transitionYear,2030);
 assert.equal(tarot.thisYear,"5");assert.equal(tarot.nextYear,"6");
 const vedic=computeCurrentPhase("vedic",{
  currentMahadasha:{lord:"Saturn",startDate:"2020-01-01",endDate:"2039-12-31"},
  currentAntardasha:{lord:"Venus",startDate:"2026-01-01",endDate:"2028-01-01"},
  mahadashaTimeline:[{lord:"Saturn",startDate:"2020-01-01",endDate:"2039-12-31"},{lord:"Mercury",startDate:"2040-01-01",endDate:"2056-12-31"}]
 },"1985-07-06",today);
 assert.equal(vedic.current,"Saturn");assert.equal(vedic.next,"Mercury");assert.match(vedic.promptLine,/Venus/);
});
test("AI reading parser supports new markers, missing sections and old historical reports",()=>{
 const text="  ## @summary  \n A unique cycle.\n\n## @next12\n- 2026 → Work → Plan\n2. 2027 → Rest → Reflect\n3) 2027 → Team → Talk\n\n## @work\n Build new routines. \n\n## @love\nDiscuss boundaries.\n## @self\nPatient.\n## @turning\nChange in 2027.\n## @ask\n- Why 2027?\n- Which skills?\n- What should I avoid?";
 const result=parseAiReading(text);
 assert.equal(result.summary,"A unique cycle.");assert.equal(result.next12.length,3);
 assert.equal(result.ask.length,3);assert.equal(result.turning,"Change in 2027.");
 assert.equal(parseAiReading("## @summary\nA sentence").next12.length,0);
 assert.equal(parseAiReading("## 命盤總覽\n舊版").legacy,true);
});
test("stale interpretation guard only accepts current reading and latest request",()=>{
 assert.equal(isCurrentRequest("reading_1",2,"reading_1",2),true);
 assert.equal(isCurrentRequest("reading_1",2,"reading_2",2),false);
 assert.equal(isCurrentRequest("reading_1",2,"reading_1",3),false);
});
test("Live text prompt contains chart facts, summary, question and no coordinates",()=>{
 const prompt=buildFortuneQuestionPrompt({fourPillars:"甲子",latitude:25.02,longitude:121.5,utcOffset:"+08:00",houses:[{house:10,sign:"Leo"}]},"當前事業轉折","2026-10-27","English","What about work?");
 for(const t of ["甲子","Leo","當前事業轉折","2026-10-27","English","What about work?"])assert.ok(prompt.includes(t),t);
 assert.doesNotMatch(prompt,/latitude|longitude|121\.5|25\.02/);
 assert.match(buildFortuneQuestionPrompt(null,"","2026-10-27","English","Hello"),/尚未提供命盤/);
});
test("report source retains required zero, dedup and equal-card behavior",()=>{
 const report=fs.readFileSync(path.join(root,"web-spa/src/fortune/report.ts"),"utf8");
 const years=fs.readFileSync(path.join(root,"web-spa/src/fortune/yearHighlights.ts"),"utf8");
 assert.match(report,/parts\.filter\(x=>x!==0\)/);
 assert.match(report,/內外一致/);
 assert.match(years,/new Set/);
 assert.doesNotMatch(report,/slice\(0,24000\)/);
});
test("tarot master numbers preserve existing outputs",()=>{
 const sandbox={window:{}};
 vm.runInNewContext(fs.readFileSync(path.join(root,"features/fortune/tarot/calculator.js"),"utf8"),sandbox);
 for(const [birth,display]of [["1971-09-11","11/2"],["1971-11-11","22/4"],["1975-09-11","33/6"]]){
  const result=sandbox.window.CrewFortuneTarot.calculate(birth,new Date("2026-10-27T12:00:00Z"));
  assert.equal(result.lifePathDisplay,display);
 }
});
function aiHarness(reply,withAbort=true){
 const memory=new Map([["crew_gemini_api_key","test-key"]]),calls=[];
 const window={},storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
 const fetch=async(url,options)=>{
  const model=decodeURIComponent(url.split("/models/")[1].split(":")[0]);calls.push({model,options});
  return reply(model,calls.length,options);
 };
 const sandbox={window,document:{querySelectorAll:()=>[]},localStorage:storage,sessionStorage:{getItem:()=>null},fetch,setTimeout,clearTimeout,WebSocket:{}};
 if(withAbort)sandbox.AbortController=AbortController;
 vm.runInNewContext(fs.readFileSync(path.join(root,"crew.js"),"utf8"),sandbox);
 return{ai:window.CrewAI,calls};
}
const reply=(text,finishReason="STOP")=>({ok:true,status:200,json:async()=>({candidates:[{finishReason,content:{parts:[{text}]}}]})});
test("requireComplete falls back on MAX_TOKENS; default preserves old behavior",async()=>{
 const one=aiHarness((_,n)=>reply(n===1?"partial":"complete",n===1?"MAX_TOKENS":"STOP"));
 assert.equal(await one.ai.call("report",{preferLive:false,strictModels:true,requireComplete:true}),"complete");
 assert.deepEqual(one.calls.map(x=>x.model),["gemini-3.6-flash","gemini-3.5-flash-lite"]);
 const two=aiHarness((_,n)=>reply("partial","MAX_TOKENS"));
 assert.equal(await two.ai.call("report",{preferLive:false,strictModels:true}),"partial");
 assert.equal(two.calls.length,1);
});
test("text timeoutMs aborts stalled fetch and uses next model",async()=>{
 const h=aiHarness((_,n,options)=>n===1?new Promise((_,reject)=>{
  options.signal.addEventListener("abort",()=>reject(new Error("aborted")),{once:true});
 }):reply("fallback"));
 assert.equal(await h.ai.call("report",{preferLive:false,strictModels:true,timeoutMs:10}),"fallback");
 assert.equal(h.calls.length,2);
 assert.equal(h.calls[0].options.signal.aborted,true);
});

test("missing and empty facts never masquerade as a chart",()=>{
 for(const facts of [null,undefined,"","  ",{},[],"null","{}","[]"]){
  const prompt=buildFortuneQuestionPrompt(facts,"","2026-10-27","English","What now?");
  assert.match(prompt,/尚未提供命盤/);
  assert.doesNotMatch(prompt,/固定命盤事實：/);
 }
});
test("summary shows only its first sentence or nonblank line",()=>{
 assert.equal(parseAiReading("## @summary\n這一年適合整頓。依據為某某資料。\n第二行\n## @work\n工作").summary,"這一年適合整頓。");
 assert.equal(parseAiReading("## @summary\nFirst sentence. Evidence follows.\n## @work\nWork").summary,"First sentence.");
 assert.equal(parseAiReading("## @summary\n\n  Single line\nSecond line").summary,"Single line");
});
test("thinking config is opt-in, 400 falls back as response, default unchanged",async()=>{
 const requests=aiHarness((model,n,options)=>{
  const body=JSON.parse(options.body);
  if(n===1)return{ok:false,status:400,json:async()=>({error:{status:"INVALID_ARGUMENT",message:"thinkingLevel unsupported"}})};
  return reply("full response");
 });
 assert.equal(await requests.ai.call("report",{preferLive:false,strictModels:true,thinking:"low",requireComplete:true}),"full response");
 assert.equal(requests.calls.length,2);
 assert.equal(JSON.parse(requests.calls[0].options.body).generationConfig.thinkingConfig.thinkingLevel,"low");
 assert.equal(JSON.parse(requests.calls[1].options.body).generationConfig.thinkingConfig.thinkingLevel,"low");
 const legacy=aiHarness(()=>reply("legacy response"));
 assert.equal(await legacy.ai.call("report",{preferLive:false,strictModels:true}),"legacy response");
 assert.equal(Object.prototype.hasOwnProperty.call(JSON.parse(legacy.calls[0].options.body).generationConfig,"thinkingConfig"),false);
});
test("timeout rejects and falls back without AbortController",async()=>{
 const h=aiHarness((_,n)=>n===1?new Promise(()=>{}):reply("no-abort fallback"),false);
 assert.equal(await h.ai.call("report",{preferLive:false,strictModels:true,timeoutMs:10}),"no-abort fallback");
 assert.equal(h.calls.length,2);
 assert.equal(h.calls[0].options.signal,undefined);
});
test("Round A fix1 UI keeps labels and dates localized",()=>{
 const file=p=>fs.readFileSync(path.join(root,p),"utf8");
 const summary=file("web-spa/src/fortune/FortuneSummaryCard.tsx");
 const overview=file("web-spa/src/fortune/ReadingOverview.tsx");
 const reading=file("web-spa/src/fortune/ReadingPage.tsx");
 const live=file("web-spa/src/fortune/LivePage.tsx");
 const highlights=file("web-spa/src/fortune/YearHighlights.tsx");
 const report=file("web-spa/src/fortune/report.ts");
 const runtime=file("web-spa/src/lib/runtime.ts");
 assert.match(summary,/reading\.phaseTarot/);
 assert.match(summary,/reading\.topic\.keyYears/);
 assert.match(overview,/wealth:parsed\.wealth/);
 assert.match(reading,/role="alert">\{formError\}/);
 assert.match(reading,/formatFortuneLocalDate\(today\)/);
 assert.match(live,/formatFortuneLocalDate\(new Date\(\)\)/);
 assert.doesNotMatch(report,/toISOString\(\)\.slice\(0,10\)/);
 assert.match(highlights,/t\("reading\.evidence"\)/);
 assert.match(runtime,/CrewAI\?:/);
 const {formatFortuneLocalDate}=loadPure("web-spa/src/fortune/aiReading.ts",["formatFortuneLocalDate"]);
 assert.equal(formatFortuneLocalDate(new Date(2026,9,27,0,30)),"2026-10-27");
});

test("thinking 400 with invalid API key stops before trying other models",async()=>{
 const h=aiHarness(()=>({ok:false,status:400,json:async()=>({error:{status:"INVALID_ARGUMENT",message:"API key not valid. Please pass a valid API key."}})}));
 await assert.rejects(h.ai.call("report",{preferLive:false,strictModels:true,thinking:"low"}),error=>error?.kind==="key"&&error.status===400);
 assert.equal(h.calls.length,1);
 assert.equal(h.calls[0].model,"gemini-3.6-flash");
});
