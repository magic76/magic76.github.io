const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const source=read('web-spa/src/live/textChatReplies.ts');
const code=stripTypeScriptTypes(source,{mode:'strip'}).replace(/^export /gm,'');
const context={};
vm.runInNewContext(code+'\nObject.assign(this,{FRIEND_TEXT_INSTRUCTIONS,stripFriendReplyMeta,parseFriendReply,friendGuestSystem});',context);
const {stripFriendReplyMeta,parseFriendReply,friendGuestSystem,FRIEND_TEXT_INSTRUCTIONS}=context;
const metadata=(...lines)=>'[[NEXT_REPLIES]]\n'+lines.map(line=>'- '+line).join('\n')+'\n[[/NEXT_REPLIES]]';

test('valid suffix yields only visible friend text and 2–3 usable user utterances',()=>{
 const text='Sounds great! Where shall we meet?';
 const result=parseFriendReply(text+'\n'+metadata('I like the window seat.','Let’s go at five.','I prefer tea.'));
 assert.equal(result.text,text);
 assert.deepEqual(Array.from(result.replies),['I like the window seat.','Let’s go at five.','I prefer tea.']);
 assert.equal(parseFriendReply('你好！\n(今天想喝咖啡。)\n'+metadata('我想點咖啡。','靠窗坐吧。')).text,'你好！\n(今天想喝咖啡。)', 'beginner meaning is preserved');
});

