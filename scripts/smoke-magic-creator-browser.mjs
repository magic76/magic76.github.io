import {createServer} from "node:http";
import {spawn,spawnSync} from "node:child_process";
import {readFileSync,writeFileSync,mkdirSync,existsSync} from "node:fs";
import {resolve,extname,join} from "node:path";
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
setTimeout(()=>{const button=document.querySelector('[data-magic-demo="creator"]');if(button)button.click()},2100);
setTimeout(()=>{
 const meta=document.createElement('meta');
 meta.name='crew-magic-browser-smoke';
 const list=document.querySelectorAll('.magic-created-list button');
 const canvas=document.querySelector('.magic-three-canvas');
 const error=document.querySelector('.magic-3d-unavailable');
 meta.content=JSON.stringify({objects:list.length,canvas:!!canvas,
  unavailable:!!error,errors:window.__magicErrors.slice(0,4)});
 document.head.appendChild(meta);
},6700);
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
const reports=[];
try{
 for(const [label,width,height] of [["mobile",390,850],["desktop",1280,850]]){
  const out=join(output,"magic-creator-"+label+".png");
  const args=["--headless=new","--no-sandbox","--disable-dev-shm-usage",
   "--enable-webgl","--ignore-gpu-blocklist","--enable-unsafe-swiftshader",
   "--use-gl=angle","--use-angle=swiftshader-webgl",
   "--window-size="+width+","+height,"--force-device-scale-factor=1",
   "--virtual-time-budget=10500","--dump-dom","--screenshot="+out,
   "http://127.0.0.1:"+server.address().port+"/magic"];
  let stdout="",stderr="";
  const exit=await new Promise((done,reject)=>{
   const child=spawn(chrome,args,{stdio:["ignore","pipe","pipe"]});
   child.stdout.on("data",c=>{stdout+=String(c)});
   child.stderr.on("data",c=>{stderr=(stderr+String(c)).slice(-2000)});
   child.on("error",reject);child.on("close",done);
   const timer=setTimeout(()=>child.kill("SIGKILL"),60000);
   child.on("close",()=>clearTimeout(timer));
  });
  const matched=stdout.match(/<meta name="crew-magic-browser-smoke" content="([^"]*)"/)?.[1];
  const state=matched?JSON.parse(matched.replaceAll("&quot;",'"')):null;
  const report={label,exit,state,screenshot:existsSync(out)?out:null,stderr:stderr.slice(-350)};
  reports.push(report);
  if(exit!==0||errors.length)throw Error("Browser/asset loading failed: "+JSON.stringify(report));
  if(state?.unavailable){
   console.log("SKIP: CI WebGL unavailable. Screenshot only shows unsupported-browser state, not visual QA.");
  }else if(!state?.canvas||state.objects<1||state.errors?.length){
   throw Error("Magic creator browser regression: "+JSON.stringify(report));
  }
 }
}finally{
 writeFileSync(join(output,"magic-creator-browser.txt"),JSON.stringify({chrome,reports,errors},null,2));
 server.close();
}
console.log(JSON.stringify({chrome,reports,errors},null,2));
