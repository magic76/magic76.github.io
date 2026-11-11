/**
 * Life Lab headless browser acceptance: real React render, IndexedDB persistence,
 * 360/390/1280 viewports, decision flow, same-seed forks and parallel comparison.
 * Never clicks "Open character chat": no Turnstile or paid AI calls.
 */
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFileSync,existsSync,mkdirSync,statSync} from "node:fs";
import {resolve,join,extname,sep} from "node:path";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright";

const dist=resolve("dist"),output=resolve("artifacts/life-lab-qa");
if(!existsSync(join(dist,"index.html")))throw Error("Build dist/ first");
mkdirSync(output,{recursive:true});
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",".webp":"image/webp",".png":"image/png",".svg":"image/svg+xml",".json":"application/json",".woff2":"font/woff2"};
const server=createServer((req,res)=>{
 const pathname=decodeURIComponent((req.url||"/").split("?")[0]);
 const target=resolve(dist,"."+pathname);
 if(!target.startsWith(dist+sep)&&target!==dist){res.writeHead(403);res.end("Forbidden");return;}
 let file=target;
 if(pathname==="/"||!existsSync(file))file=join(dist,"index.html");
 else if(statSync(file).isDirectory())file=existsSync(join(file,"index.html"))?join(file,"index.html"):join(dist,"index.html");
 try{res.writeHead(200,{"Content-Type":mime[extname(file)]||"application/octet-stream","Cache-Control":"no-store"});res.end(readFileSync(file));}
 catch{res.writeHead(404);res.end("Not found");}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const port=server.address().port;
const chromeCandidates=["google-chrome","google-chrome-stable","chromium","chromium-browser"];
const chrome=chromeCandidates.map(n=>spawnSync("which",[n],{encoding:"utf8"})).find(r=>r.status===0)?.stdout.trim();
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"],...(chrome?{executablePath:chrome}:{})});
const errors=[];
async function screenshot(page,name){
 await page.screenshot({path:join(output,name+".png"),animations:"disabled",fullPage:true});
}
async function checkOverflow(page,label){
 const values=await page.evaluate(()=>({
  screen:window.innerWidth,width:document.documentElement.scrollWidth,
  frame:document.querySelector(".life-sim-page")?.getBoundingClientRect().width
 }));
 assert.ok(values.width<=values.screen+2,label+" horizontal overflow "+JSON.stringify(values));
}
async function makeChoice(page,index){
 await page.locator(".life-sim-choices button").nth(index).click();
 await page.locator(".life-sim-event .life-sim-primary").click();
 await page.locator(".life-sim-consequence").waitFor({state:"visible"});
}
async function advance(page){
 await page.locator(".life-sim-event .life-sim-primary").click();
}
try{
 for(const {width,height} of [{width:360,height:640},{width:390,height:844},{width:1280,height:800}]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:"zh-TW",reducedMotion:"reduce"});
  const page=await context.newPage();
  page.on("pageerror",error=>errors.push(width+": "+error.message));
  await page.goto("http://127.0.0.1:"+port+"/timeline/simulate",{waitUntil:"domcontentloaded",timeout:45000});
  await page.locator(".life-sim-character").first().waitFor({state:"visible",timeout:20000});
  await checkOverflow(page,width+" selection");
  assert.equal(await page.locator(".life-sim-character").count(),3);
  await screenshot(page,width+"-select");
  await page.locator(".life-sim-character").filter({hasText:"Ethan"}).locator("button").click();
  await page.locator(".life-sim-choices button").first().waitFor();
  await checkOverflow(page,width+" event");
  await screenshot(page,width+"-event");
  await makeChoice(page,0);
  await page.reload();
  await page.locator(".life-sim-consequence").waitFor({state:"visible"});
  assert.match(await page.locator(".life-sim-consequence").innerText(),/人格變化|Personality/);
  await advance(page);
  for(let index=1;index<12;index++){
   await page.locator(".life-sim-choices button").first().waitFor({state:"visible"});
   await makeChoice(page,0);
   await advance(page);
  }
  await page.locator(".life-sim-ending-card").first().waitFor({state:"visible"});
  assert.equal(await page.locator(".life-sim-ending-card").count(),4);
  await checkOverflow(page,width+" ending");
  await screenshot(page,width+"-ending");
  await page.locator(".life-sim-fork-label select").selectOption("16");
  await page.locator(".life-sim-fork-controls button").click();
  await page.locator(".life-sim-choices button").first().waitFor({state:"visible"});
  assert.match(await page.locator(".life-sim-progress").innerText(),/16/);
  // Choose the opposite decision at the fork, then finish the second life.
  for(let index=3;index<12;index++){
   await makeChoice(page,1);
   await advance(page);
  }
  await page.locator(".life-sim-ending-card").first().waitFor({state:"visible"});
  await page.getByRole("button",{name:/比較兩條人生|Compare both lives/}).click();
  assert.equal(await page.locator(".life-sim-compare-column").count(),2);
  assert.match(await page.locator(".life-sim-compare-top").innerText(),/[1-9] 個階段|[1-9] stages/);
  await checkOverflow(page,width+" comparison");
  await screenshot(page,width+"-compare");
  await page.reload();
  await page.locator(".life-sim-ending-card").first().waitFor({state:"visible"});
  await page.getByRole("button",{name:/比較兩條人生|Compare both lives/}).click();
  assert.equal(await page.locator(".life-sim-compare-column").count(),2,"Comparison persisted after reload");
  assert.equal(await page.locator(".life-sim-chat .text-chat-panel").count(),0,"AI chat stays opt-in");
  await context.close();
 }
 assert.deepEqual(errors,[],"No uncaught client errors");
 console.log("Life Lab browser QA passed: mobile/desktop, full life, IndexedDB resume, fork and comparison.");
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
