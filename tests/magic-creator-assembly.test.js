import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync("web-spa/src/magic/MagicCreations3D.tsx","utf8");

test("creator assembly uses a readable multi-second staged reveal",()=>{
 assert.match(source,/const ASSEMBLY_SECONDS=5\.6/);
 assert.match(source,/const assemblyOrder=useMemo\(\(\)=>magicAssemblyOrder\(creation\.parts\)/);
 assert.match(source,/const delay=\.05\+\(rank\/count\)\*\.5/);
 assert.match(source,/const phase=ease\(\(completion-delay\)\/\.38\)/);
});

test("assembly prioritizes silhouette then articulated and detail parts",()=>{
 assert.match(source,/part\.joint&&part\.joint!=="fixed"\?1:0/);
 assert.match(source,/part\.size<\.72\?2:0/);
 assert.match(source,/b\.part\.size-a\.part\.size/);
});

test("reduced motion still resolves creations immediately",()=>{
 assert.match(source,/const completion=animated\?Math\.min\(1,elapsed\/ASSEMBLY_SECONDS\):1/);
});
