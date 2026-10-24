const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const artwork=fs.readFileSync(path.join(root,"web-spa/src/pages/ExploreArtwork.tsx"),"utf8");
const section=fs.readFileSync(path.join(root,"web-spa/src/pages/CrewSectionPage.tsx"),"utf8");
const css=fs.readFileSync(path.join(root,"web-spa/src/pages/crewExplore.css"),"utf8");

test("Crew Mate Explore card uses the shared scene illustration instead of stacked icons",()=>{
 assert.match(artwork,/export type ExploreKind=.*"mate"/);
 assert.match(artwork,/mate:<svg viewBox="0 0 200 126"/);
 assert.match(section,/data-kind="mate" to="\/mate"/);
 assert.match(section,/<ExploreArtwork kind="mate"\/>/);
 assert.doesNotMatch(section,/crew-explore-mate-art/);
 assert.doesNotMatch(css,/crew-explore-mate-art/);
});
test("Crew Mate drawing stays self-contained and readable at phone widths",()=>{
 const mate=artwork.split("mate:<svg")[1].split("</svg>")[0];
 assert.match(mate,/Central phone with an active two-way handoff/);
 assert.match(mate,/The person giving Mate a private brief/);
 assert.match(mate,/The other person waiting at the counter/);
 assert.doesNotMatch(mate,/<image|<foreignObject|http:|https:/);
 assert.match(css,/data-kind="mate"\] \.crew-explore-illustration/);
 assert.match(css,/@media\(max-width:420px\)/);
});
