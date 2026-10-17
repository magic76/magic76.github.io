#!/usr/bin/env node
"use strict";
/* Identical, dependency-free contract smoke test in Android & Web.
 * JSON Schema-supported subset: object/array/string/integer/boolean, properties,
 * required, additionalProperties, enum, const, pattern, minItems, minimum.
 * This is NOT a general-purpose JSON Schema validator.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const spec=JSON.parse(fs.readFileSync(path.join(root,"contracts/crew-teacher/interfaces/v1.json"),"utf8"));
const android=fs.existsSync(path.join(root,"app/src/main/java/com/crewpocket/teacher/NativeLiveActivity.java"));
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
function validate(schema,value,at="payload"){
 assert.ok(schema&&typeof schema==="object",at+": missing schema");
 if(schema.type==="object"){
  assert.ok(value!==null&&typeof value==="object"&&!Array.isArray(value),at+": expected object");
  for(const k of schema.required||[])assert.ok(Object.hasOwn(value,k),at+": missing "+k);
  for(const [k,v] of Object.entries(value)){
   const p=(schema.properties||{})[k];
   if(!p){assert.notEqual(schema.additionalProperties,false,at+": unknown "+k);continue}
   validate(p,v,at+"."+k);
  }
 }else if(schema.type==="array"){
  assert.ok(Array.isArray(value),at+": expected array");
  if(schema.minItems!==undefined)assert.ok(value.length>=schema.minItems,at+": too few elements");
  if(schema.items)value.forEach((v,i)=>validate(schema.items,v,at+"["+i+"]"));
 }else if(schema.type==="string"){
  assert.equal(typeof value,"string",at+": expected string");
  if(schema.pattern)assert.ok(new RegExp(schema.pattern).test(value),at+": invalid format");
 }else if(schema.type==="boolean")assert.equal(typeof value,"boolean",at+": expected boolean");
 else if(schema.type==="integer")assert.ok(Number.isInteger(value),at+": expected integer");
 else throw Error(at+": unsupported schema type "+schema.type);
 if(Object.hasOwn(schema,"const"))assert.deepEqual(value,schema.const,at+": wrong literal");
 if(schema.enum)assert.ok(schema.enum.includes(value),at+": unsupported value");
 if(schema.minimum!==undefined)assert.ok(value>=schema.minimum,at+": below minimum");
}
function role(ref){
 validate(spec.schemas.roleRef,ref,"role");
 assert.ok(spec.roster[ref.kind].includes(ref.id),"unknown "+ref.kind+" ID: "+ref.id);
}
function memory(scope){
 validate(spec.schemas.memoryScope,scope,"memory");
 if(scope.scope==="friend-topic"){
  assert.equal(scope.owner.kind,"friend","friend topic owner must be a friend");
  assert.ok(typeof scope.language==="string"&&scope.language.trim(),"friend topic language required");
  role(scope.owner);
 }else assert.equal(scope.owner.kind,"learner","personal facts must be learner-scoped");
}
function timeline(events){
 let last=-1,session=null;const spoken=new Set();
 for(const e of events){
  validate(spec.schemas.domainEvent,e,"event");
  assert.ok(spec.eventTypes[e.domain].includes(e.type),"unknown "+e.domain+" event "+e.type);
  if(session!==null)assert.equal(e.sessionId,session,"session mixing");
  session=e.sessionId;
  assert.ok(e.sequence>last,"events must have strictly increasing sequence");last=e.sequence;
  const key=e.sessionId+"/"+e.turnId;
  if(e.type==="game.assistant.speech.completed"&&e.actor==="assistant")spoken.add(key);
  if(e.type==="game.action.applied"&&e.actor==="assistant"&&e.requiresSpeechFirst)
   assert.ok(spoken.has(key),"assistant action applied before speech completed");
 }
}
function shortsFeed(feed){
 validate(spec.schemas.shortsFeed,feed,"shorts");
 const seen=new Set();
 for(const p of feed.posts){
  validate(spec.schemas.shortsPost,p,"shorts.post");
  assert.ok(spec.roster.friend.includes(p.friendId),"unknown Shorts friend "+p.friendId);
  assert.ok(!seen.has(p.id),"duplicate Shorts ID "+p.id);seen.add(p.id);
  for(const k of ["caption","translationZh","imageAlt","storyId"])assert.ok(p[k].trim(),"empty "+k);
  assert.ok(!Number.isNaN(Date.parse(p.publishedAt)),"invalid Shorts publication time");
 }
}
function sorted(arr){return [...new Set(arr)].sort()}
function checkRoster(roleKind,actual,filename){
 const expected=spec.roster[roleKind];
 assert.deepEqual(sorted(actual),expected,roleKind+" IDs differ in "+filename);
 assert.equal(actual.length,expected.length,roleKind+" duplicate IDs in "+filename);
}
function checkImplementationRoster(){
 if(android){
  const friendFile="app/src/main/java/com/crewpocket/teacher/CrewFriendProfile.java";
  const tutorFile="app/src/main/java/com/crewpocket/teacher/TeacherPersonaPolicy.java";
  checkRoster("friend",[...read(friendFile).matchAll(/new Profile\\("([a-z]+)"/g)].map(x=>x[1]),friendFile);
  checkRoster("teacher",[...read(tutorFile).matchAll(/new Spec\\("([a-z]+)"/g)].map(x=>x[1]),tutorFile);
 }else{
  const friendFile="web-spa/src/friends/friendProfiles.ts";
  const tutorFile="web-spa/src/teacher/teacherProfiles.ts";
  checkRoster("friend",[...read(friendFile).matchAll(/"id":"([a-z]+)"/g)].map(x=>x[1]),friendFile);
  const part=read(tutorFile).split("export const TEACHER_PROFILES:TeacherProfile[]=")[1];
  assert.ok(part,"Web teacher roster not found");
  checkRoster("teacher",[...part.matchAll(/\\bid:"([a-z]+)"/g)].map(x=>x[1]),tutorFile);
  const manifest=JSON.parse(read("content/character-identities/manifest.json"));
  for(const kind of ["friend","teacher"])checkRoster(kind,manifest.characters.filter(x=>x.role===kind).map(x=>x.id),"character identity manifest");
  shortsFeed(JSON.parse(read("content/crew-shorts/approved/posts.json")));
 }
}
async function verifyUpstream(){
 if(!process.argv.includes("--upstream")||android)return;
 const token=process.env.CREW_CONTRACT_READ_TOKEN;
 if(!token){
  console.warn("[Crew interfaces] SKIP remote equality: private Android repo requires CREW_CONTRACT_READ_TOKEN. Local validation still enforced.");
  return;
 }
 const url="https://api.github.com/repos/magic76/crew-teacher/contents/contracts/crew-teacher/interfaces/v1.json?ref=main";
 const response=await fetch(url,{headers:{Accept:"application/vnd.github.raw+json",Authorization:"Bearer "+token,"X-GitHub-Api-Version":"2022-11-28"},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error("Cannot verify private Android canonical interfaces: HTTP "+response.status);
 const remote=JSON.parse(await response.text());
 assert.deepEqual(spec,remote,"Web interfaces drifted from canonical Android main");
 console.log("[Crew interfaces] snapshot equals authenticated Android main");
}
(async()=>{
 try{
  assert.equal(spec.contractVersion,1);
  assert.equal(spec.owner,"magic76/crew-teacher");
  assert.match(spec.revision,/^\\d{4}-\\d{2}-\\d{2}\\.\\d+$/);
  for(const kind of ["friend","teacher"])assert.equal(spec.roster[kind].length,16);
  role(spec.fixtures.validRole);
  assert.throws(()=>role(spec.fixtures.invalidRole));
  memory(spec.fixtures.validMemory);
  assert.throws(()=>memory(spec.fixtures.invalidMemory));
  timeline(spec.fixtures.validGameTimeline);
  assert.throws(()=>timeline(spec.fixtures.invalidGameTimeline));
  checkImplementationRoster();
  await verifyUpstream();
  console.log("[Crew interfaces] "+(android?"Android":"Web")+" role, Shorts, memory and domain-event fixtures OK; "+spec.revision);
 }catch(e){console.error("[Crew interfaces] "+e.stack);process.exitCode=1}
})();
