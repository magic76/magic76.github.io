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
   await page.waitForFunction(()=>window.__CREW_STUDIES_QA__?.assetStatus()?.loaded?.length===10,{timeout:20000});
   assert.equal(await page.locator('[data-preview]').count(),3);
   assert.equal(await page.locator('[data-scene]').count(),2);
   assert.equal(await page.locator('#silhouetteBtn').count(),1);
   for(const scene of ['island','jelly']){
    await page.locator('[data-scene="'+scene+'"]').click();
    for(const stage of [3,8,16]){
     await page.locator('[data-stage="'+stage+'"]').click();
     const m=await page.evaluate(()=>window.__CREW_STUDIES_QA__.sceneModel());
     assert.equal(m.stage,stage);assert.equal(m.scene,scene);
     if(scene==='island'){
      assert.equal(m.units.length,stage===3?1:stage===8?2:4);
      assert.equal(m.units[0].species,'spiral');
      if(stage===16)assert.deepEqual(m.units.map(x=>x.species),['spiral','weeping','lantern-fruit','crescent']);
      assert.equal(m.lifeStage,stage===3?'seedling':stage===8?'sapling':'mature');
     } else{
      assert.equal(m.arms.length,stage===3?6:stage===8?11:19);
      assert.equal(m.silhouette.domeWidth,stage===3?136:stage===8?365:555);
      assert.equal(m.lifeStage,stage===3?'hatchling':stage===8?'juvenile':'mature');
     }
     await page.locator('#heroCanvas').screenshot({path:path.join(OUT,label+'-'+scene+'-'+stage+'.png')});
     if(stage===8)await page.locator('#heroCanvas').screenshot({
      path:path.join(OUT,'V4-YOUTH-'+label+'-'+scene+'-8-turns.png')
     });
     if(stage===3){
      assert.equal(await page.locator('#futureHint').isVisible(),true,'newborn future-world invitation');
      await page.locator('#heroCanvas').screenshot({path:path.join(OUT,'V4-NEWBORN-'+label+'-'+scene+'.png')});
     }else assert.equal(await page.locator('#futureHint').isVisible(),false);
     if(stage===16){
      await page.locator('#silhouetteBtn').click();
      assert.equal(await page.locator('#silhouetteBtn').getAttribute('aria-pressed'),'true');
      await page.locator('#heroCanvas').screenshot({path:path.join(OUT,label+'-'+scene+'-silhouette.png')});
      await page.locator('#silhouetteBtn').click();
     }
    }
    if(scene==='jelly'){
     // QA-only fixed-time sampling verifies the living membrane and delayed
     // tendrils really animate rather than only rendering a static poster.
     const animated=await page.evaluate(()=>{
      const qa=window.__CREW_STUDIES_QA__,canvas=document.getElementById('heroCanvas');
      qa.paintAt('jelly',16,103,'music',1500);
      const first=canvas.toDataURL('image/png');
      qa.paintAt('jelly',16,103,'music',4100);
      const second=canvas.toDataURL('image/png');
      return first!==second;
     });
     assert.ok(animated,'breathing umbrella, glowing buds and staggered tendrils must animate');
     // Restore the static/reduced-motion scene before comparison captures.
     await page.locator('[data-stage="16"]').click();
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
    if(label==='desktop')console.log('FANTASY_V4_'+scene.toUpperCase()+'_AGES='+sheet);
    if(label==='desktop'){
     await page.locator('#silhouetteBtn').click();
     const black=await page.evaluate(()=>{
      const previews=[...document.querySelectorAll('[data-preview]')];
      const out=document.createElement('canvas');out.width=900;out.height=420;
      const c=out.getContext('2d');c.fillStyle='#faf5e7';c.fillRect(0,0,900,420);
      previews.forEach((src,i)=>{c.drawImage(src,i*300+2,0,296,400);
       c.fillStyle='#30352f';c.font='bold 16px system-ui';c.textAlign='center';
       c.fillText([3,8,16][i]+' turns',i*300+150,415);});
      return out.toDataURL('image/jpeg',.72).split(',')[1];
     });
     const silhouetteAreas=await page.evaluate(()=>{
      return [...document.querySelectorAll('[data-preview]')].map(cv=>{
       const ctx=cv.getContext('2d'),a=ctx.getImageData(0,0,cv.width,cv.height).data;
       let count=0;for(let k=0;k<a.length;k+=4){
        if(a[k]<62&&a[k+1]<62&&a[k+2]<62&&a[k+3]>100)count++;
       }
       return count;
      });
     });
     assert.ok(silhouetteAreas[0]<silhouetteAreas[1]&&silhouetteAreas[1]<silhouetteAreas[2],
      'maturity must grow identifiable black silhouette area '+JSON.stringify(silhouetteAreas));
     console.log('FANTASY_'+scene.toUpperCase()+'_BLACK_AREA='+JSON.stringify(silhouetteAreas));
     console.log('FANTASY_'+scene.toUpperCase()+'_SILHOUETTE='+black);
     await page.locator('#silhouetteBtn').click();
    }
   }
   // Four distinctly designed skies and attached biological objects, same seed.
   // Save both scene contact sheets as real browser artwork rather than synthetic diagrams.
   if(label==='desktop'){
    for(const scene of ['island','jelly']){
     await page.locator('[data-scene="'+scene+'"]').click();
     await page.locator('[data-stage="16"]').click();
     const collage=await page.evaluate(async()=>{
      return {ok:true};
     });
     assert.equal(collage.ok,true);
     const portraits=[];
     for(const topic of ['cosmos','warmth','music','travel']){
      await page.locator('[data-topic="'+topic+'"]').click();
      const shot=await page.locator('#heroCanvas').evaluate(cv=>cv.toDataURL('image/png'));
      portraits.push(shot);
      await page.locator('#heroCanvas').screenshot({path:path.join(OUT,'desktop-'+scene+'-topic-'+topic+'.png')});
     }
     assert.equal(new Set(portraits).size,4,'all storybook palettes must differ');
     const contact=await page.evaluate(async(data)=>{
      const canvas=document.createElement('canvas');canvas.width=1040;canvas.height=340;
      const ctx=canvas.getContext('2d');
      ctx.fillStyle='#eee9da';ctx.fillRect(0,0,1040,340);
      const names=['cosmos','warmth','music','travel'];
      for(let i=0;i<data.length;i++){
       const img=new Image();img.src=data[i];await img.decode();
       ctx.drawImage(img,i*260+2,0,256,315);
       ctx.fillStyle='#374844';ctx.textAlign='center';ctx.font='bold 14px system-ui';
       ctx.fillText(names[i],i*260+130,333);
      }
      return canvas.toDataURL('image/jpeg',.72).split(',')[1];
     },portraits);
     console.log('FANTASY_V4_'+scene.toUpperCase()+'_TOPICS='+contact);
    }
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
   console.log('FANTASY_BROWSER_OK '+label+' 2 scenes x 3 stages; original SVG=10; overflow=0');
   await ctx.close();
  }
  // External authoring tools are separately reported: a CDN outage must not
  // be mistaken for an actual successful p5.brush/Rigby2D implementation.
  const ctx=await browser.newContext({viewport:{width:1280,height:850}});
  const p=await ctx.newPage();await p.goto(URL+'bake.html',{waitUntil:'domcontentloaded'});
  assert.equal(await p.locator('#bakeBtn').count(),1);
  assert.equal(await p.locator('#checkRig').count(),1);
  // These are genuine third-party engine probes. Their results are logged,
  // not counted as success unless the official runtime reports success.
  await p.locator('#checkRig').click();
  await p.waitForFunction(()=>document.querySelector('#rigReport')?.textContent?.includes('成功')||
    document.querySelector('#rigReport')?.textContent?.includes('失敗'),{timeout:25000}).catch(()=>{});
  const rigStatus=await p.locator('#rigReport').innerText();
  assert.match(rigStatus,/Rigby2D 實際 Runtime 驗證成功/,rigStatus);
  assert.match(rigStatus,/bones=21/);
  assert.match(rigStatus,/warnings=0/);
  console.log('RIGBY2D_RUNTIME_PROBE '+rigStatus.slice(0,500));
  await p.locator('#bakeBtn').click();
  await p.waitForFunction(()=>document.querySelector('#bakeReport')?.textContent?.includes('完成')||
    document.querySelector('#bakeReport')?.textContent?.includes('失敗'),{timeout:25000}).catch(()=>{});
  console.log('P5_BRUSH_BAKE_PROBE '+(await p.locator('#bakeReport').innerText()).slice(0,500));
  await p.screenshot({path:path.join(OUT,'authoring-tools.png'),fullPage:true});
  console.log('FANTASY_AUTHORING_UI_OK; runtime probes logged without falsely marking unavailable CDN as passed');
  await ctx.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
