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
 assert.deepEqual(m.icons.map(icon=>icon.src),["/icons/koolo-v1-192.png","/icons/koolo-v1-512.png","/icons/koolo-v1-maskable-512.png"],"change icon URLs so Chrome 144+ re-fetches updated logo");
 assert.ok(m.icons.some(x=>x.sizes==="512x512"&&x.purpose==="maskable"));
 const html=read("web-spa/index.html");
 assert.match(html,/rel="manifest"/);
 assert.match(html,/apple-touch-icon/);
 assert.match(html,/href="\/icons\/koolo-v1-180\.png"/);
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
 const {createCrewPwaIcon,createCrewShortcutIcon}=await import("../scripts/pwa-icons.mjs");
 const official=fs.readFileSync(path.join(ROOT,"web-spa/public/icons/koolo-source.png"));
 assert.deepEqual(createCrewPwaIcon(192),official,"192px PWA icon must be byte-identical to approved Koolo artwork");
 for(const [size,maskable] of [[180,false],[192,false],[512,false],[512,true]]){
  const png=createCrewPwaIcon(size,maskable);
  assert.equal(png.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
  assert.equal(png.readUInt32BE(16),size);
  assert.equal(png.readUInt32BE(20),size);
  assert.ok(png.length>1000);
 }
});
test("Android shortcuts use distinct real PNG icons, not text/emoji placeholders",async()=>{
 const m=JSON.parse(read("web-spa/public/site.webmanifest"));
 const {createCrewShortcutIcon}=await import("../scripts/pwa-icons.mjs");
 assert.deepEqual(m.shortcuts.map(s=>s.url),["/chat","/learn","/games"]);
 const signatures=new Set();
 for(const [index,entry] of m.shortcuts.entries()){
  const kind=["chat","learn","games"][index];
  assert.deepEqual(entry.icons.map(icon=>icon.sizes),["96x96","192x192"]);
  for(const size of [96,192]){
   const icon=entry.icons.find(icon=>icon.sizes===size+"x"+size);
   assert.equal(icon.src,"/icons/shortcut-"+kind+"-"+size+".png");
   assert.equal(icon.type,"image/png");
   const png=createCrewShortcutIcon(kind,size);
   assert.equal(png.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
   assert.equal(png.readUInt32BE(16),size);
   assert.equal(png.readUInt32BE(20),size);
   assert.ok(png.length>300,"shortcut PNG must contain rendered pictogram");
   if(size===96)signatures.add(require("node:crypto").createHash("sha256").update(png).digest("hex"));
  }
 }
 assert.equal(signatures.size,3,"all three shortcuts need distinct artwork");
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
 for(const file of ["site.webmanifest","sw.js","offline.html","favicon.svg","brand/koolo-wordmark-C.svg","icons/koolo-v1-180.png","icons/koolo-v1-192.png","icons/koolo-v1-512.png","icons/koolo-v1-maskable-512.png","icons/shortcut-chat-96.png","icons/shortcut-chat-192.png","icons/shortcut-learn-96.png","icons/shortcut-learn-192.png","icons/shortcut-games-96.png","icons/shortcut-games-192.png"]){
  assert.ok(fs.existsSync(path.join(dist,file)),file);
 }
 for(const shortcut of JSON.parse(read("web-spa/public/site.webmanifest")).shortcuts){
  for(const icon of shortcut.icons){
   const binary=fs.readFileSync(path.join(dist,icon.src.slice(1)));
   assert.equal(binary.readUInt32BE(16),Number.parseInt(icon.sizes,10));
  }
 }
 for(const file of ["index.html","en/index.html","games/index.html","teacher/roles.html","_app-noindex.html"]){
  const html=fs.readFileSync(path.join(dist,file),"utf8");
  assert.match(html,/rel="manifest" href="\/site\.webmanifest"/,file);
  assert.match(html,/rel="apple-touch-icon"/,file);
  assert.match(html,/href="\/icons\/koolo-v1-180\.png"/,file);
 }
 const headers=fs.readFileSync(path.join(dist,"_headers"),"utf8");
 assert.match(headers,/\/sw\.js[\s\S]+?Cache-Control: no-store/);
});
