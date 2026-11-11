/** CI-only desktop homepage review. Compare phone screenshots to a real master build. */
import {createServer} from "node:http";
import {readFileSync,existsSync,mkdirSync,writeFileSync,statSync} from "node:fs";
import {resolve,join,extname,sep} from "node:path";
import {spawnSync} from "node:child_process";
import {chromium} from "playwright";
import pngjs from "pngjs";

const {PNG}=pngjs;
const out=resolve("artifacts/desktop-home-stage");
mkdirSync(out,{recursive:true});
const branchDist=resolve("dist");
const masterDist=resolve(process.argv[2]||"../crew-master-visual/dist");
for(const dir of [branchDist,masterDist])if(!existsSync(join(dir,"index.html")))throw Error("Missing built index.html: "+dir);
const mimes={".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".jpeg":"image/jpeg",".jpg":"image/jpeg",".woff2":"font/woff2",".ico":"image/x-icon"};
async function serve(root){
 const server=createServer((req,res)=>{
  const p=decodeURIComponent((req.url||"/").split("?")[0]);
  let path=resolve(root,"."+p);
  if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403);res.end();return}
  if(p==="/")path=join(root,"index.html");
  else if(existsSync(path)&&statSync(path).isDirectory())path=join(path,"index.html");
  else if(!existsSync(path))path=existsSync(path+".html")?path+".html":join(root,"index.html");
  try{const data=readFileSync(path);res.writeHead(200,{"Content-Type":mimes[extname(path)]||"application/octet-stream","Cache-Control":"no-store"});res.end(data)}
  catch{res.writeHead(404);res.end("not found")}
 });
 await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
 return {server,url:"http://127.0.0.1:"+server.address().port+"/"};
}
const branch=await serve(branchDist),master=await serve(masterDist);
const bin=["google-chrome","chromium","chromium-browser"].find(x=>spawnSync("which",[x],{encoding:"utf8"}).status===0);
const chrome=bin?spawnSync("which",[bin],{encoding:"utf8"}).stdout.trim():undefined;
const browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{}),args:["--no-sandbox","--disable-dev-shm-usage"]});
const results={desktop:[],mobile:[],masterSource:"git worktree origin/master"};
const close=async()=>{await browser.close();await Promise.all([new Promise(ok=>branch.server.close(ok)),new Promise(ok=>master.server.close(ok))])};
async function newPage(url,width,height){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:"zh-TW",reducedMotion:"reduce",colorScheme:"light"});
 const page=await context.newPage();
 // Keep network, randomized feeds, remote fonts and analytics identical.
 await page.addInitScript(()=>{
  let seed=244948974;Math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
  const time=Date.now();Date.now=()=>time;
  try{localStorage.setItem("crew_onboarding_web_v1","completed")}catch{}
 });
 await page.route("**/*",route=>{
  const resource=new URL(route.request().url());
  if(resource.hostname==="127.0.0.1"||resource.protocol==="data:"||resource.protocol==="blob:")return route.continue();
  return route.abort();
 });
 const errors=[];page.on("pageerror",error=>errors.push(error.message));
 await page.goto(url,{waitUntil:"domcontentloaded",timeout:45000});
 await page.locator(".crew-home-legacy").waitFor({state:"attached",timeout:30000});
 await page.evaluate(()=>document.fonts.ready);
 await page.waitForTimeout(650);
 return {page,context,errors};
}
const rect=x=>x?({x:x.x,y:x.y,left:x.left,right:x.right,top:x.top,bottom:x.bottom,width:x.width,height:x.height}):null;
function comparePNGs(aPath,bPath,diffPath){
 const a=PNG.sync.read(readFileSync(aPath)),b=PNG.sync.read(readFileSync(bPath));
 if(a.width!==b.width||a.height!==b.height)throw Error("Different snapshot dimensions");
 let pixels=0,materialPixels=0,maxChannelDelta=0;const diff=new PNG({width:a.width,height:a.height});
 for(let i=0;i<a.data.length;i+=4){
  const deltas=[0,1,2,3].map(c=>Math.abs(a.data[i+c]-b.data[i+c]));
  const maximum=Math.max(...deltas);
  if(maximum>0){
   pixels++;maxChannelDelta=Math.max(maxChannelDelta,maximum);
   if(maximum>4)materialPixels++;
   diff.data[i]=255;diff.data[i+1]=20;diff.data[i+2]=70;diff.data[i+3]=255;
  }else{
   diff.data[i]=a.data[i];diff.data[i+1]=a.data[i+1];diff.data[i+2]=a.data[i+2];diff.data[i+3]=80;
  }
 }
 if(pixels)writeFileSync(diffPath,PNG.sync.write(diff));
 return {mismatchedPixels:pixels,materialPixels,maxChannelDelta,totalPixels:a.width*a.height,ratio:pixels/(a.width*a.height)};
}
try{
 for(const [width,height] of [[1280,800],[1440,900],[1920,1080]]){
  const {page,context,errors}=await newPage(branch.url,width,height);
  await page.locator(".crew-home-portal").waitFor({state:"visible"});
  await page.locator(".crew-home-live-bubble").waitFor({state:"visible",timeout:10000});
  const m=await page.evaluate(()=>{
   const box=sel=>document.querySelector(sel)?.getBoundingClientRect();
   const extract=el=>el?Object.fromEntries(["left","right","top","bottom","width","height"].map(k=>[k,el[k]])):null;
   const world=box(".crew-home-world"),content=box(".crew-home-content"),hero=box(".crew-home-portal");
   const heading=box(".crew-home-world .crew-home-shorts-heading h2"),shorts=box(".crew-home-world .crew-home-short-card,.crew-home-world .crew-home-short-placeholder");
   const ring=box(".crew-portal-fallback"),kicker=box(".crew-portal-kicker"),nav=box(".global-nav"),bubble=box(".crew-home-live-bubble");
   const copy=box(".crew-portal-copy"),cta=box(".crew-portal-cta");
   const lightPanel=box(".crew-home-search-summary");
   return {world:extract(world),content:extract(content),hero:extract(hero),heading:extract(heading),shorts:extract(shorts),
    ring:extract(ring),ringVisible:!!ring&&getComputedStyle(document.querySelector(".crew-portal-fallback")).display!=="none",
    kicker:extract(kicker),nav:extract(nav),bubble:extract(bubble),copy:extract(copy),cta:extract(cta),
    lightPanel:extract(lightPanel),overflow:document.documentElement.scrollWidth-innerWidth,
    desktopNavCount:document.querySelectorAll(".global-nav a").length,
    mobileVisible:getComputedStyle(document.querySelector(".crew-mobile-home")).display!=="none",
    worldBorder:getComputedStyle(document.querySelector(".crew-home-world")).borderRadius};
  });
  await page.screenshot({path:join(out,width+"-first-screen.png"),fullPage:false,animations:"disabled"});
  await page.screenshot({path:join(out,width+"-full-page.png"),fullPage:true,animations:"disabled"});
  results.desktop.push({width,height,...m});
  const fail=(why)=>{throw Error(width+" desktop QA "+why+": "+JSON.stringify(m))};
  if(errors.length)fail("JavaScript errors: "+errors.join(";"));
  if(m.overflow>2||!m.world||!m.hero||!m.content||m.mobileVisible)fail("layout/overflow");
  if(m.desktopNavCount!==5)fail("desktop five nav changed");
  if(Math.abs(m.world.left-m.content.left)>2||Math.abs(m.world.right-m.content.right)>2)fail("dark/light boundary mismatch");
  if(!m.hero.height||m.hero.height>575||m.hero.height<460)fail("hero height not compact");
  if(!m.kicker||m.kicker.left<m.world.left+10||m.kicker.right>m.world.right-10
   ||m.kicker.top<m.hero.top+10||m.kicker.bottom>m.hero.bottom-10)fail("kicker clipped");
  if(!m.nav||Math.abs(m.nav.right-m.world.left)>20)fail("rail not docked to content");
  if(!m.bubble||m.bubble.left<m.world.right+2||m.bubble.left>m.world.right+18||m.bubble.right>width-8)fail("voice bubble must sit adjacent to frame without covering Shorts");
  if(m.copy&&m.copy.right>m.kicker.left-10)fail("copy collides with stage/kicker");
  if(!m.heading||width===1440&&m.heading.top>height-25)fail("Moments not visible on first desktop screen");
  if(m.ringVisible&&m.ring&&(m.ring.left<m.world.left-3||m.ring.right>m.world.right+3))fail("halo cut off horizontally");
  await context.close();
 }
 for(const [width,height] of [[390,844],[360,800]]){
  for(const [name,url] of [["master",master.url],["pr",branch.url]]){
   const {page,context,errors}=await newPage(url,width,height);
   await page.locator(".crew-mobile-home").waitFor({state:"visible"});
   await page.screenshot({path:join(out,name+"-"+width+"-mobile.png"),fullPage:false,animations:"disabled"});
   if(errors.length)throw Error(name+" mobile page errors "+errors.join(";"));
   const tabs=await page.locator(".crew-mobile-dock a").count();
   if(tabs!==5)throw Error(name+" mobile dock changed: "+tabs);
   await context.close();
  }
  const diff=comparePNGs(join(out,"master-"+width+"-mobile.png"),join(out,"pr-"+width+"-mobile.png"),join(out,"diff-"+width+"-mobile.png"));
  results.mobile.push({width,height,...diff});
  // Chromium rasterizes a handful of curved edge pixels with 1–2/255
  // channel jitter between otherwise identical builds. Reject ANY visible
  // color change (>4/255) and raw jitter above 0.025% of the viewport.
  if(diff.materialPixels>0||diff.ratio>0.00025)
   throw Error(width+" mobile snapshot visibly differs from master: "+JSON.stringify(diff));
 }
 writeFileSync(join(out,"review-results.json"),JSON.stringify(results,null,2)+"\n");
 console.log("DESKTOP HOME QA PASS "+JSON.stringify({
  widths:results.desktop.map(x=>({width:x.width,heroHeight:x.hero.height,shortsHeadingTop:x.heading.top,frameWidth:x.world.width})),
  mobile:results.mobile}));
}finally{await close()}
