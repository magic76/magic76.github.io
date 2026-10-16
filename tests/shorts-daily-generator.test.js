const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {execFileSync}=require('node:child_process');
const script=path.resolve(__dirname,'../scripts/generate-shorts-daily.mjs');
const imageTool=path.resolve(__dirname,'../scripts/shorts-encode-webp.py');
const dir=path.join(__dirname,'../content/crew-shorts/approved');
const friends=['zoe','bella','hugo','theo','yuna'];
const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
async function gen(){return import(pathToFileURL(script))}
function setup(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'crew-shorts-daily-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const approved=path.join(root,'content/crew-shorts/approved');fs.mkdirSync(path.join(approved,'media'),{recursive:true});
 const avatars=path.join(root,'assets/friends');fs.mkdirSync(avatars,{recursive:true});
 const day='2026-10-14';
 const posts=friends.map((friend,i)=>({id:friend+'-first',friendId:friend,friendName:friend[0].toUpperCase()+friend.slice(1),
  caption:'Previous event for '+friend+' with continuity and dialogue.',translationZh:'之前的故事',image:'media/'+friend+'.webp',
  imageAlt:'At home with consistent familiar objects and window',publishedAt:day+'T08:00:00+08:00',language:'en',storyId:friend+'-arc'}));
 const source={schema:1,kind:'crew-shorts',source:'seed',posts};
 fs.writeFileSync(path.join(approved,'posts.json'),JSON.stringify(source));
 // The test intentionally uses locally generated synthetic pixels, never published media.
 const png=path.join(root,'fixture.png');
 fs.copyFileSync(path.join(__dirname,'../content/crew-shorts/approved/media/zoe-day1.webp'),png);
 const identities=path.join(root,'content/character-identities');
 fs.mkdirSync(path.join(identities,'v1/friends'),{recursive:true});
 fs.copyFileSync(path.join(__dirname,'../content/character-identities/manifest.json'),path.join(identities,'manifest.json'));
 for(const friend of friends){
  // Real OFFICIAL reference bytes, but no real image API calls.
  fs.copyFileSync(path.join(__dirname,'../assets/friends/crew_friend_'+friend+'.webp'),path.join(avatars,'crew_friend_'+friend+'.webp'));
  fs.copyFileSync(path.join(__dirname,'../content/character-identities/v1/friends/'+friend+'.json'),path.join(identities,'v1/friends/'+friend+'.json'));
  fs.copyFileSync(png,path.join(approved,'media',friend+'.webp'))
 }
 const mock=({badFriend=null,failImage=null}={})=>({
  async stories(){return {stories:friends.map(friend=>({friendId:friend,caption:'Another little chapter in '+friend+' story feels different today.',translationZh:'今天有一個新的日常故事，和昨天很不一樣。',
   scene:'A candid portrait at home with familiar window and props while '+friend+' is trying something new.',imageAlt:'A candid portrait with a familiar window and personal objects'}))}},
  async image(story,avatar,identity){
   assert.equal(identity.identityId,'crew-friend-'+story.friendId+'-v1');
   assert.equal(avatar.mimeType,'image/webp');
   if(story.friendId===failImage)throw Error('simulated image outage');
   return {data:fs.readFileSync(png),mimeType:'image/png'}
  },
  async review(story){return {pass:story.friendId!==badFriend,reason:'same face and unique candid photo',
   checks:Object.fromEntries(['sameFace','sameEyes','sameHair','sameSkin','faceVisible','singleCharacter','sceneMatch','photorealistic','noTextOrLogo'].map(key=>[key,true]))} }
 });
 const encode=(src,dst)=>{fs.copyFileSync(path.join(__dirname,'../content/crew-shorts/approved/media/zoe-day1.webp'),dst);return fs.readFileSync(dst)};
 return {root,approved,png,source,mock,encode};
}
test('daily generator plan is free, nonpublishing and shows prior context',async t=>{const {root,approved}=setup(t);const {generateDaily}=await gen();
 const original=fs.readFileSync(path.join(approved,'posts.json'));
 const r=await generateDaily({root,date:today(),mode:'plan'});
 assert.equal(r.status,'plan-only');assert.equal(r.friends.length,5);assert.deepEqual(fs.readFileSync(path.join(approved,'posts.json')),original);
});
test('preview makes five separately decoded WebPs and never changes approved source',async t=>{const {root,approved,mock,encode}=setup(t);const {generateDaily}=await gen();
 const original=fs.readFileSync(path.join(approved,'posts.json'));
 const r=await generateDaily({root,date:today(),mode:'preview',client:mock(),encode});
 assert.equal(r.status,'preview-ready');assert.equal(r.stories.length,5);
 for(const friend of friends){const name=path.join(root,'crew-shorts-preview',today(),friend+'.webp');assert.ok(fs.statSync(name).size<350*1024)}
 assert.deepEqual(fs.readFileSync(path.join(approved,'posts.json')),original);
});
test('visual QA or image error refuses all source changes',async t=>{const {root,approved,mock,encode}=setup(t);const {generateDaily}=await gen();
 const before=fs.readFileSync(path.join(approved,'posts.json'));
 await assert.rejects(generateDaily({root,date:today(),mode:'publish',client:mock({badFriend:'hugo'}),encode}),/visual QA rejected/);
 assert.deepEqual(fs.readFileSync(path.join(approved,'posts.json')),before);
 assert.equal(JSON.parse(fs.readFileSync(path.join(root,'crew-shorts-preview',today(),'manifest.json'))).status,'failed');
 assert.equal(fs.readdirSync(path.join(approved,'media')).length,5);
 await assert.rejects(generateDaily({root,date:today(),mode:'publish',client:mock({failImage:'theo'}),encode}),/simulated image outage/);
 assert.deepEqual(fs.readFileSync(path.join(approved,'posts.json')),before);
});
test('approved batch persists 5 originals and is idempotent on retry',async t=>{const {root,approved,mock,encode}=setup(t);const {generateDaily}=await gen();
 const r=await generateDaily({root,date:today(),mode:'publish',client:mock(),encode});
 assert.equal(r.status,'approved');
 const feed=JSON.parse(fs.readFileSync(path.join(approved,'posts.json')));
 assert.equal(feed.posts.length,10);assert.equal(feed.source,'daily');
 assert.ok(feed.posts.slice(0,5).every(p=>p.id.endsWith('-first')));
 for(const friend of friends)assert.ok(fs.existsSync(path.join(approved,'media',friend+'-'+today()+'.webp')));
 const again=await generateDaily({root,date:today(),mode:'publish',client:{stories(){throw Error('must not run')}},encode});
 assert.equal(again.status,'already-approved');assert.equal(JSON.parse(fs.readFileSync(path.join(approved,'posts.json'))).posts.length,10);
});
test('seeded days permit private preview but cannot republish, and future story spoilers stay out of context',async t=>{
 const {root,approved,mock,encode,source}=setup(t);const {generateDaily,createPrompt}=await gen();
 const d=today();
 source.posts.push(...friends.map(friend=>({...source.posts.find(p=>p.friendId===friend),id:friend+'-seeded',publishedAt:d+'T08:00:00+08:00'})));
 source.posts.push({...source.posts[0],id:'zoe-future',caption:'FUTURE SPOILER must never appear in current-day prompt',publishedAt:'2099-12-31T08:00:00+08:00'});
 fs.writeFileSync(path.join(approved,'posts.json'),JSON.stringify(source));
 assert.doesNotMatch(createPrompt(source,d),/FUTURE SPOILER/);
 const prior=fs.readFileSync(path.join(approved,'posts.json'));
 const preview=await generateDaily({root,date:d,mode:'preview',client:mock(),encode});
 assert.equal(preview.status,'preview-ready');assert.equal(preview.stories.length,5);
 const skipped=await generateDaily({root,date:d,mode:'publish',client:{stories(){throw Error('should skip')}}});
 assert.equal(skipped.status,'already-approved');
 assert.deepEqual(fs.readFileSync(path.join(approved,'posts.json')),prior);
});
test('invalid AI stories fail and encoder rejects nonportrait images when Pillow is installed',async t=>{const {root}=setup(t);const {validateStories,encodeWebP}=await gen();
 assert.throws(()=>validateStories({stories:friends.map(friend=>({friendId:friend,caption:'x',translationZh:'錯',scene:'bad',imageAlt:'bad'}))},{posts:[]}),/invalid English caption/);
 let pillowAvailable=true;try{execFileSync('python3',['-c','from PIL import Image'],{stdio:'ignore'})}catch{pillowAvailable=false}
 if(!pillowAvailable)return;
 const wide=path.join(root,'wide.png');
 execFileSync('python3',['-c',`from PIL import Image; Image.new('RGB',(1200,900),(55,66,77)).save(${JSON.stringify(wide)})`]);
 assert.throws(()=>encodeWebP(wide,path.join(root,'wide.webp')));
});
test('workflow never schedules API calls without explicit enablement',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../.github/workflows/crew-shorts-daily-generate.yml'),'utf8');
 assert.match(s,/CREW_SHORTS_AUTO_GENERATE_ENABLED/);
 assert.match(s,/GEMINI_API_KEY/);
 assert.match(s,/upload-artifact@v4/);
 assert.match(s,/crew-shorts-pages-publish/);
 assert.match(s,/cron: "30 22 \* \* \*"/);
});
test('Bella approved-story private preview only calls image and QA once without publication',async t=>{
 const {root,approved,mock,encode,source}=setup(t);const {generateDaily}=await gen();
 const date='2026-10-17';
 source.posts.push(...friends.map(friend=>({...source.posts.find(x=>x.friendId===friend),
  id:friend+'-day2',publishedAt:date+'T08:00:00+08:00',
  imageAlt:friend==='bella'?'Bella enjoys an indoor picnic in her living room with fruit and sandwiches on a blanket.':'An ordinary home activity for the friend today.'})));
 fs.writeFileSync(path.join(approved,'posts.json'),JSON.stringify(source));
 const original=fs.readFileSync(path.join(approved,'posts.json'));
 const normal=mock();let imageCalls=0,qaCalls=0;
 const ai={stories(){throw Error('must not generate new stories in approved mode')},
  image(...args){imageCalls++;assert.equal(args[0].friendId,'bella');return normal.image(...args)},
  review(...args){qaCalls++;assert.equal(args[0].friendId,'bella');return normal.review(...args)}};
 const r=await generateDaily({root,date,mode:'preview',friend:'bella',useApprovedStory:true,client:ai,encode});
 assert.equal(r.status,'preview-ready');assert.equal(r.stories.length,1);
 assert.equal(imageCalls,1);assert.equal(qaCalls,1);
 assert.equal(r.stories[0].friendId,'bella');
 assert.match(r.stories[0].scene,/indoor picnic/);
 assert.ok(fs.existsSync(path.join(root,'crew-shorts-preview',date,'bella.webp')));
 assert.ok(!fs.existsSync(path.join(root,'crew-shorts-preview',date,'zoe.webp')));
 assert.deepEqual(fs.readFileSync(path.join(approved,'posts.json')),original);
});
test('official master SHA mismatch fails BEFORE any model request',async t=>{
 const {root,mock,encode}=setup(t);const {generateDaily}=await gen();
 fs.writeFileSync(path.join(root,'assets/friends/crew_friend_bella.webp'),Buffer.alloc(12000,65));
 let calls=0;
 const ai={...mock(),stories(){calls++;throw Error('must not call model')}};
 await assert.rejects(generateDaily({root,date:today(),mode:'preview',friend:'bella',client:ai,encode}),/master image changed/);
 assert.equal(calls,0);
});
test('identity QA fails closed if the model returns pass=true without explicit feature checks',async t=>{
 const {root,mock,encode}=setup(t);const {generateDaily}=await gen();
 const ai={...mock(),async review(){return {pass:true,reason:'looks plausible'}}};
 await assert.rejects(generateDaily({root,date:today(),mode:'preview',friend:'bella',client:ai,encode}),/identity QA rejected bella/);
});
test('image client supplies exactly ONE verified reference image with no previous Shorts photo',async t=>{
 const {root}=setup(t);const {geminiClient}=await gen();
 const {loadIdentity}=await import(pathToFileURL(path.resolve(__dirname,'../scripts/shorts-character-identity.mjs')));
 const anchor=loadIdentity(root,'friend','bella');
 let req;
 const client=geminiClient({key:'mock-test-key',request:async(url,init)=>{
  req=JSON.parse(init.body);
  return {ok:true,json:async()=>({candidates:[{content:{parts:[{inlineData:{mimeType:'image/webp',data:fs.readFileSync(path.join(root,'assets/friends/crew_friend_bella.webp')).toString('base64')}}]}}]})};
 }});
 const story={friendId:'bella',scene:'Bella enjoys her spontaneous indoor picnic with sandwiches in the living room.',
  imageAlt:'Bella sits on a blanket with an indoor picnic in her apartment.',storyContext:'Yesterday she abandoned the outdoor picnic because of the rain.'};
 await client.image(story,anchor.reference,anchor.identity);
 const parts=req.contents[0].parts;
 assert.equal(parts.length,2);
 assert.equal(parts.filter(x=>x.inlineData).length,1);
 assert.match(parts[0].text,/canonical identity reference/);
 assert.match(parts[0].text,/golden-blonde/);
 assert.match(parts[0].text,/Yesterday she abandoned/);
 assert.equal(parts[1].inlineData.mimeType,'image/webp');
 assert.equal(parts[1].inlineData.data,anchor.reference.data.toString('base64'));
});
test('single-person generation is preview-only and future unapproved previews remain blocked',async t=>{
 const {root,mock,encode}=setup(t);const {generateDaily}=await gen();
 await assert.rejects(generateDaily({root,date:today(),mode:'publish',friend:'bella',client:mock(),encode}),/single-friend operation cannot publish/);
 await assert.rejects(generateDaily({root,date:'2099-12-31',mode:'preview',friend:'bella',client:mock(),encode}),/cannot generate future unapproved stories/);
});
