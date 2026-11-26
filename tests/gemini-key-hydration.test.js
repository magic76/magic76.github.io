const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=name=>fs.readFileSync(path.resolve(__dirname,"..",name),"utf8");

test("SSG and initial hydration never mistake an unread client key for a missing key",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 const chrome=read("web-spa/src/components/AppChrome.tsx");
 const ready=read("web-spa/src/lib/useClientReady.ts");
 const css=read("web-spa/src/styles.css");

 // The server and the first hydration pass must render the SAME indeterminate state.
 assert.match(ready,/useState\(false\)/);
 assert.match(ready,/useEffect\(\(\)=>setReady\(true\),\[\]\)/);
 assert.match(home,/const configured=ready&&Boolean\(geminiKey\(\)\)/);
 assert.match(home,/\{ready&&!configured&&trial\.resolved&&\(!trial\.enabled\|\|trial\.remaining===0\)\?<section className="crew-home-start"/);
 assert.match(home,/ready&&configured&&!verified\?<Link to="\/account#settings-gemini" className="crew-home-start-verify"/);

 // Account entry belongs to My, not the shared page header.
 const hub=read("web-spa/src/pages/CrewSectionPage.tsx");
 assert.doesNotMatch(chrome,/crew-account-entry|to="\/account"/);
 assert.match(hub,/section==="me"&&<MyAccountGroups/);
 const groups=read("web-spa/src/pages/MyAccountGroups.tsx");
 assert.match(groups,/<AccountRow to="\/account"/);
 assert.match(groups,/t\("common:auth.account"\)/);
 assert.doesNotMatch(chrome,/crew-key-status-placeholder|t\("gemini.pending"\)/);
});

test("Gemini key setup remains actionable after client hydration when truly unconfigured",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 const hub=read("web-spa/src/pages/MyAccountGroups.tsx");
 assert.match(home,/setup\.title/);
 assert.match(home,/setup\.verify/);
 assert.match(home,/crew-home-start-option/);
 assert.match(hub,/to="\/account"/);
});

test("Cyber Orb refreshes its key status when the in-app Gemini setting is saved or cleared",()=>{
 const runtime=read("web-spa/src/lib/runtime.ts");
 const orb=read("web-spa/src/pages/CyberOrbPanel.tsx");

 // Settings and the Orb share the same WebView storage; a save in the sibling
 // settings panel must refresh an already-mounted Orb without exposing the key.
 assert.match(runtime,/GEMINI_KEY_CHANGED_EVENT="crew:gemini-key-changed"/);
 assert.match(runtime,/export function saveGeminiKey\([^\n]+emitGeminiKeyChanged\(\)/);
 assert.match(runtime,/export function clearGeminiKey\([^\n]+emitGeminiKeyChanged\(\)/);
 assert.match(orb,/const \[webKey,setWebKey\]=useState\(\(\)=>geminiKey\(\)\)/);
 assert.match(orb,/addEventListener\(GEMINI_KEY_CHANGED_EVENT,refreshWebKey\)/);
 assert.match(orb,/removeEventListener\(GEMINI_KEY_CHANGED_EVENT,refreshWebKey\)/);
 assert.match(orb,/const currentWebKey=geminiKey\(\)/); // Start always reads the latest stored value.
});
