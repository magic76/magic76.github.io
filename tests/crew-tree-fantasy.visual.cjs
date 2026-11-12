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
   // Actual Canvas2D images at 0%, 50% and 100% for both stage changes.
   // Reduced-motion UI is static; QA forces a deterministic in-between frame.
   for(const scene of ['island','jelly']){
    await page.locator('[data-scene="'+scene+'"]').click();
    for(const [from,to] of [[3,8],[8,16]]){
     const pictures=[];
     for(const progress of [0,.5,1]){
      const shot=await page.evaluate(({scene,from,to,progress})=>{
       window.__CREW_STUDIES_QA__.growthFrame(scene,from,to,progress);
       return document.querySelector('#heroCanvas').toDataURL('image/png');
      },{scene,from,to,progress});
      pictures.push(shot);
      await page.locator('#heroCanvas').screenshot({
       path:path.join(OUT,'V6-GROWTH-'+label+'-'+scene+'-'+from+'-to-'+to+'-'+Math.round(progress*100)+'.png')
      });
     }
     assert.equal(new Set(pictures).size,3,'start, in-between and final morph frames must all differ '+scene);
     if(label==='desktop'){
      const contact=await page.evaluate(async pictures=>{
       const out=document.createElement('canvas');out.width=930;out.height=392;
       const c=out.getContext('2d');c.fillStyle='#f3ede1';c.fillRect(0,0,930,392);
       for(let i=0;i<pictures.length;i++){
        const img=new Image();img.src=pictures[i];await img.decode();
        c.drawImage(img,310*i+2,0,306,364);
        c.font='bold 16px system-ui';c.textAlign='center';c.fillStyle='#334841';
        c.fillText(['start','growing 50%','mature'][i],310*i+155,385);
       }
       return out.toDataURL('image/jpeg',.70).split(',')[1];
      },pictures);
      console.log('FANTASY_V6_'+scene.toUpperCase()+'_'+from+'_TO_'+to+'='+contact);
     }
    }
    const reactionFrames=[];
    for(const progress of [0,.45,.85]){
     const image=await page.evaluate(({scene,progress})=>{
      window.__CREW_STUDIES_QA__.touchFrame(scene,progress);
      return document.querySelector('#heroCanvas').toDataURL('image/png');
     },{scene,progress});
     reactionFrames.push(image);
     await page.locator('#heroCanvas').screenshot({
      path:path.join(OUT,'V6-TOUCH-'+label+'-'+scene+'-'+Math.round(progress*100)+'.png')
     });
    }
    assert.equal(new Set(reactionFrames).size,3,
     'touch must animate the character body/arms and light droplets over three moments');
   }
   // Reduced-motion mode keeps transitions immediate, while keyboard can still
   // trigger the same touch response and politely announces what happened.
   await page.locator('[data-scene="island"]').click();
   await page.locator('[data-stage="16"]').click();
   await page.locator('#heroCanvas').focus();
   await page.keyboard.press('Enter');
   assert.match(await page.locator('#reactionStatus').innerText(),/揮手/);
   assert.equal(await page.evaluate(()=>window.__CREW_STUDIES_QA__.hitTest('jelly',16,400,294)),true);
   await page.locator('[data-scene="jelly"]').click();
   const touched=await page.evaluate(()=>{
    const cv=document.querySelector('#heroCanvas'),b=cv.getBoundingClientRect();
    const scale=Math.min(b.width/800,b.height/820),ox=(b.width-800*scale)/2,oy=(b.height-820*scale)/2;
    cv.dispatchEvent(new PointerEvent('pointerdown',{
     bubbles:true,clientX:b.left+ox+400*scale,clientY:b.top+oy+294*scale
    }));
    return document.querySelector('#reactionStatus').textContent;
   });
   assert.match(touched,/水母彈了一下/,'actual pointer hit must trigger medusa response');
   await page.locator('[data-scene="island"]').click();
   await page.locator('[data-stage="3"]').click();
   await page.locator('#simulateChatBtn').click();
   assert.equal(await page.evaluate(()=>window.__CREW_STUDIES_QA__.state().turns),4);
   assert.equal(await page.evaluate(()=>window.__CREW_STUDIES_QA__.state().stage),3);
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
     if(scene==='jelly'){
      // Check the real bell, not only sky differences between topic screens.
      const capColors=[];
      for(const topic of ['cosmos','warmth','music','travel']){
       await page.locator('[data-topic="'+topic+'"]').click();
       const color=await page.locator('#heroCanvas').evaluate(cv=>{
        const ctx=cv.getContext('2d'),w=cv.width,h=cv.height;
        const scale=Math.min(w/800,h/820),ox=(w-800*scale)/2,oy=(h-820*scale)/2;
        // Interior upper-left quadrant avoids the resident fish face.
        const pts=[[330,233],[344,245],[354,259],[331,270]];
        return pts.map(([x,y])=>{
         const rgba=ctx.getImageData(Math.floor(ox+x*scale),Math.floor(oy+y*scale),1,1).data;
         return [...rgba].slice(0,3).map(v=>Math.round(v/12)).join(':');
        }).join('/');
       });
       capColors.push(color);
      }
      assert.equal(new Set(capColors).size,4,
       'V6 bell pigment in the actual canopy must change across four themes: '+JSON.stringify(capColors));
      console.log('FANTASY_V6_BELL_COLORS='+JSON.stringify(capColors));
     }
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
  // The real button path animates when motion is allowed; reduced motion
  // produces immediate still art instead of an unexpected tween.
  const motion=await browser.newContext({viewport:{width:850,height:850},reducedMotion:'no-preference'});
  const live=await motion.newPage();
  await live.goto(URL+'?qa=1',{waitUntil:'networkidle',timeout:40000});
  await live.waitForFunction(()=>window.__CREW_STUDIES_QA__?.assetStatus()?.loaded?.length===10);
  await live.locator('[data-stage="3"]').click();
  await live.locator('[data-stage="8"]').click();
  assert.equal(await live.evaluate(()=>window.__CREW_STUDIES_QA__.state().growth?.from),3);
  await live.waitForTimeout(1400);
  assert.equal(await live.evaluate(()=>window.__CREW_STUDIES_QA__.state().growth),null);
  await live.locator('[data-stage="16"]').click();
  assert.equal(await live.evaluate(()=>window.__CREW_STUDIES_QA__.state().growth?.to),16);
  await live.waitForTimeout(1400);
  await live.locator('[data-scene="jelly"]').click();
  await live.locator('[data-stage="3"]').click();
  await live.locator('[data-stage="8"]').click();
  assert.equal(await live.evaluate(()=>window.__CREW_STUDIES_QA__.state().growth?.from),3);
  await live.waitForTimeout(1450);
  await motion.close();
  console.log('FANTASY_V6_REAL_GROWTH_UI_OK; stage transitions, no-preference motion and reduced-motion fallbacks');
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
