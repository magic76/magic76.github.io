const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
test("Crew Teacher Web carries all 16 Android 1.9.30 tutors with photographic portraits",()=>{
 const src=read("web-spa/src/teacher/teacherProfiles.ts");
 const roster="emma alex james mia sophie lina oliver victor aria ruby leo nora kai olivia ethan chloe".split(" ");
 assert.equal((src.match(/categoryId:/g)||[]).length,roster.length+1);
 for(const id of roster){assert.match(src,new RegExp('id:"'+id+'"'));assert.match(src,new RegExp('teacher-'+id+'\\.(?:webp|jpg)'));}
 for(const id of roster.slice(6)){assert.ok(fs.existsSync(path.join(root,"assets/teacher/teacher-"+id+".jpg")),id+" photo missing")}
 assert.match(src,/SIGNATURE TEACHING STRATEGY/);
});
test("Tutor picker has filters, portrait gallery, role style, preview and grounded history",()=>{
 const picker=read("web-spa/src/teacher/TeacherProfilePicker.tsx"),policy=read("web-spa/src/teacher/teacherPolicy.ts");
 const preview=read("web-spa/src/teacher/teacherVoicePreview.ts"),history=read("web-spa/src/teacher/teacherPracticeHistory.ts");
 assert.match(picker,/createPortal/);assert.match(picker,/TEACHER_CATEGORIES/);assert.match(picker,/teacher-gallery-grid/);
 assert.match(picker,/previewTeacherVoice/);assert.match(picker,/completedTutorSessions/);
 assert.match(picker,/試聽失敗 · 點擊重試/);assert.doesNotMatch(picker,/profile\.recommendedVoice/);
 assert.match(preview,/generationConfig/);assert.match(preview,/turnComplete:true/);
 assert.match(preview,/SUPPORTED_VOICE/);assert.match(preview,/function previewLine/);
 assert.match(preview,/GenerativeService\.BidiGenerateContent/);assert.match(preview,/v1alpha/);
 assert.match(policy,/sceneDemeanor/);assert.match(history,/durationMs<25000/);
});
