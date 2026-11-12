'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const URL='http://127.0.0.1:8787/crew-tree-lab/art-studies/';
const OUT=process.env.ART_OUTPUT||'/tmp/crew-fantasy-screenshots';
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [label,viewport] of [['mobile',{width:390,height:844}],['desktop',{width:1280,height:800}]]){
   const ctx=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'reduce'});
   const page=await ctx.newPage();const failures=[];
   page.on('pageerror',error=>failures.push(error.message));
   page.on('response',res=>{if(res.status()>=400)failures.push('HTTP '+res.status()+': '+res.url());});
   await page.goto(URL+'?qa=1',{waitUntil:'networkidle',timeout:40000});
   await page.waitForFunction(()=>window.__CREW_STUDIES_QA__?.assetStatus()?.loaded?.length===4,{timeout:20000});
   assert.equal(await page.locator('[data-preview]').count(),3);
   assert.equal(await page.locator('[data-scene]').count(),2);
   for(const scene of ['island','jelly']){
    await page.locator('[data-scene="'+scene+'"]').click();
    for(const stage of [3,8,16]){
     await page.locator('[data-stage="'+stage+'"]').click();
     const m=await page.evaluate(()=>window.__CREW_STUDIES_QA__.sceneModel());
     assert.equal(m.stage,stage);assert.equal(m.scene,scene);
     if(scene==='island')assert.equal(m.units.length,stage===3?1:stage===8?2:4);
     else assert.equal(m.arms.length,stage===3?6:stage===8?11:19);
     await page.locator('#heroCanvas').screenshot({path:path.join(OUT,label+'-'+scene+'-'+stage+'.png')});
    }
    const sheet=await page.evaluate(()=>{
     const previews=[...document.querySelectorAll('[data-preview]')];
     const out=document.createElement('canvas');out.width=900;out.height=420;
     const c=out.getContext('2d');c.fillStyle='#dde7d8';c.fillRect(0,0,900,420);
     previews.forEach((src,i)=>{c.drawImage(src,i*300+2,0,296,400);
      c.fillStyle='#3e5548';c.font='bold 16px system-ui';c.textAlign='center';
      c.fillText([3,8,16][i]+' turns',i*300+150,415);});
     return out.toDataURL('image/jpeg',.68).split(',')[1];
    });
    if(label==='desktop')console.log('FANTASY_'+scene.toUpperCase()+'_CONTACT='+sheet);
   }
   await page.locator('[data-scene="island"]').click();
   await page.locator('[data-stage="16"]').click();
   await page.locator('[data-topic="music"]').click();
   const mutated=await page.evaluate(()=>window.__CREW_STUDIES_QA__.sceneModel().attachment);
   assert.equal(mutated,'chime-garden');
   await page.locator('#seedInput').fill('241');
   await page.locator('#seedBtn').click();
   assert.equal(await page.evaluate(()=>window.__CREW_STUDIES_QA__.state().seed),241);
   const width=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,viewport:window.innerWidth}));
   assert.ok(width.doc<=width.viewport+2,'No horizontal scrolling at '+label+': '+JSON.stringify(width));
   assert.equal(failures.length,0,JSON.stringify(failures));
   await page.screenshot({path:path.join(OUT,label+'-whole-art-study.png'),fullPage:true});
   console.log('FANTASY_BROWSER_OK '+label+' 2 scenes x 3 stages; original SVG=4; overflow=0');
   await ctx.close();
  }
  // External authoring tools are separately reported: a CDN outage must not
  // be mistaken for an actual successful p5.brush/Rigby2D implementation.
  const ctx=await browser.newContext({viewport:{width:1280,height:850}});
  const p=await ctx.newPage();await p.goto(URL+'bake.html',{waitUntil:'domcontentloaded'});
  assert.equal(await p.locator('#bakeBtn').count(),1);
  assert.equal(await p.locator('#checkRig').count(),1);
  await p.screenshot({path:path.join(OUT,'authoring-tools.png'),fullPage:true});
  console.log('FANTASY_AUTHORING_UI_OK; external runtime probes need network and separate validation');
  await ctx.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
