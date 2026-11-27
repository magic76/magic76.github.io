const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const read=p=>fs.readFileSync(p,"utf8");
test("Mine admin entry is gated by a server-authorized capability",()=>{
 const page=read("web-spa/src/pages/CrewSectionPage.tsx");
 const entry=read("web-spa/src/pages/KooloAdminEntry.tsx");
 const endpoint=read("functions/api/usage/admin.ts");
 assert.match(page,/section==="me"&&<MyAccountGroups/);
 assert.match(read("web-spa/src/pages/MyAccountGroups.tsx"),/<KooloAdminEntry>/);
 assert.match(entry,/fetch\("\/api\/usage\/admin"/);
 assert.match(entry,/value\?\.admin===true/);
 assert.match(entry,/if\(!authorized\)return null/);
 assert.match(entry,/to="\/usage"/);
 assert.doesNotMatch(entry,/shanliyoung|KOOLO_ADMIN_EMAILS/);
 assert.match(endpoint,/await verifyAccess\(request,env\)/);
 assert.match(endpoint,/"Cache-Control":"no-store"/);
});

test("unreleased paid account entries mount only inside the verified admin group until rollout",()=>{
 const page=read("web-spa/src/pages/MyAccountGroups.tsx");
 const entry=read("web-spa/src/pages/KooloAdminEntry.tsx");
 assert.match(page,/const PAID_ACCOUNT_FEATURES_PUBLIC=false/);
 const paid=page.slice(page.indexOf("function PaidAccountRows"),page.indexOf("export function MyAccountGroups"));
 const mine=page.slice(page.indexOf("export function MyAccountGroups"));
 for(const route of ["/fortune/purchases","/me/voice-credits","/me/orders"]){
  assert.ok(paid.includes('to="'+route+'"'),route);
  assert.ok(!mine.includes('to="'+route+'"'),route);
 }
 assert.match(paid,/useSummary\("reports"\),credits=useSummary\("credits"\)/);
 assert.doesNotMatch(mine,/useSummary\(/);
 assert.match(mine,/\{PAID_ACCOUNT_FEATURES_PUBLIC&&<section[^\n]+<PaidAccountRows\/>/);
 assert.match(mine,/<KooloAdminEntry>\{!PAID_ACCOUNT_FEATURES_PUBLIC&&<PaidAccountRows\/>\}<\/KooloAdminEntry>/);
 assert.ok(entry.indexOf("if(!authorized)return null")<entry.indexOf("{children}"));
 assert.match(mine,/to="\/purchase-info"/);
 assert.match(mine,/to="\/fortune\/premium"/);
});
