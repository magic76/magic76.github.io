import {createServer} from "node:http";
import {spawn,spawnSync} from "node:child_process";
import {readFileSync,writeFileSync,mkdirSync,existsSync} from "node:fs";
import {resolve,extname,join} from "node:path";

const root=resolve("dist"),artifact=resolve("artifacts");
if(!existsSync(join(root,"index.html")))throw Error("Build the Cloudflare deployment first.");
const binaries=["google-chrome","google-chrome-stable","chromium","chromium-browser"];
const chrome=binaries.find(c=>spawnSync("which",[c],{encoding:"utf8"}).status===0);
if(!chrome)throw Error("Chrome/Chromium not installed on CI worker");
mkdirSync(artifact,{recursive:true});
const mime={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".glb":"model/gltf-binary",".svg":"image/svg+xml",".woff2":"font/woff2",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg"};
const errors=[];
const monitor="<script>"
 +"window.__townErrors=[];"
 +"window.addEventListener('error',e=>window.__townErrors.push(String(e.message||'error')));"
 +"window.addEventListener('unhandledrejection',e=>window.__townErrors.push(String(e.reason)));"
 +"const original=console.error;console.error=function(...args){window.__townErrors.push(args.map(String).join(' ').slice(0,300));original.apply(console,args)};"
 +"setTimeout(()=>{"
 +"const fallback=document.querySelector('.crew-town-3d-fallback-notice');"
 +"const canvas=document.querySelector('.crew-town-3d-canvas canvas, canvas.crew-town-3d-canvas');"
 +"const simplified=document.querySelector('.crew-town-3d-model-note');"
 +"const kind=fallback?'fallback':simplified?'simplified':canvas?'canvas':'no-canvas';"
 +"const p=document.createElement('canvas');let supported=false;try{supported=!!p.getContext('webgl2')}catch(e){};"
 +"const webgl=document.createElement('meta');webgl.name='crew-town-webgl2-available';webgl.content=String(supported);document.head.appendChild(webgl);"
 +"const meta=document.createElement('meta');meta.name='crew-town-browser-smoke';meta.content=kind;document.head.appendChild(meta);"
 +"const detail=document.createElement('meta');detail.name='crew-town-browser-errors';detail.content=window.__townErrors.join(' | ').slice(0,300);document.head.appendChild(detail);"
 +"const friendMenu=document.querySelector('.crew-town-3d-friends-toggle');"
 +"const friends=document.createElement('meta');friends.name='crew-town-friend-count';friends.content=friendMenu&&friendMenu.textContent.includes('16')?'16':'0';document.head.appendChild(friends);"
 +"const labels=document.createElement('meta');labels.name='crew-town-friend-labels';labels.content=String(document.querySelectorAll('.crew-town-3d-name').length);document.head.appendChild(labels);"
 +"const residentMount=document.createElement('meta');residentMount.name='crew-town-mounted-residents';residentMount.content=document.querySelector('canvas[data-town-residents]')?.getAttribute('data-town-residents')||'0';document.head.appendChild(residentMount);"
 +"const renderer=document.createElement('meta');renderer.name='crew-town-renderer-ready';renderer.content=document.querySelector('canvas[data-town-renderer]')?.getAttribute('data-town-renderer')||'no';document.head.appendChild(renderer);"
 +"const motion=document.createElement('meta');motion.name='crew-town-reduced-motion';motion.content=String(matchMedia('(prefers-reduced-motion: reduce)').matches);document.head.appendChild(motion);"
 +"},9000);"
 +"</script>";
const server=createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
  const target=resolve(root,"."+pathname);
  if(!target.startsWith(root+"/")&&target!==root){res.writeHead(403);res.end();return}
  const file=existsSync(target)&&pathname!=="/town"&&pathname!=="/town/"?target:join(root,"index.html");
  let body=readFileSync(file),type=mime[extname(file)]||"application/octet-stream";
  if(file.endsWith("index.html")){
   type="text/html";
   body=Buffer.from(body.toString("utf8").replace("</head>",monitor+"</head>"));
  }
  res.writeHead(200,{"Content-Type":type,"Cache-Control":"no-store"});res.end(body);
 }catch(error){errors.push(String(error));res.writeHead(500);res.end("Server error")}
});
await new Promise(done=>server.listen(0,"127.0.0.1",done));
const args=["--headless=new","--no-sandbox","--disable-dev-shm-usage",
 "--disable-gpu-sandbox","--enable-webgl","--ignore-gpu-blocklist","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader-webgl",
 "--window-size=520,900","--force-device-scale-factor=1",
 "--virtual-time-budget=12000","--dump-dom",
 "--screenshot="+join(artifact,"town-browser.png"),
 "http://127.0.0.1:"+server.address().port+"/town"
];
let stdout="",stderr="";
try{
 const code=await new Promise((done,reject)=>{
  const proc=spawn(chrome,args,{stdio:["ignore","pipe","pipe"]});
  proc.stdout.on("data",data=>{stdout+=String(data)});
  proc.stderr.on("data",data=>{stderr=(stderr+String(data)).slice(-7000)});
  proc.on("error",reject);proc.on("close",done);
  const watchdog=setTimeout(()=>proc.kill("SIGKILL"),60000);
  proc.on("close",()=>clearTimeout(watchdog));
 });
 writeFileSync(join(artifact,"town-browser.html"),stdout);
 const state=stdout.match(/<meta name="crew-town-browser-smoke" content="([^"]+)"/)?.[1];
 const webgl2=stdout.match(/<meta name="crew-town-webgl2-available" content="([^"]+)"/)?.[1];
 const errorSummary=stdout.match(/<meta name="crew-town-browser-errors" content="([^"]*)"/)?.[1];
 const friendCount=stdout.match(/<meta name="crew-town-friend-count" content="([^"]*)"/)?.[1];
 const friendLabels=stdout.match(/<meta name="crew-town-friend-labels" content="([^"]*)"/)?.[1];
 const mountedResidents=stdout.match(/<meta name="crew-town-mounted-residents" content="([^"]*)"/)?.[1];
 const rendererReady=stdout.match(/<meta name="crew-town-renderer-ready" content="([^"]*)"/)?.[1];
 const reducedMotion=stdout.match(/<meta name="crew-town-reduced-motion" content="([^"]*)"/)?.[1];
 const failure=stdout.match(/class="crew-town-3d-error-detail"[^>]*>([\s\S]*?)<\/code>/)?.[1]||"";
 const report={chrome,exit:code,state,webgl2,friendCount,friendLabels,mountedResidents,rendererReady,reducedMotion,errorSummary,failure,httpErrors:errors};
 writeFileSync(join(artifact,"town-browser.txt"),JSON.stringify(report,null,2)+"\n"+stderr);
 console.log(JSON.stringify(report,null,2));
 if(code!==0||errors.length)throw Error("Town 3D browser launch or asset serving failed.");
 if(webgl2==="false"&&state==="fallback"){
  if(!failure.includes("webgl-renderer-unavailable"))throw Error("GPU-less browser did not explain 3D fallback.");
  console.log("SKIP: CI Chrome cannot allocate WebGL2; manual GPU-backed QA still required.");
  }else if(state!=="canvas")throw Error("WebGL2 is available but Town 3D did not render a canvas.");
 else if(friendCount!=="16")throw Error("Town 3D must register all sixteen selectable friends; observed "+friendCount);
 else if(mountedResidents!=="16")throw Error("Town 3D must mount all sixteen resident actors; observed "+mountedResidents);
}finally{server.close()}
