const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("Fortune tarot and Vedic cards use reviewed, unique, local WebP covers",()=>{
 const home=read("web-spa/src/fortune/HomePage.tsx");
 assert.equal((home.match(/className="fortune-home-mode /g)||[]).length,3);
 assert.equal((home.match(/className="fortune-mode-cover /g)||[]).length,3);
 for(const mode of ["tarot","vedic"]){
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
 assert.ok(home.includes('fortune-mode-cover-bazi'),"BaZi keeps an honest generic symbol, not a misleading day-master portrait");
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
 assert.ok(!home.includes('fortune-tarot-cover.png'));
 assert.ok(!home.includes('fortune-vedic-cover.png'));
});
