import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../web-spa/src/analytics/usage.ts",import.meta.url),"utf8");

test("Magic entry uses a tab-scoped timestamp guard before dispatch",()=>{
 assert.match(source,/if\(event==="magic_enter"\)/);
 assert.match(source,/sessionStorage\.getItem\(key\)/);
 assert.match(source,/now-previous<30\*60_000/);
 assert.match(source,/sessionStorage\.setItem\(key,String\(now\)\)/);
 assert.ok(source.indexOf('if(event==="magic_enter")')<source.indexOf('withGa4(ga=>ga.sendGa4Event(event,detail,pathname))'));
});

test("Magic entry dedupe does not disable other usage events",()=>{
 assert.match(source,/if\(!allowed\(\)\)return;/);
 assert.match(source,/const key=event\+":"\+detail;/);
 assert.match(source,/fetch\("\/api\/usage\/event"/);
});
