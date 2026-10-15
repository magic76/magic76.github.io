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
 assert.match(home,/\{ready&&!configured\?\s*<Link to="\/settings" className="crew-home-setup crew-home-setup-free"/);
 assert.match(home,/ready&&!verified\?<Link to="\/settings" className="crew-home-setup"/);

 // Header has an inaccessible placeholder, not a false missing-key link.
 assert.match(chrome,/\(ready\s*\?<NavLink className=\{"status "/);
 assert.match(chrome,/:<span className="status crew-key-status-placeholder" aria-hidden="true"\/>/);
 assert.match(css,/\.crew-key-status-placeholder\{[^}]*visibility:hidden/);
 assert.match(chrome,/verified\?t\("gemini.connected"\):hasKey\?t\("gemini.pending"\):t\("gemini.setup"\)/);
});

test("Gemini key setup remains actionable after client hydration when truly unconfigured",()=>{
 const home=read("web-spa/src/pages/HomePage.tsx");
 const chrome=read("web-spa/src/components/AppChrome.tsx");
 assert.match(home,/setup\.title/);
 assert.match(home,/setup\.verify/);
 assert.match(home,/crew-home-setup-free/);
 assert.match(chrome,/to="\/settings"/);
});
