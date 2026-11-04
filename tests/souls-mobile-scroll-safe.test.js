const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const page=read("web-spa/src/souls/SoulsPage.tsx");
const controls=read("web-spa/src/souls/SoulTransformControls.tsx");
const number=read("web-spa/src/souls/SoulNumberStepper.tsx");
const mask=read("web-spa/src/souls/SoulMaskEditor.tsx");
const portrait=read("web-spa/src/souls/SoulPortrait.tsx");
const css=read("web-spa/src/souls/souls.css");

test("no draggable range sliders in either portrait placement or brush controls",()=>{
 assert.doesNotMatch(controls,/<input[^>]*type="range"/);
 assert.doesNotMatch(mask,/<input[^>]*type="range"/);
 assert.match(controls,/<SoulNumberStepper\b/g);
 assert.match(mask,/<SoulNumberStepper\b/);
 assert.match(number,/onClick=\{\(\)=>adjust\(-1\)\}/);
 assert.match(number,/onClick=\{\(\)=>adjust\(1\)\}/);
 assert.match(number,/min:number;max:number;step:number/);
 assert.match(number,/Math\.max\(min,Math\.min\(max/);
 assert.match(number,/aria-label=\{label\+/);
});

test("placement controls start collapsed and need an explicit gesture button",()=>{
 assert.match(controls,/return <details className="souls-transform-controls"/);
 assert.doesNotMatch(controls,/<details[^>]*\sopen(?:\s|>|=)/);
 assert.match(controls,/gestureEnabled=false/);
 assert.match(controls,/className="souls-gesture-toggle"/);
 assert.match(controls,/aria-pressed=\{gestureEnabled\}/);
 assert.match(controls,/onClick=\{\(\)=>onGestureEnabledChange\(!gestureEnabled\)\}/);
 assert.match(controls,/if\(!e\.currentTarget\.open\)onGestureEnabledChange\(false\)/);
 assert.match(controls,/disabled=\{!faceVisible\}/);
});

test("fresh, existing and saved Souls are initially scroll-safe, gesture is reset",()=>{
 assert.match(page,/const \[gestureActive,setGestureActive\]=useState\(false\)/);
 assert.match(page,/editing=\{gestureActive\} editTarget=\{editTarget\}/);
 assert.match(page,/editing=\{editFace&&gestureActive\}/);
 assert.match(page,/gestureEnabled=\{gestureActive\} onGestureEnabledChange=\{setGestureActive\}/g);
 assert.match(page,/setEditTarget\("object"\);setGestureActive\(false\)/);
 assert.match(page,/setEditFace\(false\);setGestureActive\(false\)/);
 assert.match(portrait,/if\(!editing\)return;/);
 assert.match(portrait,/if\(!editing\|\|!pointers\.current\.has/);
 assert.match(css,/\.souls-portrait:not\(\.souls-portrait-editing\) \.souls-portrait-stage\s*\{\s*touch-action:pan-y/);
 assert.match(css,/\.souls-photo-first \.souls-stepper-buttons button\s*\{/);
 assert.match(css,/min-height:44px/);
});

test("photo, eye, mask, stored face and Live controls remain wired",()=>{
 assert.match(page,/transform:safeTransform\(transformDraft\)/);
 assert.match(page,/face:safeFace\(faceDraft\)/);
 assert.match(page,/onTransformChange=\{setTransformDraft\}/);
 assert.match(page,/faceVisible=\{faceVisible\}/);
 assert.match(page,/maskEditing==="draft"\?<SoulMaskEditor/);
 assert.match(page,/maskEditing==="saved"&&<div className="souls-panel">/);
 assert.match(page,/onVisual=\{onVisual\} onAudioLevel=\{onAudioLevel\} scene\/>/);
 assert.match(portrait,/applyGesture\(/);
 assert.match(portrait,/stageToObjectPoint\(/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
