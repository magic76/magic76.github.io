const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const trialPath=path.join(__dirname,"../web-spa/src/lib/guestTrial.ts");
const textPath=path.join(__dirname,"../web-spa/src/live/TextChatPanel.tsx");
const trialSource=fs.readFileSync(trialPath,"utf8");
const textSource=fs.readFileSync(textPath,"utf8");
const js=stripTypeScriptTypes(trialSource.replace(/^import .*;\s*$/gm,""),{mode:"strip"}).replace(/^export /gm,"");
const endpoint=window=>new Function("window","isCrewAndroidShell",js+"\nreturn GUEST_TOKEN_ENDPOINT;")(window,()=>false);
const OLD="https://crew-guest-trial.shanliyoung.workers.dev/api/guest/token";
const NEW="https://p.koolo.app/api/guest/token";

test("Both exact Koolo website origins use the custom Worker",()=>{
 for(const origin of ["https://koolo.app","https://www.koolo.app"])
  assert.equal(endpoint({location:{origin}}),NEW);
 for(const origin of [
  "https://www.3sssi.com","https://3sssi.com",
  "https://koolo.app.evil.test","http://koolo.app","https://preview.pages.dev",
  "https://p.koolo.app"
 ])assert.equal(endpoint({location:{origin}}),OLD,"should preserve legacy Worker for "+origin);
 assert.equal(endpoint({}),OLD,"missing location is safe");
 assert.equal(endpoint(undefined),OLD,"SSR must not access window");
});

test("Guest text and Live trial use the same host-specific endpoint",()=>{
 assert.ok(textSource.includes('import {GUEST_TOKEN_ENDPOINT} from "../lib/guestTrial";'));
 assert.ok(textSource.includes("const GUEST_TEXT_ENDPOINT=GUEST_TOKEN_ENDPOINT.replace("));
 assert.ok(!textSource.includes("https://crew-guest-trial.shanliyoung.workers.dev"));
 for(const origin of ["https://koolo.app","https://www.koolo.app","https://www.3sssi.com"]){
  const token=endpoint({location:{origin}});
  const text=token.replace(/\/token$/,"/text");
  assert.equal(new URL(token).origin,new URL(text).origin);
  assert.equal(new URL(text).pathname,"/api/guest/text");
 }
});

test("www.koolo.app redirects to the canonical site before SPA hydration",()=>{
 const source=fs.readFileSync(path.join(__dirname,"../web-spa/src/main.tsx"),"utf8");
 const match=source.match(/const kooloCanonicalDestination=([\s\S]*?);/);
 assert.ok(match,"Main entry must canonicalize the www alias");
 const canonical=new Function("window","return "+match[1]+";");
 const url=path=>new URL(path,"https://www.koolo.app");
 for(const path of ["/","/friend/live?chat=text#thread","/en/games/1a2b/?from=shorts"]){
  const parsed=url(path);
  assert.equal(canonical({location:parsed}),"https://koolo.app"+parsed.pathname+parsed.search+parsed.hash);
 }
 assert.equal(canonical({location:new URL("https://koolo.app/friend/live")}),null);
 assert.equal(canonical({location:new URL("https://www.3sssi.com/friend/live")}),null);
 assert.match(source,/const destination=kooloCanonicalDestination\|\|\(!legacy\?preferredPublicLocaleDestination\(/);
});
