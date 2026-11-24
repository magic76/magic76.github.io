import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const source=readFileSync(new URL("../web-spa/src/sandbox/world.ts",import.meta.url),"utf8");
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {fresh,apply,step,observe}=await import("data:text/javascript;base64,"+Buffer.from(js).toString("base64"));
const spawn=(id,x=.5,y=.5,more={})=>({op:"spawn",id,shape:"circle",x,y,...more});
test("sandbox scene operations atomic and bounded",()=>{
 const w=fresh();
 assert.throws(()=>apply(w,{operations:[spawn("a"),spawn("a")]}),/duplicate/);
 assert.equal(w.bodies.length,0);
 assert.throws(()=>apply(w,{operations:[spawn("a",Infinity)]}),/invalid-number/);
 assert.throws(()=>apply(w,{operations:Array.from({length:33},(_,i)=>spawn("b"+i))}),/invalid-batch/);
 const a=apply(w,{operations:[spawn("a"),{op:"set_world",gravity:-1}]});
 assert.equal(a.gravity,-1);assert.equal(a.revision,1);
 assert.throws(()=>apply(a,{revision:0,operations:[{op:"clear"}]}),/stale-revision/);
 assert.throws(()=>apply(a,{operations:[{op:"patch",id:"a",color:"url(bad)"}]}),/invalid-color/);
 assert.equal(a.bodies[0].color,"#80cbc4");
});
test("sandbox local collision rule scores and removes target once",()=>{
 const w=apply(fresh(),{operations:[spawn("ball"),spawn("star",.54,.5,{fixed:true}),{op:"add_rule",a:"ball",b:"star",points:10,remove:true}]});
 const contacts=new Set();
 assert.equal(step(w,.016,null,contacts).length,1);
 assert.equal(w.score,10);assert.deepEqual(w.bodies.map(b=>b.id),["ball"]);
 assert.equal(step(w,.016,null,contacts).length,0);assert.equal(w.score,10);
 assert.equal(observe(w).score,10);
});
test("sandbox circle collides with fixed platform; reversed gravity works",()=>{
 const w=apply(fresh(),{operations:[spawn("ball",.5,.4,{vy:1,w:.1}),{op:"spawn",id:"floor",shape:"box",x:.5,y:.47,w:.5,h:.04,fixed:true}]});
 step(w,.016,null,new Set());
 assert.ok(w.bodies[0].vy<0);
 const q=apply(fresh(),{operations:[spawn("a"),{op:"set_world",gravity:-1}]});
 step(q,.016,null,new Set());assert.ok(q.bodies[0].y<.5);
});
test("sandbox route lazy loads; admin entry and direct access require verified usage",()=>{
 const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
 assert.match(read("web-spa/src/App.tsx"),/const SandboxLab=lazy/);
 assert.match(read("web-spa/src/analytics/UsageDashboardPage.tsx"),/data&&<a href="\/sandbox-lab"/);
 const page=read("web-spa/src/sandbox/SandboxLab.tsx");
 assert.match(page,/access==="allowed"\?<Playground/);
 assert.match(page,/\/api\/usage\/report\?days=7/);
 assert.match(page,/sendControl/);
 assert.match(page,/seen\.current\.has\(call\.id\)/);
});
