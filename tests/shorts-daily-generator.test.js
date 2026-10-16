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
 for(const friend of friends){fs.copyFileSync(png,path.join(avatars,'crew_friend_'+friend+'.webp'));
 fs.copyFileSync(png,path.join(approved,'media',friend+'.webp'))}
 const mock=({badFriend=null,failImage=null}={})=>({
  async stories(){return {stories:friends.map(friend=>({friendId:friend,caption:'Another little chapter in '+friend+' story feels different today.',translationZh:'今天有一個新的日常故事，和昨天很不一樣。',
   scene:'A candid portrait at home with familiar window and props while '+friend+' is trying something new.',imageAlt:'A candid portrait with a familiar window and personal objects'}))}},
  async image(story){if(story.friendId===failImage)throw Error('simulated image outage');return {data:fs.readFileSync(png),mimeType:'image/png'}},
  async review(story){return {pass:story.friendId!==badFriend,reason:'same face and unique candid photo'} }
 });
 return {root,approved,png,source,mock};
}
test('daily generator plan is free, nonpublishing and shows prior context',async t=>{const {root,approved}=setup(t);const {generateDaily}=await gen();
 const original=fs.readFileSync(path.join(approved,'posts.json'));
 const r=await generateDaily({root,date:today(),mode:'plan'});
 assert.equal(r.status,'plan-only');assert.equal(r.friends.length,5);assert.deepEqual(fs.readFileSync(path.join(approved,'posts.json')),original);
});
test('preview makes five separately decoded WebPs and never changes approved source',async t=>{const {root,approved,mock}=setup(t);const {generateDaily}=await gen();
 const original=fs.readFileSync(path.join(approved,'posts.json'));
 const r=await generateDaily({root,date:today(),mode:'preview',client:mock()});
 assert.equal(r.status,'preview-ready');assert.equal(r.stories.length,5);
 for(const friend of friends){const name=path.join(root,'crew-shorts-preview',today(),friend+'.webp');assert.ok(fs.statSync(name).size<350*1024)}
 assert.deepEqual(fs.readFileSync(path.join(approved,'posts.json')),original);
});
test('visual QA or image error refuses all source changes',async t=>{const {root,approved,mock}=setup(t);const {generateDaily}=await gen();
 const before=fs.readFileSync(path.join(approved,'posts.json'));
 await assert.rejects(generateDaily({root,date:today(),mode:'publish',client:mock({badFriend:'hugo'})}),/visual QA rejected/);
 assert.deepEqual(fs.readFileSync(path.join(approved,'posts.json')),before);
 assert.equal(JSON.parse(fs.readFileSync(path.join(root,'crew-shorts-preview',today(),'manifest.json'))).status,'failed');
 assert.equal(fs.readdirSync(path.join(approved,'media')).length,5);
 await assert.rejects(generateDaily({root,date:today(),mode:'publish',client:mock({failImage:'theo'})}),/simulated image outage/);
 assert.deepEqual(fs.readFileSync(path.join(approved,'posts.json')),before);
});
test('approved batch persists 5 originals and is idempotent on retry',async t=>{const {root,approved,mock}=setup(t);const {generateDaily}=await gen();
 const r=await generateDaily({root,date:today(),mode:'publish',client:mock()});
 assert.equal(r.status,'approved');
 const feed=JSON.parse(fs.readFileSync(path.join(approved,'posts.json')));
 assert.equal(feed.posts.length,10);assert.equal(feed.source,'daily');
 assert.ok(feed.posts.slice(0,5).every(p=>p.id.endsWith('-first')));
 for(const friend of friends)assert.ok(fs.existsSync(path.join(approved,'media',friend+'-'+today()+'.webp')));
 const again=await generateDaily({root,date:today(),mode:'publish',client:{stories(){throw Error('must not run')}}});
 assert.equal(again.status,'already-approved');assert.equal(JSON.parse(fs.readFileSync(path.join(approved,'posts.json'))).posts.length,10);
});
test('invalid/repeated AI story fails, and image converter rejects mosaic-shaped images',async t=>{const {root}=setup(t);const {validateStories,encodeWebP}=await gen();
 assert.throws(()=>validateStories({stories:friends.map(friend=>({friendId:friend,caption:'x',translationZh:'錯',scene:'bad',imageAlt:'bad'}))},{posts:[]}),/invalid English caption/);
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