/* Real-browser V4 art acceptance: not a geometry-only unit test.
 * Runs with NODE_PATH pointing to playwright package installed in CI.
 * Requires http.server serving web-spa/public on localhost:8787. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const ROOT='http://127.0.0.1:8787/crew-tree-lab/';
const OUT=process.env.ART_OUTPUT||'/tmp/crew-tree-art-shots';
fs.mkdirSync(OUT,{recursive:true});
const messages=['我今天想喝咖啡和蛋糕','我們去宇宙看星星','我覺得好開心','再聊聊陽光和森林',
 '我想要好多櫻花','早安，Zoe','聽音樂讓心情好好','我們去日本旅行',
 '有沒有可以實現的夢想','我喜歡一起做這些小東西','可愛的貓咪來玩','如果有一顆奇怪星球',
 '晚上的月亮很美','我想寫 AI 程式','我們一起種樹','這棵樹好漂亮'];
async function preview(page,label){
 const b64=await page.evaluate(()=>{
  const source=document.getElementById('treeCanvas');
  const target=document.createElement('canvas');target.width=280;target.height=300;
  const ctx=target.getContext('2d');ctx.fillStyle='#e6efdc';ctx.fillRect(0,0,280,300);
  ctx.drawImage(source,0,0,target.width,target.height);
  return target.toDataURL('image/jpeg',.78).split(',')[1];
 });
 console.log('V4_PREVIEW_'+label+'='+b64);
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [label,viewport] of [['mobile',{width:390,height:844}],['desktop',{width:1280,height:800}]]){
   const ctx=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'reduce'});
   const page=await ctx.newPage();
   const failures=[];
   page.on('pageerror',error=>failures.push(error.message));
   page.on('response',r=>{if(r.status()>=400)failures.push('HTTP '+r.status()+' '+r.url())});
   await page.goto(ROOT+'?qa=1',{waitUntil:'networkidle',timeout:40000});
   await page.waitForFunction(()=>window.__TREE_QA__?.artStatus()?.allLoaded,{timeout:20000});
   assert.equal(await page.locator('.tree-art-version').innerText(),'🌿 繪本魔法樹 V4');
   for(let n=1;n<=16;n++){
    const reply=await page.evaluate(text=>window.__TREE_QA__.post(text),messages[n-1]);
    assert.ok(reply&&reply.count===n,'tree growth turn '+n);
    if([3,8,16].includes(n)){
     await page.waitForTimeout(100);
     await page.locator('#treeCanvas').screenshot({path:path.join(OUT,label+'-'+n+'-tree.png')});
     if(label==='mobile'&&(n===3||n===16))await preview(page,String(n));
    }
   }
   const state=await page.evaluate(()=>({
    art:window.__TREE_QA__.artStatus(),geometry:window.__TREE_QA__.state().geometry,
    doc:document.documentElement.scrollWidth,width:window.innerWidth
   }));
   assert.equal(state.art.version,4);
   assert.equal(state.art.loaded.length,7);
   assert.ok(state.doc<=state.width+2,'no horizontal overflow');
   assert.equal(state.geometry.modelVersion,4);
   assert.equal(failures.length,0,JSON.stringify(failures));
   await page.screenshot({path:path.join(OUT,label+'-full-page.png'),fullPage:true});
   console.log('V4_BROWSER_OK '+label+' loaded='+state.art.loaded.length+' branches='+state.geometry.branches.length);
   await ctx.close();
  }
  const c=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1,reducedMotion:'reduce'});
  const wall=await c.newPage();await wall.goto(ROOT+'art-review.html?qa=1',{waitUntil:'networkidle'});
  await wall.waitForFunction(()=>window.__TREE_ART_QA__?.status()?.allLoaded,{timeout:20000});
  assert.equal(await wall.locator('.specimen').count(),24,'8 seeds x 3 stages');
  await wall.screenshot({path:path.join(OUT,'24-tree-art-review.png'),fullPage:true});
  await wall.getByRole('button',{name:'成熟 · 16 句'}).click();
  assert.equal(await wall.locator('.specimen').count(),8);
  await wall.screenshot({path:path.join(OUT,'8-mature-tree-art-review.png'),fullPage:true});
  console.log('V4_WALL_OK 24 specimens; eight mature filtered');
  await c.close();
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exit(1)});
