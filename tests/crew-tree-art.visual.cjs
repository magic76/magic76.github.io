/* Real-browser V5 art acceptance: not a geometry-only unit test.
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
 console.log('V5_PREVIEW_'+label+'='+b64);
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
   await page.waitForFunction(()=>window.CrewTreeV5?.assetStatus()?.allLoaded&&window.__TREE_QA__?.artStatus()?.allLoaded&&window.CrewFantasyGameArt?.assetsReady(),{timeout:20000});
   await page.evaluate(()=>{window.__TREE_QA__.chooseKind('island');window.__TREE_QA__.chooseWorld('cosmos');});
   assert.equal(await page.locator('.tree-art-version').innerText(),'✨ Art V9 · 活的幻想樹');
   assert.equal(await page.locator('#kindSelect').inputValue(),'island');
   assert.equal(await page.locator('#worldSelect').inputValue(),'cosmos');
   const captures=[];
   for(let n=1;n<=16;n++){
    const reply=await page.evaluate(text=>window.__TREE_QA__.post(text),messages[n-1]);
    assert.ok(reply&&reply.count===n,'tree growth turn '+n);
    if([3,8,16].includes(n)){
     await page.waitForTimeout(100);
     await page.locator('#treeCanvas').screenshot({path:path.join(OUT,'GameV1-'+label+'-island-'+n+'-turns.png')});
     captures.push({scene:'island',n,url:await page.locator('#treeCanvas').evaluate(cv=>cv.toDataURL('image/png'))});
     assert.equal(await page.locator('#surpriseMoment').isVisible(),true);
     await page.screenshot({path:path.join(OUT,'GameV1-'+label+'-island-'+n+'-surprise.png')});
     if(label==='mobile'&&(n===3||n===16))await preview(page,String(n));
    }
   }
   // The real game must show BOTH V9 families through chat growth, including
   // the three surprise moments and custom thematic worlds.
   await page.evaluate(()=>{window.__TREE_QA__.newTree();
    window.__TREE_QA__.chooseKind('jelly');window.__TREE_QA__.chooseWorld('music');});
   for(let n=1;n<=16;n++){
    const reply=await page.evaluate(text=>window.__TREE_QA__.post(text),messages[n-1]);
    assert.equal(reply.count,n);
    if([3,8,16].includes(n)){
     await page.locator('#treeCanvas').screenshot({path:path.join(OUT,'GameV1-'+label+'-jelly-'+n+'-turns.png')});
     captures.push({scene:'jelly',n,url:await page.locator('#treeCanvas').evaluate(cv=>cv.toDataURL('image/png'))});
     assert.equal(await page.locator('#surpriseMoment').isVisible(),true);
     await page.screenshot({path:path.join(OUT,'GameV1-'+label+'-jelly-'+n+'-surprise.png')});
    }
   }
   if(label==='mobile'){
    const sheet=await page.evaluate(async captures=>{
     const out=document.createElement('canvas');out.width=900;out.height=700;
     const c=out.getContext('2d');c.fillStyle='#172f41';c.fillRect(0,0,out.width,out.height);
     for(let i=0;i<captures.length;i++){
      const im=new Image();im.src=captures[i].url;await im.decode();
      const col=i%3,row=Math.floor(i/3),x=col*300,y=row*350;
      c.drawImage(im,x+8,y+8,284,310);
      c.fillStyle='#ffedc7';c.font='bold 16px system-ui';c.textAlign='center';
      c.fillText(captures[i].scene+' · '+captures[i].n+' turns',x+150,y+339);
     }
     return out.toDataURL('image/jpeg',.68).split(',')[1];
    },captures);
    console.log('TREE_GAME_V1_3_8_16_CONTACT='+sheet);
   }
   const state=await page.evaluate(()=>({
    art:window.CrewTreeV5.assetStatus(),geometry:window.__TREE_QA__.state().geometry,
    doc:document.documentElement.scrollWidth,width:window.innerWidth
   }));
   assert.equal(state.art.version,5);
   assert.equal(state.art.loaded.length,4);
   assert.ok(state.doc<=state.width+2,'no horizontal overflow');
   assert.equal(state.geometry.modelVersion,5);
   assert.equal(failures.length,0,JSON.stringify(failures));
   await page.screenshot({path:path.join(OUT,label+'-full-page.png'),fullPage:true});
   console.log('TREE_GAME_V1_BROWSER_OK '+label+' both V9 scenes, 3/8/16 surprises, 390px no overflow; V5 branches='+state.geometry.branches.length);
   await ctx.close();
  }
  // Real V5 1.25-second live growth (not a static after-state) at 390px.
  const animCtx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'no-preference'});
  const anim=await animCtx.newPage();await anim.goto(ROOT+'?qa=1',{waitUntil:'networkidle'});
  await anim.waitForFunction(()=>window.CrewFantasyGameArt?.assetsReady());
  await anim.evaluate(()=>{window.__TREE_QA__.chooseKind('island');window.__TREE_QA__.chooseWorld('travel');});
  for(let n=1;n<=2;n++)await anim.evaluate(text=>window.__TREE_QA__.post(text),messages[n-1]);
  await anim.waitForTimeout(1350);
  await anim.locator('#treeCanvas').screenshot({path:path.join(OUT,'GameV1-390-growth-3-before.png')});
  await anim.evaluate(text=>window.__TREE_QA__.post(text),messages[2]);
  assert.equal(await anim.evaluate(()=>window.__TREE_QA__.state().growthMotion.fromTurns),2);
  await anim.locator('#treeCanvas').screenshot({path:path.join(OUT,'GameV1-390-growth-3-start.png')});
  await anim.waitForTimeout(560);
  await anim.locator('#treeCanvas').screenshot({path:path.join(OUT,'GameV1-390-growth-3-half.png')});
  await anim.waitForTimeout(850);
  await anim.locator('#treeCanvas').screenshot({path:path.join(OUT,'GameV1-390-growth-3-end.png')});
  const five=[...Array(5)].map((_,i)=>messages[3+i]);for(const text of five)await anim.evaluate(text=>window.__TREE_QA__.post(text),text);
  assert.equal(await anim.evaluate(()=>window.__TREE_QA__.state().current.growth.length),8);
  await anim.locator('#treeCanvas').screenshot({path:path.join(OUT,'GameV1-390-growth-8-surprise.png')});
  await anim.waitForTimeout(1450);
  await animCtx.close();
  console.log('TREE_GAME_V1_GROWTH_OK 390px real button/chats; 3 start/mid/end and 8 surprise');
  const c=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1,reducedMotion:'reduce'});
  const wall=await c.newPage();await wall.goto(ROOT+'art-review.html?qa=1',{waitUntil:'networkidle'});
  await wall.waitForFunction(()=>window.__TREE_ART_QA__?.status()?.allLoaded,{timeout:20000});
  assert.equal(await wall.locator('#reviewGallery .specimen').count(),24,'4 families x 2 seeds x 3 stages');
  assert.equal(await wall.locator('#matureCompare .specimen').count(),4,'four mature forms in parallel');
  const previewCompare=await wall.evaluate(()=>{
   const canvases=[...document.querySelectorAll('#matureCompare canvas')];
   const out=document.createElement('canvas');out.width=4*240;out.height=325;
   const ctx=out.getContext('2d');ctx.fillStyle='#f0f0dd';ctx.fillRect(0,0,out.width,out.height);
   canvases.forEach((src,i)=>{ctx.drawImage(src,i*240+3,0,234,300);
    ctx.fillStyle='#283b32';ctx.font='bold 16px system-ui';ctx.textAlign='center';
    ctx.fillText(['Round','Tall','Weeping','Twin'][i],i*240+120,318);});
   return out.toDataURL('image/jpeg',.76).split(',')[1];
  });
  console.log('V5_COMPARE='+previewCompare);
  const metrics=await wall.evaluate(()=>Object.fromEntries(window.__TREE_ART_QA__.families.map(f=>[f,window.__TREE_ART_QA__.metrics(f)])));
  assert.equal(metrics.twin.primaryTrunks,2);
  assert.ok(metrics.weeping.downwardBranches>=16);
  assert.ok(metrics.tall.crownWidth<metrics.round.crownWidth*.75);
  await wall.screenshot({path:path.join(OUT,'24-tree-art-review.png'),fullPage:true});
  await wall.getByRole('button',{name:'切換純黑剪影'}).click();
  assert.equal(await wall.locator('#silhouetteBtn').getAttribute('aria-pressed'),'true');
  await wall.locator('#matureCompare').screenshot({path:path.join(OUT,'four-mature-black-silhouettes.png')});
  await wall.getByRole('button',{name:'恢復彩色樹木'}).click();
  const contact=await wall.evaluate(()=>{
   const trees=[...document.querySelectorAll('#reviewGallery .specimen canvas')];
   const cellW=120,cellH=158;
   const out=document.createElement('canvas');out.width=cellW*8;out.height=cellH*3;
   const c=out.getContext('2d');c.fillStyle='#193e33';c.fillRect(0,0,out.width,out.height);
   trees.forEach((tree,i)=>{
    const col=i%8,row=Math.floor(i/8),x=col*cellW,y=row*cellH;
    c.drawImage(tree,x+2,y+2,cellW-4,cellH-24);
    c.font='bold 11px system-ui';c.fillStyle='#f2ffed';c.textAlign='center';
    c.fillText(['Round','Tall','Weep','Twin'][Math.floor(col/2)]+' '+[3,8,16][row]+' 句',x+cellW/2,y+cellH-7);
   });
   return out.toDataURL('image/jpeg',.69).split(',')[1];
  });
  console.log('V5_CONTACT_SHEET='+contact);
  await wall.getByRole('button',{name:'16 句',exact:true}).click();
  assert.equal(await wall.locator('#reviewGallery .specimen').count(),8);
  await wall.screenshot({path:path.join(OUT,'8-mature-tree-art-review.png'),fullPage:true});
  await wall.getByRole('button',{name:'垂枝 Weeping'}).click();
  assert.equal(await wall.locator('#reviewGallery .specimen').count(),2);
  await wall.getByRole('button',{name:'全部階段'}).click();
  assert.equal(await wall.locator('#reviewGallery .specimen').count(),6);
  console.log('V5_WALL_OK 24 specimens; four silhouettes; dual filters verified');
  await c.close();
  // The mobile review wall is a second independent 390px overflow acceptance.
  const mobileWall=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});
  const mobile=await mobileWall.newPage();
  await mobile.goto(ROOT+'art-review.html?qa=1',{waitUntil:'networkidle'});
  await mobile.waitForFunction(()=>window.__TREE_ART_QA__?.status()?.allLoaded);
  assert.equal(await mobile.locator('#reviewGallery .specimen').count(),24);
  assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2));
  await mobile.screenshot({path:path.join(OUT,'v5-review-390px.png'),fullPage:true});
  await mobileWall.close();
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exit(1)});
