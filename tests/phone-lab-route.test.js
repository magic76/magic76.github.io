const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

test("phone lab stays isolated from the production home navigation",()=>{
 const app=read("web-spa/src/App.tsx");
 const page=read("web-spa/src/pages/PhoneLabPage.tsx");
 const styles=read("web-spa/src/pages/PhoneLabPage.css");
 assert.match(app,/path="\/phone" element=\{<PhoneLabPage\/>\}/);
 assert.match(app,/pathname!=="\/phone"/);
 assert.match(app,/<GlobalNav active=\{active\}\/>/);
 assert.match(page,/const ZOE_TEXT="\/friend\/live\?id=zoe&from=phone&chat=text"/);
 for(const route of ["/learn","/games","/story","/fortune","/teacher/shorts","/settings"]){
  assert.ok(page.includes(route),"missing live feature link "+route);
 }
 assert.match(page,/meta.content="noindex,nofollow"/);
 assert.match(styles,/\.crew-phone-lab\{/);
 assert.match(styles,/@media\(max-width:770px\)/);
});

test("Cloudflare produces an exact noindex HTML shell for the /phone experiment",()=>{
 const deploy=read("scripts/prepare-cloudflare.mjs");
 assert.match(deploy,/const privatePaths=\[\s*"\/phone"/);
 if(process.env.CREW_CLOUDFLARE_TEST==="1"){
  const shell=read("dist/phone.html");
  assert.match(shell,/<meta name="robots" content="noindex,follow">/);
  assert.match(shell,/\/assets\//);
 }
});
