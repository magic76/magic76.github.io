/** Screenshot-only CI evidence for unmerged mobile hero v3. Not a production script. */
import {createServer} from "node:http";
import {readFileSync,existsSync,mkdirSync,writeFileSync,statSync,unlinkSync} from "node:fs";
import {resolve,join,extname,sep} from "node:path";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright";

const dist=resolve("dist");
const output=resolve("artifacts/mobile-home-hero-v3");
if(!existsSync(join(dist,"index.html")))throw Error("Build dist/ before screenshots");
mkdirSync(output,{recursive:true});
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml",".woff2":"font/woff2"};
const server=createServer((req,res)=>{
 const path=decodeURIComponent((req.url||"/").split("?")[0]);
 let target=resolve(dist,"."+path);
 if(!target.startsWith(dist+sep)&&target!==dist){res.writeHead(403);res.end();return}
 if(path==="/")target=join(dist,"index.html");
 else if(existsSync(target)&&statSync(target).isDirectory())target=join(target,"index.html");
 else if(!existsSync(target))target=existsSync(target+".html")?target+".html":join(dist,"index.html");
 try{const body=readFileSync(target);res.writeHead(200,{"Content-Type":mime[extname(target)]||"application/octet-stream"});res.end(body)}
 catch{res.writeHead(404);res.end("not found")}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const url="http://127.0.0.1:"+server.address().port+"/";
const bin=["chromium","chromium-browser","google-chrome"].find(name=>spawnSync("which",[name],{encoding:"utf8"}).status===0);
const executablePath=bin?spawnSync("which",[bin],{encoding:"utf8"}).stdout.trim():undefined;
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{}),args:["--no-sandbox","--disable-dev-shm-usage"]});
const labels=["zoe","friends","game","learn"];
const report=[];
try{
 for(const state of ["first","return"]){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,locale:"zh-TW",reducedMotion:"reduce"});
  if(state==="return")await context.addInitScript(()=>{
   localStorage.setItem("crew_onboarding_web_v1","completed");
   localStorage.setItem("crew_friend_text_resume_v1",JSON.stringify([{
    friendId:"zoe",at:Date.now(),
    messages:[{role:"user",text:"我們上次聊到旅行的事情，你還記得嗎？"},
     {role:"assistant",text:"當然記得！你說想找有海景的地方散步，後來決定去哪裡了嗎？"}]
   }]));
  });
  const page=await context.newPage();
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto(url,{waitUntil:"domcontentloaded",timeout:45000});
  await page.locator(".cmh-slide.cmh-zoe").waitFor({state:"visible",timeout:30000});
  await page.waitForTimeout(350);
  if(state==="return"){
   await page.waitForFunction(()=>document.querySelector(".cmh-zoe h1")?.textContent?.includes("繼續和 Zoe"),null,{timeout:7000});
  }else{
   await page.waitForFunction(()=>document.querySelector(".cmh-zoe h1")?.textContent?.includes("一起聊聊"),null,{timeout:7000});
  }
  const dots=page.locator(".cmh-carousel-dots button");
  if(await dots.count()!==4)throw Error("Expected 4 slide dots");
  for(let i=0;i<4;i++){
   await dots.nth(i).click();
   await page.waitForFunction(index=>document.querySelectorAll(".cmh-slide")[index]?.getAttribute("data-active")==="true",i);
   await page.waitForTimeout(100);
   const metrics=await page.evaluate(index=>{
    const slides=[...document.querySelectorAll(".cmh-slide")],active=slides[index];
    const scene=active?.querySelector(".cmh-scene"),hero=document.querySelector(".cmh-carousel");
    const image=active?.querySelector(".cmh-zoe-photo,.cmh-friend-portrait img,.cmh-learn-portrait img");
    const h=hero?.getBoundingClientRect(),s=scene?.getBoundingClientRect();
    const links=[...active.querySelectorAll("a")].map(x=>x.getAttribute("href"));
    return {index,scene:!!scene,sceneWidth:s?.width,slideHeight:active?.getBoundingClientRect().height,
      heroHeight:h?.height,overflow:document.documentElement.scrollWidth-innerWidth,
      hidden:slides.map(x=>x.getAttribute("aria-hidden")),
      reducedAnimation:scene?getComputedStyle(scene).animationName:null,
      imageLoaded:!image||(image.complete&&image.naturalWidth>0),links,
      bottomNav:document.querySelectorAll("nav.crew-mobile-dock a").length};
   },i);
   if(!metrics.scene||!metrics.sceneWidth||metrics.heroHeight>422||metrics.overflow>2||metrics.bottomNav!==5)throw Error("Mobile geometry/scene regression "+state+"/"+i+": "+JSON.stringify(metrics));
   if(metrics.hidden.filter(x=>x==="false").length!==1||metrics.hidden[i]!=="false")throw Error("Invalid slide aria-hidden "+i);
   if(metrics.reducedAnimation!=="none")throw Error("Reduced motion scene still animates "+i+": "+metrics.reducedAnimation);
   if(!metrics.imageLoaded)throw Error("Active character photo failed to load "+state+"/"+i);
   await page.screenshot({path:join(output,"390-"+state+"-"+labels[i]+".png"),animations:"disabled",fullPage:false});
   await page.locator(".cmh-carousel").screenshot({path:join(output,"hero-390-"+state+"-"+labels[i]+".png"),animations:"disabled"});
   report.push({state,slide:labels[i],...metrics});
  }
  if(errors.length)throw Error("Browser script errors: "+errors.join("; "));
  await context.close();
 }
 // Desktop regression: new mobile art is invisible at 1440px.
 const desktop=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:"reduce"});
 await desktop.goto(url,{waitUntil:"domcontentloaded"});
 const desktopState=await desktop.evaluate(()=>({
  mobileHidden:getComputedStyle(document.querySelector(".crew-mobile-home")).display==="none",
  legacyVisible:getComputedStyle(document.querySelector(".crew-home-legacy")).display!=="none",
  navItems:document.querySelectorAll("nav.global-nav .navitem").length
 }));
 if(!desktopState.mobileHidden||!desktopState.legacyVisible||desktopState.navItems!==5)throw Error("Desktop changed: "+JSON.stringify(desktopState));
 await desktop.screenshot({path:join(output,"1440-desktop-unchanged.png"),animations:"disabled"});
 await desktop.close();

 // Actual Chromium motion record: auto advance Zoe->friends, then dot navigation,
 // touch swipe and return to Zoe. All recorded with animation enabled.
 const movieContext=await browser.newContext({
  viewport:{width:390,height:844},deviceScaleFactor:1,locale:"zh-TW",hasTouch:true,
  reducedMotion:"no-preference",recordVideo:{dir:output,size:{width:390,height:844}}
 });
 const moviePage=await movieContext.newPage();
 await moviePage.goto(url,{waitUntil:"domcontentloaded"});
 await moviePage.locator(".cmh-slide.cmh-zoe").waitFor({state:"visible"});
 const firstArt=await moviePage.evaluate(()=>getComputedStyle(document.querySelector(".cmh-zoe-scene")).animationName);
 if(firstArt==="none")throw Error("Hero entrance animation absent with reduced motion off");
 await moviePage.waitForFunction(()=>document.querySelector(".cmh-slide-friends")?.getAttribute("data-active")==="true",null,{timeout:12500});
 await moviePage.waitForTimeout(1100);
 const movieDots=moviePage.locator(".cmh-carousel-dots button");
 await movieDots.nth(2).click();
 await moviePage.waitForFunction(()=>document.querySelector(".cmh-slide-game")?.getAttribute("data-active")==="true");
 await moviePage.waitForTimeout(1550);
 await moviePage.locator(".cmh-carousel-viewport").evaluate(node=>{
  const at=(x,y)=>new Touch({identifier:7,target:node,clientX:x,clientY:y});
  const start=at(316,160),end=at(60,165);
  node.dispatchEvent(new TouchEvent("touchstart",{bubbles:true,touches:[start],targetTouches:[start],changedTouches:[start]}));
  node.dispatchEvent(new TouchEvent("touchend",{bubbles:true,touches:[],targetTouches:[],changedTouches:[end]}));
 });
 await moviePage.waitForFunction(()=>document.querySelector(".cmh-slide-learn")?.getAttribute("data-active")==="true",null,{timeout:3000});
 await moviePage.waitForTimeout(1650);
 await movieDots.nth(0).click();
 await moviePage.waitForFunction(()=>document.querySelector(".cmh-slide.cmh-zoe")?.getAttribute("data-active")==="true");
 await moviePage.waitForTimeout(1700);
 const recording=moviePage.video();
 if(!recording)throw Error("Missing Playwright video");
 await movieContext.close();
 const raw=await recording.path();
 const mp4=join(output,"hero-v3-carousel-motion.mp4");
 const ffmpeg=spawnSync("ffmpeg",["-hide_banner","-loglevel","error","-y","-i",raw,
  "-vf","fps=20,scale=390:-2:flags=lanczos","-c:v","libx264","-pix_fmt","yuv420p",
  "-crf","25","-movflags","+faststart","-an",mp4],{encoding:"utf8",timeout:90000});
 if(ffmpeg.status!==0||!existsSync(mp4)||statSync(mp4).size<30000)throw Error("MP4 failed: "+(ffmpeg.stderr||String(ffmpeg.error)));
 unlinkSync(raw);
 // Check that manual selection remains stopped after > one auto interval.
 const pauseContext=await browser.newContext({viewport:{width:390,height:844},locale:"zh-TW",reducedMotion:"no-preference"});
 const pausePage=await pauseContext.newPage();await pausePage.goto(url,{waitUntil:"domcontentloaded"});
 await pausePage.locator(".cmh-carousel-dots button").nth(2).click();
 await pausePage.waitForTimeout(5600);
 if(await pausePage.locator(".cmh-slide-game").getAttribute("data-active")!=="true")throw Error("Manual slide failed to pause autoplay");
 await pauseContext.close();
 const summary={screenshots:report.length,slides:labels,desktopState,autoAdvance:true,swipe:true,dots:true,manualPause:true,reducedMotion:true,videoBytes:statSync(mp4).size};
 writeFileSync(join(output,"qa-results.json"),JSON.stringify({summary,report},null,2)+"\n");
 console.log("HERO V3 QA PASS "+JSON.stringify(summary));
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
