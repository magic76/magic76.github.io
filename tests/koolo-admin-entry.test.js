const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const read=p=>fs.readFileSync(p,"utf8");
test("Mine admin entry is gated by a server-authorized capability",()=>{
 const page=read("web-spa/src/pages/CrewSectionPage.tsx");
 const entry=read("web-spa/src/pages/KooloAdminEntry.tsx");
 const endpoint=read("functions/api/usage/admin.ts");
 assert.match(page,/section==="me"&&<MyAccountGroups/);
 assert.match(read("web-spa/src/pages/MyAccountGroups.tsx"),/<KooloAdminEntry\/>/);
 assert.match(entry,/fetch\("\/api\/usage\/admin"/);
 assert.match(entry,/value\?\.admin===true/);
 assert.match(entry,/if\(!authorized\)return null/);
 assert.match(entry,/to="\/usage"/);
 assert.doesNotMatch(entry,/shanliyoung|KOOLO_ADMIN_EMAILS/);
 assert.match(endpoint,/await verifyAccess\(request,env\)/);
 assert.match(endpoint,/"Cache-Control":"no-store"/);
});
