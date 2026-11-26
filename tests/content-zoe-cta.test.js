const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=name=>fs.readFileSync(path.join(root,name),"utf8");
const src=name=>read("web-spa/src/"+name);
const locales=["de","en","es","fr","id","ja","ko","pt-BR","th","vi","zh-TW"];
const newTopics=[
 "game-play","game-connect4","game-reversi","game-gomoku","game-1a2b","game-number-bomb","game-memory","game-taboo",
 "guide-ai-english-speaking","guide-ai-conversation-partner","guide-travel-english-dialogues",
 "guide-english-pronunciation","guide-gemini-key-for-ai-practice","research-article"
];

test("#46 daily fortune: chat is first, Gemini help is collapsed, and self-link hidden",()=>{
 const panel=src("fortune/FortuneZoeReading.tsx"),card=src("fortune/FortuneDailyCard.tsx"),css=src("fortune/dailyCard.css");
 const chat=panel.indexOf('<Link className="fortune-zoe-reading-chat"');
 const help=panel.indexOf('<details className="fortune-zoe-reading-key-more"');
 const followup=panel.indexOf('<form className="fortune-zoe-reading-followup"');
 assert.ok(chat>panel.indexOf('zoeReading.staticNote')&&chat<help&&chat<followup,
  "read first, chat next, follow-ups next, optional key help last");
 assert.match(panel,/!hasKey&&<details className="fortune-zoe-reading-key-more">/);
 assert.match(panel,/<summary>\{t\("zoeReading.keyMore"\)\}<\/summary>/);
 assert.match(panel,/<GeminiSetupNotice returnTo=\{returnTo\}/);
 assert.match(panel,/hasKey&&error==="key"&&<GeminiSetupNotice force returnTo=\{returnTo\}/);
 assert.match(panel,/friend\/live\?id=zoe&from=fortune&chat=text&quote=daily&chart=/);
 assert.match(card,/searchParams\.get\("zoe"\)!=="1"&&<Link className="fortune-daily-zoe"/);
 assert.match(card,/searchParams\.get\("zoe"\)==="1"&&<FortuneZoeReading/);
 assert.match(css,/\.fortune-zoe-reading-chat\{[^}]*min-height:44px[^}]*background:#563c91/);
 assert.match(css,/\.fortune-zoe-reading-key-more summary\{[^}]*min-height:44px/);
 assert.match(panel,/prefers-reduced-motion: reduce/);
});

test("game dock keeps voice reachable as the primary action, without text chat",()=>{
 const dock=src("games/GameVoiceDock.tsx"),css=src("games/gameVoiceDock.css");
 assert.doesNotMatch(dock,/chat=text|game-voice-dock-chat|contentChat\.gameText|useLocation/);
 assert.match(dock,/\{children\}/);
 assert.doesNotMatch(css,/game-voice-dock-chat/);
 assert.match(css,/\.game-voice-dock :is\(\.crew-play-voice-start,\.crew-mini-primary,\.friend-gomoku-start-voice\)\{background:#51418f;color:#fff/);
 assert.match(css,/\.game-voice-dock\.is-collapsed :is\(\.crew-play-voice-start,\.crew-mini-primary,\.friend-gomoku-start-voice\)\{[^}]*min-height:44px/);
 assert.doesNotMatch(css,/[^{}]*(?:crew-play-voice-start|crew-mini-primary|friend-gomoku-start-voice|crew-mini-key-link)[^{}]*\{[^}]*display:none/);
 assert.match(css,/\.game-voice-dock\.is-collapsed:has\(\.crew-game-voice-controls\)/);
 assert.match(css,/\.game-voice-dock\.is-collapsed \.crew-mini-key-link\{flex:1 1 0/);
});

test("#37 guide and research end with text chat and today's fortune, SSR-safe",()=>{
 const guide=src("guides/GuidePage.tsx"),research=src("briefing/BriefingDetailPage.tsx");
 const guideEnd=guide.slice(guide.indexOf('className="crew-guide-end"'),guide.indexOf('className="crew-guide-aside"'));
 assert.match(guideEnd,/"\/friend\/live\?id=zoe&chat=text&topic=guide-"\+slug/);
 assert.match(guideEnd,/to="\/fortune\?daily=1"/);
 assert.match(guideEnd,/to=\{guide.target\}/,"keep original guide CTA");
 assert.match(guideEnd,/contentChat.articleText/);
 const researchEnd=research.slice(research.indexOf('className="briefing-section briefing-content-chat"'),research.indexOf('<ResearchDiscovery'));
 assert.match(researchEnd,/to="\/friend\/live\?id=zoe&chat=text&topic=research-article"/);
 assert.match(researchEnd,/to="\/fortune\?daily=1"/);
 assert.match(researchEnd,/contentChat.articleText/);
 assert.doesNotMatch(guideEnd+researchEnd,/(?:window|localStorage|sessionStorage|item\.title|item\.summary|guide\.headline|encodeURIComponent)/);
 for(const css of [src("guides/guides.css"),src("briefing/briefing.css")])assert.match(css,/min-height:44px/);
});

test("new topic starters are allowlisted, localized in all 11 languages, and contain name",()=>{
 const allowed=src("pages/dailyTopics.ts");
 for(const id of [...newTopics,"photo-story","play-wildcard"])
  assert.ok(allowed.includes('"'+id+'"'),id+" is not allowlisted");
 assert.match(allowed,/getDailyTopic\(id:string\|null\)/);
 assert.doesNotMatch(allowed,/new URLSearchParams|location\.search/);
 let referenceKeys;
 for(const lang of locales){
  const friends=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/friends.json`));
  const fortune=JSON.parse(read(`web-spa/src/i18n/locales/${lang}/fortuneDaily.json`));
  for(const id of newTopics){
   const starter=friends.textStarters.topics[id];
   assert.ok(typeof starter==="string"&&starter.trim(),lang+" "+id);
   assert.deepEqual(starter.match(/\{\{([^}]+)\}\}/g),["{{name}}"],lang+" "+id);
  }
  const labels=friends.contentChat;
  assert.deepEqual(Object.keys(labels).sort(),["articleText","gameText","todayFortune"]);
  for(const [key,label] of Object.entries(labels))assert.ok(typeof label==="string"&&label.trim(),lang+" "+key);
  assert.ok(typeof fortune.zoeReading.keyMore==="string"&&fortune.zoeReading.keyMore.trim(),lang+" keyMore");
  const topicKeys=Object.keys(friends.textStarters.topics).sort();
  if(!referenceKeys)referenceKeys=topicKeys;
  else assert.deepEqual(topicKeys,referenceKeys,lang+" topic keys mismatch");
 }
});

test("changes stay below TSX size cap and add no analytics event identifiers",()=>{
 for(const file of ["fortune/FortuneZoeReading.tsx","fortune/FortuneDailyCard.tsx","games/GameVoiceDock.tsx","guides/GuidePage.tsx","briefing/BriefingDetailPage.tsx"]){
  assert.ok(Buffer.byteLength(src(file))<26000,file+" is too large");
 }
 for(const file of ["fortune/FortuneZoeReading.tsx","fortune/FortuneDailyCard.tsx","games/GameVoiceDock.tsx","guides/GuidePage.tsx","briefing/BriefingDetailPage.tsx"])
  assert.doesNotMatch(src(file),/trackUsageEvent\("(?:content_chat|game_chat|zoe_chat|research_chat)/);
});
