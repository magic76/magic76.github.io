/** Browser-only acceptance screenshots for the unmerged responsive home PR. */
import {createServer} from "node:http";
import {readFileSync,existsSync,mkdirSync,writeFileSync} from "node:fs";
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
     seoVisible:visible(".cmh-seo"),mobileNavVisible:visible(".crew-nav-mobile")};
   });
   if(width<768){
    if(info.overflow>2)throw Error(width+"px overflow "+info.overflow);
    if(info.onboardingOpen)throw Error(width+"px mobile welcome modal blocks homepage");
    if(info.homeAppCount!==6||info.mobileTabCount!==4||!info.mobileNavVisible)throw Error("mobile navigation or apps missing");
    if(!info.seoVisible)throw Error("mobile SEO text hidden");
    if(!info.homeTextHref?.includes("id=zoe"))throw Error("Zoe chat CTA missing");
   }else if(!info.legacyHome||info.mobileHome)throw Error("Desktop legacy homepage was replaced");
   const name=width+"-"+state+".png";
   await page.screenshot({path:join(output,name),animations:"disabled",fullPage:false});
   stats.push({name,viewport:width+"x"+height,state,...info,errors});
   await context.close();
  }
 }
 writeFileSync(join(output,"results.json"),JSON.stringify(stats,null,2)+"\n");
 console.log(JSON.stringify(stats.map(x=>({file:x.name,overflow:x.overflow,mobile:x.mobileHome,oldDesktop:x.legacyHome,modal:x.onboardingOpen,apps:x.homeAppCount})),null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
