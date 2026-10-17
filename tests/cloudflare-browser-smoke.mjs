/**
 * Cloudflare Pages smoke test against the actual production dist, in Chromium.
 * CI installs Playwright without adding it to the deployed application bundle.
 */
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {setTimeout as sleep} from "node:timers/promises";
import {readFileSync} from "node:fs";
import {chromium} from "playwright";

const origin="http://127.0.0.1:4179";
const routes=["/","/teacher/","/story/","/fortune/","/research/","/en/","/en/teacher/","/en/story/","/en/fortune/","/en/research/"];

async function waitForPreview(child){
 for(let n=0;n<120;n++){
  if(child.exitCode!==null)throw Error("Vite preview exited before startup: "+child.exitCode);
  try{
   const response=await fetch(origin+"/",{signal:AbortSignal.timeout(1000)});
   if(response.ok)return;
  }catch{/* Wait for Vite to bind its port. */}
  await sleep(200);
 }
 throw Error("Timed out waiting for Cloudflare preview");
}

function checkConsole(page,errors){
 page.on("pageerror",error=>errors.push("Uncaught: "+error.message));
 page.on("console",message=>{
  if(message.type()==="error"&&/hydration|hydrating|server rendered|content does not match|error occurred during hydration/i.test(message.text())){
   errors.push("Hydration: "+message.text());
  }
 });
}

