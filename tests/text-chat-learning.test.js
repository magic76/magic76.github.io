const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function load(file,names){
 const source=read(file),ctx={};
 vm.runInNewContext(stripTypeScriptTypes(source,{mode:'strip'}).replace(/^export /gm,'')+`\nObject.assign(this,{${names.join(',')}})`,ctx);
 return ctx;
}
const {stripFriendReplyMeta,parseFriendReply,friendGuestSystem,FRIEND_TEXT_INSTRUCTIONS}=load('web-spa/src/live/textChatReplies.ts',['stripFriendReplyMeta','parseFriendReply','friendGuestSystem','FRIEND_TEXT_INSTRUCTIONS']);
const {looksLikePractice,makeLearningCheck,summarizeLearning}=load('web-spa/src/live/textChatLearning.ts',['looksLikePractice','makeLearningCheck','summarizeLearning']);
const next='[[NEXT_REPLIES]]\n- We can go tomorrow.\n- I would love to try.\n[[/NEXT_REPLIES]]';
const response='That sounds fun.\n[[TIP]]I went there yesterday.[[/TIP]]\n[[PHRASE]]That sounds fun.[[/PHRASE]]\n'+next;

test('tip and phrase are isolated from the valid NEXT_REPLIES suffix',()=>{
 const result=parseFriendReply(response);
 assert.equal(result.text,'That sounds fun.');
 assert.equal(result.tip,'I went there yesterday.');
 assert.equal(result.phrase,'That sounds fun.');
 assert.deepEqual(Array.from(result.replies),['We can go tomorrow.','I would love to try.']);
 assert.equal(stripFriendReplyMeta(response),'That sounds fun.');
});
test('missing, malformed, split and trailing markers fail closed without showing tags or ghost tip',()=>{
 for(const raw of [
  'Hello!\n[[TIP]]', 'Hello!\n[[TIP]]unfinished', 'Hello!\n[[TIP]]X[[/TIP',
  'Hello!\n[[PHRASE]]', 'Hello!\n'+next+'\ntrailing text',
  'Hello!\n[[TIP]]too\nmany[[/TIP]]\n'+next,
  'Hello!\n[[PHRASE]]phrase[[/PHRASE]]\n[[TIP]]wrong order[[/TIP]]\n'+next,
 ]){
  const parsed=parseFriendReply(raw);
  assert.equal(parsed.text,'Hello!');
  assert.equal(parsed.tip,null);
  assert.equal(parsed.phrase,null);
  assert.doesNotMatch(stripFriendReplyMeta(raw),/\[\[|TIP|PHRASE|NEXT_REPLIES/);
 }
 for(const token of ['[[TIP]]','[[PHRASE]]','[[NEXT_REPLIES]]']){
  for(let n=2;n<token.length;n++)assert.equal(stripFriendReplyMeta('Hi.\n'+token.slice(0,n)),'Hi.');
 }
 assert.equal(parseFriendReply('你好。\n(我是 Zoe。)\n'+next).text,'你好。\n(我是 Zoe。)');
});
test('friend prompts end both Live and guest system, teacher never gets instructions',()=>{
 const panel=read('web-spa/src/live/TextChatPanel.tsx');
 const live=read('web-spa/src/live/liveTextChat.ts');
 assert.match(FRIEND_TEXT_INSTRUCTIONS,/Text-only exception|Keyboard-only exception/);
 assert.match(FRIEND_TEXT_INSTRUCTIONS,/natural|native/);
 assert.match(FRIEND_TEXT_INSTRUCTIONS,/immersion/);
 assert.match(FRIEND_TEXT_INSTRUCTIONS,/bilingual/);
 assert.match(FRIEND_TEXT_INSTRUCTIONS,/\[\[TIP\]\]/);
 assert.match(FRIEND_TEXT_INSTRUCTIONS,/\[\[PHRASE\]\]/);
 assert.match(FRIEND_TEXT_INSTRUCTIONS,/No extra text after the suffix/);
 assert.match(live,/this\.friendScope\?FRIEND_TEXT_INSTRUCTIONS:""/);
 assert.match(panel,/const guestSystem=isFriend\?friendGuestSystem\(guestBase\+easyFriendTextReplyRule\(guestBase,isFriend\)\):guestBase/);
 const guest=friendGuestSystem('Friend persona\n'+'big '.repeat(2000)+'\n[FRIEND LANGUAGE CONTROL — FULL IMMERSION]');
 assert.ok(guest.length<=6000);
 assert.ok(guest.endsWith(FRIEND_TEXT_INSTRUCTIONS));
 assert.match(panel,/const parsed=isFriend\?parseFriendReply\(reply\):null/);
 assert.match(panel,/if\(parsed\)reply=parsed\.text/);
 assert.match(panel,/learning\.record\(answerIndex,reply,parsed\.tip,parsed\.phrase,value\)/);
});
test('no correction or phrase metadata reaches saved history, resume preview, or outgoing context',()=>{
 const panel=read('web-spa/src/live/TextChatPanel.tsx');
 const transcript=read('web-spa/src/live/sessionTranscript.ts');
 assert.match(panel,/await reveal\.finish\(reply\)/);
 assert.ok(panel.indexOf('if(parsed)reply=parsed.text')<panel.indexOf('const complete=[...next'));
 assert.match(panel,/saveFriendResume\(sessionScope,complete\)/);
 assert.match(panel,/messages\.slice\(-10\)\.map\(m=>m\.role\+": "\+m\.text/);
 assert.match(panel,/next\.slice\(-10\)\.map\(m=>\(\{role:m\.role,text:m\.text\}\)\)/);
 assert.match(transcript,/role:m\.role,text:m\.text/);
 assert.doesNotMatch(transcript,/tip|phrase/i);
 const parsed=parseFriendReply(response);
 assert.doesNotMatch(parsed.text,/\[\[|I went there yesterday/);
});
test('practice language detection, localized check action and mode control',()=>{
 assert.equal(looksLikePractice('I goed to market yesterday','en','zh-TW'),true);
 assert.equal(looksLikePractice('我今天去市場','en','zh-TW'),false);
 assert.equal(looksLikePractice('今日はお元気ですか','ja','zh-TW'),true);
 assert.equal(looksLikePractice('我是中文','ja','zh-TW'),false);
 assert.equal(looksLikePractice('Estoy muy feliz','es','zh-TW'),true);
 assert.equal(looksLikePractice('hello','en','zh-TW'),false);
 assert.equal(makeLearningCheck('I goed home','en','natural','我這句說得自然嗎？'),'我這句說得自然嗎？ 「I goed home」');
 assert.equal(makeLearningCheck('I goed home','en','bilingual','我這句說得自然嗎？'),'我這句說得自然嗎？ 「I goed home」');
 assert.equal(makeLearningCheck('I goed home','en','immersion','我這句說得自然嗎？'),'Does this sound natural? 「I goed home」');
 const panel=read('web-spa/src/live/TextChatPanel.tsx');
 const ui=read('web-spa/src/live/TextChatLearning.tsx');
 assert.match(ui,/scope\.startsWith\("friend:"\)/);
 assert.match(ui,/onSend\(value\)/);
 assert.match(panel,/value=>void sendMessage\(value\)/);
 assert.match(panel,/learning\.canCheck\(i,m\.text\)/);
 assert.match(panel,/guestMode&&\["unavailable","exhausted","paused"\]\.includes\(guestPhase\)/);
 assert.match(ui,/checked\.includes\(index\)/);
});
test('summary only after 3 user turns or 2 corrections, deduplicated and bounded to three',()=>{
 const msgs=[{role:'user',text:'I goed'},{role:'assistant',text:'One'},
  {role:'user',text:'I runned'},{role:'assistant',text:'Two'},
  {role:'user',text:'I was happy'},{role:'assistant',text:'Three'}];
 const notes=[{index:1,reply:'One',original:'I goed',tip:'I went',phrase:'What a day'},
  {index:3,reply:'Two',original:'I runned',tip:'I ran',phrase:'What a day'},
  {index:5,reply:'Three',original:'I was happy',tip:null,phrase:'Sounds lovely'}];
 assert.equal(summarizeLearning(msgs.slice(0,4),notes.slice(0,1)).length,0);
 assert.equal(summarizeLearning(msgs.slice(0,4),notes.slice(0,2)).length,3);
 assert.deepEqual(Array.from(summarizeLearning(msgs,notes)),['I goed → I went','What a day','I runned → I ran']);
 assert.equal(summarizeLearning(msgs,notes.map(n=>({...n,reply:'changed'}))).length,0);
 assert.equal(summarizeLearning(msgs,[]).length,0);
});
test('eleven locales have only string leaves, no guestText or followUps alterations; UI interaction sizes',()=>{
 for(const locale of ['zh-TW','en','ja','ko','es','fr','de','pt-BR','id','vi','th']){
  const data=JSON.parse(read(`web-spa/src/i18n/locales/${locale}/voice.json`));
  assert.deepEqual(Object.keys(data.textChat.learning).sort(),['better','checkButton','checkQuestion','dismiss','summaryTitle']);
  assert.ok(Object.values(data.textChat.learning).every(v=>typeof v==='string'&&v.trim()),locale);
  assert.equal(Object.keys(data.textChat.followUps).length,3);
  assert.equal(Object.keys(data.guestText).length,25);
 }
 const panel=read('web-spa/src/live/TextChatPanel.tsx');
 const ui=read('web-spa/src/live/TextChatLearning.tsx');
 const css=read('web-spa/src/live/TextChatPanel.css');
 assert.ok(Buffer.byteLength(panel)<26000);
 assert.ok(Buffer.byteLength(ui)<26000);
 assert.match(css,/\.crew-text-learning-check\{[^}]*min-height:44px/);
 assert.match(css,/\.crew-text-learning-header button\{[^}]*min-height:44px/);
 assert.match(css,/\.crew-text-keyboard-open \.crew-text-learning-summary\{display:none\}/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(panel+ui,/trackEvent\(|logEvent\(|analytics\.track\(/);
});