test('missing, unfinished, invalid, duplicated, and oversized suggestions never leak markers',()=>{
 for(const raw of [
  'Hi there!',
  'Hi.\n[[NEXT_REPLIES]]\n- Hello',
  'Hi.\n'+metadata('Only one'),
  'Hi.\n'+metadata('Same','Same'),
  'Hi.\n'+metadata('Good','A '.repeat(70)),
  'Hi.\n[NEXT_REPLIES]\n- A\n- B',
  'Hi.\n[[NEXT_REPLIES]]\n- First\n- Second\n[[/NEXT_REPLIES]]\nBAD',
 ]){
  const parsed=parseFriendReply(raw);
  assert.equal(parsed.text,'Hi there!'===raw?'Hi there!':'Hi.');
  assert.equal(parsed.replies,null);
  assert.doesNotMatch(parsed.text,/NEXT_REPLIES|\[\[/);
 }
});

test('Live partials do not flash the start token at any position while it streams',()=>{
 const beginning='A lovely idea.\n';
 for(let i=2;i<'[[NEXT_REPLIES]]'.length;i++){
  const partiallyArrived=beginning+'[[NEXT_REPLIES]]'.slice(0,i);
  assert.equal(stripFriendReplyMeta(partiallyArrived),'A lovely idea.');
 }
 assert.equal(stripFriendReplyMeta(beginning+metadata('Sure.','Sounds good.')),'A lovely idea.');
 assert.equal(stripFriendReplyMeta('Just a chat.'),'Just a chat.');
});

test('friend-only system tail survives the 6000-character guest budget, including Shorts context',()=>{
 assert.match(FRIEND_TEXT_INSTRUCTIONS,/1–3 short|40 English words/);
 assert.match(FRIEND_TEXT_INSTRUCTIONS,/Ask at most ONE question/);
 assert.match(FRIEND_TEXT_INSTRUCTIONS,/Preserve the first two beginner text replies/);
 assert.match(FRIEND_TEXT_INSTRUCTIONS,/no extra text after|No extra text after/);
 const plain=friendGuestSystem('PERSONA\nMODE');
 assert.equal(plain,'PERSONA\nMODE'+FRIEND_TEXT_INSTRUCTIONS);
 const long='Original character details\n'+('X'.repeat(7100))+'\n[SHORTS TEXT HANDOFF]\nThe original post is about cycling\n[LANGUAGE RULE] Japanese';
 const result=friendGuestSystem(long);
 assert.ok(result.length<=6000,`system is ${result.length} chars`);
 assert.match(result,/Original character details/);
 assert.match(result,/The original post is about cycling/);
 assert.match(result,/\[LANGUAGE RULE\] Japanese/);
 assert.ok(result.endsWith(FRIEND_TEXT_INSTRUCTIONS));
 const shorts='[IDENTITY] Zoe\n'+('persona '.repeat(1100))+'\n[SHORTS TEXT HANDOFF — FIRST REPLY]\nVerified Shorts caption: a small lost kitten\n[LANGUAGE] Korean';
 const fit=friendGuestSystem(shorts);
 assert.ok(fit.length<=6000);
 assert.match(fit,/Verified Shorts caption: a small lost kitten/);
 assert.match(fit,/\[LANGUAGE\] Korean/);
 assert.ok(fit.endsWith(FRIEND_TEXT_INSTRUCTIONS));
});

test('friend prompts cover Live and free Worker; teacher is not subject to the suffix',()=>{
 const panel=read('web-spa/src/live/TextChatPanel.tsx');
 const live=read('web-spa/src/live/liveTextChat.ts');
 assert.match(panel,/sessionScope\.startsWith\("friend:"\)/);
 assert.match(panel,/const guestSystem=isFriend\?friendGuestSystem\(guestBase\):guestBase/);
 assert.match(panel,/status=>\{if\(mounted\.current\)setLiveStatus\(status\)\},isFriend/);
 assert.match(live,/this\.friendScope\?FRIEND_TEXT_INSTRUCTIONS:""/);
 assert.match(live,/this\.searchEnabled\?.*FRIEND_TEXT_INSTRUCTIONS/);
 assert.match(panel,/if\(parsed\)reply=parsed\.text/);
 assert.ok(panel.indexOf('if(parsed)reply=parsed.text')<panel.indexOf('await reveal.finish(reply)'));
 assert.ok(panel.indexOf('await reveal.finish(reply)')<panel.indexOf('writeSessionTranscript(sessionScope,complete)'));
 assert.ok(panel.indexOf('writeSessionTranscript(sessionScope,complete)')<panel.indexOf('saveFriendResume(sessionScope,complete)'));
 assert.match(panel,/stripFriendReplyMeta\(text\)/);
 assert.match(panel,/next\.slice\(-10\)\.map\(m=>\(\{role:m\.role,text:m\.text\}\)\)/);
 assert.match(panel,/messages\.slice\(-10\)\.map\(m=>m\.role\+": "\+m\.text/);
});

test('typing and safe fallback phrases are localized in all 11 voice namespaces',()=>{
 const langs=['zh-TW','en','ja','ko','es','fr','de','pt-BR','vi','id','th'];
 for(const locale of langs){
  const dict=JSON.parse(read(`web-spa/src/i18n/locales/${locale}/voice.json`));
  assert.match(dict.textChat.typing,/\{\{name\}\}/,`${locale} typing interpolates a name`);
  assert.equal(typeof dict.textChat.nextHeading,'string');
  assert.equal(Object.keys(dict.textChat.followUps).length,3);
  assert.ok(Object.values(dict.textChat.followUps).every(value=>typeof value==='string'&&value.length>0));
 }
 const panel=read('web-spa/src/live/TextChatPanel.tsx');
 const css=read('web-spa/src/live/TextChatPanel.css');
 const next=read('web-spa/src/live/TextChatNextReplies.tsx');
 assert.match(panel,/t\("textChat\.typing",\{name:speaker\}\)/);
 assert.match(panel,/busy&&requestSent&&messages\.at\(-1\)\?\.role!=="assistant"/);
 assert.match(panel,/aria-live="off"/);
 assert.match(css,/prefers-reduced-motion:reduce\)\{\.crew-text-typing-dots i\{animation:none/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/\.crew-text-keyboard-open \.crew-text-next-replies\{display:none\}/);
 assert.match(next,/useTeacherStore\(state=>state\.friendChatMode\)/);
 assert.match(next,/modeFromFriendSystem\(system,storedMode\)/);
 assert.match(next,/friendFallbackPhrases\(code,mode,keys\.map\(key=>t\(key\)\)\)/);
 assert.doesNotMatch(next,/getFixedT\(/);
 assert.match(panel,/useFriendNextReplyFallback\(system\)/);
 assert.match(panel,/nextReplies==="fallback"\?fallbackReplies:nextReplies/);
 assert.match(next,/onClick=\{\(\)=>onPick\(reply\)\}/);
 assert.ok(Buffer.byteLength(panel)<26000);
});

const fallbackSource=read('web-spa/src/live/friendReplyFallback.ts');
const fallbackContext={};
vm.runInNewContext(stripTypeScriptTypes(fallbackSource,{mode:'strip'}).replace(/^export /gm,'')+
 '\nObject.assign(this,{modeFromFriendSystem,friendFallbackPhrases});',fallbackContext);
const {modeFromFriendSystem,friendFallbackPhrases}=fallbackContext;

test('fallback uses the practiced language even if only the zh-TW voice namespace is loaded',()=>{
 const ui=['多說一點。','為什麼？','換個話題。'];
 assert.deepEqual(Array.from(friendFallbackPhrases('en','immersion',ui)),
  ['Tell me more.','Why is that?','Let’s talk about something else.']);
 assert.deepEqual(Array.from(friendFallbackPhrases('en','bilingual',ui)),
  ['Tell me more.','Why is that?','Let’s talk about something else.']);
 assert.deepEqual(Array.from(friendFallbackPhrases('en','natural',ui)),ui);
 assert.deepEqual(Array.from(friendFallbackPhrases('it','immersion',ui)),
  ['Raccontami di più.','Perché?','Cambiamo argomento.']);
 for(const code of ['zh','en','ja','ko','es','fr','de','it','vi','id','th','pt']){
  const entries=Array.from(friendFallbackPhrases(code,'immersion',ui));
  assert.equal(entries.length,3,code);
  assert.ok(entries.every(phrase=>typeof phrase==='string'&&phrase.trim()),code);
 }
});

test('page-local mode directive wins over the persisted store and rerenders fallback',()=>{
 const ui=['多說一點。','為什麼？','換個話題。'];
 const directive=label=>'[CHARACTER] Zoe\n[FRIEND LANGUAGE CONTROL — '+label+', silent instruction] text';
 const native=directive('NATURAL SINGLE LANGUAGE');
 const immersion=directive('FULL IMMERSION');
 const bilingual=directive('TARGET CHAT WITH NATIVE HELP');
 assert.equal(modeFromFriendSystem(native,'immersion'),'natural');
 assert.equal(modeFromFriendSystem(immersion,'natural'),'immersion');
 assert.equal(modeFromFriendSystem(bilingual,'natural'),'bilingual');
 assert.equal(modeFromFriendSystem('no directive','immersion'),'immersion');
 const after=friendFallbackPhrases('en',modeFromFriendSystem(immersion,'natural'),ui);
 assert.deepEqual(Array.from(after),['Tell me more.','Why is that?','Let’s talk about something else.']);
 assert.deepEqual(Array.from(friendFallbackPhrases('en',modeFromFriendSystem(native,'immersion'),ui)),ui);
 const panel=read('web-spa/src/live/TextChatPanel.tsx');
 assert.match(panel,/setNextReplies\(isFriend\?\(parsed\?\.replies\|\|"fallback"\):null\)/);
 assert.match(panel,/saved\.at\(-1\)\?\.role==="assistant"\?"fallback":null/);
 assert.match(panel,/nextReplies==="fallback"\?fallbackReplies:nextReplies/);
});