async function run(){
 const vite=spawn(process.execPath,["node_modules/vite/bin/vite.js","preview","--config","vite.web.config.ts","--host","127.0.0.1","--port","4179","--strictPort"],{
  cwd:process.cwd(),
  env:{...process.env,CREW_DEPLOY_TARGET:"cloudflare"},
  stdio:["ignore","pipe","pipe"]
 });
 let viteErrors="";
 vite.stderr.on("data",chunk=>{viteErrors+=chunk.toString()});
 let browser;
 try{
  await waitForPreview(vite);
  browser=await chromium.launch({
   channel:process.env.CREW_CHROME_CHANNEL||"chrome",
   headless:true,
   args:["--no-sandbox"]
  });
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  for(const route of routes){
   const errors=[];
   const page=await context.newPage();
   checkConsole(page,errors);
   const response=await page.goto(origin+route,{waitUntil:"domcontentloaded",timeout:30000});
   assert.equal(response?.status(),200,"route should return 200: "+route);
   await page.locator("header.app-header").waitFor({state:"visible",timeout:15000});
   await page.locator("nav.global-nav").waitFor({state:"visible",timeout:15000});
   assert.ok(await page.locator("main h1").count(),"Missing SSG heading: "+route);
   assert.equal(await page.locator(".crew-build-section").count(),0,"Version info must not appear outside settings: "+route);
   const computed=await page.locator("header.app-header").evaluate(el=>{
    const css=getComputedStyle(el);
    return {height:el.getBoundingClientRect().height,display:css.display};
   });
   assert.ok(computed.height>20&&computed.display!=="none","Crew CSS missing: "+route);
   const bodyStart=await page.locator("body").evaluate(el=>el.textContent?.trim().slice(0,5)||"");
   assert.ok(!bodyStart.startsWith("\\n"),"literal escaped newline visible: "+route);
   await page.waitForTimeout(120);
   assert.deepEqual(errors,[],"Browser hydration error on "+route);
   await page.close();
   process.stdout.write("PASS prerender + hydrate "+route+"\n");
  }
  // Version details only render within Settings, not as a fixed overlay.
  for (const route of ["/settings", "/en/settings"]) {
    const page=await context.newPage();
    const errors=[];
    checkConsole(page,errors);
    await page.goto(origin+route,{waitUntil:"domcontentloaded",timeout:30000});
    const card=page.locator(".crew-build-section");
    await card.waitFor({state:"visible",timeout:15000});
    assert.equal(await page.locator(".crew-build-section").count(),1,"One settings build card: "+route);
    const positioning=await card.evaluate(el=>getComputedStyle(el).position);
    assert.notEqual(positioning,"fixed","Settings version card must follow page layout");
    await card.locator(".crew-build-toggle").click();
    assert.ok(await card.locator("#crew-build-details").isVisible(),"Build details should expand on "+route);
    const fields=await card.locator("#crew-build-details dt").allTextContents();
    assert.deepEqual(fields,route.startsWith("/en")?["Build time","Version"]:["建置時間","版本"],
      "Only build time and version should be visible on "+route);
    assert.equal(await card.locator(".crew-build-status,.crew-build-dot").count(),0,
      "Update status must not appear on "+route);
    assert.equal(await card.locator(".crew-build-heading small").count(),0,
      "Environment badge must not appear on "+route);
    assert.deepEqual(errors,[],"Settings page error on "+route);
    await page.close();
    process.stdout.write("PASS settings-only build version "+route+"\n");
  }
  const sitemap=readFileSync("dist/sitemap.xml","utf8");
  const researchRoutes=[...sitemap.matchAll(/<loc>https:\/\/www\.3sssi\.com(\/research\/\d{4}-\d{2}-\d{2}\/[^<]+)<\/loc>/g)].map(x=>x[1]);
  const discovery=JSON.parse(readFileSync("dist/briefings/discovery.json","utf8"));
  const samples=researchRoutes.length?researchRoutes.slice(0,3):Object.keys(discovery).slice(0,3);
  assert.ok(samples.length>0,"public Research needs at least one article");
  for(const route of samples){
   const errors=[];
   const page=await context.newPage();
   checkConsole(page,errors);
   const response=await page.goto(origin+route,{waitUntil:"domcontentloaded",timeout:30000});
   assert.equal(response?.status(),200,"article route should serve real HTML: "+route);
   const article=page.locator("article.briefing-detail");
   await article.waitFor({state:"visible",timeout:15000});
   assert.ok(await article.locator("h1").textContent(),"article title missing: "+route);
   assert.ok(await article.locator("a[href^='https://']").count(),"article must cite public source: "+route);
   const expectedRelated=discovery[route]||[];
   if(expectedRelated.length){
    assert.equal(await article.locator(".briefing-discovery-group ul a").count(),expectedRelated.length,"related links must survive SSG hydration: "+route);
   }
   await page.waitForTimeout(180);
   assert.deepEqual(errors,[],"hydration mismatch on research article "+route);
   await page.close();
   process.stdout.write("PASS indexed research article "+route+"\\n");
  }
  // A real SPA soft navigation must not turn a page into a second marketing site.
  const home=await context.newPage();
  await home.goto(origin+"/",{waitUntil:"domcontentloaded"});
  await home.locator('.global-nav a[href="/teacher"]').click();
  await home.waitForURL(url=>url.pathname.replace(/\/$/,"")==="/teacher");
  await home.locator("header.app-header").waitFor({state:"visible"});
  // Client-side React navigation is asynchronous; wait for the routed screen,
  // not only for the URL (the global header is already present on the home page).
  await home.locator(".hero").waitFor({state:"visible",timeout:15000});
  assert.ok(await home.locator(".hero h1").textContent(),"Navigation did not render Teacher");
  await home.close();
  process.stdout.write("PASS React client navigation\n");
  // BrowserRouter deep-link refresh uses root SPA fallback rather than SSG hydration.
  const deep=await context.newPage();
  const deepErrors=[];
  checkConsole(deep,deepErrors);
  await deep.goto(origin+"/teacher/roles?mode=friends",{waitUntil:"domcontentloaded"});
  await deep.waitForFunction(()=>!document.documentElement.classList.contains("crew-dynamic-route"),null,{timeout:15000});
  await deep.locator("header.app-header").waitFor({state:"visible",timeout:15000});
  assert.equal(new URL(deep.url()).pathname,"/teacher/roles");
  await deep.reload({waitUntil:"domcontentloaded"});
  await deep.waitForFunction(()=>!document.documentElement.classList.contains("crew-dynamic-route"),null,{timeout:15000});
  assert.deepEqual(deepErrors,[],"Deep route should render without hydration mismatch");
  await deep.close();
  process.stdout.write("PASS deep-link refresh\n");
  // Crew Play: exercise the actual built game routes, moves and local puzzle state.
  const play=await context.newPage();
  const playErrors=[];
  checkConsole(play,playErrors);
  await play.goto(origin+"/games",{waitUntil:"domcontentloaded",timeout:30000});
  await play.locator(".crew-play-game-card").first().waitFor({state:"visible",timeout:15000});
  assert.equal(await play.locator(".crew-play-game-card").count(),5,"Crew Play lobby must include five games");
  await play.goto(origin+"/games/connect4",{waitUntil:"domcontentloaded"});
  await play.locator(".crew-connect-slot:enabled").first().waitFor({timeout:15000});
  assert.equal(await play.locator(".crew-connect-slot").count(),42);
  await play.locator(".crew-connect-slot:enabled").first().click();
  await play.locator(".crew-connect-disc.player").first().waitFor({timeout:5000});
  await play.locator(".crew-connect-disc.computer").first().waitFor({timeout:5000});
  await play.goto(origin+"/games/reversi",{waitUntil:"domcontentloaded"});
  await play.locator(".crew-reversi-cell.can-play").first().waitFor({timeout:15000});
  assert.equal(await play.locator(".crew-reversi-cell").count(),64);
  await play.locator(".crew-reversi-cell.can-play").first().click();
  await play.locator(".crew-reversi-disc.white").nth(1).waitFor({timeout:5000});
  await play.goto(origin+"/games/twenty-questions",{waitUntil:"domcontentloaded"});
  await play.locator(".crew-play-question-disclosure summary").click();
  await play.locator(".crew-play-question-grid button").first().waitFor({timeout:15000});
  await play.locator(".crew-play-question-grid button").first().click();
  assert.equal(await play.locator(".crew-play-question-history li").count(),1);
  await play.locator(".crew-play-guess-form input").fill("a deliberately wrong answer");
  await play.locator(".crew-play-guess-form button").click();
  assert.equal(await play.locator(".crew-play-question-history li").count(),2);
  await play.goto(origin+"/games/mystery",{waitUntil:"domcontentloaded"});
  await play.locator(".crew-play-question-grid button").first().waitFor({timeout:15000});
  await play.locator(".crew-play-question-grid button").first().click();
  await play.locator(".crew-play-reveal").click();
  await play.locator(".crew-play-solution").waitFor({state:"visible",timeout:5000});
  // Gemini-powered mysteries: mock the existing Crew text API (no paid calls)
  // and verify each new round fetches a different validated case.
  const generatedMystery=await context.newPage();
  const mysteryErrors=[];
  checkConsole(generatedMystery,mysteryErrors);
  await generatedMystery.addInitScript(()=>{
   localStorage.setItem("crew_gemini_api_key","mock-key-for-mystery-smoke");
   window.__mysteryCalls=0;
   window.CrewAI={call:async ()=>{
    const n=++window.__mysteryCalls;
    await new Promise(resolve=>setTimeout(resolve,100));
    return JSON.stringify({
     story:{
      zh:"一位旅客每天把同一張明信片帶進車站，卻從來不把它寄出去，這是第 "+n+" 次。",
      en:"Every day a traveler brings the same postcard to the railway station without mailing it. This is round "+n+"."
     },
     solution:{
      zh:"這是一張車站的導覽明信片，他只是拿來確認出入口與旅行方向，並不是要郵寄。",
      en:"The postcard is a tourist map of the station. The traveler uses it to find the exit, not to mail a letter."
     },
     clues:[
      {question:{zh:"它是一張導覽圖嗎？",en:"Is the postcard used as a map?"},answer:true},
      {question:{zh:"旅客要把它寄給別人嗎？",en:"Does the traveler intend to mail it?"},answer:false},
      {question:{zh:"這與找路有關嗎？",en:"Is finding the way involved?"},answer:true},
      {question:{zh:"旅客迷路在海上嗎？",en:"Is the traveler lost at sea?"},answer:false},
      {question:{zh:"這張卡片可以重複使用嗎？",en:"Can the card be reused?"},answer:true},
      {question:{zh:"卡片是食物嗎？",en:"Is the card food?"},answer:false}
     ]
    });
   }};
  });
  await generatedMystery.goto(origin+"/games/mystery",{waitUntil:"domcontentloaded"});
  await generatedMystery.locator(".crew-play-mystery-source").getByText("Gemini 原創謎題").waitFor({timeout:15000});
  assert.match(await generatedMystery.locator(".crew-play-riddle h2").textContent(),/第 1 次/);
  await generatedMystery.locator(".crew-play-question-grid button").first().click();
  assert.equal(await generatedMystery.locator(".crew-play-question-history li").count(),1);
  await generatedMystery.locator(".crew-play-reveal").click();
  assert.match(await generatedMystery.locator(".crew-play-solution").textContent(),/導覽明信片/);
  await generatedMystery.locator(".crew-play-solution button").click();
  await generatedMystery.locator(".crew-play-mystery-source").getByText("Gemini 原創謎題").waitFor({timeout:15000});
  assert.match(await generatedMystery.locator(".crew-play-riddle h2").textContent(),/第 2 次/);
  assert.equal(await generatedMystery.locator(".crew-play-question-history li").count(),0);
  assert.deepEqual(mysteryErrors,[],"No errors while generating fresh mystery rounds");
  await generatedMystery.close();
  process.stdout.write("PASS Gemini mystery generation and next-round regeneration\n");

  // Invalid model responses must gracefully use the original, offline puzzle bank.
  const failedMystery=await context.newPage();
  await failedMystery.addInitScript(()=>{
   localStorage.setItem("crew_gemini_api_key","mock-key-for-mystery-fallback");
   window.CrewAI={call:async()=>"{invalid model JSON"};
  });
  await failedMystery.goto(origin+"/games/mystery",{waitUntil:"domcontentloaded"});
  await failedMystery.locator(".crew-play-mystery-source").getByText("AI 生成失敗").waitFor({timeout:15000});
  assert.ok(await failedMystery.locator(".crew-play-question-grid button").count()>0,"Built-in fallback is playable");
  await failedMystery.close();
  process.stdout.write("PASS mystery fallback on invalid Gemini output\n");
  // 20 Questions P0: Gemini-generated secret + a single 20-attempt budget shared
  // by screen prompts, spoken free questions and explicit spoken guesses.
  const voiceTwenty=await context.newPage();
  const twentyErrors=[];
  checkConsole(voiceTwenty,twentyErrors);
  await voiceTwenty.addInitScript(()=>{
   localStorage.setItem("crew_gemini_api_key","mock-key-for-twenty-smoke");
   window.__twentyGenerationCalls=0;
   const facts=[
    {question:{en:"Does it have two wheels?",zh:"它有兩個輪子嗎？"},answer:true},
    {question:{en:"Can it float on the ocean?",zh:"它能漂浮在海上嗎？"},answer:false},
    {question:{en:"Does it have pedals?",zh:"它有踏板嗎？"},answer:true},
    {question:{en:"Does it need a battery?",zh:"它需要電池嗎？"},answer:false},
    {question:{en:"Do people ride it outdoors?",zh:"人們會在戶外騎它嗎？"},answer:true},
    {question:{en:"Does it make coffee?",zh:"它可以煮咖啡嗎？"},answer:false}
   ];
   window.CrewAI={call:async prompt=>{
    if(prompt.includes("choosing ONE secret object")){
     const n=++window.__twentyGenerationCalls;
     const name=n===1?{zh:"腳踏車",en:"bicycle"}:{zh:"鍵盤",en:"keyboard"};
     return JSON.stringify({name,aliases:n===1?["腳踏車","bicycle","bike"]:["鍵盤","keyboard","電腦鍵盤"],
       traits:n===1?["made","outdoors","transport"]:["made","electric","portable"],
       facts});
    }
    if(prompt.includes("conservative 20 Questions game judge")){
     const speech=prompt.match(/Learner transcript \(untrusted\): (.+)$/m)?.[1]||"";
     if(speech.includes("hello")||speech.includes("Hello"))
      return JSON.stringify({type:"chat"});
     if(speech.includes("I think it's a bicycle"))
      return JSON.stringify({type:"guess",guess:"bicycle"});
     if(speech.includes("made by people"))
      return JSON.stringify({type:"question",answer:"yes"});
     return JSON.stringify({type:"question",answer:"unknown"});
    }
    return JSON.stringify({type:"chat"});
   }};
   window.CrewLiveUI={};
   class MockTwentySession{
    constructor(options){this.options=options;this.ready=true;this.running=true;this.micMuted=false;window.__twentyVoice=this}
    async start(){this.options.onState?.("ready")}
    async stop(){this.running=false}
    setVolume(){}
    sendText(){return true}
    interrupt(){return true}
    getDurationMs(){return 0}
   }
   window.CrewLive={Session:MockTwentySession};
  });
  await voiceTwenty.goto(origin+"/games/twenty-questions",{waitUntil:"domcontentloaded"});
  await voiceTwenty.locator(".crew-play-mystery-source").getByText("Gemini 全新物品").waitFor({timeout:15000});
  assert.equal(await voiceTwenty.locator(".crew-play-count").textContent(),"0 / 20");
  await voiceTwenty.locator(".crew-play-question-disclosure summary").click();
  await voiceTwenty.locator(".crew-play-question-grid button").first().click();
  assert.equal(await voiceTwenty.locator(".crew-play-count").textContent(),"1 / 20","On-screen action uses same count");
  await voiceTwenty.locator(".crew-play-voice-start").click();
  assert.equal(await voiceTwenty.locator(".crew-play-voice-presence").count(),1,"Friend reply should appear above the board");
  assert.equal(await voiceTwenty.locator(".crew-play-voice").count(),0,"Voice should not be duplicated below the game");
  assert.equal(await voiceTwenty.locator(".crew-play-voice-dock-shell .crew-voice-dock").count(),1);
  await voiceTwenty.evaluate(()=>window.__twentyVoice.options.onOutputTranscript?.("Yes, you can find it at home!"));
  await voiceTwenty.locator(".crew-play-voice-presence-reply").getByText("Yes, you can find it at home!").waitFor({timeout:4000});

  await voiceTwenty.evaluate(()=>window.__twentyVoice.options.onTurnComplete({
   input:"Hello Bella",output:"Hi!",hasValidOutput:true
  }));
  await voiceTwenty.waitForTimeout(180);
  assert.equal(await voiceTwenty.locator(".crew-play-count").textContent(),"1 / 20","Small talk must not count");
  await voiceTwenty.evaluate(()=>window.__twentyVoice.options.onTurnComplete({
   input:"Is it made by people?",output:"Yes!",hasValidOutput:true
  }));
  await voiceTwenty.locator(".crew-play-count").getByText("2 / 20").waitFor({timeout:6000});
  assert.equal(await voiceTwenty.locator(".crew-play-question-history li").count(),2);
  assert.match(await voiceTwenty.locator(".crew-play-question-history").textContent(),/Is it made by people/);
  await voiceTwenty.evaluate(()=>window.__twentyVoice.options.onTurnComplete({
   input:"I think it's a bicycle",output:"You got it!",hasValidOutput:true
  }));
  await voiceTwenty.locator(".crew-play-count").getByText("3 / 20").waitFor({timeout:6000});
  await voiceTwenty.locator(".crew-play-solution").waitFor({timeout:6000});
  assert.match(await voiceTwenty.locator(".crew-play-solution").textContent(),/腳踏車/);
  await voiceTwenty.locator(".crew-play-solution button").click();
  await voiceTwenty.locator(".crew-play-mystery-source").getByText("Gemini 全新物品").waitFor({timeout:15000});
  assert.equal(await voiceTwenty.locator(".crew-play-count").textContent(),"0 / 20");
  assert.equal(await voiceTwenty.evaluate(()=>window.__twentyGenerationCalls),2);
  assert.deepEqual(twentyErrors,[],"20 Questions speech synchronization should be error-free");
  await voiceTwenty.close();
  process.stdout.write("PASS 20 Questions generated secrets, voice questions/guesses and shared 20-attempt budget\n");

  const noKeyTwenty=await context.newPage();
  await noKeyTwenty.addInitScript(()=>{
   localStorage.removeItem("crew_gemini_api_key");
   sessionStorage.removeItem("crew_gemini_api_key_session");
  });
  await noKeyTwenty.goto(origin+"/games/twenty-questions",{waitUntil:"domcontentloaded"});
  await noKeyTwenty.locator(".crew-play-mystery-source").getByText("內建物品").waitFor({timeout:15000});
  await noKeyTwenty.locator(".crew-play-question-disclosure summary").click();
  await noKeyTwenty.locator(".crew-play-question-grid button").first().click();
  assert.equal(await noKeyTwenty.locator(".crew-play-count").textContent(),"1 / 20");
  await noKeyTwenty.close();
  process.stdout.write("PASS keyless offline 20 Questions fallback\n");

  // Responsive UX regression: the voice dock stays visible above global nav
  // while users scroll, and the optional question grid stays collapsed.
  const mobileTwenty=await context.newPage();
  await mobileTwenty.setViewportSize({width:390,height:844});
  await mobileTwenty.addInitScript(()=>{
   localStorage.removeItem("crew_gemini_api_key");
   sessionStorage.removeItem("crew_gemini_api_key_session");
  });
  await mobileTwenty.goto(origin+"/games/twenty-questions",{waitUntil:"domcontentloaded"});
  await mobileTwenty.locator(".crew-play-voice-presence").waitFor({state:"visible",timeout:15000});
  assert.equal(await mobileTwenty.locator(".crew-play-friend-bar").count(),0,"Do not duplicate the friend card");
  assert.equal(await mobileTwenty.locator(".crew-play-voice-dock-shell .crew-play-voice-start").count(),1);
  assert.equal(await mobileTwenty.locator(".crew-play-question-disclosure:not([open])").count(),1,"Hints are initially collapsed");
  const inspectVoiceDock=async()=>{
   return mobileTwenty.evaluate(()=>{
    const dock=document.querySelector(".crew-play-voice-dock-shell").getBoundingClientRect();
    const nav=document.querySelector(".global-nav").getBoundingClientRect();
    return {dockTop:dock.top,dockBottom:dock.bottom,navTop:nav.top,
      viewportHeight:window.innerHeight,horizontalOverflow:document.documentElement.scrollWidth-window.innerWidth};
   });
  };
  let bounds=await inspectVoiceDock();
  assert.ok(bounds.dockBottom<=bounds.navTop-2,"Voice dock must be above fixed navigation");
  assert.ok(bounds.dockTop>=0&&bounds.dockTop<bounds.viewportHeight,"Voice dock visible on first screen");
  assert.ok(bounds.horizontalOverflow<=1,"The mobile layout must not overflow sideways");
  await mobileTwenty.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await mobileTwenty.waitForTimeout(160);
  bounds=await inspectVoiceDock();
  assert.ok(bounds.dockBottom<=bounds.navTop-2,"Voice dock remains above nav at end of the page");
  assert.ok(bounds.dockTop>=0,"Voice dock remains on-screen while scrolling");
  await mobileTwenty.locator(".crew-play-question-disclosure summary").click();
  for(let i=0;i<4;i++)await mobileTwenty.locator(".crew-play-question-grid button:enabled").first().click();
  assert.equal(await mobileTwenty.locator(".crew-play-question-history--compact > ul > li").count(),3,
    "Only three most recent questions should remain expanded");
  assert.equal(await mobileTwenty.locator(".crew-play-history-older summary").count(),1,
    "Earlier questions remain accessible behind a disclosure");
  await mobileTwenty.locator(".crew-play-history-older summary").click();
  assert.equal(await mobileTwenty.locator(".crew-play-history-older li").count(),1);
  await mobileTwenty.close();
  process.stdout.write("PASS mobile 20 Questions dock above nav, collapsed hints, recent-three history\n");

  // Gomoku: column letters and row numbers align with the exact rendered stone centers.
  await play.goto(origin+"/games/friend-gomoku",{waitUntil:"domcontentloaded"});
  await play.locator(".friend-gomoku-setup .btn").waitFor({state:"visible",timeout:15000});
  await play.locator(".friend-gomoku-setup .btn").click();
  await play.locator(".friend-gomoku-cell").first().waitFor({state:"visible",timeout:15000});
  assert.equal(await play.locator(".friend-gomoku-cell").count(),225);
  assert.equal(await play.locator(".friend-gomoku-axis-top .friend-gomoku-axis-label").count(),15);
  assert.equal(await play.locator(".friend-gomoku-axis-left .friend-gomoku-axis-label").count(),15);
  assert.deepEqual(await play.locator(".friend-gomoku-axis-top .friend-gomoku-axis-label").allTextContents(),
    "ABCDEFGHIJKLMNO".split(""));
  assert.deepEqual(await play.locator(".friend-gomoku-axis-left .friend-gomoku-axis-label").allTextContents(),
    Array.from({length:15},(_,i)=>String(i+1)));
  async function coordinateError(){
   return play.evaluate(()=>{
    const letters=[...document.querySelectorAll(".friend-gomoku-axis-top .friend-gomoku-axis-label")];
    const numbers=[...document.querySelectorAll(".friend-gomoku-axis-left .friend-gomoku-axis-label")];
    return ["A1","H10","J7","O15"].map(coordinate=>{
     const cell=document.querySelector('[data-coordinate="'+coordinate+'"]');
     if(!cell)return Infinity;
     const x=coordinate.charCodeAt(0)-65,y=Number(coordinate.slice(1))-1;
     const c=cell.getBoundingClientRect(),a=letters[x].getBoundingClientRect(),b=numbers[y].getBoundingClientRect();
     return Math.max(Math.abs(c.x+c.width/2-a.x-a.width/2),Math.abs(c.y+c.height/2-b.y-b.height/2));
    });
   });
  }
  assert.ok((await coordinateError()).every(delta=>delta<1.5),"Desktop coordinate labels must be centered on stones");
  await play.setViewportSize({width:390,height:844});
  assert.ok((await coordinateError()).every(delta=>delta<1.5),"Mobile coordinate labels must remain aligned");
  await play.locator('[data-coordinate="H10"]').click();
  await play.locator('[data-coordinate="H10"] .friend-gomoku-stone.black').waitFor({timeout:5000});
  process.stdout.write("PASS Gomoku coordinate guides on desktop and mobile\\n");
  // Voice pacing: mock Live transport so CI can prove a spoken turn ends
  // BEFORE the AI places its stone, without a paid API or microphone.
  const voiceGame=await context.newPage();
  const voiceErrors=[];
  checkConsole(voiceGame,voiceErrors);
  await voiceGame.addInitScript(()=>{
    try{localStorage.setItem("crew_gemini_api_key","mock-key-for-browser-smoke");}catch{}
    window.CrewAI={};window.CrewLiveUI={};
    class MockVoiceSession{
      constructor(options){this.options=options;this.ready=true;this.running=true;this.micMuted=false;window.__mockGomokuVoice=this;}
      async start(){this.options.onState?.("ready")}
      async stop(){this.running=false}
      setVolume(){}
      sendText(value){
        window.__mockGomokuCue=value;
        this.options.onSpeaking?.(true);
        return true;
      }
      interrupt(){this.options.onSpeaking?.(false);return true}
      getDurationMs(){return 0}
    }
    window.CrewLive={Session:MockVoiceSession};
  });
  await voiceGame.goto(origin+"/games/friend-gomoku",{waitUntil:"domcontentloaded"});
  await voiceGame.locator(".friend-gomoku-setup .btn").click();
  await voiceGame.locator(".friend-gomoku-start-voice").click();
  await voiceGame.locator(".friend-gomoku-cell").first().waitFor({state:"visible"});
  await voiceGame.locator('[data-coordinate="H10"]').click();
  await voiceGame.waitForFunction(()=>window.__mockGomokuCue?.includes("[GOMOKU BEFORE MOVE]"));
  assert.equal(await voiceGame.locator(".friend-gomoku-stone.white").count(),0,
    "AI must not move before the friend talks");
  await voiceGame.evaluate(()=>window.__mockGomokuVoice.options.onTurnComplete({hasValidOutput:true,output:"I will play here"}));
  await voiceGame.waitForTimeout(520);
  assert.equal(await voiceGame.locator(".friend-gomoku-stone.white").count(),0,
    "Model turn completion is NOT equivalent to finished audio playback");
  await voiceGame.evaluate(()=>window.__mockGomokuVoice.options.onSpeaking(false));
  await voiceGame.locator(".friend-gomoku-stone.white").first().waitFor({timeout:5000});
  assert.equal(await voiceGame.locator(".friend-gomoku-skip").count(),0);
  await voiceGame.locator('[data-coordinate="J7"]').click();
  await voiceGame.locator(".friend-gomoku-skip").waitFor({state:"visible",timeout:5000});
  await voiceGame.locator(".friend-gomoku-skip").click();
  await voiceGame.locator(".friend-gomoku-stone.white").nth(1).waitFor({timeout:5000});
  assert.deepEqual(voiceErrors,[],"Gomoku mocked voice must not raise browser exceptions");
  await voiceGame.close();
  process.stdout.write("PASS Gomoku voice-drain pacing and manual skip\n");
  // Both new board games must place the AI's disc first, then block the next
  // human turn until its audible post-move comment has really drained.
  for(const gameName of ["connect4","reversi"]){
   const boardVoice=await context.newPage();
   const boardErrors=[];
   checkConsole(boardVoice,boardErrors);
   await boardVoice.addInitScript(()=>{
    try{localStorage.setItem("crew_gemini_api_key","mock-key-for-browser-smoke")}catch{}
    window.CrewAI={};window.CrewLiveUI={};
    class MockBoardSession{
     constructor(options){this.options=options;this.ready=true;this.running=true;this.micMuted=false;window.__mockBoardSession=this}
     async start(){this.options.onState?.("ready")}
     async stop(){this.running=false}
     setVolume(){}
     sendText(text){window.__mockBoardCue=text;this.options.onSpeaking?.(true);return true}
     interrupt(){this.options.onSpeaking?.(false);return true}
     getDurationMs(){return 0}
    }
    window.CrewLive={Session:MockBoardSession};
   });
   await boardVoice.goto(origin+"/games/"+gameName,{waitUntil:"domcontentloaded"});
   await boardVoice.locator(".crew-play-voice-start").click();
   if(gameName==="connect4"){
    await boardVoice.locator(".crew-connect-slot:enabled").first().click();
   }else{
    await boardVoice.locator(".crew-reversi-cell.can-play").first().click();
   }
   await boardVoice.waitForFunction(name=>window.__mockBoardCue?.includes(
    name==="connect4"?"[CONNECT FOUR AFTER MOVE]":"[REVERSI AFTER MOVE]"),gameName,{timeout:8000});
   if(gameName==="connect4"){
    assert.equal(await boardVoice.locator(".crew-connect-disc.computer").count(),1,
      "The yellow AI disc must be present before speech begins");
    assert.equal(await boardVoice.locator(".crew-connect-slot:enabled").count(),0,
      "Connect Four must block input while AI is speaking");
   }else{
    assert.equal(await boardVoice.locator(".crew-reversi-disc.white").count(),3,
      "The newly flipped board must be visible before speech begins");
    assert.equal(await boardVoice.locator(".crew-reversi-cell.can-play").count(),0,
      "Reversi must block legal moves while AI is speaking");
   }
   await boardVoice.evaluate(()=>window.__mockBoardSession.options.onTurnComplete({
    hasValidOutput:true,output:"I have played my move"
   }));
   await boardVoice.waitForTimeout(480);
   assert.equal(await boardVoice.locator(gameName==="connect4"?".crew-connect-slot:enabled":".crew-reversi-cell.can-play").count(),0,
     "The model turnComplete callback is too early; wait for actual audio drain");
   await boardVoice.evaluate(()=>window.__mockBoardSession.options.onSpeaking(false));
   await boardVoice.locator(gameName==="connect4"?".crew-connect-slot:enabled":".crew-reversi-cell.can-play").first().waitFor({timeout:5000});
   if(gameName==="connect4"){
    await boardVoice.locator(".crew-connect-slot:enabled").first().click();
   }else{
    await boardVoice.locator(".crew-reversi-cell.can-play").first().click();
   }
   await boardVoice.locator(".crew-play-skip-speech").waitFor({state:"visible",timeout:8000});
   await boardVoice.locator(".crew-play-skip-speech").click();
   await boardVoice.locator(".crew-play-skip-speech").waitFor({state:"detached",timeout:5000});
   await boardVoice.locator(".crew-play-board-actions button").last().click();
   await boardVoice.locator(gameName==="connect4"?".crew-connect-slot:enabled":".crew-reversi-cell.can-play").first().waitFor({timeout:8000});
   assert.deepEqual(boardErrors,[],"No browser errors for "+gameName+" voice pacing");
   await boardVoice.close();
   process.stdout.write("PASS "+gameName+" post-move voice completion, skip, reset\n");
  }
  assert.deepEqual(playErrors,[],"Crew Play should not throw browser errors");
  await play.close();
  process.stdout.write("PASS Crew Play boards and puzzles\\n");
  await context.close();
 }finally{
  if(browser)await browser.close();
  vite.kill("SIGTERM");
  await sleep(200);
  if(viteErrors&&vite.exitCode&&vite.exitCode!==0)process.stderr.write(viteErrors);
 }
}

run().catch(error=>{console.error(error);process.exitCode=1});
