const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const read=file=>fs.readFileSync(path.resolve(__dirname,"..",file),"utf8");

test("section card arrows are white against their green circular background",()=>{
 const section=read("web-spa/src/pages/crewSections.css");
 const arrow=read("web-spa/src/components/Arrow.css");
 const component=read("web-spa/src/pages/CrewSectionPage.tsx");
 assert.match(section,/\.crew-section-arrow\{[^}]*color:#fff;/);
 assert.match(arrow,/\.crew-arrow\{[^}]*background:#285a48;[^}]*color:#fff;/);
 assert.match(component,/<Arrow className="crew-section-arrow"\/>/);
});
