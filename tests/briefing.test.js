import test from "node:test";
import assert from "node:assert/strict";
import {normalizeCandidate,select,unique,classify} from "../scripts/generate-briefing.mjs";
const now=new Date().toISOString();
const sample={title:"A new approach to agent memory and context retrieval",url:"https://example.org/paper",publishedAt:now,
 topic:"Agent Memory",projects:["Crew Pocket"],abstract:"Source index",score:82};
test("Crew Briefing accepts only verifiable fresh HTTPS sources",()=>{
 assert.equal(normalizeCandidate({...sample,url:"javascript:alert(1)"}),null);
 assert.equal(normalizeCandidate({...sample,publishedAt:"2020-01-01T00:00:00Z"}),null);
 assert.equal(normalizeCandidate(sample)?.sources[0].url,"https://example.org/paper");
});
test("Crew Briefing deduplicates previous sources, preserving unique discoveries",()=>{
 const selected=select([sample,sample]);
 assert.equal(selected.length,1);
 assert.equal(select([sample],[{items:selected}]).length,0);
});
test("Crew Briefing maps public research to relevant Crew projects",()=>{
 assert.ok(classify("AI speech language learning").includes("Crew Teacher"));
 assert.deepEqual(unique(["Crew Pocket","Crew Pocket","Crew Web"]),["Crew Pocket","Crew Web"]);
});
test("Crew Briefing never ships fabricated research items as its empty-state data",()=>{
 assert.deepEqual(select([]),[]);
});
