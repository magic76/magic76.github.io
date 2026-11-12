/**
 * Life Observatory browser acceptance: actual route, selection, autonomous world,
 * capped intervention, causal recaps, saving, replay, and two-world comparison.
 * AI and other external services are never called.
 */
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFileSync,existsSync,mkdirSync,statSync} from "node:fs";
import {resolve,join,extname,sep} from "node:path";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright";

const dist=resolve("dist"),output=resolve("artifacts/life-observatory-qa");
if(!existsSync(join(dist,"index.html")))throw Error("Build Cloudflare dist/ first");
mkdirSync(output,{recursive:true});
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml",".json":"application/json",".woff2":"font/woff2"};
const server=createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent((req.url||"/").split("?")[0]);
  let file=resolve(dist,"."+pathname);
  if(!file.startsWith(dist+sep)&&file!==dist){res.writeHead(403);res.end("Forbidden");return;}
  if(pathname==="/"||!existsSync(file))file=join(dist,"index.html");
  else if(statSync(file).isDirectory())file=existsSync(join(file,"index.html"))?join(file,"index.html"):join(dist,"index.html");
  res.writeHead(200,{"Content-Type":mime[extname(file)]||"application/octet-stream","Cache-Control":"no-store"});
  res.end(readFileSync(file));
 }catch{res.writeHead(404);res.end("Not found");}
});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
const address="http://127.0.0.1:"+server.address().port;
const chrome= ["google-chrome","google-chrome-stable","chromium","chromium-browser"]
 .map(name=>spawnSync("which",[name],{encoding:"utf8"}))
 .find(item=>item.status===0)?.stdout.trim();
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"],...(chrome?{executablePath:chrome}:{})});
const problems=[];
const snapshot=async(page,name)=>page.screenshot({path:join(output,name+".png"),fullPage:true,animations:"disabled"});
const overflow=async(page,label)=>{
 const widths=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:window.innerWidth}));
 assert.ok(widths.scroll<=widths.viewport+2,label+": "+JSON.stringify(widths));
};
const checkTapTargets=async(page,label)=>{
 const metrics=await page.locator(".lo-option-list button:not(:disabled)").evaluateAll(items=>items.map(x=>({w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height})));
 assert.ok(metrics.length>0,label+" buttons missing");
 assert.ok(metrics.every(item=>item.w>=44&&item.h>=44),label+" small touch target "+JSON.stringify(metrics));
};
async function waitForPortraits(page,label){
 await page.waitForFunction(()=>{
  const frames=Array.from(document.querySelectorAll(".lo-person .lo-portrait"));
  return frames.length===3&&frames.every(frame=>{
   const image=frame.querySelector("img");
   return image&&image.complete&&image.naturalWidth>0;
  });
 },null,{timeout:20000});
 assert.equal(await page.locator(".lo-person .lo-portrait img").count(),3,label+" verified photos missing");
}
async function intervene(page,actor,index){
 await page.locator('.lo-scene-tab[data-actor="'+actor+'"]').click();
 await page.locator(".lo-scene-"+actor+" .lo-option-list button").nth(index).click();
}
async function watch(page){
 await page.locator('.lo-scene-tab[data-actor="hana"]').click();
 await page.locator(".lo-focus-next .lo-primary").click();
 await page.locator(".lo-ripple").waitFor({state:"visible"});
 await page.waitForFunction(()=>{const el=document.querySelector("#lo-recap");return !!el&&el.getBoundingClientRect().top<150;});
 assert.equal(await page.locator(".lo-outcome").count(),3);
}
async function next(page){await page.locator(".lo-recap-footer .lo-primary").click();}
try{
 for(const [width,height] of [[360,640],[390,844],[1280,800]]){
  const context=await browser.newContext({viewport:{width,height},locale:"zh-TW",reducedMotion:"reduce",deviceScaleFactor:1});
  const page=await context.newPage();page.on("pageerror",error=>problems.push(width+": "+error.message));
  await page.goto(address+"/timeline/observe/classic",{waitUntil:"domcontentloaded",timeout:45000});
  await page.locator(".lo-intro .lo-primary").waitFor({state:"visible",timeout:30000});
  assert.equal(await page.locator(".lo-person").count(),3);
  await waitForPortraits(page,width+" intro");
  await overflow(page,width+" intro");
  await snapshot(page,width+"-intro");
  await page.locator(".lo-intro .lo-primary").click();
  await page.locator(".lo-scene").first().waitFor({state:"visible"});
  assert.ok(await page.evaluate(()=>window.scrollY)<5,"Starting V3 must show the new chapter from the top");
  assert.equal(await page.locator(".lo-scene").count(),1,"One focused decision at a time");
  assert.equal(await page.locator(".lo-scene-tab").count(),3);
  await page.locator(".lo-person-ethan .lo-person-focus").click();
  assert.equal(await page.locator(".lo-scene-ethan").count(),1,"Portrait opens correct story");
  await page.locator('.lo-scene-tab[data-actor="mira"]').click();
  await page.locator(".lo-focus-next .lo-primary").click();
  assert.equal(await page.locator(".lo-scene-ethan").count(),1,"Clear next-person action");
  await page.locator('.lo-scene-tab[data-actor="mira"]').click();
  await waitForPortraits(page,width+" watch");
  await checkTapTargets(page,width+" observe");
  await overflow(page,width+" observe");
  await snapshot(page,width+"-watch-16");
  await intervene(page,"ethan",0);
  await intervene(page,"hana",1);
  assert.equal(await page.locator(".lo-budget strong").innerText().then(s=>s.trim().split(" ")[0]),"0");
  await page.locator('.lo-scene-tab[data-actor="mira"]').click();
  assert.ok(await page.locator(".lo-scene-mira .lo-option-list button").first().isDisabled(),"Intervention budget must prevent a third choice");
  assert.ok(await page.locator('.lo-scene-tab[data-actor="mira"]').isEnabled(),"Character tabs stay usable at full budget");
  await watch(page);
  assert.equal(await page.locator(".lo-ripple").count(),1,"Ripple should lead the result view");
  assert.match(await page.locator(".lo-ripple h3").innerText(),/沒有人去的車站/);
  await snapshot(page,width+"-recap-16");
  await page.reload();
  await page.locator(".lo-ripple").waitFor({state:"visible"});
  assert.match(await page.locator(".lo-ripple h3").innerText(),/沒有人去的車站/,"Recap survives refresh");
  await next(page);
  await page.locator(".lo-scene").first().waitFor({state:"visible"});
  assert.match(await page.locator(".lo-chapter-now").innerText(),/25/);
  // Age 25 must contain a causal event from the 16-year decisions.
  await page.locator('.lo-scene-tab[data-actor="ethan"]').click();
  assert.match(await page.locator(".lo-scene-ethan h3").innerText(),/錄音室的邀約/);
  await watch(page);
  await next(page);
  assert.match(await page.locator(".lo-chapter-now").innerText(),/40/);
  await intervene(page,"mira",0);
  await intervene(page,"hana",0);
  await watch(page);
  await snapshot(page,width+"-recap-40");
  await next(page);
  await page.locator(".lo-ending").waitFor({state:"visible"});
  await overflow(page,width+" ending");
  await snapshot(page,width+"-ending");
  // Replay same seed, make the opposite decisions, and compare two saved worlds.
  await page.locator(".lo-ending-actions .lo-primary").click();
  await page.locator(".lo-scene").first().waitFor({state:"visible"});
  await intervene(page,"ethan",1);
  await intervene(page,"hana",0);
  await watch(page);await next(page);
  await intervene(page,"mira",1);
  await watch(page);await next(page);
  await intervene(page,"hana",1);
  await watch(page);await next(page);
  await page.locator(".lo-ending").waitFor({state:"visible"});
  await page.locator(".lo-compare-toggle button").click();
  assert.equal(await page.locator(".lo-compare-side").count(),2);
  assert.notEqual(await page.locator(".lo-compare-side").first().innerText(),await page.locator(".lo-compare-side").last().innerText());
  await overflow(page,width+" compare");
  await snapshot(page,width+"-compare");
  await page.reload();
  await page.locator(".lo-compare-toggle button").waitFor({state:"visible"});
  await page.locator(".lo-compare-toggle button").click();
  assert.equal(await page.locator(".lo-compare-side").count(),2,"Second world must survive reload");
  await page.goto(address+"/timeline/simulate",{waitUntil:"domcontentloaded"});
  await page.waitForURL(/\/timeline\/observe/);
  await page.locator(".lc-page").waitFor({state:"visible",timeout:15000});
  assert.equal(await page.locator(".lc-item").count(),5,"Legacy V2 bookmark now opens the new experiment box");
  await context.close();
 }
 assert.deepEqual(problems,[],"No uncaught runtime exceptions");
 console.log("Life Observatory QA PASS: 360/390/1280, no overflow, autonomous agency, budget, causal outcomes, save/reload and replay comparison.");
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
