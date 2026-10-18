const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

function audit(){
 const source=stripTypeScriptTypes(read("web-spa/src/teacher/voiceAssignmentAudit.ts"),{mode:"strip"})
  .replace(/^import[^\n]*\n/gm,"").replace(/^export /gm,"");
 const context={catalog:["Zephyr","Leda","Puck","Kore"],normalizeLiveVoice:name=>name,LIVE_VOICES:["Zephyr","Leda","Puck","Kore"],result:null};
 vm.runInNewContext(source+"\nresult=auditVoiceAssignments;",context);
 return context.result;
}

test("voice usage audit derives shared and unused IDs without hardcoded character counts",()=>{
 const fn=audit();
 const friends=[{id:"zoe",name:"Zoe",voice:"Leda"},{id:"yuna",name:"Yuna",voice:"Zephyr"}];
 const teachers=[{id:"emma",name:"Emma",recommendedVoice:"Leda"}];
 const data=fn(friends,teachers,["Zephyr","Leda","Puck","Kore"]);
 assert.equal(data.totalRoles,3);
 assert.deepEqual(Array.from(data.assigned),["Zephyr","Leda"]);
 assert.deepEqual(Array.from(data.shared),["Leda"]);
 assert.deepEqual(Array.from(data.unused),["Puck","Kore"]);
 assert.deepEqual(Array.from(data.users.get("Leda"),x=>x.name),["Zoe","Emma"]);
 assert.equal(friends[0].voice,"Leda");
 assert.equal(teachers[0].recommendedVoice,"Leda");
});

test("voice usage audit recalculates when roles change, not fixed to 22/10/8",()=>{
 const fn=audit();
 const data=fn([{id:"a",name:"A",voice:"Puck"}],[],["Zephyr","Leda","Puck","Kore"]);
 assert.deepEqual(Array.from(data.assigned),["Puck"]);
 assert.deepEqual(Array.from(data.shared),[]);
 assert.deepEqual(Array.from(data.unused),["Zephyr","Leda","Kore"]);
});

test("Voice Lab exposes unused and shared filters but keeps opt-in, existing audition and ratings",()=>{
 const page=read("web-spa/src/teacher/VoiceLabPage.tsx");
 const app=read("web-spa/src/App.tsx");
 assert.match(page,/auditVoiceAssignments\(CREW_FRIENDS,TEACHER_PROFILES\)/);
 assert.match(page,/voiceFilter==="unused"\?voiceAudit\.unused/);
 assert.match(page,/voiceFilter==="shared"\?voiceAudit\.shared/);
 assert.match(page,/disabled=\{active\} value=\{voiceFilter\}/);
 assert.match(page,/setVoiceFilter\("all"\)/);
 assert.match(page,/voiceUsers\.length/);
 assert.match(page,/voiceAudit\.shared\.map\(/);
 assert.match(page,/persistHistory:false,teacherReport:false/);
 assert.match(page,/localStorage\.setItem\(KEY/);
 assert.match(app,/\/teacher\/voice-lab/);
 assert.doesNotMatch(app,/\/teacher\/voice-casting/);
});
