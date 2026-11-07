const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const ROOT=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(ROOT,p),"utf8");

test("PWA manifest is scoped to Crew on the canonical domain with installable icons",()=>{
 const m=JSON.parse(read("web-spa/public/site.webmanifest"));
 assert.equal(m.id,"/");
 assert.equal(m.scope,"/");
 assert.equal(m.start_url,"/");
 assert.equal(m.display,"standalone");
 assert.ok(m.icons.some(x=>x.sizes==="192x192"&&x.type==="image/png"));
 assert.ok(m.icons.some(x=>x.sizes==="512x512"&&x.purpose==="maskable"));
 const html=read("web-spa/index.html");
 assert.match(html,/rel="manifest"/);
 assert.match(html,/apple-touch-icon/);
});
test("PWA service worker is network first for navigation and never caches dynamic requests",()=>{
 const script=read("web-spa/public/sw.js");
 assert.doesNotThrow(()=>new vm.Script(script));
 const handlers={};
 const self={location:{origin:"https://www.3sssi.com"},addEventListener:(type,fn)=>handlers[type]=fn};
 vm.runInNewContext(script,{self,URL,
  caches:{open:async()=>({match:async()=>({ok:true})}),match:async()=>({ok:true})},
  fetch:()=>Promise.resolve({ok:true,type:"basic"})
 });
 function intercept(url,mode="cors"){
  let handled=false;
  const event={request:{method:"GET",url,mode},respondWith(){handled=true;}};
  handlers.fetch(event);
  return handled;
 }
 for(const p of ["/api/guest/trial","/api/auth/me","/api/video/tts","/api/usage/event","/auth/callback","/usage","/version.json?check=123","/sw.js"]){
  assert.equal(intercept("https://www.3sssi.com"+p),false,p);
 }
 assert.equal(intercept("https://www.3sssi.com/assets/build/index-123abc.js"),true);
 assert.equal(intercept("https://www.3sssi.com/assets/build/index-123abc.css"),true);
 assert.equal(intercept("https://www.3sssi.com/assets/friends/crew_friend_ada.webp"),false);
 assert.equal(intercept("https://www.3sssi.com/assets/build/index-123abc.js?token=abc"),false);
 assert.equal(intercept("https://www.3sssi.com/games/1a2b","navigate"),true);
 assert.equal(intercept("https://example.net/anything","navigate"),false);
});
test("PWA icon renderer emits a valid PNG for required device sizes",async()=>{
 const {createCrewPwaIcon}=await import("../scripts/pwa-icons.mjs");
 for(const [size,maskable] of [[180,false],[192,false],[512,false],[512,true]]){
  const png=createCrewPwaIcon(size,maskable);
  assert.equal(png.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
  assert.equal(png.readUInt32BE(16),size);
  assert.equal(png.readUInt32BE(20),size);
  assert.ok(png.length>1000);
 }
});
test("PWA is opt-in, excluded from Android WebView and keeps existing build update UX",()=>{
 const runtime=read("web-spa/src/runtime/pwa.ts");
 assert.match(runtime,/isCrewAndroidShell/);
 assert.match(runtime,/location\.pathname\.startsWith\("\/crew-app\/"\)/);
 assert.match(runtime,/serviceWorker\.register\("\/sw\.js"/);
 const entry=read("web-spa/src/components/CrewInstallEntry.tsx");
 assert.match(entry,/requestCrewInstall/);
 assert.match(entry,/isCrewIosSafari/);
 assert.match(read("web-spa/src/components/AppChrome.tsx"),/<CrewInstallEntry\/>/);
 assert.match(read("web-spa/src/components/CrewUpdateNotice.tsx"),/hasNewBuild\(latest\)/);
});
test("Cloudflare build publishes PWA assets and metadata on SSG and private pages",()=>{
 if(process.env.CREW_CLOUDFLARE_TEST!=="1")return;
 const dist=path.join(ROOT,"dist");
 for(const file of ["site.webmanifest","sw.js","offline.html","icons/crew-180.png","icons/crew-192.png","icons/crew-512.png","icons/crew-maskable-512.png"]){
  assert.ok(fs.existsSync(path.join(dist,file)),file);
 }
 for(const file of ["index.html","en/index.html","games/index.html","teacher/roles.html","_app-noindex.html"]){
  const html=fs.readFileSync(path.join(dist,file),"utf8");
  assert.match(html,/rel="manifest" href="\/site\.webmanifest"/,file);
  assert.match(html,/rel="apple-touch-icon"/,file);
 }
 const headers=fs.readFileSync(path.join(dist,"_headers"),"utf8");
 assert.match(headers,/\/sw\.js[\s\S]+?Cache-Control: no-store/);
});
