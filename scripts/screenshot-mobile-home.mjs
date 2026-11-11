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
 else if(!existsSync(target))target=existsSync(target+".html")?target+".html":join(dist,"index.html");
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
    if(state==="return")await page.getByRole("heading",{name:/繼續和 Zoe|Continue with Zoe/}).waitFor({state:"visible"});
   }
   const info=await page.evaluate(()=>{
    const visible=selector=>{const el=document.querySelector(selector);return !!el&&getComputedStyle(el).display!=="none"&&el.getBoundingClientRect().width>0};
    return {overflow:document.documentElement.scrollWidth-innerWidth, mobileHome:visible(".crew-mobile-home"),
     legacyHome:visible(".crew-home-legacy"),onboardingOpen:!!document.querySelector(".crew-onboarding-dialog[open]"),
     desktopTabCount:document.querySelectorAll(".crew-nav-desktop a").length,mobileTabCount:document.querySelectorAll(".crew-nav-mobile a").length,
     homeAppCount:document.querySelectorAll(".cmh-app").length,homeTextHref:document.querySelector(".cmh-zoe-primary")?.getAttribute("href"),
     seoVisible:visible(".cmh-seo"),mobileNavVisible:visible(".crew-nav-mobile"),
     slideCount:document.querySelectorAll(".cmh-slide").length,dotCount:document.querySelectorAll(".cmh-carousel-dots button").length,
     activeSlide:document.querySelector(".cmh-slide[data-active=true]")?.getAttribute("class"),
     duplicateGameCard:!!document.querySelector(".cmh-featured"),
     reducedAnimationName:document.querySelector(".cmh-zoe-photo")?getComputedStyle(document.querySelector(".cmh-zoe-photo")).animationName:null};
   });
   if(width<768){
    if(info.overflow>2)throw Error(width+"px overflow "+info.overflow);
    if(info.onboardingOpen)throw Error(width+"px mobile welcome modal blocks homepage");
    if(info.homeAppCount!==6||info.mobileTabCount!==4||!info.mobileNavVisible)throw Error("mobile navigation or apps missing");
    if(info.slideCount!==4||info.dotCount!==4||!info.activeSlide?.includes("cmh-zoe"))throw Error("mobile hero carousel missing or not Zoe-first");
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
  zoeGeneric:document.querySelector(".cmh-zoe h1")?.textContent?.includes("一起聊聊吧"),
  noahLink:document.querySelector(".cmh-other-resume-link")?.getAttribute("href")?.includes("id=noah"),
  motionEnabled:getComputedStyle(document.querySelector(".cmh-zoe-photo")).animationName!=="none"
 }));
 if(!otherFriendState.zoeGeneric||!otherFriendState.noahLink||!otherFriendState.motionEnabled)throw Error("Other-friend resume or motion-enabled regression");
 await interactionPage.locator(".cmh-carousel-dots button").nth(2).click();
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
 await videoPage.waitForFunction(()=>document.querySelector(".cmh-carousel-dots button:nth-child(2)")?.classList.contains("is-active"),null,{timeout:11000});
 await videoPage.waitForTimeout(850);
 // Synthetic TouchEvents exercise the same React touch handlers as a physical swipe.
 await videoPage.locator(".cmh-carousel-viewport").evaluate(element=>{
  const at=(x,y)=>new Touch({identifier:1,target:element,clientX:x,clientY:y});
  const start=at(310,170),end=at(65,175);
  element.dispatchEvent(new TouchEvent("touchstart",{bubbles:true,touches:[start],targetTouches:[start],changedTouches:[start]}));
  element.dispatchEvent(new TouchEvent("touchend",{bubbles:true,touches:[],targetTouches:[],changedTouches:[end]}));
 });
 await videoPage.waitForFunction(()=>document.querySelector(".cmh-slide-game")?.getAttribute("data-active")==="true",null,{timeout:3000});
 await videoPage.waitForTimeout(1600);
 await videoPage.locator(".cmh-carousel-dots button").nth(3).click();
 await videoPage.waitForFunction(()=>document.querySelector(".cmh-slide-learn")?.getAttribute("data-active")==="true",null,{timeout:3000});
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
 writeFileSync(join(output,"results.json"),JSON.stringify(stats,null,2)+"\n");
 console.log(JSON.stringify(stats.map(x=>({file:x.name,overflow:x.overflow,mobile:x.mobileHome,oldDesktop:x.legacyHome,modal:x.onboardingOpen,apps:x.homeAppCount})),null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
