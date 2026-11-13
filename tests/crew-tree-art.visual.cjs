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
   await page.goto(ROOT+'?qa=1&legacy=1',{waitUntil:'networkidle',timeout:40000});
   await page.waitForFunction(()=>window.CrewTreeV5?.assetStatus()?.allLoaded&&window.__TREE_QA__?.artStatus()?.allLoaded&&window.CrewFantasyGameArt?.assetsReady(),{timeout:20000});
   await page.evaluate(()=>{window.__TREE_QA__.chooseKind('island');window.__TREE_QA__.chooseWorld('cosmos');});
   assert.equal(await page.locator('.tree-art-version').innerText(),'✨ Art V9 · 活的幻想樹');
   assert.equal(await page.locator('#kindSelect').inputValue(),'island');
   assert.equal(await page.locator('#worldSelect').inputValue(),'cosmos');
   if(label==='mobile'){
    const fit=await page.locator('#treeCanvas').evaluate(canvas=>{
     const b=canvas.getBoundingClientRect(),w=b.width,h=b.height,scale=Math.min(w/800,h/820);
     return {w,h,letterboxTop:(h-820*scale)/2};
    });
    assert.ok(fit.letterboxTop<3,'V9 phone must not retain the pale top/bottom bars '+JSON.stringify(fit));
    console.log('TREE_GAME_V1_MOBILE_CANVAS_FIT='+JSON.stringify(fit));
   }
   const captures=[];
   for(let n=1;n<=16;n++){
    const reply=await page.evaluate(text=>window.__TREE_QA__.post(text),messages[n-1]);
    assert.ok(reply&&reply.count===n,'tree growth turn '+n);
    if([3,8,16].includes(n)){
     await page.waitForTimeout(100);
     await page.locator('#treeCanvas').screenshot({path:path.join(OUT,'GameV1-'+label+'-island-'+n+'-turns.png')});
     captures.push({scene:'island',n,url:await page.locator('#treeCanvas').evaluate(cv=>cv.toDataURL('image/png'))});
     assert.equal(await page.locator('#surpriseMoment').isVisible(),true);
     assert.equal(await page.evaluate(n=>window.__TREE_QA__.stageForTurns(n),n),n===16?16:n===8?8:3);
     const islandCopy=await page.locator('#surpriseMoment').innerText();
     assert.ok(n===3?islandCopy.includes('第一位小居民'):n===8?islandCopy.includes('新浮島'):islandCopy.includes('群島完整'));
     assert.doesNotMatch(islandCopy,/水母|珊瑚|觸鬚/);
     const strip=await page.evaluate(()=>{
      const art=document.getElementById('treeCanvas').getBoundingClientRect();
      const card=document.getElementById('surpriseMoment').getBoundingClientRect();
      return{bottom:art.bottom,top:card.top,height:card.height};
     });
     assert.ok(strip.top>=strip.bottom-1&&strip.height<75,'surprise must be a short ribbon BELOW the artwork '+JSON.stringify(strip));
     assert.equal(await page.locator('#watchGrowthBtn').isVisible(),true,'mobile chat should have a route back to growing world');
     await page.locator('.tree-panel').screenshot({path:path.join(OUT,'GameV1-'+label+'-island-'+n+'-surprise.png')});
     if(label==='mobile'&&(n===3||n===16))await preview(page,String(n));
    }
   }
   // The real game must show BOTH V9 families through chat growth, including
   // the three surprise moments and custom thematic worlds.
   const islandSeed=await page.evaluate(()=>window.__TREE_QA__.state().current.seed);
   await page.evaluate(()=>window.__TREE_QA__.newTree());
   assert.equal(await page.locator('#surpriseMoment').isVisible(),false,'new seed clears previous celebration');
   await page.locator('.tree-panel').screenshot({path:path.join(OUT,'GameV1-'+label+'-new-tree-no-stale-surprise.png')});
   await page.evaluate(()=>{window.__TREE_QA__.chooseKind('jelly');window.__TREE_QA__.chooseWorld('music');});
   assert.equal(await page.locator('#surpriseMoment').isVisible(),false,'changing species/world keeps old celebration hidden');
   await page.locator('.tree-panel').screenshot({path:path.join(OUT,'GameV1-'+label+'-switch-to-jelly-no-stale-surprise.png')});
   for(let n=1;n<=16;n++){
    const reply=await page.evaluate(text=>window.__TREE_QA__.post(text),messages[n-1]);
    assert.equal(reply.count,n);
    if([3,8,16].includes(n)){
     await page.locator('#treeCanvas').screenshot({path:path.join(OUT,'GameV1-'+label+'-jelly-'+n+'-turns.png')});
     captures.push({scene:'jelly',n,url:await page.locator('#treeCanvas').evaluate(cv=>cv.toDataURL('image/png'))});
     assert.equal(await page.locator('#surpriseMoment').isVisible(),true);
     assert.equal(await page.evaluate(n=>window.__TREE_QA__.stageForTurns(n),n),n===16?16:n===8?8:3);
     const jellyCopy=await page.locator('#surpriseMoment').innerText();
     assert.ok(n===3?jellyCopy.includes('小魚'):n===8?jellyCopy.includes('觸鬚'):jellyCopy.includes('燈籠樹'));
     assert.doesNotMatch(jellyCopy,/浮島|樹洞|群島/);
     const strip=await page.evaluate(()=>{
      const art=document.getElementById('treeCanvas').getBoundingClientRect();
      const card=document.getElementById('surpriseMoment').getBoundingClientRect();
      return{bottom:art.bottom,top:card.top,height:card.height};
     });
     assert.ok(strip.top>=strip.bottom-1&&strip.height<75,'jelly friend must remain visible above the short ribbon '+JSON.stringify(strip));
     await page.locator('.tree-panel').screenshot({path:path.join(OUT,'GameV1-'+label+'-jelly-'+n+'-surprise.png')});
    }
   }
   // Save/open/swap must cancel the pending 3.3-second surprise timer.
   await page.evaluate(seed=>window.__TREE_QA__.open(seed),islandSeed);
   assert.equal(await page.locator('#surpriseMoment').isVisible(),false,'opening saved island hides last jelly event');
   await page.locator('.tree-panel').screenshot({path:path.join(OUT,'GameV1-'+label+'-open-saved-no-stale-surprise.png')});
   await page.evaluate(()=>window.__TREE_QA__.chooseWorld('travel'));
   assert.equal(await page.locator('#surpriseMoment').isVisible(),false,'world change should never reopen previous event');
   await page.locator('.tree-panel').screenshot({path:path.join(OUT,'GameV1-'+label+'-world-change-no-stale-surprise.png')});
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
  // Check desktop 1440px aspect ratio rather than only mobile crop.
  const wideCtx=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
  const wide=await wideCtx.newPage();await wide.goto(ROOT+'?qa=1&legacy=1',{waitUntil:'networkidle'});
  const wideFit=await wide.evaluate(()=>{
   const b=document.getElementById('treeCanvas').getBoundingClientRect(),ratio=b.width*820/800;
   return{width:b.width,height:b.height,expected:ratio,blank:Math.abs(b.height-ratio),
    scrollWidth:document.documentElement.scrollWidth,viewport:window.innerWidth};
  });
  assert.ok(wideFit.blank<2,'1440px world ratio must match 800:820 '+JSON.stringify(wideFit));
  assert.ok(wideFit.scrollWidth<=wideFit.viewport+2,'no desktop horizontal overflow');
  await wide.locator('.tree-panel').screenshot({path:path.join(OUT,'GameV1-1440-stage-and-short-ribbon-layout.png')});
  console.log('TREE_GAME_V1_DESKTOP_1440_FIT='+JSON.stringify(wideFit));
  await wideCtx.close();
  // Real V5 1.25-second live growth (not a static after-state) at 390px.
  const animCtx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'no-preference'});
  const anim=await animCtx.newPage();await anim.goto(ROOT+'?qa=1&legacy=1',{waitUntil:'networkidle'});
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
  const four=[...Array(4)].map((_,i)=>messages[3+i]);
  for(const text of four)await anim.evaluate(msg=>window.__TREE_QA__.post(msg),text);
  assert.equal(await anim.evaluate(()=>window.__TREE_QA__.state().current.growth.length),7);
  await anim.waitForTimeout(1400);
  await anim.locator('#treeCanvas').screenshot({path:path.join(OUT,'GameV1-390-growth-7-before-8.png')});
  const beforeScale=await anim.evaluate(()=>window.CrewFantasyGameArt.growthScale(7));
  await anim.evaluate(text=>window.__TREE_QA__.post(text),messages[7]);
  assert.equal(await anim.evaluate(()=>window.__TREE_QA__.state().current.growth.length),8);
  assert.equal(await anim.evaluate(()=>window.__TREE_QA__.stageForTurns(8)),8);
  await anim.locator('#treeCanvas').screenshot({path:path.join(OUT,'GameV1-390-growth-8-start.png')});
  await anim.waitForTimeout(540);
  await anim.locator('#treeCanvas').screenshot({path:path.join(OUT,'GameV1-390-growth-8-half.png')});
  await anim.waitForTimeout(860);
  await anim.locator('#treeCanvas').screenshot({path:path.join(OUT,'GameV1-390-growth-8-end.png')});
  const nextScale=await anim.evaluate(()=>window.CrewFantasyGameArt.growthScale(8));
  assert.ok(nextScale>=beforeScale,'8-turn plate cannot restart at a smaller scale');
  for(let n=9;n<=15;n++)await anim.evaluate(text=>window.__TREE_QA__.post(text),messages[n-1]);
  await anim.waitForTimeout(1420);
  await anim.locator('#treeCanvas').screenshot({path:path.join(OUT,'GameV1-390-growth-15-before-16.png')});
  await anim.evaluate(text=>window.__TREE_QA__.post(text),messages[15]);
  assert.equal(await anim.evaluate(()=>window.__TREE_QA__.stageForTurns(16)),16);
  await anim.locator('#treeCanvas').screenshot({path:path.join(OUT,'GameV1-390-growth-16-start.png')});
  await anim.waitForTimeout(540);
  await anim.locator('#treeCanvas').screenshot({path:path.join(OUT,'GameV1-390-growth-16-half.png')});
  await anim.waitForTimeout(860);
  await anim.locator('#treeCanvas').screenshot({path:path.join(OUT,'GameV1-390-growth-16-end.png')});
  assert.ok(await anim.evaluate(()=>window.CrewFantasyGameArt.growthScale(16)>=window.CrewFantasyGameArt.growthScale(15)));
  console.log('TREE_GAME_V1_GROWTH_STAGE_CONTINUITY_OK scales='+beforeScale+','+nextScale);
  await anim.waitForTimeout(100);
  await animCtx.close();
  console.log('TREE_GAME_V1_GROWTH_OK 390px real chats; 3 seedling visitor, 7→8 and 15→16 start/mid/end; no scale reset');
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

  // Crew Glow Forest V6 is the real default tree lab. Keep the old V5/V9
  // acceptance above accessible only via explicit ?legacy=1.
  const glowCtx=await browser.newContext({
   viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce',acceptDownloads:true
  });
  const glow=await glowCtx.newPage();
  const issues=[];
  glow.on('pageerror',e=>issues.push(e.message));
  glow.on('response',res=>{if(res.status()>=400)issues.push(res.status()+' '+res.url());});
  await glow.goto(ROOT+'?qa=1',{waitUntil:'networkidle',timeout:45000});
  await glow.waitForFunction(()=>window.CrewGlowForestV6&&document.body.classList.contains('glow-v6'));
  const layout=await glow.evaluate(()=>{
   const x=document.getElementById('treeCanvas').getBoundingClientRect();
   return {width:x.width,height:x.height,expected:x.width*1120/780,
    scroll:document.documentElement.scrollWidth,viewport:innerWidth};
  });
  assert.ok(layout.scroll<=layout.viewport+2,'V6 390px must not scroll horizontally '+JSON.stringify(layout));
  assert.ok(Math.abs(layout.height-layout.expected)<2,'new art must use 780:1120 portrait ratio');
  console.log('GLOW_V6_390_LAYOUT='+JSON.stringify(layout));
  assert.equal(await glow.locator('#quickForestSave').isVisible(),true);
  const quick=await glow.locator('#quickForestSave').boundingBox();
  const canvasBox=await glow.locator('#canvasWrap').boundingBox();
  assert.ok(quick&&canvasBox&&quick.x>canvasBox.x+canvasBox.width/2,
   'persistent PNG button must be in upper-right of the night-stage');
  assert.ok(quick.height>=44,'390px quick download should have 44px touch height');
  const stillSnapshots=[];
  const staticFrame=()=>glow.evaluate(()=>{
   const canvas=document.createElement('canvas');canvas.width=390;canvas.height=560;
   const qa=window.__TREE_QA__;
   window.CrewGlowForestV6.paint(canvas,qa.glow().garden,qa.state().current,1000,
     {width:390,height:560,still:true});
   return canvas.toDataURL('image/png');
  });
  for(let i=0;i<5;i++){
   const seed=200+i;
   assert.equal(await glow.evaluate(seed=>window.__TREE_QA__.glowSeed(seed),seed),true);
   if(i===0){
    await glow.waitForTimeout(70);
    await glow.locator('#canvasWrap').screenshot({path:path.join(OUT,'V6-mobile-0-seed.png')});
    stillSnapshots.push({n:0,url:await staticFrame()});
   }
   for(let n=1;n<=16;n++){
    const res=await glow.evaluate((({turn,seed})=>
     window.__TREE_QA__.post(['我今天想喝咖啡','我們去宇宙旅行','我家貓咪很好玩','我要聽音樂唱歌'][turn%4])),{turn:n,seed});
    assert.equal(res.count,n);
    if(i===0&&n<=15){
     const url=await staticFrame();
     assert.notEqual(url,stillSnapshots[stillSnapshots.length-1].url,
       'every chat turn must change visible pixels, including non-milestones: '+n);
     stillSnapshots.push({n,url});
    }
    if(i===0&&[1,2,3,8,16].includes(n)){
     const state=await glow.evaluate(()=>window.__TREE_QA__.glow());
     const expected=n===1||n===2?'sprout':n===3?'sapling':n===8?'island':'final';
     assert.equal(state.stage,expected);
     if(n<16)assert.match(await glow.locator('#gardenM16').innerText(),/？？？/);
     await glow.waitForTimeout(75);
     await glow.locator('.tree-panel').screenshot({path:path.join(OUT,'V6-mobile-'+n+'-stage.png')});
    }
    if(n===16){
     const state=await glow.evaluate(()=>window.__TREE_QA__.glow());
     assert.equal(state.garden.totalCompleted,i+1);
     assert.equal(state.garden.slots.length,Math.min(i+1,4));
     assert.equal(state.garden.retired.length,Math.max(0,i-3));
     assert.equal(state.reveal.form,['constellation','crystal','lantern','petal','constellation'][i]);
     const formName=['星空樹','水晶樹','燈籠樹','花瀑樹','星空樹'][i];
     assert.match(await glow.locator('#surpriseTitle').innerText(),new RegExp(formName));
     await glow.waitForTimeout(100);
     await glow.locator('.tree-panel').screenshot({path:path.join(OUT,'V6-mobile-final-'+formName+'.png')});
     assert.equal(await glow.locator('#momentSave').isVisible(),true,
       'all 16th turns offer save-this-moment before the new seed appears');
     assert.match(await glow.locator('#captureMilestoneBtn').innerText(),/存下這一刻/);
     if(i>=2)await glow.locator('.tree-panel').screenshot({
      path:path.join(OUT,'V6-mobile-forest-'+(i+1)+'-save-moment.png')
     });
     if(i===2)assert.match(await glow.locator('#forestUnlocks').innerText(),/菇路/);
     if(i===3)assert.match(await glow.locator('#forestUnlocks').innerText(),/池塘/);
     if(i===4)assert.match(await glow.locator('#forestUnlocks').innerText(),/極光/);
    }
   }
  }
  await glow.locator('.tree-panel').screenshot({path:path.join(OUT,'V6-mobile-5-forest-before-seed.png')});
  assert.equal(await glow.locator('#retiredCount').innerText(),'1');
  // Retire the oldest from four occupied slots; reveal eventually yields the
  // new seed in front of four grown completed trees.
  const five=await glow.evaluate(()=>window.__TREE_QA__.glow());
  assert.equal(five.garden.retired[0].seed,200);
  assert.deepEqual(five.garden.slots.map(t=>t.seed),[201,202,203,204]);
  const d=glow.waitForEvent('download');
  await glow.locator('#quickForestSave').click();
  const download=await d;
  assert.match(download.suggestedFilename(),/^crew-forest-5-trees\.png$/);
  const posterFile=path.join(OUT,'V6-5-trees-postcard-1080x1920.png');
  await download.saveAs(posterFile);
  const png=fs.readFileSync(posterFile);
  assert.equal(png.readUInt32BE(16),1080,'PNG width');
  assert.equal(png.readUInt32BE(20),1920,'PNG height');
  const sampled=await glow.evaluate(()=>{
   const q=window.__TREE_QA__.glowPoster(),out=document.createElement('canvas');
   window.CrewForestPostcardV6.render(out,q.garden,q.active,1000,q.options);
   const c=out.getContext('2d');
   return {width:out.width,height:out.height,
    black:[...c.getImageData(5,1500,1,1).data],
    purple:[...c.getImageData(5,1444,1,1).data],
    level:window.CrewGlowForestV6.forestLevel(q.garden.totalCompleted).name};
  });
  assert.deepEqual(sampled.black.slice(0,3),[18,16,28]);
  assert.deepEqual(sampled.purple.slice(0,3),[98,87,231]);
  assert.equal(sampled.level,'極光森林');
  const secondDownload=glow.waitForEvent('download');
  await glow.locator('#captureMilestoneBtn').click();
  assert.match((await secondDownload).suggestedFilename(),/crew-forest-5-trees\.png$/);
  console.log('GLOW_V6_POSTCARD_OK '+JSON.stringify(sampled));
  // 0 to 15 turn-by-turn fixed-time screenshots in one inspection sheet.
  const sheetBase64=await glow.evaluate(async captures=>{
   const out=document.createElement('canvas');out.width=4*195;out.height=4*290;
   const c=out.getContext('2d');c.fillStyle='#12101c';c.fillRect(0,0,out.width,out.height);
   for(let i=0;i<captures.length;i++){
    const shot=captures[i],im=new Image();im.src=shot.url;await im.decode();
    const col=i%4,row=Math.floor(i/4),x=col*195,y=row*290;
    c.drawImage(im,x+4,y+4,187,265);
    c.fillStyle='#F7F7F4';c.font='bold 16px system-ui';c.textAlign='center';
    c.fillText(shot.n+' 句',x+97,y+284);
   }
   return out.toDataURL('image/png').split(',')[1];
  },stillSnapshots);
  fs.writeFileSync(path.join(OUT,'V6-every-turn-0-to-15-contact.png'),
   Buffer.from(sheetBase64,'base64'));
  console.log('GLOW_V6_EVERY_TURN_OK 16 unique static Canvas frames, one per conversation state');
  await glow.waitForTimeout(3850);
  await glow.locator('#canvasWrap').screenshot({path:path.join(OUT,'V6-mobile-5-trees-new-seed.png')});
  assert.equal((await glow.evaluate(()=>window.__TREE_QA__.glow())).stage,'seed');
  await glow.screenshot({path:path.join(OUT,'V6-mobile-five-forest-full-page.png'),fullPage:true});
  await glow.reload({waitUntil:'networkidle'});
  const savedGarden=await glow.evaluate(()=>window.__TREE_QA__.glow());
  assert.equal(savedGarden.garden.totalCompleted,5);
  assert.equal(savedGarden.garden.slots.length,4);
  assert.equal(savedGarden.garden.retired[0].seed,200);
  assert.equal(issues.length,0,JSON.stringify(issues));
  console.log('GLOW_V6_BROWSER_OK 390px 0/1/2/3/8/16, four distinct final forms, 3/4/5 forest, retirement, 1080x1920 share, reload; 0 page errors');
  await glowCtx.close();

 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exit(1)});
