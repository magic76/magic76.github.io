'use strict';
/* Browser acceptance: actual viewport, user clicks, storage reloads, next-day
 * time travel, plus side-by-side source-branch and master screenshots. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const OUT=process.env.ART_OUTPUT||'/tmp/crew-creature-retention-shots';
const ROOT='http://127.0.0.1:8787/crew-creature-lab/';
const BASE='http://127.0.0.1:8788/crew-creature-lab/';
fs.mkdirSync(OUT,{recursive:true});
const cases=[['360x640',{width:360,height:640}],['390x844',{width:390,height:844}],['1280x800',{width:1280,height:800}]];
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CREW_CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [name,viewport] of cases){
   const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'reduce'});
   const old=await context.newPage();
   await old.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});
   await old.waitForTimeout(500);
   await old.screenshot({path:path.join(OUT,'before-master-'+name+'.png')});
   await old.close();
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('dialog',dialog=>dialog.accept());
   await page.goto(ROOT+'?qa=1',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>!!window.__CREATURE_QA__);
   await page.waitForTimeout(500);
   await page.screenshot({path:path.join(OUT,'after-first-visit-'+name+'.png')});
   if(viewport.width<=390){
    const input=await page.locator('#chatInput').boundingBox();
    assert.ok(input&&input.y+input.height<=viewport.height+1,
      name+' text input should be available without scrolling: '+JSON.stringify(input));
    const sizes=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(sizes.scroll<=sizes.viewport+1,name+' no horizontal overflow: '+JSON.stringify(sizes));
    assert.equal(await page.locator('#progressHint').isVisible(),true);
    assert.equal(await page.locator('#ideaChips').isVisible(),false,'new egg has only two first-hatch choices');
   }
   assert.equal(await page.locator('#hatchBtn').isVisible(),false);
   const first=page.locator('#hatchIdeas button').first(),second=page.locator('#hatchIdeas button').last();
   {
    const rect=await first.boundingBox();
    assert.ok(rect&&rect.y+rect.height<=viewport.height+1,
      name+' first-hatch topic should be visible without scrolling: '+JSON.stringify(rect));
   }
   await first.click();
   assert.match(await page.locator('#hatchPrompt').innerText(),/再聊 1 句/);
   await second.click();
   assert.equal(await page.locator('#evolveBtn').innerText(),'🥚 孵出我的生物');
   assert.equal(await page.evaluate(()=>window.__CREATURE_QA__.state().creature.stage),0);
   await page.locator('#evolveBtn').click();
   await page.waitForTimeout(650);
   const hatched=await page.evaluate(()=>window.__CREATURE_QA__.state().creature);
   assert.equal(hatched.stage,1);
   assert.ok(hatched.line);
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.__CREATURE_QA__);
   assert.equal(await page.evaluate(()=>window.__CREATURE_QA__.state().creature.line),hatched.line);
   assert.equal(await page.evaluate(()=>window.__CREATURE_QA__.state().creature.stage),1);
   assert.match(await page.locator('#linePreview').innerText(),/已遇見/);
   await page.waitForTimeout(350);
   await page.screenshot({path:path.join(OUT,'after-hatch-'+name+'.png')});
   assert.equal(await page.locator('#hatchGuide').isVisible(),false);
   assert.equal(await page.locator('#ideaChips').isVisible(),true,'growing creature uses conversation topics');
   if(viewport.width<=390){
    assert.equal(await page.locator('#labSettings').getAttribute('open'),null,'bag tools start collapsed');
    await page.locator('#labSettings summary').click();
    assert.equal(await page.locator('#giftBtn').isVisible(),true,'gift remains reachable via bag');
    await page.locator('#labSettings summary').click();
   }
   const gift=await page.evaluate(()=>{
    const qa=window.__CREATURE_QA__,items=qa.giftItems();
    const sum=items.reduce((s,item)=>s+item.weight,0);let before=0;
    for(const item of items){
     qa.grantGift('evolve');
     const r=(before+item.weight/3)/sum;
     qa.openGift(()=>r);
     before+=item.weight;
    }
    return {seen:qa.giftSeen(),inventory:qa.giftCollection()};
   });
   assert.equal(Object.keys(gift.seen).length,16,'all 16 seen, including energy and golden');
   assert.equal(await page.locator('#giftCollectionCount').innerText(),'16/16');
   await page.evaluate(()=>window.__CREATURE_QA__.hatch('cat'));
   assert.equal(await page.locator('#giftCollectionCount').innerText(),'16/16');
   await page.reload({waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('#giftCollectionCount').innerText(),'16/16');
   assert.deepEqual(errors,[],'browser exceptions');
   await page.close();
   await context.close();
   console.log('CREATURE_HATCH_AND_16_GIFTS_OK '+name);
  }
  // Hold browser-local civil dates stable to prove daily award and exact
  // creature persistence; clock changes only via this QA-only test context.
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});
  await context.addInitScript(()=>{
   const NativeDate=Date;
   window.Date=class extends NativeDate{
    constructor(...args){
     const day=localStorage.getItem('__crew_visual_day');
     super(...(args.length?args:day?[day+'T10:00:00+08:00']:[]));
    }
    static now(){
     const day=localStorage.getItem('__crew_visual_day');
     return day?new NativeDate(day+'T10:00:00+08:00').getTime():NativeDate.now();
    }
   };
  });
  const page=await context.newPage();
  page.on('dialog',dialog=>dialog.accept());
  await page.goto(ROOT+'?qa=1');
  await page.evaluate(()=>localStorage.setItem('__crew_visual_day','2026-11-14'));
  await page.reload();
  const first=await page.evaluate(()=>{
   const qa=window.__CREATURE_QA__;
   for(let i=0;i<16;i++)qa.post('我們去海邊看海豚');
   qa.evolve(()=>0);qa.evolve();qa.evolve();qa.evolve();
   return {creature:qa.state().creature,gifts:qa.gifts()};
  });
  assert.equal(first.creature.stage,4);
  assert.equal(await page.locator('#carePanel').isVisible(),true);
  assert.match(await page.locator('#carePrompt').innerText(),/海邊/);
  await page.locator('#careChoices button').first().click();
  assert.match(await page.locator('#careMemory').innerText(),/撿貝殼/);
  assert.equal(await page.evaluate(()=>window.__CREATURE_QA__.gifts()),first.gifts);
  await page.screenshot({path:path.join(OUT,'after-complete-care-390x844.png')});
  await page.reload();
  assert.match(await page.locator('#careMemory').innerText(),/撿貝殼/);
  await page.locator('#careChoices button').last().click();
  assert.equal(await page.evaluate(()=>window.__CREATURE_QA__.gifts()),first.gifts);
  await page.evaluate(()=>localStorage.setItem('__crew_visual_day','2026-11-15'));
  await page.reload();
  await page.locator('#careChoices button').first().click();
  const tomorrow=await page.evaluate(()=>{
   const qa=window.__CREATURE_QA__;
   return {creature:qa.state().creature,gifts:qa.gifts()};
  });
  assert.equal(tomorrow.gifts,first.gifts+1);
  assert.equal(tomorrow.creature.line,first.creature.line);
  assert.equal(tomorrow.creature.stage,4);
  assert.equal(tomorrow.creature.memories.length,3);
  await page.locator('#careChoices button').last().click();
  assert.equal(await page.evaluate(()=>window.__CREATURE_QA__.gifts()),tomorrow.gifts);
  await page.screenshot({path:path.join(OUT,'after-next-day-revisit-390x844.png')});
  await context.close();
  console.log('CREATURE_FULLY_GROWN_REVISIT_OK');

  // Exercise the same-origin message bridge in a real browser. The child
  // simulates a completed Zoe exchange; it does not request a microphone.
  const voiceContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await voiceContext.route(url=>url.pathname==='/friend/live',route=>route.fulfill({
   status:200,contentType:'text/html',body:`<!doctype html><html><body>
    <button id="exchange" disabled>Simulate completed exchange</button>
    <script>
     let channel='';
     window.addEventListener('message',event=>{
      if(event.origin!==location.origin||event.source!==parent)return;
      if(event.data.type==='CREW_CREATURE_VOICE_CONTEXT'){
       channel=event.data.channelId;
       document.getElementById('exchange').disabled=false;
       document.body.dataset.stage=String(event.data.creature.stage);
      }
      if(event.data.type==='CREW_CREATURE_VOICE_STOP'&&event.data.channelId===channel){
       parent.postMessage({type:'CREW_CREATURE_VOICE_STOPPED',channelId:channel},location.origin);
      }
     });
     document.getElementById('exchange').addEventListener('click',()=>{
      const event={type:'CREW_CREATURE_VOICE_TURN',channelId:channel,turnId:'voice-turn-1',input:'一起去海邊',output:'好，我們去看海！'};
      parent.postMessage(event,location.origin);
      parent.postMessage(event,location.origin);
     });
     parent.postMessage({type:'CREW_CREATURE_VOICE_READY'},location.origin);
    </script></body></html>`
  }));
  const voicePage=await voiceContext.newPage();
  const voiceErrors=[];
  voicePage.on('pageerror',error=>voiceErrors.push(error.message));
  await voicePage.goto(ROOT+'?qa=1',{waitUntil:'domcontentloaded'});
  await voicePage.waitForFunction(()=>!!window.__CREATURE_QA__);
  await voicePage.locator('#openVoice').click();
  const child=voicePage.frameLocator('#voiceFrameHost iframe');
  const exchange=child.locator('#exchange');
  await exchange.waitFor({state:'visible'});
  await voicePage.waitForFunction(()=>document.querySelector('#voiceFrameHost iframe')?.contentDocument?.body.dataset.stage==='0');
  assert.equal(await exchange.isEnabled(),true,'READY receives the initial creature context');
  await exchange.click();
  await voicePage.waitForFunction(()=>window.__CREATURE_QA__.energy()===1);
  assert.equal(await voicePage.evaluate(()=>window.__CREATURE_QA__.state().creature.sentences),1,'duplicate turn counts once');
  await voicePage.locator('#closeVoice').click();
  await voicePage.waitForFunction(()=>!document.querySelector('#voiceFrameHost iframe'));
  assert.equal(await voicePage.locator('#localChatPanel').isVisible(),true);
  assert.equal(await voicePage.evaluate(()=>window.__CREATURE_QA__.energy()),1);
  assert.deepEqual(voiceErrors,[],'voice bridge browser exceptions');
  await voiceContext.close();
  console.log('CREATURE_VOICE_FRAME_BRIDGE_OK');
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
