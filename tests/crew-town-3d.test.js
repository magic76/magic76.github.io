const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const test=require("node:test");
const root=path.join(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

test("Crew Town 3D is a lazy opt-in route with the existing 2.5D fallback",()=>{
 const app=read("web-spa/src/App.tsx");
 const page=read("web-spa/src/town/Town3DPage.tsx");
 assert.match(app,/import\("\.\/town\/Town3DPage"\)/);
 assert.match(page,/lazy\(\(\)=>import\("\.\/three\/TownScene"\)/);
 assert.match(page,/lazy\(\(\)=>import\("\.\/TownPage"\)/);
 assert.match(page,/webglcontextlost|setFailed\(true\)|setFallbackReason\("render-error"\)/);
 assert.match(page,/prefers-reduced-motion: reduce/);
 assert.match(page,/\/explore/);
});

test("original bundled GLB is a valid glTF 2.0 library with eight named art groups",()=>{
 const data=fs.readFileSync(path.join(root,"assets/town/crew-town-art-kit.glb"));
 assert.equal(data.readUInt32LE(0),0x46546c67);
 assert.equal(data.readUInt32LE(4),2);
 assert.equal(data.readUInt32LE(8),data.length);
 const jsonLength=data.readUInt32LE(12);
 assert.equal(data.readUInt32LE(16),0x4e4f534a);
 const doc=JSON.parse(data.subarray(20,20+jsonLength).toString("utf8"));
 const rootNodes=doc.scenes[0].nodes.map(n=>doc.nodes[n].name);
 assert.deepEqual(rootNodes,["cafe","studio","play","gazebo","tree","bench","lantern","flowers"]);
 assert.ok(doc.meshes.length>=25);
 assert.ok(data.length<120*1024);
});

test("Town 3D keeps six distinct real friends, four destinations, and voice handoff",()=>{
 const world=read("web-spa/src/town/three/world.ts");
 const chars=read("web-spa/src/town/three/TownCharacters.tsx");
 const places=read("web-spa/src/town/three/TownEnvironment.tsx");
 const overlay=read("web-spa/src/town/three/TownOverlay.tsx");
 for(const id of ["zoe","yuna","theo","hugo","bella","noah"]){
  assert.match(world,new RegExp('id:"'+id+'"'));
  assert.match(read("web-spa/src/friends/friendProfiles.ts"),new RegExp('"id":"'+id+'"'));
 }
 for(const id of ["cafe","studio","play","garden"])assert.match(world,new RegExp('id:"'+id+'"'));
 for(const state of ["Idle","Walking","Arriving","Interacting","Talking"])assert.match(chars,new RegExp('"'+state+'"'));
 assert.match(chars,/document.hidden/);
 assert.match(places,/crew-town-art-kit\.glb/);
 assert.match(overlay,/\/friend\/live\?id=/);
 assert.match(overlay,/CREW_FRIENDS/);
 assert.doesNotMatch(overlay,/new WebSocket|generateContent|startLiveSession/);
});

test("mobile controls, bounded orbit camera and day/night remain separate from Live",()=>{
 const camera=read("web-spa/src/town/three/TownCameraController.tsx");
 const scene=read("web-spa/src/town/three/TownScene.tsx");
 const page=read("web-spa/src/town/Town3DPage.tsx");
 const css=read("web-spa/src/town/three/town3d.css");
 assert.match(camera,/OrbitControls/);
 assert.match(camera,/minPolarAngle/);
 assert.match(camera,/maxDistance/);
 assert.match(camera,/enablePan=\{false\}/);
 assert.match(scene,/dpr=\{\[1/);
 assert.match(scene,/frameloop=\{reducedMotion/);
 assert.match(scene,/webglcontextlost/);
 assert.match(page,/setNight/);
 assert.match(css,/env\(safe-area-inset-bottom\)/);
 assert.match(css,/touch-action:none/);
});

test("2.5D fallback clearly exposes unsupported, rendering failure, and manual modes",()=>{
 const page=read("web-spa/src/town/Town3DPage.tsx");
 const css=read("web-spa/src/town/three/town3d.css");
 for(const reason of ["unsupported","render-error","manual"])assert.ok(page.includes('"'+reason+'"'));
 assert.ok(page.includes('目前使用 2.5D 地圖'));
 assert.ok(page.includes('onClick={()=>setFallbackReason("manual")}'));
 assert.ok(page.includes('onClick={retry3D}'));
 assert.match(page,/key=\{attempt\}/);
 assert.match(page,/setAttempt\(n=>n\+1\)/);
 assert.match(page,/WebGLRenderingContext/);
 assert.doesNotMatch(page,/WEBGL_lose_context|\.loseContext\(/);
 assert.ok(page.includes('this.props.onFailure(compactError(error))'));
 assert.match(css,/\.crew-town-3d-fallback-notice/);
});

test("the bundled glTF actually loads in Three's GLTFLoader",async()=>{
 const {GLTFLoader}=await import("three/addons/loaders/GLTFLoader.js");
 const binary=fs.readFileSync(path.join(root,"assets/town/crew-town-art-kit.glb"));
 const buffer=binary.buffer.slice(binary.byteOffset,binary.byteOffset+binary.byteLength);
 const asset=await new Promise((resolve,reject)=>new GLTFLoader().parse(buffer,"",resolve,reject));
 assert.ok(asset.scene.getObjectByName("cafe"));
 assert.ok(asset.scene.getObjectByName("gazebo"));
 assert.ok(asset.scene.getObjectByName("flowers"));
});
test("3D rendering has an in-Canvas model fallback and actionable errors",()=>{
 const scene=read("web-spa/src/town/three/TownScene.tsx");
 const page=read("web-spa/src/town/Town3DPage.tsx");
 const simple=read("web-spa/src/town/three/TownSimpleWorld.tsx");
 assert.match(scene,/TownModelsBoundary/);
 assert.match(scene,/TownSimpleWorld/);
 assert.match(scene,/webgl-context-lost/);
 assert.match(page,/crew-town-3d-error-detail/);
 assert.match(page,/onSimplified=\{simplified\}/);
 for(const id of ["cafe","studio","play","garden"])assert.ok(simple.includes('onSelect("'+id+'")'));
});

test("Canvas fallback is inert DOM content, not a side-effect-driven failure",()=>{
 const scene=read("web-spa/src/town/three/TownScene.tsx");
 assert.match(scene,/fallback=\{<span>WebGL unavailable<\/span>\}/);
 assert.doesNotMatch(scene,/CanvasUnavailable/);
 assert.doesNotMatch(scene,/useEffect\(\(\)=>onFailure\(/);
 assert.match(scene,/onFailure\("webgl-context-lost"\)/);
});


test("P1 camera makes town at least 15% larger while preserving focus and orbit bounds",()=>{
 const camera=read("web-spa/src/town/three/TownCameraController.tsx");
 const stage=read("web-spa/src/town/three/town3d.css");
 const apparentSize=(x,y,z,fov)=>1/(Math.hypot(x,y,z)*Math.tan(fov*Math.PI/360));
 const previousDesktop=apparentSize(14,16,23,36);
 const previousMobile=apparentSize(17,21,29,54);
 assert.ok(apparentSize(11.9,14,19.8,34)/previousDesktop>1.15);
 assert.ok(apparentSize(14.7,18.5,25,52)/previousMobile>1.15);
 assert.ok(apparentSize(12.7,15.7,23.4,49)/previousMobile>1.15);
 for(const offset of ["11.9,14,19.8","14.7,18.5,25","12.7,15.7,23.4","4.3,5.2,7.3"]){
  assert.ok(camera.includes("new Vector3("+offset+")"));
 }
 assert.ok(camera.includes("minDistance={7.5} maxDistance={50}"));
 assert.match(camera,/minPolarAngle/);
 assert.match(stage,/80svh/);
 assert.ok(stage.includes("max-height:min(39svh,300px)"));
});

test("P1 chibi friends have larger heads, smaller bodies and grounded feet",()=>{
 const chars=read("web-spa/src/town/three/TownCharacters.tsx");
 assert.ok(chars.includes("sphereGeometry args={[.42,20,16]}"));
 assert.ok(chars.includes("capsuleGeometry args={[.27,.27,5,12]}"));
 assert.ok(chars.includes("position={[route[0][0],.025,route[0][1]]}"));
 assert.ok(chars.includes("feet.rotation.x=Math.sin(s.walk)*.13"));
 for(const id of ["zoe","yuna","bella","theo","hugo","noah"]){
  assert.ok(chars.includes('id==="'+id+'"'));
 }
});

test("Town 3D P1.1 can focus moving friends and browse without losing 2.5D fallback",()=>{
 const scene=read("web-spa/src/town/three/TownScene.tsx");
 const chars=read("web-spa/src/town/three/TownCharacters.tsx");
 const environment=read("web-spa/src/town/three/TownEnvironment.tsx");
 const overlay=read("web-spa/src/town/three/TownOverlay.tsx");
 const page=read("web-spa/src/town/Town3DPage.tsx");
 const css=read("web-spa/src/town/three/town3d.css");
 assert.match(scene,/actorPositions=useRef/);
 assert.ok(scene.includes("onMove={trackActor}"));
 assert.ok(scene.includes("onPointerMissed={onDeselect}"));
 assert.ok(page.includes("onDeselect={()=>setSelected(null)}"));
 assert.ok(chars.includes("onMove(id,group.position.x,group.position.z)"));
 assert.ok(chars.includes("MathUtils.euclideanModulo(facing-group.rotation.y"));
 assert.match(chars,/<Html /);
 assert.ok(chars.includes("useCursor(hovered)"));
 assert.ok(environment.includes("useCursor(hovered!==null)"));
 assert.ok(environment.includes("ringGeometry args={[1.45,1.67,36]}"));
 assert.match(overlay,/crew-town-3d-roster-nav/);
 assert.ok(overlay.includes("navigate(-1)"));
 assert.match(css,/crew-town-3d-name/);
 assert.match(scene,/TownModelsBoundary/);
 assert.match(scene,/webgl-context-lost/);
});

test("P2 immersive close-up is the default while wide aerial overview remains selectable",()=>{
 const camera=read("web-spa/src/town/three/TownCameraController.tsx");
 const scene=read("web-spa/src/town/three/TownScene.tsx");
 const page=read("web-spa/src/town/Town3DPage.tsx");
 const css=read("web-spa/src/town/three/town3d.css");
 const details=read("web-spa/src/town/three/TownDecorations.tsx");
 assert.ok(page.includes('useState<TownViewMode>("close")'));
 assert.ok(page.includes('setView(mode=>mode==="close"?"overview":"close")'));
 assert.ok(page.includes("view={view}"));
 assert.ok(camera.includes('view==="close"'));
 assert.ok(camera.includes("new Vector3(5.4,8.1,12)"));
 assert.ok(camera.includes("new Vector3(14.7,18.5,25)"));
 assert.ok(scene.includes("<TownDecorations"));
 assert.ok(details.includes("TownWelcomeGate"));
 assert.ok(details.includes("CafeTerrace"));
 assert.ok(details.includes("PondLife"));
 assert.ok(css.includes(".crew-town-3d-hero"));
 assert.ok(css.includes(".crew-town-3d-landmark"));
 assert.match(scene,/TownModelsBoundary/);
});
