const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const root=path.resolve(__dirname,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const code=read("web-spa/src/souls/soulMaskBrush.ts");
const compiled=stripTypeScriptTypes(code,{mode:"strip"})
 .replace(/\bexport\s+function\s+/g,"function ");
const mod={exports:{}};
new Function("module",compiled+"\nmodule.exports={paintMaskPoint,paintMaskStroke};")(mod);
const {paintMaskPoint,paintMaskStroke}=mod.exports;
const page=read("web-spa/src/souls/SoulsPage.tsx");
const portrait=read("web-spa/src/souls/SoulPortrait.tsx");
const data=read("web-spa/src/souls/soulData.ts");
const chat=read("web-spa/src/souls/SoulChat.tsx");
const editor=read("web-spa/src/souls/SoulMaskEditor.tsx");
const subject=read("web-spa/src/souls/SoulSubjectSelector.tsx");
const settings=read("web-spa/src/souls/SoulDisplayPreferences.tsx");
const css=read("web-spa/src/souls/souls.css");

function sourcePixels(width=18,height=18){
 const p=new Uint8ClampedArray(width*height*4);
 for(let i=0;i<p.length;i+=4){
  p[i]=220;p[i+1]=90;p[i+2]=50;p[i+3]=255;
 }
 return p;
}
test("erase brush removes only touched foreground, preserving pixels outside radius",()=>{
 const src=sourcePixels(),out=new Uint8ClampedArray(src);
 paintMaskPoint(out,src,18,18,9,9,3,"erase");
 assert.equal(out[(9*18+9)*4+3],0);
 assert.equal(out[(0*18+0)*4+3],255);
 assert.equal(out[(9*18+9)*4],220);
});
test("restore brush fills missing object with source colors and does not affect surrounding alpha",()=>{
 const src=sourcePixels(),out=new Uint8ClampedArray(src.length);
 paintMaskPoint(out,src,18,18,9,9,3,"restore");
 assert.equal(out[(9*18+9)*4+3],255);
 assert.equal(out[(0*18+0)*4+3],0);
 assert.equal(out[(9*18+9)*4],220);
});
test("stroke interpolation fills missing gaps between pointer events",()=>{
 const src=sourcePixels(60,16),out=new Uint8ClampedArray(src);
 paintMaskStroke(out,src,60,16,{x:5,y:8},{x:54,y:8},4,"erase");
 for(let x=5;x<=54;x++)assert.equal(out[(8*60+x)*4+3],0);
});
test("invalid brush buffers and off-canvas strokes fail safely",()=>{
 const src=sourcePixels(),out=new Uint8ClampedArray(src);
 paintMaskPoint(out,new Uint8ClampedArray(6),18,18,3,3,5,"erase");
 assert.deepEqual(out,src);
 paintMaskPoint(out,src,18,18,1000,1000,5,"erase");
 assert.deepEqual(out,src);
});
test("manual editor is local, can undo redo reset and applies only on confirmation",()=>{
 assert.match(editor,/onPointerDown=\{down\}[\s\S]*onPointerMove=\{move\}/);
 assert.match(editor,/setPointerCapture\(e.pointerId\)/);
 assert.match(editor,/paintMaskStroke\(/);
 assert.match(editor,/historyRef\.current\.push/);
 assert.match(editor,/futureRef\.current\.push/);
 assert.match(editor,/function undo\(\)/);
 assert.match(editor,/function redo\(\)/);
 assert.match(editor,/function reset\(\)/);
 assert.match(editor,/onApply\(canvas\.toDataURL\("image\/png"\)\)/);
 assert.doesNotMatch(editor,/fetch\(|CrewAI|geminiKey\(/);
 assert.match(page,/maskEditing==="draft"\?<SoulMaskEditor/);
 assert.match(page,/maskEditing==="saved"&&<div className="souls-panel">/);
 assert.match(page,/await update\(id,current=>\(\{\.\.\.current,cutout:dataUrl\}\)\)/);
});
test("person photo mode uses fictional identity, no cartoon eyes by default",()=>{
 assert.match(data,/export type SoulSubjectType="object"\|"person"/);
 assert.match(data,/faceVisible\?:boolean/);
 assert.match(data,/subjectType\?:SoulSubjectType/);
 assert.match(data,/s\.faceVisible\?\?soulSubjectType\(s\)==="object"/);
 assert.match(data,/s\.subjectType==="person"\?"person":"object"/);
 assert.match(data,/You are an original fictional character inspired by a user-provided portrait/);
 assert.match(data,/You are not the real person in the photo/);
 assert.match(page,/setSubjectType\(kind\);setFaceVisible\(kind==="object"\)/);
 assert.match(page,/subjectType,faceVisible,speechStyle/);
 assert.match(subject,/onClick=\{\(\)=>onChange\("person"\)\}/);
 assert.match(portrait,/faceVisible&&<div className="souls-portrait-face"/);
});
test("face visibility is separate from stored face coordinates and works for old Souls",()=>{
 assert.match(page,/faceVisible=\{soulFaceVisible\(s\)\}/);
 assert.match(page,/faceVisible=\{faceVisible\}/);
 assert.match(page,/faceVisible=\{soulFaceVisible\(selected\)\}/);
 assert.match(settings,/onChange=\{e=>onFaceChange\(e.target.checked\)\}/);\n assert.match(page,/onFaceChange=\{visible=>void mutate\(current=>/);
 assert.match(portrait,/data-face-visible=\{faceVisible\?"true":"false"\}/);
 assert.match(page,/face:safeFace\(faceDraft\),transform:safeTransform\(transformDraft\)/);
});
test("speech moves outside the image, and transcript is expandable below Live controls",()=>{
 assert.match(page,/visual=\{visual\} caption=\{false\}/);
 assert.match(page,/className=\{"souls-speech-display souls-speech-"\+soulSpeechStyle\(selected\)\}/);
 assert.match(page,/onVisual=\{onVisual\} onAudioLevel=\{onAudioLevel\} scene/);
 assert.match(data,/export type SoulSpeechStyle="bubble"\|"subtitle"/);
 assert.match(page,/speechStyle:style/);
 assert.match(chat,/scene\?<details className="souls-chat-history"/);
 assert.match(chat,/scene\?"souls-chat-inline":"souls-panel"/);
 assert.match(chat,/useLiveSession\(/);
 assert.match(chat,/live\.sendText\(value\)/);
 assert.match(css,/\.souls-speech-bubble/);
 assert.match(css,/\.souls-speech-subtitle/);
 assert.match(css,/\.souls-photo-profile \.souls-portrait-stage/);
 assert.match(css,/background:none!important/);
});
