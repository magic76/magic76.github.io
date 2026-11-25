/**
 * Cloudflare Pages smoke test against the actual production dist, in Chromium.
 * CI installs Playwright without adding it to the deployed application bundle.
 */
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {setTimeout as sleep} from "node:timers/promises";
import {readFileSync} from "node:fs";
import {mkdir,rename} from "node:fs/promises";
import {chromium} from "playwright";
import {approvedPortrait} from "../web-spa/src/timeline/portraitAssetPolicy.mjs";

const origin="http://127.0.0.1:4179";
const routes=["/","/teacher/","/story/","/fortune/","/research/","/games/","/en/","/en/teacher/","/en/story/","/en/fortune/","/en/research/","/en/games/"];

// Read the actual composited screenshot, rather than the declared background:
// a sibling copy scrim once darkened this CTA even though CSS still said #f5eee6.
// Chromium decodes its own PNG in-browser, so no screenshot/PNG dependency is needed.
async function assertPortalCtaPixels(page,label){
 const button=page.locator(".crew-portal-cta");
 await page.mouse.move(0,0); // Keep hover transforms/shadows out of this pixel check.
 await page.waitForTimeout(220); // Let any prior 200ms hover transition finish before capturing.
 await button.scrollIntoViewIfNeeded();
 // Capture the element after Playwright settles animations/scrolling, then use PNG-local
 // coordinates. A stale offscreen page boundingBox can no longer create an empty clip.
 const png=await button.screenshot({type:"png",animations:"disabled",scale:"css"});
 const picture=await page.evaluate(async encoded=>{
  const bytes=Uint8Array.from(atob(encoded),character=>character.charCodeAt(0));
  const image=await createImageBitmap(new Blob([bytes],{type:"image/png"}));
  const canvas=new OffscreenCanvas(image.width,image.height),ctx=canvas.getContext("2d");
  ctx.drawImage(image,0,0);image.close();
  const samples=[
   {name:"left center",x:12,y:Math.round(canvas.height/2)-1},
   {name:"right center",x:canvas.width-15,y:Math.round(canvas.height/2)-1},
   {name:"top center",x:Math.round(canvas.width/2)-1,y:6}
  ];
  return {width:canvas.width,height:canvas.height,samples:samples.map(sample=>({
   name:sample.name,pixels:Array.from(ctx.getImageData(sample.x,sample.y,3,3).data)
  }))};
 },png.toString("base64"));
 assert.ok(picture.width>=44&&picture.height>=44,"Visible CTA for "+label);
 assert.equal(picture.samples.length,3,"Three interior CTA regions for "+label);
 for(const sample of picture.samples){
  assert.equal(sample.pixels.length,36,"Complete 3x3 CTA region for "+label+" at "+sample.name);
  for(let at=0;at<sample.pixels.length;at+=4)
   assert.deepEqual(sample.pixels.slice(at,at+4),[245,238,230,255],label+" CTA must paint solid #f5eee6 at "+sample.name);
 }
}

// Resizes and Playwright clicks can scroll controls into view. First-screen
// geometry must always be measured from the same settled, top-of-page origin.
async function restorePortalFirstScreen(page){
 await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:"instant"}));
 await page.waitForTimeout(50);
 await page.waitForFunction(()=>window.scrollX===0&&window.scrollY===0,null,{timeout:1500});
}

