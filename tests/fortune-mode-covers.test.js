const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("Fortune Bazi, tarot and Vedic cards use reviewed local WebP covers",()=>{
 const home=read("web-spa/src/fortune/HomePage.tsx");
 assert.equal((home.match(/className="fortune-home-mode /g)||[]).length,3);
 assert.equal((home.match(/className="fortune-mode-cover /g)||[]).length,3);
 for(const mode of ["bazi","tarot","vedic"]){
  const name="fortune-"+mode+"-cover.webp";
  const asset=path.join(root,"web-spa/public/fortune/modes",name);
  assert.ok(fs.existsSync(asset),name+" must ship in Vite public assets");
  const data=fs.readFileSync(asset);
  assert.ok(data.length>10000&&data.length<600000,"WebP should be nontrivial but optimized: "+name);
  assert.equal(data.toString("ascii",0,4),"RIFF");
  assert.equal(data.toString("ascii",8,12),"WEBP");
  assert.equal(data.toString("ascii",12,16),"VP8 ");
  assert.equal(data.readUInt16LE(26)&0x3fff,1536,"Cover width");
  assert.equal(data.readUInt16LE(28)&0x3fff,864,"Cover height");
  assert.ok(home.includes('to="/fortune/reading?mode='+mode+'"'));
  assert.ok(home.includes('src="/fortune/modes/'+name+'"'));
 }
 assert.ok(home.includes('to="/fortune/reading?mode=bazi"'));
 assert.ok(home.includes('fortune-mode-cover-bazi'),"BaZi cover is the system-wide visual, not a specific day-master portrait");
 assert.ok(home.includes('onError={event=>{event.currentTarget.hidden=true}}'),"Load errors preserve the pictogram fallback");
});

test("mode cards stay readable at phone width and preserve meaningful accessible link names",()=>{
 const home=read("web-spa/src/fortune/HomePage.tsx");
 const css=read("web-spa/src/fortune/unifiedHome.css");
 for(const mode of ["bazi","tarot","vedic"]){
  assert.ok(home.includes('t("home.'+mode+'")'));
  assert.ok(home.includes('t("home.'+mode+'Desc")'));
 }
 assert.match(home,/className="fortune-mode-cover-image"[^>]*alt=""/);
 assert.match(home,/aria-hidden="true"/);
 assert.match(css,/aspect-ratio:16\/9/);
 assert.match(css,/@media\(max-width:800px\)/);
 assert.match(css,/\.fortune-journey-create \.fortune-home-mode\{flex-direction:row;align-items:center/);
 assert.match(css,/\.fortune-home-mode \.fortune-mode-description\{[^}]*font-size:12px/);
 assert.match(css,/\.fortune-mode-cover-image\[hidden\]\{display:none\}/);
 assert.ok(!home.includes('fortune-bazi-cover.png'));
 assert.ok(!home.includes('fortune-tarot-cover.png'));
 assert.ok(!home.includes('fortune-vedic-cover.png'));
});

test("all mode covers have a small intrinsic fallback and a height cap before route CSS",()=>{
 const home=read("web-spa/src/fortune/HomePage.tsx");
 const css=read("web-spa/src/fortune/unifiedHome.css");
 const covers=home.match(/<img className="fortune-mode-cover-image"[^>]+/g)||[];
 assert.equal(covers.length,3);
 for(const cover of covers){
  assert.match(cover,/width=\{128\} height=\{72\} style=\{MODE_COVER_GUARD\}/);
 }
 assert.match(home,/maxWidth:"100%",maxHeight:"var\(--fortune-mode-cover-max-height, 80px\)",objectFit:"cover"/);
 assert.match(css,/--fortune-mode-cover-max-height:220px;\s*max-height:var\(--fortune-mode-cover-max-height\)/);
 assert.match(css,/@media\(max-width:800px\)\{[^]*?width:clamp\(108px,34vw,154px\);--fortune-mode-cover-max-height:160px/);
 assert.match(css,/@media\(max-width:600px\)\{[^]*?width:clamp\(96px,30vw,126px\);--fortune-mode-cover-max-height:80px/);
});
