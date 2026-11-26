const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const {runInNewContext}=require("node:vm");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
const source=read("web-spa/src/teacher/teacherVoicePreview.ts");
// Evaluate the actual preview module; the Live imports are not needed by these mocked auditions.
const {recordedTeacherPreviewUrl,previewTeacherVoiceRecorded}=runInNewContext(
 stripTypeScriptTypes(source.replace(/^import[^\n]*\n/gm,"")).replace(/^export /gm,"")+"\n;({recordedTeacherPreviewUrl,previewTeacherVoiceRecorded})"
);
function fixture(id="emma"){
 const profile={id},opts={voice:"Sulafat",speakingPace:"slow"},states=[],urls=[],calls=[];
 let resolve,reject;
 const promise=new Promise((yes,no)=>{resolve=yes;reject=no});
 const audio={pauseCount:0,loadCount:0,play:()=>promise,pause(){this.pauseCount++},removeAttribute(name){assert.equal(name,"src");this.removed=true},load(){this.loadCount++}};
 let stops=0,liveStatus;
 const live=(...args)=>{calls.push(args);liveStatus=args[2];liveStatus({state:"connecting"});return()=>{stops++}};
 const start=lang=>previewTeacherVoiceRecorded(profile,lang,s=>states.push(s.state),opts,src=>{urls.push(src);return audio},live);
 return {profile,opts,states,urls,calls,audio,start,resolve,reject,stops:()=>stops,liveStatus:s=>liveStatus(s)};
}
test("English and Chinese select teacher-specific recordings; other languages have no recording",()=>{
 for(const id of "emma alex james mia sophie lina oliver victor aria ruby leo nora kai olivia ethan chloe".split(" ")){
  assert.equal(recordedTeacherPreviewUrl(id,"英文"),`/teacher-previews/${id}-en.mp3`);
  assert.equal(recordedTeacherPreviewUrl(id,"中文"),`/teacher-previews/${id}-zh.mp3`);
 }
 assert.equal(recordedTeacherPreviewUrl("emma","日文"),null);
});
test("recorded playback reports connecting, playing and finished without Live or a key",async()=>{
 for(const lang of ["英文","中文"]){
  const f=fixture();f.start(lang);assert.deepEqual(f.urls,[recordedTeacherPreviewUrl("emma",lang)]);
  assert.deepEqual(f.states,["connecting"]);f.audio.onplaying();f.resolve();await Promise.resolve();
  f.audio.onended();assert.deepEqual(f.states,["connecting","playing","finished"]);
  assert.equal(f.calls.length,0);assert.equal(f.audio.pauseCount,1);assert.ok(f.audio.removed);
 }
});
test("each missing recording falls back to Live once with the original options, and stop cancels Live",async()=>{
 for(const [id,lang] of [["ruby","英文"],["olivia","中文"],["ethan","英文"]]){
  const f=fixture(id),stop=f.start(lang),fail=f.audio.onerror;
  fail();f.reject(new Error("missing"));await Promise.resolve();fail();
  assert.equal(f.calls.length,1);assert.equal(f.calls[0][0],f.profile);assert.equal(f.calls[0][1],lang);assert.equal(f.calls[0][3],f.opts);
  assert.equal(f.audio.pauseCount,1);f.liveStatus({state:"playing"});stop();stop();
  f.liveStatus({state:"finished"});assert.equal(f.stops(),1);assert.deepEqual(f.states,["connecting","connecting","playing"]);
 }
});
test("rejected play falls back and a stopped recording never starts Live",async()=>{
 const f=fixture(),stop=f.start("英文");f.reject(new Error("play failed"));await Promise.resolve();assert.equal(f.calls.length,1);stop();
 const g=fixture(),cancel=g.start("中文"),error=g.audio.onerror,ended=g.audio.onended;cancel();g.reject(new Error("aborted"));await Promise.resolve();error();ended();
 assert.equal(g.calls.length,0);assert.deepEqual(g.states,["connecting"]);assert.equal(g.audio.pauseCount,1);
});
test("other languages go directly to Live and return its stop function",()=>{
 const f=fixture(),stop=f.start("日文");assert.deepEqual(f.urls,[]);assert.equal(f.calls.length,1);assert.equal(f.calls[0][1],"日文");assert.equal(f.calls[0][3],f.opts);stop();assert.equal(f.stops(),1);
});
test("both learning entrances use the recorded-first wrapper",()=>{
 assert.match(read("web-spa/src/teacher/TutorPage.tsx"),/stopRef\.current=previewTeacherVoiceRecorded\(profile,s\.targetLanguage,setPreview/);
 assert.match(read("web-spa/src/teacher/TeacherProfilePicker.tsx"),/previewStop\.current=previewTeacherVoiceRecorded\(detail,targetLanguage,setPreview/);
});
