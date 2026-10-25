const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const read=filename=>readFileSync(path.resolve(__dirname,"..",filename),"utf8");

test("Explore presents six peer destinations in a single illustrated grid",()=>{
 const page=read("web-spa/src/pages/CrewSectionPage.tsx");
 const art=read("web-spa/src/pages/ExploreArtwork.tsx");
 const css=read("web-spa/src/pages/crewExplore.css");
 assert.match(page,/section==="explore"\?/);
 assert.match(page,/className="crew-explore-grid"/);
 assert.match(page,/\[x.hero,\.\.\.x.items\]\.map/);
 assert.match(page,/className="crew-explore-tile"/);
 assert.match(page,/exploreKinds:readonly ExploreKind\[\]=\["fortune","timeline","games","story","research","circle"\]/);
 assert.match(page,/<ExploreArtwork kind=\{exploreKinds\[i\]\}\/>/);
 // Other top-level sections still use their original hero + link list.
 assert.match(page,/className="crew-section-hero"/);
 assert.match(page,/className="crew-section-discover"/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 for(const kind of ["fortune","timeline","games","story","research","circle"]){
  if(kind!=="fortune")assert.match(css,new RegExp('data-kind="'+kind+'"'),kind);
  else assert.match(css,/--art:#f4ecfc/,"Fortune uses the common artwork theme");
  assert.ok(art.includes(kind),kind);
 }
});
test("Explore's six cards lead to existing features with no duplicate Fortune or Shorts",()=>{
 const page=read("web-spa/src/pages/CrewSectionPage.tsx");
 const zh=page.slice(page.indexOf(" explore:{"),page.indexOf(" learn:{"));
 const en=page.slice(page.indexOf(" explore:{",page.indexOf("const englishCopy")),page.indexOf(" learn:{",page.indexOf("const englishCopy")));
 for(const copy of [zh,en]){
  const items=[...copy.matchAll(/to:"(\/[^"]+)",icon:/g)].map(x=>x[1]);
  assert.deepEqual(items,["/fortune","/timeline","/games","/story","/research","/circle"]);
  assert.doesNotMatch(copy,/\/teacher\/fortune|\/teacher\/shorts/);
 }
});
test("Illustrations reuse official timeline portraits without decorative network fonts",()=>{
 const art=read("web-spa/src/pages/ExploreArtwork.tsx");
 for(const age of ["7","25","70"])assert.match(art,new RegExp('/assets/timeline/mira-'+age+'\\.webp'));
 assert.doesNotMatch(art,/https?:\/\/|@import/);
 assert.match(art,/aria-hidden="true"/);
 const css=read("web-spa/src/pages/crewExplore.css");
 assert.match(css,/focus-visible/);
});
