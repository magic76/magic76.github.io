const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const artwork=fs.readFileSync(path.join(root,"web-spa/src/pages/ExploreArtwork.tsx"),"utf8");
const section=fs.readFileSync(path.join(root,"web-spa/src/pages/CrewSectionPage.tsx"),"utf8");
const css=fs.readFileSync(path.join(root,"web-spa/src/pages/crewExplore.css"),"utf8");

test("Crew Mate hides its Explore entry but keeps local photo assets and direct route",()=>{
 assert.match(artwork,/export type ExploreKind=.*"mate"/);
 assert.doesNotMatch(section,/<Link className="crew-explore-tile crew-explore-mate"/);
 assert.match(fs.readFileSync(path.join(root,"web-spa/src/App.tsx"),"utf8"),/path="\/mate"/);
 assert.doesNotMatch(section,/<ExploreArtwork kind="mate"\/>/);
 assert.match(artwork,/"\/assets\/explore\/"\+kind\+"\.webp"/);
 assert.match(artwork,/crew-explore-illustration crew-explore-photo/);
 assert.doesNotMatch(artwork,/<svg|<foreignObject|https?:\/\//);
 assert.doesNotMatch(section,/crew-explore-mate-art/);
 assert.doesNotMatch(css,/crew-explore-mate-art/);
});
test("Crew Mate's shared image is accessible, stable and cropped at phone widths",()=>{
 assert.match(artwork,/alt=""/);
 assert.match(artwork,/aria-hidden="true"/);
 assert.match(artwork,/width=\{1200\} height=\{800\}/);
 assert.match(artwork,/loading=\{kind==="fortune"\?"eager":"lazy"\}/);
 assert.match(artwork,/decoding="async"/);
 assert.match(artwork,/draggable="false"/);
 assert.match(css,/\.crew-explore-photo img\s*\{/);
 assert.match(css,/object-fit:cover/);
 assert.match(css,/@media\(max-width:420px\)/);
 assert.match(css,/data-kind="mate"/);
});
