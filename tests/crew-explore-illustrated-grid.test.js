const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const path=require("node:path");
const read=filename=>readFileSync(path.resolve(__dirname,"..",filename),"utf8");

test("Explore preserves its illustrated destinations and hides Circle from navigation",()=>{
 const page=read("web-spa/src/pages/CrewSectionPage.tsx");
 const art=read("web-spa/src/pages/ExploreArtwork.tsx");
 const css=read("web-spa/src/pages/crewExplore.css");
 assert.match(page,/section==="explore"\?/);
 assert.match(page,/className="crew-explore-grid"/);
 assert.match(page,/\[x.hero,\.\.\.x.items\]\.map/);
 assert.match(page,/const showCircleInExplore=false;/);
 assert.match(page,/\.filter\(item=>showCircleInExplore\|\|item\.to!=="\/circle"\)/);
 assert.match(page,/className="crew-explore-tile"/);
 assert.match(page,/exploreKinds:readonly ExploreKind\[\]=\["fortune","timeline","games","story","research","circle"\]/);
 assert.match(page,/<ExploreArtwork kind=\{kind\}\/>/);
 assert.match(page,/map\(\(item,i\)=>\(\{item,kind:exploreKinds\[i\]\}\)\)\.filter\(\(\{kind\}\)=>kind!=="timeline"&&kind!=="story"\)/);
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
test("Explore keeps Circle configuration for later re-enabling without duplicate Fortune or Shorts",()=>{
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

test("All eight non-Timeline cards use local 3:2 Explore illustrations",()=>{
 const page=read("web-spa/src/pages/CrewSectionPage.tsx");
 const art=read("web-spa/src/pages/ExploreArtwork.tsx");
 const css=read("web-spa/src/pages/crewExplore.css");
 const photoKinds=["fortune","games","story","research","circle","mate","town","magic"];
 assert.match(art,/src=\{"\/assets\/explore\/"\+kind\+"\.webp"\}/);
 for(const kind of photoKinds){
  const url=`/assets/explore/${kind}.webp`;
  assert.equal("/assets/explore/"+kind+".webp",url);
  assert.ok(art.includes(`"${kind}"`),`missing kind for ${url}`);
  if(kind==="magic")assert.match(page,new RegExp(`data-kind="${kind}"`));
  else if(["mate","town"].includes(kind))assert.doesNotMatch(page,new RegExp(`data-kind="${kind}"`));
  else assert.match(page,/data-kind=\{kind\}/);
 }
 assert.doesNotMatch(page,/<ExploreArtwork kind="town"\/>/);
 assert.match(page,/<ExploreArtwork kind="magic"\/>/);
 assert.doesNotMatch(page,/crew-explore-town-mini|crew-explore-magic-preview/);
 assert.match(art,/width=\{1200\} height=\{800\}/);
 assert.match(art,/loading=\{kind==="fortune"\?"eager":"lazy"\}/);
 assert.match(art,/fetchPriority:"high"/);
 assert.match(css,/aspect-ratio:3\/2/);
 assert.match(css,/object-fit:cover/);
 assert.match(css,/object-position:center/);
 assert.match(css,/crew-explore-art-arrive 440ms/);
 assert.match(css,/scale\(1\.03\)/);
 assert.doesNotMatch(css,/crew-explore-town-mini|crew-explore-magic-preview/);
});
