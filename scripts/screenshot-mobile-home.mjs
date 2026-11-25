/** Browser-only acceptance screenshots for the unmerged responsive home PR. */
import {createServer} from "node:http";
import {readFileSync,existsSync,mkdirSync,writeFileSync,unlinkSync,statSync} from "node:fs";
import {resolve,join,extname,sep} from "node:path";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright";

const dist=resolve("dist"),output=resolve("artifacts/mobile-home-qa");
if(!existsSync(join(dist,"index.html")))throw Error("Build dist/ first");
mkdirSync(output,{recursive:true});
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",".json":"application/json",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml",".woff2":"font/woff2"};
const server=createServer((req,res)=>{
 const path=decodeURIComponent((req.url||"/").split("?")[0]);
 let target=resolve(dist,"."+path);
 if(!target.startsWith(dist+sep)&&target!==dist){res.writeHead(403);res.end();return;}
 if(path==="/")target=join(dist,"index.html");
 else if(existsSync(target)&&statSync(target).isDirectory()){
  // Public SSG routes like /games and /story can materialize as directories.
  const nested=join(target,"index.html");
  target=existsSync(nested)?nested:join(dist,"index.html");
 }else if(!existsSync(target))target=existsSync(target+".html")?target+".html":join(dist,"index.html");
 try{const data=readFileSync(target);res.writeHead(200,{"Content-Type":mime[extname(target)]||"application/octet-stream","Cache-Control":"no-store"});res.end(data)}
 catch{res.writeHead(404);res.end("not found")}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const port=server.address().port;
const available=["google-chrome","google-chrome-stable","chromium","chromium-browser"].find(n=>spawnSync("which",[n],{encoding:"utf8"}).status===0);
const chrome=available?spawnSync("which",[available],{encoding:"utf8"}).stdout.trim():undefined;
const browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{}) ,args:["--no-sandbox","--disable-dev-shm-usage"]});
const cases=[{width:360,height:800},{width:390,height:844},{width:1440,height:900}];
const stats=[];
try{
 for(const {width,height} of cases){
  for(const state of ["first","return"]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:"zh-TW",reducedMotion:"reduce"});
   if(state==="return")await context.addInitScript(()=>{
    localStorage.setItem("crew_onboarding_web_v1","completed");
    localStorage.setItem("crew_friend_text_resume_v1",JSON.stringify([{friendId:"zoe",at:Date.now(),messages:[{role:"user",text:"我們上次聊到旅行的事情，你還記得嗎？"},{role:"assistant",text:"當然記得！你說想找個有海景的地方慢慢走，後來有決定要去哪裡嗎？"}],preview:""}]));
   });
   const page=await context.newPage();
   const errors=[];page.on("pageerror",error=>errors.push(error.message));
   await page.goto("http://127.0.0.1:"+port+"/",{waitUntil:"domcontentloaded",timeout:45000});
   await page.waitForSelector(".crew-mobile-home",{state:width<768?"visible":"attached",timeout:30000});
   await page.waitForTimeout(900);
   if(width<768){
    await page.locator(".cmh-zoe").waitFor({state:"visible"});
    if(state==="return")await page.waitForFunction(()=>document.querySelector(".cmh-zoe h2")?.textContent?.includes("繼續和 Zoe"));
   }
   const info=await page.evaluate(()=>{
    const visible=selector=>{const el=document.querySelector(selector);return !!el&&getComputedStyle(el).display!=="none"&&el.getBoundingClientRect().width>0};
    return {overflow:document.documentElement.scrollWidth-innerWidth, mobileHome:visible(".crew-mobile-home"),
     legacyHome:visible(".crew-home-legacy"),onboardingOpen:!!document.querySelector(".crew-onboarding-dialog[open]"),
     desktopTabCount:document.querySelectorAll(".global-nav a").length,mobileTabCount:document.querySelectorAll(".crew-mobile-dock a").length,
     homeAppCount:document.querySelectorAll(".cmh-app").length,homeTextHref:document.querySelector(".cmh-zoe .cmh-zoe-primary")?.getAttribute("href"),
     seoVisible:visible(".cmh-seo"),mobileNavVisible:visible(".crew-mobile-dock"),
     slideCount:document.querySelectorAll(".cmh-slide").length,dotCount:document.querySelectorAll(".cmh-carousel-dots button").length,
     activeSlide:document.querySelector(".cmh-slide[data-active=true]")?.getAttribute("class"),
     duplicateGameCard:!!document.querySelector(".cmh-featured"),
     reducedAnimationName:document.querySelector(".cmh-zoe-photo")?getComputedStyle(document.querySelector(".cmh-zoe-photo")).animationName:null};
   });
   if(width<768){
    if(info.overflow>2)throw Error(width+"px overflow "+info.overflow);
    if(info.onboardingOpen)throw Error(width+"px mobile welcome modal blocks homepage");
    if(info.homeAppCount!==8||info.mobileTabCount!==5||!info.mobileNavVisible)throw Error("mobile navigation or apps missing");
    const shortcuts=await page.locator(".cmh-app").evaluateAll(nodes=>nodes.map(node=>({
     text:node.textContent?.trim(),href:node.getAttribute("href"),
     width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height
    })));
    const timeline=shortcuts.find(item=>item.href==="/timeline");
    const scenarios=shortcuts.find(item=>item.href==="/teacher/course");
    if(!timeline||!scenarios||timeline.text!=="時光機"||scenarios.text!=="情境課程")throw Error("Timeline / Scenarios shortcut labels or links wrong");
    if(shortcuts.some(item=>item.href==="/magic"||item.width<44||item.height<44))throw Error("Invalid shortcut target or small touch area");
    if(info.slideCount!==4||info.dotCount!==4||!info.activeSlide?.includes("cmh-slide-learn"))throw Error("mobile hero carousel missing or not teacher-first");
    if(info.duplicateGameCard)throw Error("Daily recommendation duplicated below carousel");
    if(info.reducedAnimationName!=="none")throw Error("Reduced-motion screenshot still animates Zoe");
    if(!info.seoVisible)throw Error("mobile SEO text hidden");
    if(!info.homeTextHref?.includes("id=zoe"))throw Error("Zoe chat CTA missing");
   }else if(!info.legacyHome||info.mobileHome)throw Error("Desktop legacy homepage was replaced");
   const name=width+"-"+state+".png";
   await page.screenshot({path:join(output,name),animations:"disabled",fullPage:false});
   stats.push({name,viewport:width+"x"+height,state,...info,errors});
   await context.close();
  }
 }
 // Verify actual user gesture, paused autoplay and reduced-motion behavior.
 const interactionContext=await browser.newContext({
  viewport:{width:390,height:844},locale:"zh-TW",reducedMotion:"no-preference",hasTouch:true
 });
 await interactionContext.addInitScript(()=>{
  localStorage.setItem("crew_friend_text_resume_v1",JSON.stringify([
   {friendId:"noah",at:Date.now(),messages:[
    {role:"user",text:"今天想去公園走走"},
    {role:"assistant",text:"傍晚的公園很好，很適合慢慢走走。"}
   ],preview:""}]));
 });
 const interactionPage=await interactionContext.newPage();
 await interactionPage.goto("http://127.0.0.1:"+port+"/",{waitUntil:"domcontentloaded"});
 await interactionPage.locator(".cmh-zoe .cmh-zoe-primary").waitFor();
 await interactionPage.locator(".cmh-other-resume-link strong").waitFor({state:"visible"});
 const otherFriendState=await interactionPage.evaluate(()=>({
  zoeGeneric:document.querySelector(".cmh-zoe h2")?.textContent?.includes("一起聊聊吧"),
  noahLink:document.querySelector(".cmh-other-resume-link")?.getAttribute("href")?.includes("id=noah"),
  motionEnabled:getComputedStyle(document.querySelector(".cmh-zoe-photo")).animationName!=="none"
 }));
 if(!otherFriendState.zoeGeneric||!otherFriendState.noahLink||!otherFriendState.motionEnabled)throw Error("Other-friend resume or motion-enabled regression");
 await interactionPage.locator(".cmh-carousel-dots button").nth(3).click();
 await interactionPage.waitForFunction(()=>document.querySelector(".cmh-slide-game")?.getAttribute("data-active")==="true");
 await interactionPage.waitForTimeout(5450);
 if(await interactionPage.locator(".cmh-slide-game").getAttribute("data-active")!=="true")throw Error("Carousel autoplay did not pause after user interaction");
 await interactionContext.close();

 // Record the actual moving gradients, 5-second auto-advance, touch-swipe and dot controls.
 const videoContext=await browser.newContext({
  viewport:{width:390,height:844},deviceScaleFactor:1,locale:"zh-TW",hasTouch:true,
  reducedMotion:"no-preference",recordVideo:{dir:output,size:{width:390,height:844}}
 });
 const videoPage=await videoContext.newPage();
 await videoPage.goto("http://127.0.0.1:"+port+"/",{waitUntil:"domcontentloaded"});
 await videoPage.locator(".cmh-zoe").waitFor({state:"visible"});
 await videoPage.waitForFunction(()=>document.querySelector(".cmh-carousel-dots button:nth-child(2)")?.classList.contains("is-active"),null,{timeout:15000});
 await videoPage.waitForTimeout(850);
 // Synthetic TouchEvents exercise the same React touch handlers as a physical swipe.
 await videoPage.locator(".cmh-carousel-viewport").evaluate(element=>{
  const at=(x,y)=>new Touch({identifier:1,target:element,clientX:x,clientY:y});
  const start=at(310,170),end=at(65,175);
  element.dispatchEvent(new TouchEvent("touchstart",{bubbles:true,touches:[start],targetTouches:[start],changedTouches:[start]}));
  element.dispatchEvent(new TouchEvent("touchend",{bubbles:true,touches:[],targetTouches:[],changedTouches:[end]}));
 });
 await videoPage.waitForFunction(()=>document.querySelector(".cmh-slide-friends")?.getAttribute("data-active")==="true",null,{timeout:3000});
 await videoPage.waitForTimeout(1600);
 await videoPage.locator(".cmh-carousel-dots button").nth(3).click();
 await videoPage.waitForFunction(()=>document.querySelector(".cmh-slide-game")?.getAttribute("data-active")==="true",null,{timeout:3000});
 await videoPage.waitForTimeout(1650);
 await videoPage.locator(".cmh-carousel-dots button").first().click();
 await videoPage.waitForTimeout(1450);
 const recordedVideo=videoPage.video();
 if(!recordedVideo)throw Error("Playwright video recording is missing");
 await videoContext.close();
 const webmPath=await recordedVideo.path();
 const moviePath=join(output,"carousel-motion-demo.mp4");
 const converted=spawnSync("ffmpeg",["-hide_banner","-loglevel","error","-y",
  "-i",webmPath,"-vf","fps=18,scale=390:-2:flags=lanczos","-c:v","libx264",
  "-pix_fmt","yuv420p","-crf","27","-movflags","+faststart","-an",moviePath],
  {encoding:"utf8",timeout:90000});
 if(converted.status!==0||!existsSync(moviePath)||statSync(moviePath).size<30000){
  throw Error("MP4 conversion failed: "+(converted.stderr||converted.error||"no output"));
 }
 unlinkSync(webmPath);
 stats.push({name:"carousel-motion-demo.mp4",kind:"video",bytes:statSync(moviePath).size,
  interaction:"5.2s autoplay then swipe to game, dots to Learn and Zoe",otherFriendState});

 // Cross-page dock audit is run with actual browser navigation and CSS computation.
 // The same component must look and behave identically on every general Crew page.
 const navCases=[
  ["home","/","home"],
  ["chat","/chat","chat"],
  ["explore","/explore","explore"],
  ["mine","/me","me"],
  ["learn","/learn","learn"],
  ["practice","/teacher/practice","learn"],
  ["course","/teacher/course","learn"],
  ["vocabulary","/teacher/vocabulary","learn"],
  ["pronunciation","/teacher/pronunciation","learn"],
  ["phrasebook","/teacher/phrasebook","learn"],
  ["reports","/teacher/reports","learn"],
  ["games","/games","explore"],
  ["story","/story","explore"],
  ["fortune","/fortune","explore"],
  ["moments","/teacher/shorts","chat"],
  ["friends","/teacher/roles?mode=friends","chat"],
  ["teachers","/teacher/roles?mode=teacher","learn"],
  ["my-stories","/story/me","me"],
  ["fortune-history","/fortune/history","me"],
  ["settings","/settings","me"],
  ["circle","/circle","explore"]
 ];
 const navContext=await browser.newContext({viewport:{width:390,height:844},locale:"zh-TW",
  deviceScaleFactor:1,reducedMotion:"reduce"});
 await navContext.addInitScript(()=>localStorage.setItem("crew_onboarding_web_v1","completed"));
 const navPage=await navContext.newPage();
 const navErrors=[];navPage.on("pageerror",error=>navErrors.push(error.message));
 const navRecords=[];let baseline=null;
 const navInspect=()=>navPage.evaluate(()=>{
  const dock=document.querySelector("nav.crew-mobile-dock");
  const items=[...document.querySelectorAll("nav.crew-mobile-dock a")];
  const rect=dock?.getBoundingClientRect();
  const style=dock&&getComputedStyle(dock);
  return {
   dockCount:document.querySelectorAll("nav.crew-mobile-dock").length,
   visible:!!rect&&rect.width>0&&style?.display!=="none",
   desktopHidden:[...document.querySelectorAll("nav.global-nav")].every(x=>getComputedStyle(x).display==="none"),
   labels:items.map(x=>x.querySelector(".crew-mobile-dock-label")?.textContent?.trim()),
   hrefs:items.map(x=>x.getAttribute("href")),
   current:items.filter(x=>x.getAttribute("aria-current")==="page").map(x=>x.getAttribute("href")),
   active:dock?.getAttribute("data-active"),
   geometry:rect?{width:rect.width,height:rect.height,top:rect.top,bottom:rect.bottom}:null,
   style:style?{background:style.backgroundColor,border:style.borderTopColor,
    shadow:style.boxShadow,fontFamily:getComputedStyle(items[0]).fontFamily}:null,
   hitTargets:items.map(x=>{
    const b=x.getBoundingClientRect();
    const hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);
    return {width:b.width,height:b.height,hit:!!hit&&(hit===x||x.contains(hit))};
   }),
   overflow:document.documentElement.scrollWidth-window.innerWidth
  };
 });
 // Actual tab taps from the homepage verify the shared dock stays mounted during SPA navigation.
 await navPage.goto("http://127.0.0.1:"+port+"/",{waitUntil:"domcontentloaded"});
 for(const target of ["/chat","/explore","/learn","/me","/"]){
  await navPage.locator('nav.crew-mobile-dock a[href="'+target+'"]').click();
  await navPage.waitForURL(url=>url.pathname===target,{timeout:15000});
  await navPage.waitForFunction(expected=>document.querySelector("nav.crew-mobile-dock")?.getAttribute("data-active")===expected,
   target==="/"? "home":target.slice(1),{timeout:15000});
  // On a first Learn visit the language-choice dialog correctly blocks all page
  // controls. Capture it, then use its actual Skip button before checking the dock.
  if(target==="/learn"){
   const languageGate=navPage.locator("dialog.crew-learning-language-dialog");
   await languageGate.waitFor({state:"visible",timeout:12000});
   await navPage.screenshot({path:join(output,"nav-390-learn-first-language-dialog.png"),animations:"disabled",fullPage:false});
   await languageGate.locator("button.crew-onboarding-skip").click();
   await navPage.waitForFunction(()=>!document.querySelector(".crew-learning-language-dialog")?.open);
  }
 }
 for(const [id,route,active] of navCases){
  const navResponse=await navPage.goto("http://127.0.0.1:"+port+route,{waitUntil:"domcontentloaded",timeout:45000});
  if(!navResponse||navResponse.status()!==200)throw Error("Nav route HTTP failure "+route+": "+navResponse?.status());
  await navPage.waitForFunction(expected=>{
   const nav=document.querySelector("nav.crew-mobile-dock");
   return !!nav&&getComputedStyle(nav).display!=="none"&&nav.dataset.active===expected
  },active,{timeout:20000});
  await navPage.waitForTimeout(360);
  if(id==="learn"){
   // The first Learn visit opens a real modal to choose a target language.
   // Capture that separate experience, then exercise its Skip control before
   // auditing the persistent navigation (modal overlays intentionally block clicks).
   const languageGate=navPage.locator("dialog.crew-learning-language-dialog");
   if(await languageGate.isVisible()){
    await navPage.screenshot({path:join(output,"nav-390-learn-first-language-dialog.png"),animations:"disabled",fullPage:false});
    await languageGate.locator("button.crew-onboarding-skip").click();
    await navPage.waitForFunction(()=>!document.querySelector(".crew-learning-language-dialog")?.open);
   }
  }
  const item=await navInspect();
  if(item.dockCount!==1||!item.visible||!item.desktopHidden||item.labels.length!==5)throw Error("Unexpected duplicated/hidden nav on "+route+": "+JSON.stringify(item));
  if(item.labels.join(",")!=="首頁,學習,探索,聊天,我的")throw Error("Different dock labels on "+route+": "+item.labels.join(","));
  if(item.hrefs.join(",")!=="/,/learn,/explore,/chat,/me")throw Error("Different dock routes on "+route);
  if(item.active!==active||item.current.length!==1||item.current[0]!==({home:"/",chat:"/chat",explore:"/explore",learn:"/learn",me:"/me"})[active])throw Error("Incorrect active tab on "+route+": "+JSON.stringify(item));
  if(Math.abs(item.geometry.bottom-844)>1||Math.abs(item.geometry.width-390)>1)throw Error("Dock misplaced on "+route);
  if(item.hitTargets.some(x=>!x.hit||x.height<44||x.width<44))throw Error("Dock obstructed/undersized on "+route+": "+JSON.stringify(item.hitTargets));
  if(item.overflow>2)throw Error("Horizontal overflow on "+route+" "+item.overflow);
  if(!baseline)baseline={height:item.geometry.height,style:item.style,labels:item.labels,hrefs:item.hrefs};
  else if(item.geometry.height!==baseline.height||JSON.stringify(item.style)!==JSON.stringify(baseline.style))throw Error("Dock CSS changed across pages: "+route);
  await navPage.screenshot({path:join(output,"nav-390-"+id+".png"),animations:"disabled",fullPage:false});
  await navPage.locator("nav.crew-mobile-dock").screenshot({path:join(output,"dock-390-"+id+".png"),animations:"disabled"});
  navRecords.push({id,route,active,geometry:item.geometry,labels:item.labels,hrefs:item.hrefs,style:item.style});
 }
 // Immersive Magic can hide the dock only because the page already has an Explore return link.
 await navPage.goto("http://127.0.0.1:"+port+"/magic",{waitUntil:"domcontentloaded"});
 await navPage.waitForFunction(()=>document.querySelector("nav.crew-mobile-dock--immersive")!==null);
 await navPage.locator('a.magic-back[href="/explore"]').waitFor({state:"visible",timeout:20000});
 const magicExit=await navPage.evaluate(()=>({
  hidden:getComputedStyle(document.querySelector("nav.crew-mobile-dock")).display==="none",
  returnLink:!!document.querySelector('a.magic-back[href="/explore"]')
 }));
 if(!magicExit.hidden||!magicExit.returnLink)throw Error("Magic immersive screen lacks an exit or hides nav incorrectly");
 if(navErrors.length)throw Error("Browser page exceptions on general routes: "+navErrors.join("; "));
 writeFileSync(join(output,"nav-results.json"),JSON.stringify({baseline,routes:navRecords,magicExit,spaTapFlow:"passed"},null,2)+"\n");
 stats.push({name:"nav-results.json",kind:"navigationQA",routes:navRecords.length,magicExit});
 await navContext.close();
 writeFileSync(join(output,"results.json"),JSON.stringify(stats,null,2)+"\n");
 console.log(JSON.stringify(stats.map(x=>({file:x.name,overflow:x.overflow,mobile:x.mobileHome,oldDesktop:x.legacyHome,modal:x.onboardingOpen,apps:x.homeAppCount})),null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
