/**
 * Life Cafe browser acceptance: real scene interactions across phone/desktop.
 * Does not call Gemini, Turnstile or any third-party backend.
 */
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFileSync,existsSync,mkdirSync,statSync} from "node:fs";
import {resolve,join,extname,sep} from "node:path";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright";
const dist=resolve("dist"),output=resolve("artifacts/life-cafe-qa");
if(!existsSync(join(dist,"index.html")))throw Error("Build Cloudflare dist/ first");
mkdirSync(output,{recursive:true});
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml",".json":"application/json",".woff2":"font/woff2"};
const server=createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent((req.url||"/").split("?")[0]);let file=resolve(dist,"."+pathname);
  if(!file.startsWith(dist+sep)&&file!==dist){res.writeHead(403);res.end("Forbidden");return;}
  if(pathname==="/"||!existsSync(file))file=join(dist,"index.html");
  else if(statSync(file).isDirectory())file=existsSync(join(file,"index.html"))?join(file,"index.html"):join(dist,"index.html");
  res.writeHead(200,{"Content-Type":mime[extname(file)]||"application/octet-stream","Cache-Control":"no-store"});res.end(readFileSync(file));
 }catch{res.writeHead(404);res.end("Not found")}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const base="http://127.0.0.1:"+server.address().port;
const chrome=["google-chrome","google-chrome-stable","chromium","chromium-browser"]
 .map(x=>spawnSync("which",[x],{encoding:"utf8"})).find(x=>x.status===0)?.stdout.trim();
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"],...(chrome?{executablePath:chrome}:{})});
const errors=[];
const screenshot=(page,name)=>page.screenshot({path:join(output,name+".png"),fullPage:true,animations:"disabled"});
async function layout(page,description){
 const data=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:window.innerWidth}));
 assert.ok(data.document<=data.viewport+2,description+" horizontal overflow "+JSON.stringify(data));
}
async function portraits(page){
 await page.waitForFunction(()=>Array.from(document.querySelectorAll(".lc-character .lc-portrait")).length===3
  && Array.from(document.querySelectorAll(".lc-character .lc-portrait img")).length===3
  && Array.from(document.querySelectorAll(".lc-character .lc-portrait img")).every(el=>el.complete&&el.naturalWidth>0),null,{timeout:20000});
}
async function prop(page,id,target,guess=null){
 await page.locator(".lc-item").filter({has:page.locator(".lc-item-icon")}).nth(["letter","ticket","rain","camera","coffee"].indexOf(id)).click();
 await page.locator(".lc-character-"+target).click();
 if(guess)await page.locator(".lc-guess-pills button").filter({hasText:guess==="mira"?"Mira":guess==="ethan"?"Ethan":"Hana"}).click();
 await page.locator(".lc-submit .lc-primary").click();
 await page.locator(".lc-reaction h2").waitFor({state:"visible"});
}
async function next(page){
 await page.locator(".lc-reaction-actions .lc-primary").click();
}
try{
 for(const [width,height] of [[360,640],[390,844],[1280,800]]){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:"reduce",locale:"zh-TW"});
  const page=await ctx.newPage();page.on("pageerror",e=>errors.push(width+": "+e.message));
  await page.goto(base+"/timeline/observe",{waitUntil:"domcontentloaded",timeout:45000});
  await page.locator(".lc-item").first().waitFor({state:"visible",timeout:25000});
  await portraits(page);
  if(width<=390)assert.equal(await page.locator(".crew-mobile-dock").evaluate(el=>getComputedStyle(el).display),"none","Immersive game must not overlap prop controls with mobile site dock");
  assert.equal(await page.locator(".lc-character").count(),3);
  assert.equal(await page.locator(".lc-item").count(),5);
  await layout(page,width+" opening");
  await screenshot(page,width+"-cafe-start");
  await prop(page,"letter","mira","hana");
  assert.match(await page.locator(".lc-reaction h2").innerText(),/誤會開始發酵/);
  assert.equal(await page.locator(".lc-dialogue-line").count(),3);
  await layout(page,width+" first reaction");
  await screenshot(page,width+"-anonymous-letter");
  // On a later visit the client reconstructs a limited number of small happenings.
  await page.evaluate(()=>{
   const key="crew-life-cafe-v1";const state=JSON.parse(localStorage.getItem(key));
   state.lastSeenAt=Date.now()-45*60*1000;
   localStorage.setItem(key,JSON.stringify(state));
  });
  await page.reload();
  await page.locator(".lc-away").waitFor({state:"visible"});
  assert.equal(await page.locator(".lc-away p").count(),2,"Catch-up is bounded by elapsed time");
  await screenshot(page,width+"-while-away");
  await page.locator(".lc-away button").click();
  await next(page);
  await prop(page,"camera","ethan");
  assert.match(await page.locator(".lc-reaction h2").innerText(),/照片裡藏著另一個答案/);
  await page.locator(".lc-discoveries .lc-fold-button").click();
  assert.match(await page.locator(".lc-secrets").innerText(),/Mira 藏了一張照片/);
  await screenshot(page,width+"-picture-reveal");
  await next(page);
  await prop(page,"ticket","ethan");
  assert.match(await page.locator(".lc-reaction h2").innerText(),/原來有人偷偷寫歌/);
  await next(page);
  await prop(page,"rain","hana");
  await next(page);
  await prop(page,"coffee","hana");
  await next(page);
  await page.locator(".lc-finished").waitFor({state:"visible"});
  assert.equal(await page.locator(".lc-finished-stats").count(),1);
  await layout(page,width+" ending");
  await screenshot(page,width+"-experiment-end");
  await page.reload();await page.locator(".lc-finished").waitFor({state:"visible"});
  assert.match(await page.locator(".lc-counter").innerText(),/5/);
  await page.locator(".lc-finished-actions .lc-primary").click();
  await page.locator(".lc-item").first().waitFor({state:"visible"});
  assert.match(await page.locator(".lc-counter").innerText(),/0/);
  await page.goto(base+"/timeline/observe/classic",{waitUntil:"domcontentloaded"});
  await page.locator(".lo-page").waitFor({state:"visible"}); // Previous game is available for reference.
  await page.goto(base+"/timeline/simulate",{waitUntil:"domcontentloaded"});
  await page.waitForURL(/\/timeline\/observe/);
  await page.locator(".lc-page").waitFor({state:"visible"});
  await ctx.close();
 }
 assert.deepEqual(errors,[],"No uncaught client errors");
 console.log("Life Cafe PASS: portraits, 5 distinct props, target causality, guess UI, secrets, offline catch-up, replay, legacy route at 360/390/1280.");
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