// Check the CSS-selected stage in the real rendered page, before any scrolling.
// Text ranges catch clipped glyphs and label collisions that element boxes miss.
async function assertPortalStageLayout(page,width,height,label){
 const metric=await page.evaluate(()=>{
  const hero=document.querySelector(".crew-home-portal"),content=hero.querySelector(".crew-portal-content");
  const heading=hero.querySelector("h1"),kickers=[...hero.querySelectorAll(".crew-portal-kicker")];
  const rect=element=>{const r=element.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
  const textRects=element=>{
   const result=[],walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
   for(let node=walker.nextNode();node;node=walker.nextNode()){
    if(!node.textContent.trim())continue;
    const range=document.createRange();range.selectNodeContents(node);
    for(const r of range.getClientRects())if(r.width&&r.height)result.push({left:r.left,right:r.right,top:r.top,bottom:r.bottom});
   }
   return result;
  };
  const heroRect=rect(hero),style=getComputedStyle(hero);
  const stageScaleW=Number.parseFloat(style.getPropertyValue("--portal-stage-scale-w"));
  const stageScaleH=Number.parseFloat(style.getPropertyValue("--portal-stage-scale-h"));
  const stageEnvelope=Number.parseFloat(style.getPropertyValue("--portal-copy-ring-envelope"));
  const stageRadius=Math.min(heroRect.width*stageScaleW,heroRect.height*stageScaleH);
  const stageLeft=heroRect.left+heroRect.width*Number.parseFloat(style.getPropertyValue("--portal-stage-x"))-stageRadius*stageEnvelope;
  const copy=[...hero.querySelectorAll(".crew-portal-intro,h1,.crew-portal-description,.crew-portal-cta,.crew-portal-remaining")].flatMap(textRects);
  return {hero:heroRect,content:rect(content),contentPosition:getComputedStyle(content).position,
   locale:hero.lang||document.documentElement.lang,headingFont:Number.parseFloat(getComputedStyle(heading).fontSize),
   heading:rect(heading),headingText:textRects(heading),headingOverflow:heading.scrollWidth>heading.clientWidth+1,
   cta:rect(hero.querySelector(".crew-portal-cta")),ctaOverflow:hero.querySelector(".crew-portal-cta").scrollWidth>hero.querySelector(".crew-portal-cta").clientWidth+1,
   kickerCount:kickers.length,kicker:kickers.length===1?rect(kickers[0]):null,copy,
   stage:{split:Number(style.getPropertyValue("--portal-stage-split")),
    scaleW:stageScaleW,scaleH:stageScaleH,radius:stageRadius,envelope:stageEnvelope,left:stageLeft,
    x:heroRect.left+heroRect.width*Number(style.getPropertyValue("--portal-stage-x")),
    y:heroRect.top+heroRect.height*Number(style.getPropertyValue("--portal-stage-y"))},
   introDisplay:getComputedStyle(hero.querySelector(".crew-portal-intro")).display,
   descriptionDisplay:getComputedStyle(hero.querySelector(".crew-portal-description")).display,
   navTop:document.querySelector(".global-nav").getBoundingClientRect().top,
   navHeightToken:Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")),
   safeBottom:Number.parseFloat(getComputedStyle(document.querySelector(".global-nav")).paddingBottom)||0,
   shortsTop:document.querySelector(".crew-home-shorts").getBoundingClientRect().top};
 });
 const details=label+": "+JSON.stringify(metric);
 assert.equal(metric.contentPosition,"relative","Content keeps a flow-based layout "+details);
 assert.equal(metric.kickerCount,1,"One kicker element, never duplicated "+details);
 assert.ok(!metric.headingOverflow&&!metric.ctaOverflow,"Heading and CTA fit their columns "+details);
 assert.ok(metric.headingText.length>0,"Heading has visible glyphs "+details);
 for(const rect of metric.headingText)
  assert.ok(rect.left>=metric.hero.left-1&&rect.right<=metric.hero.right+1&&rect.top>=metric.hero.top-1&&rect.bottom<=metric.hero.bottom+1,"Heading glyphs are not clipped by the hero "+details);
 const compact=width>=560&&width>height&&height<=500;
 const split=width>=1100||(width>=760&&width>height&&height>=501)||compact;
 if(split){
  assert.equal(metric.stage.split,1,"Split stage selected by CSS "+details);
  assert.ok(metric.content.left<width*.5&&metric.heading.left<width*.5,"Copy column stays on the left "+details);
  assert.ok(metric.stage.x>width*.5&&metric.stage.x>metric.heading.right,"Stage center stays right of the copy column "+details);
  assert.ok(Math.abs(metric.stage.x-width*.70)<=width*.02+1,"Stage uses the approved right-side center "+details);
  assert.ok(Math.abs((metric.kicker.left+metric.kicker.right)/2-metric.stage.x)<=2&&Math.abs((metric.kicker.top+metric.kicker.bottom)/2-metric.stage.y)<=2,"Single kicker stays at the stage center "+details);
  for(const rect of metric.copy)
   assert.ok(rect.right<=metric.kicker.left||rect.left>=metric.kicker.right||rect.bottom<=metric.kicker.top||rect.top>=metric.kicker.bottom,"Stage label does not overlap copy glyphs "+details);
 }
 // Group glyph rectangles by their line tops; the Georgia accent can sit a
 // few pixels above the surrounding font without being a separate text line.
 if(split&&width>=1100&&!compact){
  assert.ok([metric.stage.scaleW,metric.stage.scaleH,metric.stage.radius,metric.stage.envelope,metric.stage.left].every(value=>Number.isFinite(value)&&value>0),"Desktop stage boundary requires finite positive CSS geometry "+details);
  assert.ok(metric.heading.right<=metric.stage.left+8,"Desktop heading stays before the stage's left boundary "+details);
  const lines=[];
  for(const glyph of [...metric.headingText].sort((a,b)=>a.top-b.top)){
   let line=lines.find(item=>Math.abs(item.top-glyph.top)<=Math.max(8,metric.headingFont*.3));
   if(!line){line={top:glyph.top,left:glyph.left,right:glyph.right};lines.push(line)}
   else{line.left=Math.min(line.left,glyph.left);line.right=Math.max(line.right,glyph.right)}
  }
  const cjk=/^(?:zh(?:-|$)|ja(?:-|$)|ko(?:-|$))/i.test(metric.locale);
  if(cjk)assert.equal(lines.length,2,"CJK heading keeps exactly the two designed lines "+details);
  assert.ok(lines.length<=(width>=1280?3:4),"Desktop heading line budget "+details);
  const widest=Math.max(...lines.map(line=>line.right-line.left)),last=lines.at(-1);
  assert.ok(last.right-last.left+1>=widest*.35,"Balanced heading has no orphan last line "+details);
 }
 if(compact){
  assert.equal(metric.introDisplay,"none","Compact landscape hides the intro "+details);
  assert.equal(metric.descriptionDisplay,"none","Compact landscape hides the description "+details);
  assert.ok(Math.abs(metric.hero.height-(height-58-metric.navHeightToken-metric.safeBottom))<=1,"Compact hero uses the visible-area height without a portrait floor "+details);
  assert.ok(metric.cta.top>=58&&metric.cta.bottom<=metric.navTop,"Compact CTA stays above nav "+details);
 }
 const firstScreenEnd=width<1100?metric.navTop:height;
 assert.ok(metric.shortsTop>=firstScreenEnd-1,"Shorts never peek into the first screen "+details);
}

async function captureCrewVisualQA(browser){
 const folder="artifacts/crew-visual-qa";
 await mkdir(folder,{recursive:true});
 const routes=[{path:"/",id:"home"},{path:"/chat/",id:"chat"},{path:"/learn/",id:"learn"},{path:"/explore/",id:"explore"}];
 for(const width of [390,430,1440]){
  for(const route of routes){
   const context=await browser.newContext({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500,deviceScaleFactor:1});
   await context.addInitScript(()=>localStorage.setItem("crew_onboarding_web_v1","existing"));
   try{
    for(const version of ["before","after"]){
     const host=version==="before"?"https://www.3sssi.com":origin;
     const page=await context.newPage();
     try{
      const response=await page.goto(host+route.path,{waitUntil:"domcontentloaded",timeout:16000});
      assert.equal(response?.status(),200);
      await page.locator("main").first().waitFor({state:"visible",timeout:10000});
      await page.waitForTimeout(240);
      await page.screenshot({path:folder+"/"+version+"-"+route.id+"-"+width+".jpg",type:"jpeg",quality:75,fullPage:true,animations:"disabled"});
      process.stdout.write("CAPTURE "+version+" "+route.id+" "+width+"px\\n");
     }catch(error){process.stdout.write("CAPTURE unavailable "+version+" "+route.id+" "+width+"px: "+String(error).slice(0,160)+"\\n");}
     finally{await page.close();}
    }
   }finally{await context.close();}
  }
 }
 // Two short real browser recordings with explicit manual interaction.
 for(const setup of [{id:"phone",width:390},{id:"desktop",width:1440}]){
  const context=await browser.newContext({
   viewport:{width:setup.width,height:900},isMobile:setup.width<500,hasTouch:setup.width<500,
   deviceScaleFactor:1,recordVideo:{dir:folder,size:{width:setup.width,height:900}}
  });
  await context.addInitScript(()=>localStorage.setItem("crew_onboarding_web_v1","existing"));
  const page=await context.newPage();
  const video=page.video();
  try{
   await page.goto(origin+"/chat/",{waitUntil:"domcontentloaded",timeout:20000});
   await page.locator(".crew-section-carousel-actions button").last().waitFor({state:"visible",timeout:12000});
   await page.locator(".crew-section-carousel-actions button").last().click();
   await page.waitForTimeout(350);
   await page.locator(".crew-section-carousel-actions button").last().click();
   await page.waitForTimeout(350);
   await page.goto(origin+"/",{waitUntil:"domcontentloaded",timeout:20000});
   await page.locator(".crew-portal-cta").waitFor({state:"visible",timeout:12000});
   await page.locator('.crew-portal-tab[data-mode="learn"]').click();
   await page.waitForTimeout(350);
   await page.locator('.crew-portal-tab[data-mode="fortune"]').click();
   await page.waitForTimeout(350);
  }catch(error){process.stdout.write("VIDEO QA partial "+setup.id+": "+String(error).slice(0,140)+"\\n");}
  finally{
   await context.close();
   if(video){try{await rename(await video.path(),folder+"/motion-"+setup.id+".webm")}catch(error){process.stdout.write("VIDEO unavailable "+String(error).slice(0,120)+"\\n");}}
  }
 }
 // Reduced-motion behavior is checked in an actual Chromium media-emulation context.
 const reduce=await browser.newContext({viewport:{width:390,height:900},reducedMotion:"reduce",isMobile:true,hasTouch:true});
 await reduce.addInitScript(()=>localStorage.setItem("crew_onboarding_web_v1","existing"));
 const reducedPage=await reduce.newPage();
 try{
  await reducedPage.goto(origin+"/chat/",{waitUntil:"domcontentloaded",timeout:20000});
  await reducedPage.locator(".crew-section-friend").first().waitFor({state:"visible",timeout:12000});
  const state=await reducedPage.locator(".crew-section-friend").first().evaluate(el=>({
   reduced:matchMedia("(prefers-reduced-motion: reduce)").matches,
   duration:getComputedStyle(el).transitionDuration
  }));
  assert.ok(state.reduced,"Browser must emulate reduced-motion setting");
  assert.ok(state.duration.split(",").every(value=>parseFloat(value)<0.001),"Friend card transitions must be effectively static in reduced-motion mode: "+state.duration);
  process.stdout.write("PASS reduced-motion static friend cards\\n");
 }finally{await reduce.close();}
}


// CSS collision regression: learn, vocabulary, and course all use their full width.
async function verifyLearningResponsiveLayout(browser){
 for(const width of [390,430,1440]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<500,hasTouch:width<500});
  await context.addInitScript(()=>localStorage.setItem("crew_onboarding_web_v1","existing"));
  const page=await context.newPage();
  try{
   for(const [path,root,surface] of [
    ["/learn/",".crew-section-learn",".crew-section-focus-card"],
    ["/teacher/vocabulary/",".crew-learning-focus",".crew-learning-quiz"],
    ["/teacher/course/",".crew-learning-focus",".crew-course-resume"]
   ]){
    const response=await page.goto(origin+path,{waitUntil:"domcontentloaded",timeout:30000});
    assert.equal(response?.status(),200,path+" must load");
    await page.locator(surface).first().waitFor({state:"visible",timeout:15000});
    const geometry=await page.evaluate(({root,surface})=>{
     const shell=document.querySelector(root).getBoundingClientRect();
     const card=document.querySelector(surface).getBoundingClientRect();
     return {shell:shell.width,card:card.width,viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth};
    },{root,surface});
    assert.ok(geometry.shell>=250&&geometry.card>=geometry.shell*.9,path+" must not become a narrow column at "+width+": "+JSON.stringify(geometry));
    assert.ok(geometry.scroll<=geometry.viewport+2,path+" must not overflow at "+width+": "+JSON.stringify(geometry));
    if(path==="/learn/"){
     const textWidth=await page.locator(".crew-section-focus-card-content").evaluate(el=>el.getBoundingClientRect().width);
     assert.ok(textWidth>(width<500?160:280),"Learn heading must remain readable at "+width);
     // Regression: bare SVG on the speaking shortcut once occupied ~300px and squeezed Chinese into one character per line.
     const speaking=page.locator(".crew-learn-three-minute");
     await speaking.waitFor({state:"visible"});
     const shortcut=await speaking.evaluate(el=>{
      const svg=el.querySelector(".crew-learn-three-minute-icon svg");
      const copy=el.querySelector(".crew-learn-three-minute-copy");
      const arrow=el.querySelector(".crew-learn-three-minute-arrow");
      const bounds=el.getBoundingClientRect(),icon=svg.getBoundingClientRect(),text=copy.getBoundingClientRect();
      const style=getComputedStyle(svg);
      return {width:bounds.width,iconWidth:icon.width,iconHeight:icon.height,textWidth:text.width,
       textRight:text.right,arrowLeft:arrow.getBoundingClientRect().left,stroke:style.stroke,fill:style.fill};
     });
     assert.ok(shortcut.iconWidth>=18&&shortcut.iconWidth<=26&&shortcut.iconHeight>=18&&shortcut.iconHeight<=26,
      "Speaking icon must stay ~22px at "+width+": "+JSON.stringify(shortcut));
     assert.ok(shortcut.textWidth>=(width<500?110:200)&&shortcut.textRight<=shortcut.arrowLeft+1,
      "Speaking text must fit before arrow at "+width+": "+JSON.stringify(shortcut));
     assert.equal(shortcut.fill,"none","Speaking icon must not render as a solid black bubble");
     assert.notEqual(shortcut.stroke,"none","Speaking icon must keep its outline");
    }
    if(path==="/teacher/vocabulary/"){
     const positions=await page.locator(".crew-learning-question .quiz-choice").evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().top));
     assert.equal(positions.length,3,"Vocabulary must show three answers");
     assert.ok(positions.every(y=>Math.abs(y-positions[0])<2),"Three choices must be horizontal");
    }
    process.stdout.write("PASS learning CSS "+path+" "+width+"px\\n");
   }
  }finally{await context.close();}
 }
}

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
  // Fresh visitors on both phone and desktop must reach Home without any modal.
  for(const [width,height] of [[390,844],[1280,800]]){
   const onboardingContext=await browser.newContext({viewport:{width,height},locale:"zh-TW"});
   try{
    const first=await onboardingContext.newPage();
    await first.goto(origin+"/",{waitUntil:"domcontentloaded"});
    await first.locator("main h1").waitFor({state:"visible",timeout:15000});
    await first.getByText("今日小語",{exact:true}).first().waitFor({state:"visible",timeout:15000});
    await first.waitForTimeout(300); // Allow the lazy gate to hydrate before asserting it stays closed.
    assert.equal(await first.locator(".crew-onboarding-dialog[open]").count(),0,"Fresh Home must not open a guide at "+width);
    assert.equal(await first.evaluate(()=>localStorage.getItem("crew_onboarding_web_v1")),null,"Home visit is not a completed guide");
    // The primary path must be clickable without dismissing an overlay.
    if(width>=768){
     await first.locator(".crew-home-world .crew-home-portal").waitFor({state:"visible",timeout:15000});
     await first.locator(".crew-portal-cta").click({timeout:10000});
    }else{
     await first.getByText("文字聊天",{exact:true}).first().click({timeout:10000});
    }
    await first.waitForURL(url=>url.pathname==="/friend/live"&&url.searchParams.get("chat")==="text",{timeout:15000});
    await first.goto(origin+"/settings",{waitUntil:"domcontentloaded"});
    await first.locator(".crew-settings-onboarding-replay").click();
    await first.locator(".crew-onboarding-dialog[open]").waitFor({state:"visible",timeout:15000});
    assert.match(await first.locator("#crew-onboarding-title").textContent()||"",/歡迎來到 Crew/);
    assert.equal(await first.locator(".crew-onboarding-dialog").getByText("免註冊免費體驗 AI 語音 5 分鐘",{exact:false}).count(),0);
    if(width>=768){
     // A voluntarily replayed guide still completes its language preference flow.
     await first.locator(".crew-onboarding-footer .crew-onboarding-primary").click();
     assert.equal(await first.locator(".crew-onboarding-tile").count(),4);
     await first.locator(".crew-onboarding-tile").filter({hasText:"練習外語"}).click();
     await first.locator(".crew-onboarding-footer .crew-onboarding-primary").click();
     await first.locator(".crew-onboarding-setting select").selectOption("日文");
     await first.locator(".crew-onboarding-footer .crew-onboarding-primary").click();
     await first.waitForURL(url=>url.pathname==="/teacher/live"&&url.searchParams.get("lesson")==="daily_u1_l1");
     assert.equal(await first.evaluate(()=>localStorage.getItem("crew_onboarding_web_v1")),"completed");
     assert.equal(await first.evaluate(()=>localStorage.getItem("crew_teacher_lang")),"日文");
     await first.goto(origin+"/settings",{waitUntil:"domcontentloaded"});
     await first.locator(".crew-settings-onboarding-replay").click();
     await first.locator(".crew-onboarding-dialog[open]").waitFor({state:"visible"});
    }
    await first.locator(".crew-onboarding-skip").click();
    assert.equal(await first.evaluate(()=>localStorage.getItem("crew_onboarding_web_v1")),"skipped");
    await first.goto(origin+"/",{waitUntil:"domcontentloaded"});
    await first.locator("main h1").waitFor({state:"visible",timeout:15000});
    assert.equal(await first.locator(".crew-onboarding-dialog[open]").count(),0);
    process.stdout.write("PASS nonblocking Home, text chat and optional Settings guide "+width+"px\n");
   }finally{await onboardingContext.close();}
  }
  await verifyLearningResponsiveLayout(browser);
   const context=await browser.newContext({viewport:{width:1280,height:800}});
  await context.addInitScript(()=>localStorage.setItem("crew_onboarding_web_v1","existing"));
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
  // Crew World: integrated React desktop/mobile visual geometry, bilingual copy and interactions.
  for(const setup of [
    {route:"/",width:360,height:780,mobile:true},
    {route:"/",width:390,height:844,mobile:true},
    {route:"/",width:1440,height:900,mobile:false},
    {route:"/en/",width:393,height:852,mobile:true},
    {route:"/en/",width:1280,height:800,mobile:false}
  ]){
    const view=await browser.newContext({viewport:{width:setup.width,height:setup.height},isMobile:setup.mobile,hasTouch:setup.mobile,deviceScaleFactor:1});
    await view.addInitScript(()=>localStorage.setItem("crew_onboarding_web_v1","existing"));
    const page=await view.newPage();
    const errors=[];checkConsole(page,errors);
    try{
      await page.goto(origin+setup.route,{waitUntil:"domcontentloaded",timeout:30000});
      await page.locator(".crew-home-world .crew-home-portal").waitFor({state:"visible",timeout:15000});
      assert.equal(await page.locator(".crew-portal-cta").count(),1,"Only one primary CTA");
      assert.equal(await page.locator('.crew-portal-tabs [role="tab"]').count(),4,"Four manual portal tabs");
      assert.equal(await page.locator(".crew-portal-motion, .crew-portal-hint").count(),0,"No pause control or motion hint");
      assert.ok(await page.locator(".crew-portal-content h1").isVisible(),"Visible chat heading");
      const initial=await page.locator(".crew-portal-content h1").textContent();
      assert.ok(initial?.trim(),"Non-empty translated chat heading");
      if(setup.mobile){
        await page.waitForFunction(() =>
          document.querySelector(".crew-portal-field")?.getAttribute("data-ready")==="true",
          null,{timeout:12000}
        );
        const portalState=await page.evaluate(()=>{
          const field=document.querySelector(".crew-portal-field");
          const canvas=field?.querySelector("canvas");
          return {ready:field?.getAttribute("data-ready"),width:canvas?.width||0,height:canvas?.height||0};
        });
        assert.equal(portalState.ready,"true","Mobile KV initializes the real Canvas");
        assert.ok(portalState.width>0&&portalState.height>0,"Mobile particle surface is sized");
      }
      await restorePortalFirstScreen(page);
      const metric=await page.evaluate(()=>{
        const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {x:r.left,right:r.right,y:r.top,bottom:r.bottom,width:r.width,height:r.height}};
        return {screenWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
          heading:rect(".crew-portal-content h1"),cta:rect(".crew-portal-cta"),tabs:rect(".crew-portal-tabs"),
          tabsButtons:[...document.querySelectorAll('.crew-portal-tabs [role="tab"]')].map(el=>{const r=el.getBoundingClientRect();return {y:r.top,bottom:r.bottom,height:r.height,width:r.width}}),
          nav:rect(".global-nav"),bridge:rect(".crew-home-world-bridge"),shorts:rect(".crew-home-shorts")};
      });
      assert.ok(metric.scrollWidth<=metric.screenWidth+2,"No horizontal overflow: "+JSON.stringify({setup,metric}));
      assert.ok(metric.heading.bottom<=metric.cta.y,"Headline precedes CTA");
      assert.ok(metric.cta.bottom<=metric.tabs.y,"CTA and tabs do not overlap: "+JSON.stringify({setup,metric}));
      assert.equal(metric.tabsButtons.length,4,"Four tab buttons");
      assert.ok(metric.cta.height>=44,"CTA remains a touch target");
      for(const tab of metric.tabsButtons){
        assert.ok(tab.height>=44&&tab.width>=44,"Tabs retain >=44px touch targets");
        if(setup.mobile)assert.ok(tab.bottom<=metric.nav.y,"All tabs fit above the bottom navigation: "+JSON.stringify({setup,metric}));
      }
      if(setup.mobile)assert.ok(metric.shorts.y>=metric.nav.y,"Shorts start below the first viewport");
      assert.ok(metric.bridge.y<metric.shorts.y,"Photos follow the KV");
      await assertPortalStageLayout(page,setup.width,setup.height,setup.route+" initial portal");
      const href=await page.locator(".crew-portal-cta").getAttribute("href");
      assert.match(href||"",/\/(?:friend\/live\?id=zoe|account#settings-gemini)$/, "CTA targets direct chat or exhausted setup");
      const homeUrl=page.url();
      const headings=new Set();
      const sample=()=>page.locator(".crew-home-portal canvas").evaluate(canvas=>{
        const pixels=canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data;
        let hash=2166136261;for(const value of pixels)hash=Math.imul(hash^value,16777619)>>>0;
        return hash;
      });
      assert.equal(await page.locator(".crew-home-portal canvas").count(),1,"Exactly one canvas covers the hero");
      const canvasStates=new Set();
      for(const [mode,target] of [["chat","/friend/live?id=zoe"],["learn","/teacher"],["fortune","/fortune"],["play","/games/1a2b"]]){
        const tab=page.locator('.crew-portal-tab[data-mode="'+mode+'"]');
        await tab.click();
        await restorePortalFirstScreen(page);
        assert.equal(page.url(),homeUrl,"Selecting a tab does not navigate");
        assert.equal(await tab.getAttribute("aria-selected"),"true");
        assert.equal(await tab.getAttribute("tabindex"),"0");
        assert.equal(await page.locator('.crew-portal-tabs [role="tab"][tabindex="0"]').count(),1,"Only selected tab enters the tab order");
        assert.ok((await tab.textContent())?.trim(),"Every tab has a text name");
        const panelId=await tab.getAttribute("aria-controls");
        assert.ok(panelId,"Tab controls a named panel");
        assert.equal(await page.locator('[role="tabpanel"]').getAttribute("id"),panelId);
        assert.equal(await page.locator('[role="tabpanel"]').getAttribute("aria-labelledby"),await tab.getAttribute("id"));
        const url=new URL(await page.locator(".crew-portal-cta").getAttribute("href"),origin);
        assert.equal(url.pathname.replace(/^\/en(?=\/)/,"" ).replace(/\/$/,"" )+url.search,target,"Active CTA targets "+mode);
        const heading=await page.locator(".crew-portal-content h1").textContent();headings.add(heading);
        await page.waitForTimeout(150);
        assert.equal(await page.locator(".crew-portal-content h1").textContent(),heading,"Heading stays stable between selections");
        if(setup.width===390&&setup.route==="/"){await page.waitForTimeout(700);canvasStates.add(await sample());}
      }
      assert.equal(headings.size,4,"Each tab has distinct translated copy");
      if(setup.width===390&&setup.route==="/"){
        assert.equal(canvasStates.size,4,"The single particle surface changes for all four selected modes");
        const manualHeading=await page.locator(".crew-portal-content h1").textContent();
        await page.waitForTimeout(5300);
        assert.equal(await page.locator(".crew-portal-content h1").textContent(),manualHeading,"Heading never auto-rotates after the old 5-second interval");
      }
      await page.locator('.crew-portal-tab[data-mode="chat"]').hover();
      assert.equal(await page.locator('.crew-portal-tab[data-mode="play"]').getAttribute("aria-selected"),"true","Hover does not select a tab");
      await page.locator('.crew-portal-tab[data-mode="play"]').press("Home");
      assert.equal(await page.locator('.crew-portal-tab[data-mode="chat"]').getAttribute("aria-selected"),"true");
      await page.locator('.crew-portal-tab[data-mode="chat"]').press("ArrowLeft");
      assert.equal(await page.locator('.crew-portal-tab[data-mode="play"]').getAttribute("aria-selected"),"true","ArrowLeft wraps");
      await page.locator('.crew-portal-tab[data-mode="play"]').press("ArrowRight");
      assert.equal(await page.locator('.crew-portal-tab[data-mode="chat"]').getAttribute("aria-selected"),"true","ArrowRight wraps");
      await page.locator('.crew-portal-tab[data-mode="chat"]').press("End");
      assert.equal(await page.locator('.crew-portal-tab[data-mode="play"]').getAttribute("aria-selected"),"true");
      const screenshots=page.locator(".crew-home-shorts .crew-home-short-card");
      await screenshots.first().waitFor({state:"visible",timeout:18000});
      assert.ok(await screenshots.count()>=2,"Live Shorts feed should show multiple image stories");
      const cards=await page.locator(".crew-home-shorts-grid").evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));
      assert.ok(cards.scroll>cards.client,"Shorts must be horizontally scrollable");
      const photo=page.locator(".crew-home-short-card .crew-home-short-photo").first();
      assert.match(await photo.getAttribute("href")||"",/^(?:\/en)?\/teacher\/shorts\?post=/);
      const chat=page.locator(".crew-home-short-card .crew-home-short-question").first();
      assert.ok((await chat.getAttribute("href")||"").startsWith("/"),"Shorts keeps friend chat");
      assert.equal(await page.locator(".crew-portal-motion").count(),0,"No decorative pause control");
      assert.deepEqual(errors,[],"No runtime / hydration errors");
      process.stdout.write("PASS Crew World responsive portal + Shorts "+setup.route+" "+setup.width+"px\n");
    }finally{await view.close();}
  }

  // Motion-constrained devices redraw a complete selected frame without scheduling RAF.
  for(const policy of ["reduced-motion","save-data"]){
    const staticContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:policy==="reduced-motion"?"reduce":"no-preference"});
    await staticContext.addInitScript(policy=>{
      localStorage.setItem("crew_onboarding_web_v1","existing");
      if(policy==="save-data")Object.defineProperty(navigator,"connection",{value:{saveData:true},configurable:true});
      window.__portalRafCalls=0;
      const original=window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame=callback=>{window.__portalRafCalls++;return original(callback)};
    },policy);
    const staticPage=await staticContext.newPage();
    try{
      await staticPage.goto(origin+"/",{waitUntil:"domcontentloaded",timeout:30000});
      await staticPage.waitForFunction(()=>document.querySelector(".crew-portal-field")?.getAttribute("data-ready")==="true",null,{timeout:12000});
      const canvas=staticPage.locator(".crew-home-portal canvas");
      assert.equal(await canvas.count(),1,"One static canvas for "+policy);
      const pictures=new Set();
      for(const mode of ["chat","learn","fortune","play"]){
        await staticPage.locator('.crew-portal-tab[data-mode="'+mode+'"]').click();
        await staticPage.waitForTimeout(80);
        const before=await canvas.evaluate(el=>el.toDataURL());pictures.add(before);
        const rafBefore=await staticPage.evaluate(()=>window.__portalRafCalls);
        await staticPage.waitForTimeout(180);
        assert.equal(await canvas.evaluate(el=>el.toDataURL()),before,policy+" never animates "+mode+" pixels");
        assert.equal(await staticPage.evaluate(()=>window.__portalRafCalls),rafBefore,policy+" schedules no animation frames while idle");
        await assertPortalCtaPixels(staticPage,policy+" "+mode);
      }
      assert.equal(pictures.size,4,policy+" redraws a distinct complete static frame for every selected tab");
    }finally{await staticContext.close();}
  }

  // Every tab label and CTA must fit above the fixed nav at all acceptance sizes.
  for(const locale of ["zh-TW","en","de","es","fr","id","ja","ko","pt-BR","th","vi"]){
    const view=await browser.newContext({viewport:{width:320,height:640},isMobile:true,hasTouch:true,reducedMotion:"reduce",
      userAgent:"Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"});
    await view.addInitScript(()=>localStorage.setItem("crew_onboarding_web_v1","existing"));
    const page=await view.newPage(),errors=[];checkConsole(page,errors);
    try{
      await page.goto(origin+(locale==="zh-TW"?"/":"/"+locale+"/"),{waitUntil:"domcontentloaded",timeout:30000});
      await page.locator('.crew-portal-tabs [role="tab"]').first().waitFor({state:"visible",timeout:15000});
      for(const [width,height] of [[320,640],[390,844],[412,915],[844,390],[932,430],[740,360],[667,375],[1100,800],[1180,820],[1280,720],[1366,768],[1440,900],[1536,864],[1920,1080]]){
        await page.setViewportSize({width,height});
        await restorePortalFirstScreen(page);
        for(const mode of ["chat","learn","fortune","play"]){
          await page.locator('.crew-portal-tab[data-mode="'+mode+'"]').click();
          await restorePortalFirstScreen(page);
          const metric=await page.evaluate(()=>{
            const nav=document.querySelector(".global-nav").getBoundingClientRect();
            const cta=document.querySelector(".crew-portal-cta").getBoundingClientRect();
            const hero=document.querySelector(".crew-home-portal");
            const tabs=[...document.querySelectorAll('.crew-portal-tabs [role="tab"]')].map(el=>{
              const r=el.getBoundingClientRect(),style=getComputedStyle(el);
              return {top:r.top,bottom:r.bottom,width:r.width,height:r.height,overflow:el.scrollWidth>el.clientWidth+1,
                ellipsis:style.textOverflow==="ellipsis",wordBreak:style.wordBreak,wrap:style.overflowWrap};
            });
            return {scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,navY:nav.top,
              documentLang:document.documentElement.lang,heroLang:hero.lang,
              ringEnvelope:Number.parseFloat(getComputedStyle(hero).getPropertyValue("--portal-copy-ring-envelope")),headingRight:hero.querySelector("h1").getBoundingClientRect().right,
              cta:{top:cta.top,bottom:cta.bottom,height:cta.height},tabs};
          });
          const label=locale+" "+width+"x"+height+" "+mode+": "+JSON.stringify(metric);
          assert.equal(metric.documentLang,locale,"Document language matches the requested locale "+label);
          assert.equal(metric.heroLang,locale,"Hero language matches the requested locale "+label);
          if(locale==="id"&&width===1280&&height===720&&mode==="learn"){
            assert.equal(metric.documentLang,"id","Indonesian learn route keeps document lang=id "+label);
            assert.equal(metric.heroLang,"id","Indonesian learn hero keeps lang=id "+label);
            assert.equal(metric.ringEnvelope,1.35,"Indonesian learn override actually applies at 1280x720 "+label);
            assert.ok(metric.headingRight<=500,"Indonesian learn heading stays within the fixed 500px acceptance bound "+label);
          }
          assert.ok(metric.scroll<=metric.viewport+2,"No horizontal overflow "+label);
          assert.ok(metric.cta.height>=44&&metric.cta.top>=58,"CTA remains visible and touchable "+label);
          assert.equal(metric.tabs.length,4);
          assert.ok(Math.max(...metric.tabs.map(tab=>tab.height))-Math.min(...metric.tabs.map(tab=>tab.height))<=1,"Equal tab heights "+label);
          for(const tab of metric.tabs){
            assert.ok(tab.height>=44&&tab.width>=44,"Tab targets >=44px "+label);
            assert.ok(!tab.overflow&&!tab.ellipsis&&tab.wordBreak!=="break-all"&&tab.wrap!=="anywhere","Labels fit without truncation or mid-word breaks "+label);
            if(width<1100)assert.ok(tab.top>=58&&tab.bottom<=metric.navY&&metric.cta.bottom<=metric.navY,"CTA and tabs above bottom nav "+label);
          }
          await assertPortalStageLayout(page,width,height,label);
        }
      }
      assert.deepEqual(errors,[],locale+" portal runtime errors");
    }finally{await view.close();}
  }

  // Validate every on-demand Beta locale in a real browser. Keep this inside
  // the existing Cloudflare smoke workflow to avoid extra Actions minutes.
  for(const locale of ["ja","es","pt-BR","id","ko","fr","de","vi","th"]){
    const homeStrings=JSON.parse(readFileSync(new URL("../web-spa/src/i18n/locales/"+locale+"/home.json",import.meta.url),"utf8"));
    const settingsStrings=JSON.parse(readFileSync(new URL("../web-spa/src/i18n/locales/"+locale+"/settings.json",import.meta.url),"utf8"));
    const teacherStrings=JSON.parse(readFileSync(new URL("../web-spa/src/i18n/locales/"+locale+"/teacher.json",import.meta.url),"utf8"));
    const view=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await view.addInitScript(()=>{
      localStorage.setItem("crew_teacher_lang","日文");
      localStorage.setItem("crew_teacher_native_lang","繁體中文");
      localStorage.setItem("crew_teacher_chatMode","practice");
      localStorage.setItem("crew_teacher_speakingPace","slow");
    });
    const page=await view.newPage(),errors=[];
    checkConsole(page,errors);
    try{
      const route="/"+locale+"/games/";
      const response=await page.goto(origin+route,{waitUntil:"domcontentloaded",timeout:30000});
      assert.equal(response?.status(),200,locale+" direct game deep link");
      await page.locator(".crew-play-hero h1").waitFor({state:"visible",timeout:15000});
      assert.equal((await page.locator(".crew-play-hero h1").textContent())?.trim(),homeStrings.playHub.heading,locale+" translated game title");
      assert.equal(await page.locator("html").getAttribute("lang"),locale,locale+" document locale");
      const geometry=await page.evaluate(()=>({
        scroll:document.documentElement.scrollWidth,
        client:document.documentElement.clientWidth,
        learn:localStorage.getItem("crew_teacher_lang"),
        native:localStorage.getItem("crew_teacher_native_lang"),
        chat:localStorage.getItem("crew_teacher_chatMode"),
        pace:localStorage.getItem("crew_teacher_speakingPace")
      }));
      assert.ok(geometry.scroll<=geometry.client+2,locale+" mobile overflow: "+JSON.stringify(geometry));
      assert.deepEqual([geometry.learn,geometry.native,geometry.chat,geometry.pace],["日文","繁體中文","practice","slow"],locale+" UI language does not change learning preferences");
      await page.reload({waitUntil:"domcontentloaded",timeout:30000});
      await page.locator(".crew-play-hero h1").waitFor({state:"visible",timeout:15000});
      assert.equal((await page.locator(".crew-play-hero h1").textContent())?.trim(),homeStrings.playHub.heading,locale+" direct refresh retains translation");
      await page.goto(origin+"/"+locale+"/settings/",{waitUntil:"domcontentloaded",timeout:30000});
      await page.locator("#settings-device h2").waitFor({state:"visible",timeout:15000});
      assert.equal((await page.locator("#settings-device h2").textContent())?.trim(),settingsStrings.device.heading,locale+" Settings translation");
      await page.locator(".crew-language-trigger").first().click();
      assert.equal(await page.locator(".crew-language-dialog[open] .crew-language-option").count(),11,locale+" no preview languages in picker");
      await page.locator(".crew-language-dialog[open] .crew-language-close").click();
      assert.equal(await page.evaluate(()=>localStorage.getItem("crew_teacher_lang")),"日文",locale+" Settings retains target language");
      // Walk the remaining user-facing destinations with the same saved
      // learning-language settings. No screenshots/artifacts are uploaded.
      for(const destination of ["/","/chat/","/explore/","/learn/","/me/","/teacher/","/teacher/roles?mode=friends","/story/","/fortune/","/timeline/","/teacher/shorts/"]){
        const url="/"+locale+destination;
        const response=await page.goto(origin+url,{waitUntil:"domcontentloaded",timeout:30000});
        assert.equal(response?.status(),200,locale+" opens "+destination);
        await page.locator("main").first().waitFor({state:"visible",timeout:15000});
        const snapshot=await page.evaluate(()=>({
          lang:document.documentElement.lang,
          viewport:document.documentElement.clientWidth,
          document:document.documentElement.scrollWidth,
          target:localStorage.getItem("crew_teacher_lang"),
          native:localStorage.getItem("crew_teacher_native_lang"),
          pace:localStorage.getItem("crew_teacher_speakingPace"),
          mode:localStorage.getItem("crew_teacher_chatMode")
        }));
        assert.equal(snapshot.lang,locale,locale+" remains selected on "+destination);
        if(destination==="/explore/"){
          const heading=page.locator(".crew-section-explore h1");
          await heading.waitFor({state:"visible",timeout:15000});
          assert.equal((await heading.textContent())?.trim(),homeStrings.sectionExplore.title,locale+" Explore localized heading");
          const tiles=page.locator(".crew-explore-grid .crew-explore-tile");
          assert.equal(await tiles.count(),9,locale+" Explore offers visible destinations");
          assert.equal(await page.locator('.crew-explore-grid a[href="/circle"]').count(),0,locale+" Circle is hidden from Explore");
          for(const [position,kind] of ["fortune","games","research"].entries()){
            assert.equal((await tiles.nth(position).locator("strong").textContent())?.trim(),homeStrings.sectionExplore[kind].title,locale+" Explore translated "+kind);
          }
        }
        if(["/chat/","/learn/","/me/"].includes(destination)){
          const section=destination.slice(1,-1);
          const strings=homeStrings.sectionHubs[section];
          const root=page.locator(".crew-section-"+section);
          await root.locator(".crew-section-heading h1").waitFor({state:"visible",timeout:15000});
          assert.equal((await root.locator(".crew-section-heading h1").textContent())?.trim(),strings.title,locale+" "+section+" heading");
          assert.equal((await root.locator(".crew-section-heading p").textContent())?.trim(),strings.intro,locale+" "+section+" intro");
          if(section==="me"){
           assert.equal((await root.locator(".crew-section-hero-copy strong").textContent())?.trim(),strings.hero.title,locale+" me main card");
           assert.equal((await root.locator(".crew-section-eyebrow").textContent())?.trim(),strings.hero.tag,locale+" me label");
          }
          if(section==="learn"){
           assert.equal((await root.locator(".crew-section-focus-card h2").textContent())?.trim(),strings.firstTopic,locale+" new learner focus");
           assert.equal((await root.locator(".crew-section-focus-card .kicker").textContent())?.trim(),strings.newLabel,locale+" first-run label");
           assert.ok((await root.locator(".crew-section-focus-card .crew-action-primary").getAttribute("href")||"").includes("/teacher/roles?mode=teacher"),locale+" teacher CTA");
          }
          const keys=section==="chat"?["games","memory"]:section==="learn"?["center","scenarios","textbook","pronunciation","reports"]:["readings","stories","memory","settings","reports"];
          const cards=root.locator(".crew-section-grid .crew-section-card");
          assert.equal(await cards.count(),keys.length+(section==="me"?1:0),locale+" "+section+" card count");
          for(const [position,key] of keys.entries()){
           const isVocab=section==="learn"&&key==="center";
           const expectedTitle=isVocab?teacherStrings.learn.vocab:strings.items[key].title;
           const expectedDesc=isVocab?teacherStrings.learn.vocabDesc:strings.items[key].desc;
           assert.equal((await cards.nth(position).locator("strong").textContent())?.trim(),expectedTitle,locale+" "+section+" "+key+" localized title");
           assert.equal((await cards.nth(position).locator("small").textContent())?.trim(),expectedDesc,locale+" "+section+" "+key+" localized description");
           if(isVocab)assert.ok((await cards.nth(position).getAttribute("href"))?.endsWith("/teacher/vocabulary"),locale+" direct vocabulary access");
          }
          if(section==="chat"){
           assert.equal((await root.locator(".crew-section-people h2").textContent())?.trim(),strings.meetFriends,locale+" translated friend heading");
           assert.equal(await root.locator(".crew-section-friend").count(),6,locale+" six real featured friends");
           assert.equal((await root.locator(".crew-section-friend").first().locator("small").textContent())?.trim(),strings.friendTitles.zoe,locale+" localized first friend");
           assert.equal((await root.locator(".crew-section-friend").first().locator(".crew-section-friend-bio").textContent())?.trim(),strings.friendBios.zoe,locale+" localized biography");
           assert.equal(await root.locator(".crew-section-carousel-actions button").count(),2,locale+" manual controls");
          }
          if(section==="learn"){
           assert.equal((await root.locator(".crew-today-learning-heading").textContent())?.trim(),homeStrings.todayLearning.heading,locale+" daily progress heading");
           assert.ok((await root.locator(".crew-section-learning .crew-action-text").textContent()||"").includes(strings.threeMinuteTitle),locale+" secondary speaking action");
          }
          if(section==="me")assert.ok((await cards.last().getAttribute("href"))?.endsWith("/settings#settings-device"),locale+" device settings destination");
          if(section==="me")assert.equal((await root.locator(".crew-section-footnote").textContent())?.trim(),strings.footnote,locale+" local data warning");
          if(locale==="ja"){
           await page.reload({waitUntil:"domcontentloaded",timeout:30000});
           await page.locator(".crew-section-"+section+" .crew-section-heading h1").waitFor({state:"visible",timeout:15000});
           assert.equal((await page.locator(".crew-section-"+section+" .crew-section-heading h1").textContent())?.trim(),strings.title,"ja "+section+" refresh preserves Japanese");
          }
        }
        assert.ok(snapshot.document<=snapshot.viewport+2,locale+" overflow on "+destination+": "+JSON.stringify(snapshot));
        assert.deepEqual([snapshot.target,snapshot.native,snapshot.pace,snapshot.mode],["日文","繁體中文","slow","practice"],locale+" learning isolation on "+destination);
        process.stdout.write("PASS Beta route "+locale+" "+destination+"\n");
      }
      assert.deepEqual(errors,[],locale+" browser/console errors");
      process.stdout.write("PASS Beta i18n mobile deep link, refresh, settings and language isolation "+locale+"\n");
    }finally{await view.close();}
  }

  // Fortune homepage and saved readings must remain accessible even when
  // external astrology engines (or the optional AI core) cannot be fetched.
  const offlineFortuneContext=await browser.newContext({viewport:{width:390,height:844}});
  // A normal browser can contain old/invalid history records that do not
  // exist in incognito mode; keep those from crashing React after hydration.
  await offlineFortuneContext.addInitScript(()=>{
   localStorage.setItem("crew_fortune_readings_v2",JSON.stringify([
    null,{id:"saved-bazi",mode:"bazi",summary:"保留的命盤",createdAt:"2026-10-01T12:00:00.000Z"},
    {id:"legacy-invalid",mode:"other",summary:{unexpected:true}}
   ]));
  });
  const offlineFortune=await offlineFortuneContext.newPage(),unwantedRequests=[],fortuneErrors=[];
  checkConsole(offlineFortune,fortuneErrors);
  await offlineFortune.route("**/*",route=>{
   const url=route.request().url();
   if(/(?:cdn\.jsdelivr\.net\/npm\/(?:lunar-javascript|astronomy-engine)|\/features\/fortune\/|\/crew\.js(?:\?|$))/.test(url)){
    unwantedRequests.push(url);
    return route.abort();
   }
   return route.continue();
  });
  const fortuneResponse=await offlineFortune.goto(origin+"/fortune/",{waitUntil:"domcontentloaded"});
  assert.equal(fortuneResponse?.status(),200);
  await offlineFortune.locator(".fortune-home-mode").first().waitFor({state:"visible",timeout:15000});
  await offlineFortune.waitForTimeout(600);
  assert.equal(await offlineFortune.locator(".fortune-home-mode").count(),3,"Fortune modes remain visible offline");
  assert.equal(await offlineFortune.locator(".fortune-history-row").count(),1,"Saved record should render despite legacy or malformed records");
  assert.match(await offlineFortune.locator(".fortune-history-row").textContent()||"",/保留的命盤/);
  assert.deepEqual(unwantedRequests,[],"Fortune homepage should not request external engines");
  assert.deepEqual(fortuneErrors,[],"Fortune homepage must not crash without external engines");
  await offlineFortuneContext.close();
  process.stdout.write("PASS Fortune homepage works without remote astrology scripts\n");

  // Mira Timeline regression: every age selects its own approved full-body
  // photo, the photo response succeeds, and the feature image keeps the feet.
  const timelineErrors=[];
  const timeline404s=[];
  const timeline=await context.newPage();
  checkConsole(timeline,timelineErrors);
  timeline.on("response",response=>{
   if(/\/assets\/timeline\/fullbody\/mira-\d+\.webp$/.test(new URL(response.url()).pathname)&&response.status()!==200){
    timeline404s.push(response.url()+" "+response.status());
   }
  });
  await timeline.goto(origin+"/timeline",{waitUntil:"domcontentloaded"});
  await timeline.locator(".timeline-page").waitFor({state:"visible",timeout:15000});
  const timelineAges=[7,10,13,16,19,22,25,35,40,50,55,70];
  assert.equal(await timeline.locator(".timeline-stop").count(),timelineAges.length,"Timeline must offer all twelve ages");
  assert.equal(await timeline.locator(".timeline-photo-slide").count(),timelineAges.length,"All twelve photos must be mounted in the carousel");
  const carouselStyle=await timeline.locator(".timeline-photo-carousel").evaluate(el=>({
   snapping:getComputedStyle(el).scrollSnapType,
   overflow:getComputedStyle(el).overflowX,
   scrollable:el.scrollWidth>el.clientWidth
  }));
  assert.ok(carouselStyle.snapping.includes("mandatory"),"Timeline photos must snap after a swipe");
  assert.equal(carouselStyle.overflow,"auto","Native horizontal photo swiping must remain enabled");
  assert.equal(carouselStyle.scrollable,true,"At least one adjacent age must be reachable by scrolling");
  for(let index=0;index<timelineAges.length;index++){
   const age=timelineAges[index];
   await timeline.locator(".timeline-stop").nth(index).click();
   const photo=timeline.locator(".timeline-photo-slide[data-active=true] .timeline-feature-photo img");
   await timeline.waitForFunction(expected=>{
    const image=document.querySelector(".timeline-photo-slide[data-active=true] .timeline-feature-photo img");
    return image?.complete&&image.naturalWidth===900&&image.naturalHeight===1200&&
      image.getAttribute("src")===`/assets/timeline/fullbody/mira-${expected}.webp`;
   },age,{timeout:15000});
   const style=await photo.evaluate(image=>getComputedStyle(image).objectFit);
   assert.equal(style,"contain","Full-body photo must preserve the complete figure at age "+age);
   assert.ok((await timeline.locator(".timeline-feature-copy .kicker").textContent())?.includes(String(age)),"Selected age story must update");
   assert.ok((await timeline.locator(".timeline-primary-cta").getAttribute("href"))?.endsWith("age="+age),"Conversation link must use selected age");
   if(age===25){
    const locked=timeline.locator(".timeline-story.locked");
    assert.equal(await locked.count(),5,"Future chapters remain locked at age 25");
    for(const card of await locked.all()){
     assert.equal(await card.locator("img").count(),0,"Future chapters must not reveal portraits");
     const text=await card.textContent()||"";
     assert.ok(text.includes("尚未經歷的章節")||text.includes("A chapter not yet lived"),"Future chapters show only the locked placeholder");
    }
   }
  }
  assert.deepEqual(timeline404s,[],"No Mira full-body photo request may 404");
  assert.deepEqual(timelineErrors,[],"Timeline browser render must not report errors");
  // A phone viewport keeps the rail horizontally scrollable without widening
  // the page, and selecting a late-life age still reveals the complete photo.
  await timeline.setViewportSize({width:390,height:844});
  await timeline.locator(".timeline-stop").nth(11).click();
  await timeline.waitForFunction(()=>{
   const image=document.querySelector(".timeline-photo-slide[data-active=true] .timeline-feature-photo img");
   return image?.complete&&image.naturalWidth===900&&image.naturalHeight===1200&&
     image.getAttribute("src")==="/assets/timeline/fullbody/mira-70.webp";
  },null,{timeout:15000});
  const mobileLayout=await timeline.evaluate(()=>({
   viewport:window.innerWidth,
   documentWidth:document.documentElement.scrollWidth,
   railWidth:document.querySelector(".timeline-rail").scrollWidth,
   railClientWidth:document.querySelector(".timeline-rail").clientWidth,
   objectFit:getComputedStyle(document.querySelector(".timeline-photo-slide[data-active=true] .timeline-feature-photo img")).objectFit
  }));
  assert.ok(mobileLayout.documentWidth<=mobileLayout.viewport+1,"Mobile Timeline must not cause page-wide horizontal overflow");
  assert.ok(mobileLayout.railWidth>mobileLayout.railClientWidth,"Mobile age rail remains horizontally scrollable");
  assert.equal(mobileLayout.objectFit,"contain","Mobile full-body photo must keep shoes visible");
  const mobileCarousel=await timeline.evaluate(()=>{
   const carousel=document.querySelector(".timeline-photo-carousel");
   const active=document.querySelector('.timeline-photo-slide[data-active="true"]');
   const stage=document.querySelector(".timeline-stage-visual");
   const nav=document.querySelector(".timeline-visual-nav");
   const counter=document.querySelector(".timeline-stage-count");
   if(!carousel||!active||!stage||!nav||!counter)return null;
   const photo=stage.getBoundingClientRect(),controls=nav.getBoundingClientRect();
   const image=active.querySelector("img");
   const panel=document.querySelector(".timeline-feature.panel");
   const frame=active.querySelector(".timeline-feature-photo");
   const photoStyles=getComputedStyle(active),panelStyles=getComputedStyle(panel);
   const imageRect=image?.getBoundingClientRect();
   return {
    widthRatio:active.getBoundingClientRect().width/carousel.getBoundingClientRect().width,
    imageHeight:photo.height,controlsTop:controls.top,photoBottom:photo.bottom,
    counterBottom:counter.getBoundingClientRect().bottom,photoTop:photo.top,
    imageRatio:imageRect?imageRect.width/imageRect.height:0,
    radius:parseFloat(getComputedStyle(frame).borderTopLeftRadius),
    photoBackground:photoStyles.backgroundImage,
    frameBackground:getComputedStyle(frame).backgroundImage,
    panelBorder:panelStyles.borderTopWidth,
    panelShadow:panelStyles.boxShadow
   };
  });
  assert.ok(mobileCarousel,"Timeline stage layout must exist on mobile");
  assert.ok(mobileCarousel.widthRatio>.84&&mobileCarousel.widthRatio<.96,
   "A large Mira photo should occupy about 88–92% of the mobile carousel viewport");
  assert.ok(mobileCarousel.imageHeight>310&&mobileCarousel.imageHeight<470,
   "The full-body portrait should be larger without taking over the whole mobile page");
  assert.ok(mobileCarousel.imageRatio>.69&&mobileCarousel.imageRatio<.79,
   "Photo frame should keep a near 3:4 aspect ratio instead of showing a purple letterbox");
  assert.ok(mobileCarousel.radius>=18,"The image itself should have rounded corners");
  assert.equal(mobileCarousel.photoBackground,"none","Photo slides should not have a purple backing gradient");
  assert.equal(mobileCarousel.frameBackground,"none","Image frames should not have a second backing gradient");
  assert.equal(mobileCarousel.panelBorder,"0px","The feature section should not have an outer border");
  assert.equal(mobileCarousel.panelShadow,"none","The feature section should not have an outer card shadow");
  assert.ok(mobileCarousel.controlsTop>=mobileCarousel.photoBottom-1,"Swipe controls must be below, not over, the image");
  assert.ok(mobileCarousel.counterBottom<=mobileCarousel.photoTop+1,"Chapter count must not float over the neighboring photo");
  await timeline.locator(".timeline-primary-cta").click();
  await timeline.waitForURL(url=>url.pathname==="/timeline/live");
  await timeline.waitForFunction(()=>document.querySelector(".app-title strong")?.textContent?.includes("70"));
  assert.ok((await timeline.locator(".app-title strong").textContent())?.includes("70"),"Conversation opens with selected age");
  await timeline.close();
  process.stdout.write("PASS Mira Timeline 12 ages, full-body assets, future locks, phone layout and conversation entry\n");
  const portraitManifest=JSON.parse(readFileSync("contracts/crew-timeline/person-portraits-v1.json","utf8"));
  const people=await context.newPage(),pendingRequests=[];
  people.on("request",request=>{
   const match=new URL(request.url()).pathname.match(/^\/assets\/timeline\/(fullbody|avatars)\/(ethan|hana)-(\d+)\.webp$/);
   if(match&&!approvedPortrait(portraitManifest,match[2],Number(match[3]),match[1]==="avatars"?"avatar":"fullbody"))pendingRequests.push(request.url());
  });
  for(const [id,name] of [["ethan","Ethan"],["hana","Hana"]]){
   await people.goto(origin+"/timeline?character="+id,{waitUntil:"domcontentloaded"});
   await people.locator(".timeline-page").waitFor({state:"visible"});
   for(const [index,age] of timelineAges.entries()){
    await people.locator(".timeline-stop").nth(index).click();
    await people.waitForFunction(({name,age})=>document.querySelector(".timeline-feature-copy .kicker")?.textContent?.includes(name.toUpperCase()+" · "+age),{name,age});
    assert.ok((await people.locator(".timeline-primary-cta").getAttribute("href"))?.includes("character="+id+"&age="+age));
    assert.equal(await people.locator(".timeline-story.locked").count(),timelineAges.length-index-1);
    const active=people.locator('.timeline-photo-slide[data-active="true"]');
    if(!approvedPortrait(portraitManifest,id,age,"fullbody")){
     assert.equal(await active.locator("img").count(),0,"Unreviewed photographs must remain placeholders");
     assert.ok((await active.locator(".timeline-image-fallback").getAttribute("aria-label"))?.startsWith(name+" age "+age));
    }else{
     await people.waitForFunction(({age,index})=>{
      const body=document.querySelector('.timeline-photo-slide[data-timeline-age="'+age+'"] .timeline-feature-photo img');
      const avatar=document.querySelectorAll('.timeline-stop')[index]?.querySelector('img');
      return body?.complete&&body.naturalWidth===900&&body.naturalHeight===1200&&body.src.startsWith('blob:')&&
       avatar?.complete&&avatar.naturalWidth===320&&avatar.naturalHeight===320&&avatar.src.startsWith('blob:');
     },{age,index},{timeout:15000});
     const actual=await people.evaluate(async({age,index})=>{
      const body=document.querySelector('.timeline-photo-slide[data-timeline-age="'+age+'"] .timeline-feature-photo img');
      const avatar=document.querySelectorAll('.timeline-stop')[index].querySelector('img');
      const digest=async image=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await (await fetch(image.src)).arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
      return {fullbody:await digest(body),avatar:await digest(avatar)};
     },{age,index});
     assert.equal(actual.fullbody,approvedPortrait(portraitManifest,id,age,"fullbody").sha256,"Displayed fullbody must match approved bytes");
     assert.equal(actual.avatar,approvedPortrait(portraitManifest,id,age,"avatar").sha256,"Displayed headshot must match its approved same-source crop");
    }
   }
   for(const viewport of [{width:320,height:568},{width:844,height:390}]){
    await people.setViewportSize(viewport);
    assert.ok(await people.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"Timeline must fit phone portrait and landscape");
   }
   await people.locator(".timeline-primary-cta").click();
   await people.waitForURL(url=>url.pathname==="/timeline/live");
   await people.waitForFunction(name=>document.querySelector(".app-title strong")?.textContent?.includes(name+" · 70"),name);
  }
  assert.deepEqual(pendingRequests,[],"Unreviewed new-character files must never be requested");
  await people.close();
  process.stdout.write("PASS Ethan/Hana 24 chapter selections, approved fullbody/avatar Blob hashes or pending placeholders, phone layouts and correct conversation identities\n");
  const approvedSample=portraitManifest.images.find(row=>approvedPortrait(portraitManifest,row.characterId,row.age,"fullbody"));
  if(approvedSample){
   const corrupt=await context.newPage(),id=approvedSample.characterId,age=approvedSample.age;
   const altered=Buffer.from(readFileSync('assets/'+approvedSample.fullbody.path));altered[altered.length-1]^=1;
   let corruptSeen=false,missingSeen=false;
   await corrupt.route('**/assets/'+approvedSample.fullbody.path+'?v=*',async route=>{corruptSeen=true;await route.fulfill({status:200,contentType:'image/webp',body:altered});});
   await corrupt.route('**/assets/'+approvedSample.avatar.path+'?v=*',async route=>{missingSeen=true;await route.fulfill({status:404,body:'missing'});});
   const rejectedResponses=Promise.all([corrupt.waitForResponse(response=>new URL(response.url()).pathname==='/assets/'+approvedSample.fullbody.path),corrupt.waitForResponse(response=>new URL(response.url()).pathname==='/assets/'+approvedSample.avatar.path)]);
   await corrupt.goto(origin+'/timeline?character='+id,{waitUntil:'domcontentloaded'});
   await corrupt.locator('.timeline-stop').nth(timelineAges.indexOf(age)).click();
   await rejectedResponses;
   await corrupt.waitForTimeout(300);
   assert.ok(corruptSeen&&missingSeen,"Corrupt and missing official images must reach the validation gate");
   const rejected=corrupt.locator('.timeline-photo-slide[data-timeline-age="'+age+'"]');
   assert.equal(await rejected.locator('img').count(),0,"A mismatched hash must never become a displayed photograph");
   assert.equal(await corrupt.locator('.timeline-stop').nth(timelineAges.indexOf(age)).locator('img').count(),0,"A missing headshot must keep a placeholder");
   assert.ok((await rejected.locator('.timeline-image-fallback').getAttribute('aria-label'))?.toLowerCase().startsWith(id+' age '+age));
   await corrupt.close();process.stdout.write('PASS corrupt fullbody/missing avatar fail closed without another character fallback\n');
  }
  // Regression: a cold first click from Home can fail to download the lazy
  // Crew Play module on a flaky connection or during a Pages deployment.
  // Recover with a single full-document refresh instead of leaving a blank app.
  const retryContext=await browser.newContext({viewport:{width:390,height:844}});
  await retryContext.addInitScript(()=>localStorage.setItem("crew_onboarding_web_v1","existing"));
  const retryPage=await retryContext.newPage();
  let gameChunkRequests=0,failNextGameChunk=false,failedGameChunk="";
  await retryPage.route(/\/assets\/[^/]+\.js(?:\?.*)?$/,async route=>{
   const url=route.request().url();
   if(failNextGameChunk&&!failedGameChunk)failedGameChunk=url;
   if(url!==failedGameChunk){await route.continue();return;}
   gameChunkRequests++;
   if(gameChunkRequests===1)await route.abort("failed");
   else await route.continue();
  });
  await retryPage.goto(origin+"/",{waitUntil:"networkidle"});
  await retryPage.locator('.crew-portal-tab[data-mode="play"]').waitFor({state:"visible"});
  await retryPage.locator('.crew-portal-tab[data-mode="play"]').click();
  failNextGameChunk=true;
  await retryPage.locator(".crew-portal-cta").click();
  await retryPage.waitForURL(url=>url.pathname.replace(/\/$/,"")==="/games/1a2b",{timeout:20000});
  await retryPage.locator("#crew-number").waitFor({state:"visible",timeout:20000});
  assert.ok(gameChunkRequests>=2,"A failed game chunk must recover with a fresh document");
  assert.equal(new URL(retryPage.url()).pathname.replace(/\/$/,""),"/games/1a2b","Recovered click stays on 1A2B");
  assert.equal(await retryPage.getByText("頁面暫時無法載入").count(),0,"No persistent blank/error screen");
  await retryContext.close();
  process.stdout.write("PASS recover first Home-to-1A2B chunk fetch failure\n");
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
  for(const route of ["/games/","/en/games/"]){
   const page=await context.newPage(),errors=[];checkConsole(page,errors);
   const response=await page.goto(origin+route,{waitUntil:"domcontentloaded",timeout:30000});
   assert.equal(response?.status(),200,"Crew Play localized SSG must serve 200: "+route);
   await page.locator(".crew-play-game-card").first().waitFor({timeout:15000});
   assert.equal(await page.locator(".crew-play-game-card").count(),7,"All current Crew Play games must be visible: "+route);
   assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"),"https://www.3sssi.com"+route);
   assert.deepEqual(errors,[],"Crew Play localized SSG must hydrate cleanly: "+route);
   await page.close();
  }
  process.stdout.write("PASS Crew Play bilingual SSG seven-game directory\\n");
  // A real SPA soft navigation must not turn a page into a second marketing site.
  const home=await context.newPage();
  await home.goto(origin+"/",{waitUntil:"domcontentloaded"});
  // Homepage entry points are intentionally small: no redundant second product directory.
  await home.locator(".crew-home-portal").waitFor({state:"visible",timeout:15000});
  assert.equal(await home.locator(".crew-home-products").count(),0,"Remove the redundant product grid");
  assert.equal(await home.locator(".crew-home-world-explore-card").count(),2,"Fortune and Timeline stay discoverable");
  assert.equal(await home.locator(".crew-home-android").getAttribute("open"),null,"Android downloads are collapsed");
  await home.setViewportSize({width:390,height:844});
  const dailyGame=home.locator(".crew-home-game-pick-action");
  await dailyGame.waitFor({state:"visible",timeout:15000});
  const route=await dailyGame.getAttribute("href");
  assert.match(route||"",/^\/games\/(1a2b|connect4|reversi)$/,"Daily game must have a safe known destination");
  await dailyGame.click();
  await home.waitForURL(url=>url.pathname===route);
  await home.goto(origin+"/",{waitUntil:"domcontentloaded"});
  await home.setViewportSize({width:1280,height:800});
  // Global navigation now groups user intent instead of showing product names.
  const globalTabs=home.locator(".global-nav a.navitem");
  assert.equal(await globalTabs.count(),5,"Crew primary navigation must have five tabs");
  for(const target of ["/","/chat","/explore","/learn","/me"])
   assert.equal(await home.locator('.global-nav a[href="'+target+'"]').count(),1,"Missing "+target);
  await home.locator('.global-nav a[href="/learn"]').click();
  await home.waitForURL(url=>url.pathname.replace(/\/$/,"")==="/learn");
  await home.locator("header.app-header").waitFor({state:"visible"});
  await home.locator(".crew-section-heading h1").waitFor({state:"visible",timeout:15000});
  assert.ok(await home.locator(".crew-section-heading h1").textContent(),"Navigation did not render Learn");
  await home.locator('.global-nav a[href="/explore"]').click();
  await home.waitForURL(url=>url.pathname.replace(/\/$/,"")==="/explore");
  await home.locator('a[href="/fortune"]').first().waitFor({state:"visible",timeout:15000});
  assert.ok(await home.locator('a[href="/fortune"]').count(),"Fortune must remain accessible in Explore");
  // Five original destinations plus Mate, Town, Magic and Discover remain visible; Circle is hidden.
  const exploreCards=home.locator(".crew-explore-grid .crew-explore-tile");
  await exploreCards.first().waitFor({state:"visible",timeout:15000});
  assert.equal(await exploreCards.count(),9,"Explore must expose nine visible destinations");
  assert.equal(await home.locator('.crew-explore-grid a[href="/circle"]').count(),0,"Circle must stay hidden in Explore");
  for(const destination of ["/fortune","/timeline","/games","/story","/research","/mate","/town","/magic","/discover"])
   assert.equal(await home.locator('.crew-explore-grid a[href="'+destination+'"]').count(),1,"Explore missing "+destination);
  assert.equal(await home.locator(".crew-section-explore .crew-section-hero").count(),0,"Explore should not promote one giant hero");
  assert.equal(await home.locator(".crew-section-explore .crew-section-discover").count(),0,"No second 'more destinations' list");
  for(const viewport of [{width:390,height:844,cols:2},{width:1280,height:800,cols:3}]){
   await home.setViewportSize({width:viewport.width,height:viewport.height});
   const rects=await exploreCards.evaluateAll(cards=>cards.map(card=>({
    x:Math.round(card.getBoundingClientRect().x),
    y:Math.round(card.getBoundingClientRect().y),
    width:Math.round(card.getBoundingClientRect().width)
   })));
   assert.ok(rects[0].width>rects[1].width,"Featured Explore destination spans more columns");
   assert.ok(viewport.cols===2?rects[1].y>rects[0].y:Math.abs(rects[1].y-rects[0].y)<=2,"Explore follows responsive featured-grid layout");
   assert.ok(rects.every(r=>r.width>=140),"Explore cards must be tappable");
   assert.ok(await home.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),"Explore must not overflow");
   }

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
  assert.equal(await play.locator(".crew-play-game-card").count(),7,"Crew Play lobby must include seven games");
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
  await play.locator(".crew-play-voice-entrance").waitFor({state:"visible",timeout:15000});
  assert.equal(await play.locator(".crew-play-word-panel").count(),0,"Voice is required for guessing");
  await play.goto(origin+"/games/mystery",{waitUntil:"domcontentloaded"});
  await play.locator(".crew-play-voice-entrance").waitFor({state:"visible",timeout:15000});
  assert.equal(await play.locator(".crew-play-word-panel").count(),0,"Voice is required for Mystery");
  // Actual built-app browser interactions at desktop and 390px phone widths.
  // These run in Chromium without a Gemini key or a microphone.
  for(const width of [1280,390]){
   const mini=await context.newPage();
   const errors=[];
   checkConsole(mini,errors);
   await mini.setViewportSize({width,height:844});
   await mini.goto(origin+"/games/1a2b",{waitUntil:"domcontentloaded"});
   await mini.locator("#crew-number").waitFor({state:"visible",timeout:15000});
   assert.ok(await mini.getByText("無 Key 也能完整打字玩").count(),"1A2B must work without a key");
   mini.on("dialog",dialog=>dialog.accept());
   await mini.getByRole("button",{name:/遊戲設定/}).click();
   await mini.getByRole("button",{name:"3 位"}).click();
   await mini.getByRole("button",{name:"Close / 關閉"}).click();
   await mini.locator("#crew-number").fill("123");
   await mini.locator(".crew-mini-input-row button[type=submit]").click();
   await mini.locator(".crew-mini-number-history li").first().waitFor({state:"visible",timeout:5000});
   assert.equal(await mini.locator(".crew-mini-number-history li").count(),1,"1A2B offline A/B turn");
   await mini.getByRole("button",{name:"撤銷上一筆"}).click();
   assert.equal(await mini.locator(".crew-mini-number-history li").count(),0,"1A2B undo turn");
   await mini.getByRole("button",{name:/遊戲設定/}).click();
   await mini.getByRole("button",{name:"朋友猜我的數字"}).click();
   await mini.getByRole("button",{name:"Close / 關閉"}).click();
   await mini.getByRole("button",{name:"回報結果"}).click();
   await mini.locator(".crew-mini-number-history li").first().waitFor({state:"visible",timeout:5000});
   assert.equal(await mini.locator(".crew-mini-number-history li").count(),1,"1A2B reverse feedback");
   await mini.goto(origin+"/games/taboo",{waitUntil:"domcontentloaded"});
   await mini.getByRole("button",{name:/開始挑戰/}).waitFor({state:"visible",timeout:15000});
   await mini.getByRole("button",{name:/開始挑戰/}).click();
   assert.ok(await mini.locator(".crew-mini-target").isVisible(),"Taboo must show offline card");
   const banned=(await mini.locator(".crew-mini-banned span").first().textContent())?.trim()||"";
   assert.ok(banned,"Taboo forbidden word required");
   await mini.locator("#crew-taboo-answer").fill("It is "+banned);
   await mini.locator(".crew-mini-word-form button[type=submit]").click();
   assert.ok((await mini.locator(".crew-taboo-scoreboard").textContent())?.includes("-5"),"Taboo violation deducts five points");
   await mini.locator(".crew-taboo-switch-mode").click();
   await mini.getByRole("button",{name:/開始挑戰/}).click();
   assert.ok(await mini.locator(".crew-mini-clue").first().isVisible(),"Taboo reverse mode has offline English clue");
   await mini.locator("#crew-taboo-answer").fill("nottherightword");
   await mini.locator(".crew-mini-word-form button[type=submit]").click();
   assert.equal(await mini.locator(".crew-mini-clue").count(),2,"Wrong answer reveals second clue");
   const bounds=await mini.evaluate(()=>({
    scrollWidth:document.documentElement.scrollWidth,
    viewport:window.innerWidth,
    panelRight:document.querySelector(".crew-mini-panel")?.getBoundingClientRect().right||0
   }));
   assert.ok(bounds.scrollWidth<=bounds.viewport+1,"No horizontal overflow at "+width+"px: "+JSON.stringify(bounds));
   assert.ok(bounds.panelRight<=bounds.viewport+1,"Game panel fits "+width+"px viewport");
   assert.deepEqual(errors,[],"No runtime errors at "+width+"px");
   await mini.close();
   process.stdout.write("PASS offline 1A2B and Taboo desktop/mobile "+width+"px\\n");
  }
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
    if(n>1)return JSON.stringify({
     story:{zh:"一位工程師每次走進辦公室都會先敲桌面三下，卻不是要叫醒任何人。這是第 "+n+" 次。",
       en:"An engineer taps a desk exactly three times every time they enter the office, but not to wake anyone. This is round "+n+"."},
     solution:{zh:"桌面下藏有接觸不良的感測器，他用輕敲來啟動自動照明系統，與叫醒人無關。",
       en:"A loose contact sensor under the desk controls the automatic office lights, so tapping the desk briefly activates it."},
     twistKey:"touch sensor needs mechanical vibration to reconnect",
     clues:[
      {question:{zh:"這和電器有關嗎？",en:"Is an electronic device involved?"},answer:true},
      {question:{zh:"這是某種秘密暗號嗎？",en:"Is it a secret signal to someone?"},answer:false},
      {question:{zh:"桌下藏著東西嗎？",en:"Is something installed beneath the desk?"},answer:true},
      {question:{zh:"他想叫醒同事嗎？",en:"Is he trying to wake a colleague?"},answer:false},
      {question:{zh:"敲桌子會造成震動嗎？",en:"Does tapping the desk create vibration?"},answer:true},
      {question:{zh:"這是為了製造音樂嗎？",en:"Is he playing music?"},answer:false}
     ]
    });
    return JSON.stringify({
     story:{
      zh:"一位旅客每天把同一張明信片帶進車站，卻從來不把它寄出去，這是第 "+n+" 次。",
      en:"Every day a traveler brings the same postcard to the railway station without mailing it. This is round "+n+"."
     },
     solution:{
      zh:"這是一張車站的導覽明信片，他只是拿來確認出入口與旅行方向，並不是要郵寄。",
      en:"The postcard is a tourist map of the station. The traveler uses it to find the exit, not to mail a letter."
     },
     twistKey:"postcard used as printed station navigation map",
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
  await generatedMystery.addInitScript(()=>{
   window.CrewLiveUI={};
   window.CrewLive={Session:class {
    constructor(options){this.options=options;this.ready=true;this.running=true;this.micMuted=false}
    async start(){} async stop(){this.running=false}
    setVolume(){} sendControl(text){window.__mysteryControlMessage=text;return true} sendText(){return true} interrupt(){return true} getDurationMs(){return 0}
   }};
  });
  await generatedMystery.goto(origin+"/games/mystery",{waitUntil:"domcontentloaded"});
  await generatedMystery.locator(".crew-play-voice-entrance .crew-play-voice-start").click();
  await generatedMystery.locator(".crew-play-mystery-source").getByText("Gemini 原創謎題").waitFor({timeout:15000});
  assert.match(await generatedMystery.locator(".crew-play-mystery-flip-front h2").textContent(),/第 1 次/);
  await generatedMystery.locator(".crew-play-question-grid button").first().click();
  assert.equal(await generatedMystery.locator(".crew-play-question-history li").count(),1);
  await generatedMystery.locator(".crew-play-reveal").click();
  assert.match(await generatedMystery.locator(".crew-play-solution").textContent(),/導覽明信片/);
  assert.equal(await generatedMystery.locator(".crew-play-mystery-flip.is-revealed").count(),1,"Revealing flips the story card");
  await generatedMystery.locator(".crew-play-solution button").click();
  assert.equal(await generatedMystery.locator(".crew-play-voice-entrance").count(),0,"Next mystery must keep Live open");
  await generatedMystery.locator(".crew-play-mystery-source").getByText("Gemini 原創謎題").waitFor({timeout:15000});
  assert.match(await generatedMystery.locator(".crew-play-mystery-flip-front h2").textContent(),/第 2 次/);
  assert.match(await generatedMystery.evaluate(()=>window.__mysteryControlMessage||""),/MYSTERY ROUND UPDATE/);
  assert.equal(await generatedMystery.evaluate(()=>JSON.parse(localStorage.getItem("crew_play_puzzle_diversity_v2")||"[]").filter(x=>x.kind==="mystery").length),2,"Two distinct mysteries are saved for later visits");
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
  await failedMystery.addInitScript(()=>{
   window.CrewLiveUI={};
   window.CrewLive={Session:class{
    constructor(options){this.options=options;this.ready=true;this.running=true;this.micMuted=false}
    async start(){} async stop(){this.running=false}
    setVolume(){} sendText(){return true} interrupt(){return true} getDurationMs(){return 0}
   }};
  });
  await failedMystery.goto(origin+"/games/mystery",{waitUntil:"domcontentloaded"});
  await failedMystery.locator(".crew-play-voice-entrance .crew-play-voice-start").click();
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
    async start(){window.__twentyStartCount=(window.__twentyStartCount||0)+1;this.options.onState?.("ready")}
    sendControl(text){window.__twentyControlMessage=text;return true}
    async stop(){this.running=false}
    setVolume(){}
    sendText(){return true}
    interrupt(){return true}
    getDurationMs(){return 0}
   }
   window.CrewLive={Session:MockTwentySession};
  });
  await voiceTwenty.goto(origin+"/games/twenty-questions",{waitUntil:"domcontentloaded"});
  assert.equal(await voiceTwenty.locator(".crew-play-word-panel").count(),0,"Before Live, do not show guessing UI");
  await voiceTwenty.locator(".crew-play-voice-entrance .crew-play-voice-start").click();
  await voiceTwenty.locator(".crew-play-mystery-source").getByText("Gemini 全新物品").waitFor({timeout:15000});
  assert.equal(await voiceTwenty.locator(".crew-play-count").textContent(),"0 / 20");
  await voiceTwenty.locator(".crew-play-question-disclosure summary").click();
  await voiceTwenty.locator(".crew-play-question-grid button").first().click();
  assert.equal(await voiceTwenty.locator(".crew-play-count").textContent(),"1 / 20","On-screen action uses same count");
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
  assert.equal(await voiceTwenty.locator(".crew-play-celebration").count(),1,"Winning triggers a single confetti burst");
  await voiceTwenty.locator(".crew-play-solution button").click();
  assert.equal(await voiceTwenty.locator(".crew-play-voice-entrance").count(),0,"Next round must not ask for voice again");
  await voiceTwenty.locator(".crew-play-mystery-source").getByText("Gemini 全新物品").waitFor({timeout:15000});
  assert.equal(await voiceTwenty.locator(".crew-play-count").textContent(),"0 / 20");
  assert.equal(await voiceTwenty.evaluate(()=>window.__twentyGenerationCalls),2);
  assert.equal(await voiceTwenty.evaluate(()=>JSON.parse(localStorage.getItem("crew_play_puzzle_diversity_v2")||"[]").filter(x=>x.kind==="twenty").length),2,"Different secret objects are persisted");
  assert.equal(await voiceTwenty.evaluate(()=>window.__twentyStartCount),1,"One Live start spans multiple rounds");
  assert.match(await voiceTwenty.evaluate(()=>window.__twentyControlMessage||""),/ROUND UPDATE/,"The continuing model receives the new secret");
  assert.deepEqual(twentyErrors,[],"20 Questions speech synchronization should be error-free");
  await voiceTwenty.close();
  process.stdout.write("PASS 20 Questions generated secrets, voice questions/guesses and shared 20-attempt budget\n");

  const noKeyTwenty=await context.newPage();
  await noKeyTwenty.addInitScript(()=>{
   localStorage.removeItem("crew_gemini_api_key");
   sessionStorage.removeItem("crew_gemini_api_key_session");
  });
  await noKeyTwenty.goto(origin+"/games/twenty-questions",{waitUntil:"domcontentloaded"});
  await noKeyTwenty.locator(".crew-play-voice-entrance").waitFor({state:"visible",timeout:15000});
  assert.equal(await noKeyTwenty.locator(".crew-play-word-panel").count(),0);
  assert.equal(await noKeyTwenty.locator(".crew-play-voice-dock-shell").count(),0);
  await noKeyTwenty.locator(".crew-play-voice-entrance .crew-gemini-setup-notice").waitFor({state:"visible"});
  await noKeyTwenty.close();
  process.stdout.write("PASS keyless word games require voice and show Gemini setup\n");
  // Responsive UX regression: the voice dock stays visible above global nav
  // while users scroll, and the optional question grid stays collapsed.
  const mobileTwenty=await context.newPage();
  await mobileTwenty.setViewportSize({width:390,height:844});
  await mobileTwenty.addInitScript(()=>{
   localStorage.setItem("crew_gemini_api_key","fake-key-mobile-voice-test");
   window.CrewAI={call:async()=>"{invalid generation"};
   window.CrewLiveUI={};
   window.CrewLive={Session:class{
    constructor(options){this.options=options;this.ready=true;this.running=true;this.micMuted=false}
    async start(){} async stop(){this.running=false}
    setVolume(){} sendText(){return true} interrupt(){return true} getDurationMs(){return 0}
   }};
  });
  await mobileTwenty.goto(origin+"/games/twenty-questions",{waitUntil:"domcontentloaded"});
  await mobileTwenty.locator(".crew-play-voice-presence").waitFor({state:"visible",timeout:15000});
  assert.equal(await mobileTwenty.locator(".crew-play-friend-bar").count(),0,"Do not duplicate the friend card");
  assert.equal(await mobileTwenty.locator(".crew-play-voice-dock-shell").count(),0,"Voice start must not be pinned before session");
  await mobileTwenty.locator(".crew-play-voice-entrance .crew-play-voice-start").click();
  await mobileTwenty.locator(".crew-play-voice-dock-shell").waitFor({state:"visible",timeout:15000});
  assert.equal(await mobileTwenty.locator(".crew-play-voice-entrance").count(),0,"Start button disappears after connection");
  // The voice dock becomes ready before React mounts the first question grid.
  // Wait for the disclosure, then assert the actual default collapsed state.
  await mobileTwenty.locator(".crew-play-question-disclosure").waitFor({state:"attached",timeout:15000});
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
  // Simulate a pending reply to the learner announcing J7 before clicking.
  await voiceGame.evaluate(()=>window.__mockGomokuVoice.options.onSpeaking(true));
  await voiceGame.locator('[data-coordinate="H10"]').click();
  await voiceGame.waitForFunction(()=>window.__mockGomokuCue?.includes("[GOMOKU BEFORE MOVE]"));
  assert.equal(await voiceGame.locator(".friend-gomoku-stone.white").count(),0,
    "AI must not move before the friend talks");
  await voiceGame.evaluate(()=>window.__mockGomokuVoice.options.onTurnComplete({
    hasValidOutput:true,input:"I want to play J7",output:"You said J7; that seems interesting."
  }));
  await voiceGame.waitForTimeout(550);
  assert.equal(await voiceGame.locator(".friend-gomoku-stone.white").count(),0,
    "A stale reply to a planned square must not release a Gomoku move");
  const gomokuTarget=await voiceGame.evaluate(()=>window.__mockGomokuCue.match(/NEXT white stone is planned for ([A-O]\d+)/)?.[1]);
  assert.ok(gomokuTarget,"The authoritative cue must specify the selected AI move");
  // The old speech has now been replaced: real Live reports the canceled
  // audio draining, then announces the NEW verified move as a fresh utterance.
  await voiceGame.evaluate(()=>window.__mockGomokuVoice.options.onSpeaking(false));
  await voiceGame.waitForFunction(()=>Boolean(document.querySelector(".friend-gomoku-skip")));
  await voiceGame.evaluate(()=>window.__mockGomokuVoice.options.onSpeaking(true));
  await voiceGame.waitForTimeout(80);
  await voiceGame.evaluate(move=>window.__mockGomokuVoice.options.onTurnComplete({
    hasValidOutput:true,output:"I'll place "+move+"."
  }),gomokuTarget);
  await voiceGame.waitForTimeout(220);
  assert.equal(await voiceGame.locator(".friend-gomoku-stone.white").count(),0,
    "The correct turnComplete still waits until matching speech playback drains");
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
  // Both voice-enabled board games must announce the chosen move first,
  // finish real audio playback, and only THEN place the AI's stone.
  // Without voice they still play the next local engine move immediately.
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
    name==="connect4"?"[CONNECT FOUR BEFORE MOVE]":"[REVERSI BEFORE MOVE]"),gameName,{timeout:8000});
   if(gameName==="connect4"){
    assert.equal(await boardVoice.locator(".crew-connect-disc.computer").count(),0,
      "The yellow AI disc must NOT appear before speech finishes");
    assert.equal(await boardVoice.locator(".crew-connect-slot:enabled").count(),0,
      "Connect Four must block input while AI is speaking");
   }else{
    assert.equal(await boardVoice.locator(".crew-reversi-disc.white").count(),1,
      "The player\'s black capture already flipped one original white stone; AI has not placed its white stone");
    assert.equal(await boardVoice.locator(".crew-reversi-cell.can-play").count(),0,
      "Reversi must block legal moves while AI is speaking");
   }
   // Earlier spoken intentions must not finish the new board narration.
   await boardVoice.evaluate(()=>window.__mockBoardSession.options.onTurnComplete({
    hasValidOutput:true,input:"I'll put J7",output:"You said J7; got it."
   }));
   await boardVoice.waitForTimeout(530);
   assert.equal(await boardVoice.locator(gameName==="connect4"?".crew-connect-slot:enabled":".crew-reversi-cell.can-play").count(),0,
    "Stale user-intention output must not unlock the board");
   assert.equal(await boardVoice.locator(gameName==="connect4"?".crew-connect-disc.computer":".crew-reversi-disc.white").count(),gameName==="connect4"?0:1,
    "Stale J7 output must not physically place the next AI stone");
   const expectedSpeech=await boardVoice.evaluate(name=>{
    const cue=window.__mockBoardCue;
    if(name==="connect4"){
      const n=cue.match(/selected for column (\d+)/)?.[1];
      return n?"I played in column "+n+".":"";
    }
    const square=cue.match(/white stone is selected for ([A-H]\d+)/)?.[1];
    return square?"I just played "+square+".":"";
   },gameName);
   assert.ok(expectedSpeech,"Narrator cue must contain its expected move");
   await boardVoice.evaluate(output=>window.__mockBoardSession.options.onTurnComplete({
    hasValidOutput:true,output
   }),expectedSpeech);
   await boardVoice.waitForTimeout(480);
   assert.equal(await boardVoice.locator(gameName==="connect4"?".crew-connect-slot:enabled":".crew-reversi-cell.can-play").count(),0,
     "The model turnComplete callback is too early; wait for actual audio drain");
   assert.equal(await boardVoice.locator(gameName==="connect4"?".crew-connect-disc.computer":".crew-reversi-disc.white").count(),gameName==="connect4"?0:1,
    "A completed transcript MUST NOT place the AI stone before audio drains");
   await boardVoice.evaluate(()=>window.__mockBoardSession.options.onSpeaking(false));
   await boardVoice.locator(gameName==="connect4"?".crew-connect-disc.computer":".crew-reversi-disc.white").nth(gameName==="connect4"?0:2).waitFor({timeout:5000});
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
   process.stdout.write("PASS "+gameName+" voice BEFORE AI stone, verified audio drain, skip, reset\n");
  }
  assert.deepEqual(playErrors,[],"Crew Play should not throw browser errors");
  await play.close();
  process.stdout.write("PASS Crew Play boards and puzzles\\n");
  await context.close();
  if(process.env.CREW_VISUAL_QA==="1")await captureCrewVisualQA(browser);
 }finally{
  if(browser)await browser.close();
  vite.kill("SIGTERM");
  await sleep(200);
  if(viteErrors&&vite.exitCode&&vite.exitCode!==0)process.stderr.write(viteErrors);
 }
}

run().catch(error=>{console.error(error);process.exitCode=1});

