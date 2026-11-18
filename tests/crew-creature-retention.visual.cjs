'use strict';
/* Browser acceptance for the collection-only Creature Lab: 360/390/desktop,
 * external Crew chat awards, explicit evolution, daily supply, codex and
 * read-only migration of old care memories. No local or embedded conversation. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const OUT=process.env.ART_OUTPUT||'/tmp/crew-creature-retention-shots';
const ROOT='http://127.0.0.1:8787/crew-creature-lab/';
const BASE='http://127.0.0.1:8788/crew-creature-lab/';
fs.mkdirSync(OUT,{recursive:true});
const cases=[['360x640',{width:360,height:640}],['390x844',{width:390,height:844}],['1280x800',{width:1280,height:800}]];
const ledger=total=>JSON.stringify({version:1,total,day:'2026-11-16',todayCount:Math.min(total,8),seen:[]});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CREW_CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [name,viewport] of cases){
   const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'reduce'});
   const old=await context.newPage();
   await old.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});
   await old.waitForTimeout(300);
   await old.screenshot({path:path.join(OUT,'before-master-'+name+'.png')});
   await old.close();
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('dialog',dialog=>dialog.accept());
   await page.goto(ROOT+'?qa=1',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>!!window.__CREATURE_QA__);
   await page.waitForTimeout(300);
   for(const id of ['localChatPanel','chatForm','chatInput','hatchIdeas','careChoices','voicePanel','voiceFrameHost','openVoice']){
    assert.equal(await page.locator('#'+id).count(),0,name+' must remove '+id);
   }
   assert.equal(await page.locator('.play-grid>.creature-panel').count(),1);
   assert.equal(await page.locator('#dailyGiftBtn').isVisible(),false,'new egg cannot claim daily supply');
   await page.screenshot({path:path.join(OUT,'after-first-visit-'+name+'.png')});
   if(viewport.width<=390){
    const rect=await page.locator('#canvasWrap').boundingBox();
    assert.ok(rect&&rect.height>=225&&Math.abs(rect.height/rect.width-2)<0.03,
      name+' full-size 1:2 creature artwork: '+JSON.stringify(rect));
    const sizes=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
    assert.ok(sizes.scrollWidth<=sizes.width+1,name+' no horizontal overflow '+JSON.stringify(sizes));
   }
   // Real app reward storage is written by completed friends/teacher exchanges.
   // Here seed its aggregate ledger; the Lab imports the unclaimed difference.
   await page.evaluate(value=>localStorage.setItem('crew-creature-chat-rewards-v1',value),ledger(18));
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.__CREATURE_QA__);
   assert.equal(await page.evaluate(()=>window.__CREATURE_QA__.energy()),18,'Crew-wide reward imports');
   assert.equal(await page.locator('#evolveBtn').innerText(),'🥚 孵出我的生物');
   assert.equal(await page.evaluate(()=>window.__CREATURE_QA__.state().creature.stage),0,'no automatic hatch');
   await page.locator('#evolveBtn').click();
   await page.waitForTimeout(550);
   const hatched=await page.evaluate(()=>window.__CREATURE_QA__.state().creature);
   assert.equal(hatched.stage,1);assert.ok(hatched.line);
   assert.match(await page.locator('#linePreview').innerText(),/已遇見/);
   assert.equal(await page.locator('#dailyGiftBtn').isVisible(),true);
   await page.locator('#dailyGiftBtn').click();
   assert.equal(await page.locator('#dailyGiftBtn').isVisible(),false,'daily supply hidden once claimed');
   const afterSupply=await page.evaluate(()=>window.__CREATURE_QA__.gifts());
   await page.reload({waitUntil:'domcontentloaded'});
   assert.equal(await page.evaluate(()=>window.__CREATURE_QA__.state().creature.line),hatched.line);
   assert.equal(await page.evaluate(()=>window.__CREATURE_QA__.energy()),16);
   assert.equal(await page.evaluate(()=>window.__CREATURE_QA__.gifts()),afterSupply);
   await page.screenshot({path:path.join(OUT,'after-hatch-'+name+'.png')});
   // Energy is earned externally; progression remains a deliberate button press.
   for(let stage=2;stage<=4;stage++){
    assert.equal(await page.locator('#evolveBtn').isVisible(),true);
    await page.locator('#evolveBtn').click();
    await page.waitForTimeout(560);
    assert.equal(await page.evaluate(()=>window.__CREATURE_QA__.state().creature.stage),stage);
   }
   assert.equal(await page.locator('#evolveBtn').isVisible(),false);
   assert.equal(await page.evaluate(()=>window.__CREATURE_QA__.energy()),2);
   assert.match(await page.locator('#linePreview').innerText(),/已養成/);
   assert.match(await page.locator('#gallery').innerText(),/完全體/);
   await page.screenshot({path:path.join(OUT,'after-final-'+name+'.png')});
   // Existing gift mechanics and all sixteen discoveries are unchanged.
   const seen=await page.evaluate(()=>{
    const qa=window.__CREATURE_QA__,items=qa.giftItems();
    const total=items.reduce((sum,item)=>sum+item.weight,0);let offset=0;
    for(const item of items){
     qa.grantGift('evolve');
     qa.openGift(()=>(offset+item.weight/3)/total);
     offset+=item.weight;
    }
    return Object.keys(qa.giftSeen());
   });
   assert.equal(seen.length,16,'all 16 gift discoveries persist');
   assert.equal(await page.locator('#giftCollectionCount').innerText(),'16/16');
   await page.reload({waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('#giftCollectionCount').innerText(),'16/16');
   assert.deepEqual(errors,[],'browser JS exceptions');
   await page.close();await context.close();
   console.log('CREATURE_COLLECTION_ONLY_OK '+name);
  }
  // Legacy care memories are preserved, but read-only. Daily supply uses
  // the existing lastDailyGift marker, independent of conversation.
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
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto(ROOT+'?qa=1');
  const existing={line:'stardragon',stage:4,topics:['cosmos'],sentences:19,
   memories:[{date:'2026-11-14',text:'星龍和你一起追流星，許了一個小願望。',topic:'cosmos'}]};
  await page.evaluate(saved=>{
   localStorage.setItem('__crew_visual_day','2026-11-15');
   localStorage.setItem('crew-creature-lab-v1',JSON.stringify({
    version:1,energy:7,externalEnergyClaimed:7,creature:saved,collection:[saved],
    encountered:{stardragon:true},gifts:2,giftCollection:{},giftSeen:{},lastDailyGift:'2026-11-14'
   }));
  },existing);
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#memoryArchive').isVisible(),true);
  assert.equal(await page.locator('#memoryArchiveList p').count(),1);
  await page.locator('#memoryArchive summary').click();
  assert.match(await page.locator('#memoryArchiveList').innerText(),/追流星/);
  assert.equal(await page.locator('#dailyGiftBtn').isVisible(),true);
  await page.locator('#dailyGiftBtn').click();
  assert.equal(await page.locator('#dailyGiftBtn').isVisible(),false);
  const gifts=await page.evaluate(()=>window.__CREATURE_QA__.gifts());
  await page.screenshot({path:path.join(OUT,'after-legacy-memory-390x844.png')});
  await page.reload();
  assert.equal(await page.evaluate(()=>window.__CREATURE_QA__.gifts()),gifts);
  assert.equal(await page.locator('#dailyGiftBtn').isVisible(),false);
  await page.evaluate(()=>localStorage.setItem('__crew_visual_day','2026-11-16'));
  await page.reload();
  assert.equal(await page.locator('#dailyGiftBtn').isVisible(),true);
  await page.locator('#dailyGiftBtn').click();
  assert.equal(await page.evaluate(()=>window.__CREATURE_QA__.gifts()),gifts+1);
  assert.equal(await page.evaluate(()=>window.__CREATURE_QA__.state().creature.memories.length),1);
  await page.screenshot({path:path.join(OUT,'after-next-day-supply-390x844.png')});
  assert.deepEqual(errors,[],'legacy page has no JS exceptions');
  await context.close();
  console.log('CREATURE_READ_ONLY_MEMORY_DAILY_SUPPLY_OK');
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
