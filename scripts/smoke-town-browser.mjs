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
 +"const meta=document.createElement('meta');meta.name='crew-town-browser-smoke';meta.content=kind;document.head.appendChild(meta);"
 +"const detail=document.createElement('meta');detail.name='crew-town-browser-errors';detail.content=window.__townErrors.join(' | ').slice(0,300);document.head.appendChild(detail);"
 +"},8500);"
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
 "--disable-gpu-sandbox","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader",
 "--window-size=520,900","--force-device-scale-factor=1",
 "--virtual-time-budget=13500","--dump-dom",
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
 const errorSummary=stdout.match(/<meta name="crew-town-browser-errors" content="([^"]*)"/)?.[1];
 const failure=stdout.match(/class="crew-town-3d-error-detail"[^>]*>([\s\S]*?)<\/code>/)?.[1]||"";
 const report={chrome,exit:code,state,errorSummary,failure,httpErrors:errors};
 writeFileSync(join(artifact,"town-browser.txt"),JSON.stringify(report,null,2)+"\n"+stderr);
 console.log(JSON.stringify(report,null,2));
 if(code!==0||state!=="canvas"||errors.length)throw Error("Town 3D failed the browser-render smoke. See artifact town-browser.");
}finally{server.close()}
