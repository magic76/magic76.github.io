const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const read=file=>readFileSync(path.join(__dirname,"..",file),"utf8");
const hub=read("web-spa/src/pages/CrewSectionPage.tsx");
const artwork=read("web-spa/src/pages/ExploreArtwork.tsx");
const css=read("web-spa/src/pages/crewExplore.css");
const nav=read("web-spa/src/pages/crewNavigation.ts");
const page=read("web-spa/src/souls/SoulsPage.tsx");
const chat=read("web-spa/src/souls/SoulChat.tsx");
const usage=read("web-spa/src/analytics/usage.ts");
const server=read("functions/api/usage/event.ts");
const panel=read("web-spa/src/analytics/SoulsUsagePanel.tsx");
const dashboard=read("web-spa/src/analytics/UsageDashboardPage.tsx");

test("Souls is a visible Explore tile, with a working existing route and entry click",()=>{
 assert.match(hub,/data-kind="souls" to="\/souls"/);
 assert.match(hub,/trackUsageEvent\("explore_entry_click","souls"\)/);
 assert.match(hub,/<ExploreArtwork kind="souls"\/>/);
 assert.match(hub,/Crew Souls · 讓照片活過來/);
 assert.match(artwork,/kind==="souls"/);
 assert.match(artwork,/crew-explore-souls-art/);
 assert.match(css,/\.crew-explore-tile\[data-kind="souls"\]/);
 assert.match(nav,/,"souls"\]\.includes\(root\)/);
 assert.doesNotMatch(artwork,/assets\/explore\/souls\.webp/);
});

test("Souls lifecycle events are emitted only for meaningful browser actions",()=>{
 assert.match(page,/trackUsageEvent\("souls_open"\)/);
 assert.match(page,/await photoFromFile\(file\);[\s\S]*?trackUsageEvent\("souls_photo_ready"\)/);
 assert.match(page,/await save\(s\);trackUsageEvent\("souls_created",subjectType\)/);
 assert.match(page,/trackUsageEvent\("souls_mask_repaired"\)/);
 assert.match(chat,/if\(ready&&!wasReady\.current\)trackUsageEvent\("souls_live_connected"\)/);
 assert.match(chat,/wasReady\.current=ready/);
 assert.match(chat,/onOutputLevel:level=>onAudioLevel\?\.\(level\)/);
 assert.doesNotMatch(page,/trackUsageEvent\([^)]*(?:name|image|caption|description|note|voice)\b/);
});

test("private dashboard uses Souls event totals, distinct-browser count and non-cohort caveat",()=>{
 assert.match(dashboard,/<SoulsUsagePanel rows=\{rows\} unique=\{unique\}\/>/);
 assert.match(dashboard,/\{id:"souls",label:"Souls"/);
 assert.match(dashboard,/SOULS_USAGE_EVENTS/);
 assert.match(dashboard,/SOULS_USAGE_NAMES/);
 assert.match(panel,/explore_entry_click/);
 assert.match(panel,/souls_open/);
 assert.match(panel,/souls_photo_ready/);
 assert.match(panel,/souls_created/);
 assert.match(panel,/souls_live_connected/);
 assert.match(panel,/souls_live_attempt/);
 assert.match(panel,/souls_user_input/);
 assert.match(panel,/souls_ai_replied/);
 assert.match(panel,/souls_mask_repaired/);
 assert.match(panel,/不是同一批使用者的精準轉換率/);
 assert.match(panel,/souls_conversation/);
 assert.match(panel,/souls_live_failed/);
 assert.match(chat,/trackUsageEvent\("souls_conversation"\)/);
 assert.match(chat,/trackUsageEvent\("souls_live_failed"\)/);
 assert.match(chat,/trackUsageEvent\("souls_user_input"\)/);
 assert.match(chat,/trackUsageEvent\("souls_ai_replied"\)/);
 assert.match(chat,/recordExchange\(live\.turns\)/);
 assert.match(chat,/last=\[\.\.\.turns\]\.reverse\(\)\.find\(t=>t.input\?\.trim\(\)&&t.output\?\.trim\(\)\)/);
 assert.match(chat,/countedConversation\.current=true/);
 assert.match(usage,/\|"souls_created"/);
 assert.match(server,/"souls_created"/);
 assert.match(usage,/\|"object"/);
 assert.match(server,/"object"/);
});

test("public Explore has no third-party image fetch or dynamic character data",()=>{
 const soulIllustration=artwork.slice(artwork.indexOf('if(kind==="souls")'),artwork.indexOf('if(kind==="timeline")'));
 assert.doesNotMatch(soulIllustration,/fetch|window\.|document\.|https?:|image|src=/);
 assert.match(css,/\.crew-explore-souls-art/);
});
