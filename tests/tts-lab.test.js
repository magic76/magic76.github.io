const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("retired comparison and Kokoro TTS labs are not published",()=>{
 for(const prefix of ["web-spa/public/tts-lab","crew-app/tts-lab"]){
  for(const slug of ["compare","kokoro"]){
   assert.equal(fs.existsSync(path.join(root,prefix,slug)),false,prefix+"/"+slug);
  }
  for(const file of ["index.html","distilled/index.html"]){
   assert.doesNotMatch(read(prefix+"/"+file),/href="\/tts-lab\/(compare|kokoro)\//);
  }
 }
 const deploy=read("scripts/prepare-cloudflare.mjs");
 for(const prefix of ["/tts-lab","/crew-app/tts-lab"]){
  for(const slug of ["compare","kokoro"]){
   assert.ok(deploy.includes('"'+prefix+'/'+slug+' /learn 301"'));
   assert.ok(deploy.includes('"'+prefix+'/'+slug+'/* /learn 301"'));
  }
 }
});
