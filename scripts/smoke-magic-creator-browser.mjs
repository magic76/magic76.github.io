import {createServer} from "node:http";
import {spawn,spawnSync} from "node:child_process";
import {readFileSync,writeFileSync,mkdirSync,existsSync,mkdtempSync,rmSync} from "node:fs";
import {resolve,extname,join} from "node:path";
import {tmpdir} from "node:os";
const root=resolve("dist"),output=resolve("artifacts");
if(!existsSync(join(root,"index.html")))throw Error("Build Cloudflare dist before browser smoke.");
const bins=["google-chrome","google-chrome-stable","chromium","chromium-browser"];
const chrome=bins.find(c=>spawnSync("which",[c],{encoding:"utf8"}).status===0);
mkdirSync(output,{recursive:true});
if(!chrome){
 const reason="Chrome/Chromium unavailable on CI worker: real screenshot NOT produced.";
 writeFileSync(join(output,"magic-creator-browser.txt"),reason+"\n");
 console.log("SKIP: "+reason);
 process.exit(0);
}
const mime={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",
 ".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".woff2":"font/woff2"};
const errors=[];
const injected=`<script>
window.__magicErrors=[];
window.addEventListener('error',e=>window.__magicErrors.push(String(e.message)));
window.addEventListener('unhandledrejection',e=>window.__magicErrors.push(String(e.reason)));
const scenario=new URL(location.href).searchParams;
const count=Math.max(1,Math.min(3,Number(scenario.get('creations')||1)));
for(let i=0;i<count;i++)setTimeout(()=>{
 const type=scenario.get('sculpt');
 const ids=['sculptrobot','sculptfox','sculptdragon'];
 const chosen=type==='yes'?ids[i%3]:type==='fox'?'sculptfox':
  type==='dragon'?'sculptdragon':type==='robot'?'sculptrobot':'creator';
 const button=document.querySelector('[data-magic-demo="'+chosen+'"]');
 if(button)button.click();
},2100+i*580);
if(scenario.get('evolve')==='yes')setTimeout(()=>{
 document.querySelector('[data-magic-demo="evolve"]')?.click();
},2200+count*580);
setTimeout(()=>{
 const meta=document.createElement('meta');
 meta.name='crew-magic-browser-smoke';
 const list=document.querySelectorAll('.magic-created-list button');
 const canvas=document.querySelector('.magic-three-canvas');
 const error=document.querySelector('.magic-3d-unavailable');
 meta.content=JSON.stringify({objects:list.length,canvas:!!canvas,
  unavailable:!!error,errors:window.__magicErrors.slice(0,4)});
 document.head.appendChild(meta);
},scenario.get('early')==='yes'?3400:6700);
</script>`;
const server=createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
  const target=resolve(root,"."+pathname);
  if(!target.startsWith(root+"/")&&target!==root){res.writeHead(403);res.end();return}
  const file=existsSync(target)&&pathname!=="/magic"?target:join(root,"index.html");
  let body=readFileSync(file),type=mime[extname(file)]||"application/octet-stream";
  if(file.endsWith("index.html")){type="text/html";body=Buffer.from(body.toString("utf8").replace("</head>",injected+"</head>"))}
  res.writeHead(200,{"Content-Type":type,"Cache-Control":"no-store"});res.end(body);
 }catch(e){errors.push(String(e));res.writeHead(500);res.end("error")}
});
await new Promise(done=>server.listen(0,"127.0.0.1",done));
// Chrome can occasionally hang while writing its WebGL screenshot. Only a
// watchdog-killed launch is retried; a browser error or bad scene never is.
function runChrome(args){
 return new Promise((resolveRun,reject)=>{
  let stdout="",stderr="",watchdogKilled=false;
  const started=Date.now();
  // POSIX process group: Chrome's GPU/renderer children must die with it.
  const child=spawn(chrome,args,{stdio:["ignore","pipe","pipe"],detached:true});
  child.stdout.on("data",chunk=>{stdout+=String(chunk)});
  child.stderr.on("data",chunk=>{stderr=(stderr+String(chunk)).slice(-2000)});
  const timer=setTimeout(()=>{
   watchdogKilled=true;
   try{process.kill(-child.pid,"SIGKILL")}
   catch(error){
    // A process group may already have exited between the timer and kill.
    if(error.code!=="ESRCH")console.warn("Chrome group kill:",String(error));
    if(child.pid)child.kill("SIGKILL");
   }
  },60000);
  child.once("error",error=>{clearTimeout(timer);reject(error)});
  child.once("close",(exit,signal)=>{
   clearTimeout(timer);
   resolveRun({exit,signal,watchdogKilled,stdout,stderr,ms:Date.now()-started});
  });
 });
}
const reports=[];
try{
 for(const [label,width,height,count,evolve,early,sculpt] of [
  ["mobile-guardian",390,850,1,false],["mobile-jelly",390,850,2,false],
  ["desktop-ensemble",1280,850,3,false],["mobile-evolved",390,850,1,true],
  ["mobile-assembly-in-progress",390,850,1,false,true],
  ["desktop-procedural-trio",1280,850,3,false,false,"yes"],
  ["mobile-sculpted-fox",390,850,1,false,false,"fox"],
  ["mobile-sculpted-robot",390,850,1,false,false,"robot"],
  ["mobile-sculpted-dragon",390,850,1,false,false,"dragon"]
 ]){
  const out=join(output,"magic-creator-"+label+".png");
  const args=["--headless=new","--no-sandbox","--disable-dev-shm-usage",
   "--disable-background-networking","--disable-component-update","--disable-default-apps",
   "--disable-sync","--disable-features=OptimizationGuideModelDownloading,OptimizationHints,MediaRouter","--metrics-recording-only","--no-first-run","--no-default-browser-check",
   "--enable-webgl","--ignore-gpu-blocklist","--enable-unsafe-swiftshader",
   "--use-gl=angle","--use-angle=swiftshader-webgl",
   "--window-size="+width+","+height,"--force-device-scale-factor=1",
   "--virtual-time-budget="+(early?4800:10500),"--dump-dom","--screenshot="+out,
   "http://127.0.0.1:"+server.address().port+"/magic?creations="+count+(evolve?"&evolve=yes":"")+(early?"&early=yes":"")+(sculpt?"&sculpt="+sculpt:"")];
  const attemptResults=[];
  let result;
  for(let attempt=1;attempt<=2;attempt++){
   // A fresh profile for *each* attempt prevents Chromium locks from a hung
   // launch from affecting a retry or any following scenario.
   const profile=mkdtempSync(join(tmpdir(),"crew-magic-smoke-"));
   rmSync(out,{force:true}); // A timed-out attempt must not leave a stale screenshot.
   try{
    result=await runChrome([...args.slice(0,-1),"--user-data-dir="+profile,args.at(-1)]);
   }finally{
    rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100});
   }
   attemptResults.push({attempt,ms:result.ms,exit:result.exit,
    watchdogKilled:result.watchdogKilled,stderr:result.stderr.slice(-350)});
   if(!result.watchdogKilled)break;
   if(attempt<2)console.warn("RETRY "+label+" after Chromium watchdog kill ("+result.ms+" ms)");
  }
  const {exit,stdout,stderr}=result;
  const matched=stdout.match(/<meta name="crew-magic-browser-smoke" content="([^"]*)"/)?.[1];
  const state=matched?JSON.parse(matched.replaceAll("&quot;",'"')):null;
  const ms=attemptResults.reduce((total,item)=>total+item.ms,0);
  const report={label,exit,state,screenshot:existsSync(out)?out:null,
   attempts:attemptResults.length,ms,attemptMs:attemptResults.map(item=>item.ms),
   attemptResults,stderr:stderr.slice(-350)};
  reports.push(report);
  console.log("CASE "+label+" ms="+ms+" attempts="+report.attempts+
   " attemptMs="+report.attemptMs.join(",")+" exit="+exit);

  if(exit!==0||errors.length)throw Error("Browser/asset loading failed: "+JSON.stringify(report));
  if(state?.unavailable){
   console.log("SKIP: CI WebGL unavailable. Screenshot only shows unsupported-browser state, not visual QA.");
  }else if(!state?.canvas||state.objects!==count||state.errors?.length){
   throw Error("Magic creator browser regression: "+JSON.stringify(report));
  }
 }
}finally{
 writeFileSync(join(output,"magic-creator-browser.txt"),JSON.stringify({chrome,reports,errors},null,2));
 server.close();
}
console.log(JSON.stringify({chrome,reports,errors},null,2));
