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

test("Town 3D keeps all 16 canonical friends, four destinations, and voice handoff",()=>{
 const world=read("web-spa/src/town/three/world.ts");
 const chars=read("web-spa/src/town/three/TownCharacters.tsx");
 const places=read("web-spa/src/town/three/TownEnvironment.tsx");
 const overlay=read("web-spa/src/town/three/TownOverlay.tsx");
 for(const id of ["zoe","noah","iris","max","yuna","felix","luna","theo","isla","hugo","ada","finn","maya","oscar","bella","ryan"]){
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
 assert.match(camera,/enablePan/);
 assert.match(camera,/screenSpacePanning=\{false\}/);
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
 for(const offset of ["11.9,14,19.8","54,74,89","34,42,67","4.3,5.2,7.3"]){
  assert.ok(camera.includes("new Vector3("+offset+")"));
 }
 assert.ok(camera.includes("minDistance={6.5} maxDistance={140}"));
 assert.match(camera,/minPolarAngle/);
 assert.match(stage,/80svh/);
 assert.ok(stage.includes("max-height:min(39svh,300px)"));
});

test("P1 chibi friends have larger heads, smaller bodies and grounded feet",()=>{
 const chars=read("web-spa/src/town/three/TownCharacters.tsx");
 assert.ok(chars.includes("sphereGeometry args={[.42,20,16]}"));
 assert.ok(chars.includes("capsuleGeometry args={[.27,.27,5,12]}"));
 assert.ok(chars.includes("position={[WALK_GRAPH[startNode].point[0],.025,WALK_GRAPH[startNode].point[1]]}"));
 assert.ok(chars.includes("leftLeg.current.rotation.x=MathUtils.damp("));
 assert.ok(chars.includes("rightLeg.current.rotation.x=MathUtils.damp("));
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
 assert.ok(camera.includes("new Vector3(54,74,89)"));
 assert.ok(scene.includes("<TownDecorations"));
 assert.ok(details.includes("TownWelcomeGate"));
 assert.ok(details.includes("CafeTerrace"));
 assert.ok(details.includes("PondLife"));
 assert.ok(css.includes(".crew-town-3d-hero"));
 assert.ok(css.includes(".crew-town-3d-landmark"));
 assert.match(scene,/TownModelsBoundary/);
});

test("Town friends keep the correct 3D body and label mapping for every identity",()=>{
 const world=read("web-spa/src/town/three/world.ts");
 const chars=read("web-spa/src/town/three/TownCharacters.tsx");
 const profiles=read("web-spa/src/friends/friendProfiles.ts");
 for(const id of ["zoe","yuna","bella"]){
  assert.ok(world.includes('{id:"'+id+'",outfit:"dress"'),id+" dress mapping");
  assert.ok(profiles.includes('"id":"'+id+'"'),id+" profile");
 }
 for(const id of ["theo","hugo","noah"]){
  assert.ok(world.includes('{id:"'+id+'",outfit:"jacket"'),id+" jacket mapping");
  assert.ok(profiles.includes('"id":"'+id+'"'),id+" profile");
 }
 assert.ok(world.includes('outfit:"dress"|"jacket"'));
 assert.ok(chars.includes('const isDress=outfit==="dress"'));
 assert.ok(chars.includes('cylinderGeometry args={[.19,.37,.69,14]}'));
 assert.ok(chars.includes('capsuleGeometry args={[.27,.27,5,12]}'));
 assert.ok(chars.includes("key={person.id} {...person}"));
 assert.ok(chars.includes("id[0].toUpperCase()+id.slice(1)"));
});

test("P3 extends the actual land footprint and offers camera traversal of five districts",()=>{
 const world=read("web-spa/src/town/three/world.ts");
 const land=read("web-spa/src/town/three/TownEnvironment.tsx");
 const districts=read("web-spa/src/town/three/TownDistricts.tsx");
 const camera=read("web-spa/src/town/three/TownCameraController.tsx");
 const scene=read("web-spa/src/town/three/TownScene.tsx");
 const page=read("web-spa/src/town/Town3DPage.tsx");
 const css=read("web-spa/src/town/three/town3d.css");
 assert.match(world,/WORLD_SIZE=\{width:52,depth:44\}/);
 assert.ok((52*44)/(21.7*17.1)>6);
 assert.ok(land.includes("<TownIsland/>"));
 const island=read("web-spa/src/town/three/TownIsland.tsx");
 assert.ok(island.includes("extrudeGeometry"));
 assert.ok(island.includes("coastPoint"));
 for(const id of ["center","market","grove","homes","harbor"]){
  assert.ok(world.includes('id:"'+id+'"'),id);
 }
 for(const fragment of ["function Market(","function Grove(","function Homes(","function Harbor(","EDGE_TREES"]){
  assert.ok(districts.includes(fragment),fragment);
 }
 assert.ok(camera.includes("districtAnchor"));
 assert.ok(camera.includes("enablePan"));
 assert.ok(camera.includes("maxDistance={140}"));
 assert.ok(camera.includes("onChange={()"));
 assert.ok(camera.includes("new Vector3(54,74,89)"));
 assert.ok(scene.includes("<TownDistricts"));
 assert.ok(scene.includes("far:230"));
 assert.ok(page.includes("travelToDistrict(area.id)"));
 assert.ok(page.includes('setDistrict(id)'));
 assert.ok(css.includes(".crew-town-3d-districts"));
});

test("P4 world registers exactly the canonical sixteen friend ids with matching avatars",()=>{
 const world=read("web-spa/src/town/three/world.ts");
 const profiles=read("web-spa/src/friends/friendProfiles.ts");
 const overlay=read("web-spa/src/town/three/TownOverlay.tsx");
 const page=read("web-spa/src/town/Town3DPage.tsx");
 const match=world.match(/export const TOWN_FRIEND_IDS=(\[[\s\S]*?\]) as const;/);
 assert.ok(match);
 const ids=JSON.parse(match[1]);
 assert.equal(ids.length,16);
 assert.equal(new Set(ids).size,16);
 for(const id of ids){
  assert.ok(profiles.includes('"id":"'+id+'"'),id+" must exist in canonical profiles");
  assert.ok(world.includes('id:"'+id+'"'),id+" must have its own actor data");
 }
 assert.equal((world.match(/startNode:"/g)||[]).length,16);
 assert.ok(overlay.includes("PEOPLE.length"));
 assert.ok(page.includes('近景探索 · 16 位朋友'));
});
test("P4 graph keeps 16 residents on connected safe pedestrian paths across all five districts",()=>{
 const fs=require("node:fs"),vm=require("node:vm");
 const walk=read("web-spa/src/town/three/TownWalkGraph.ts");
 const world=read("web-spa/src/town/three/world.ts");
 const sourceLoops=walk.match(/const LOOPS:[^=]+=(\[[\s\S]*?\]);\nconst BRIDGES/);
 const sourceBridges=walk.match(/const BRIDGES:[^=]+=(\[[\s\S]*?\]);\n/);
 assert.ok(sourceLoops);assert.ok(sourceBridges);
 const loops=vm.runInNewContext(sourceLoops[1]);
 const bridges=vm.runInNewContext(sourceBridges[1]);
 assert.equal(loops.length,5);
 const nodes=new Map();
 for(const loop of loops)for(const [id,x,z] of loop){
  assert.ok(Math.abs(x)<=25&&Math.abs(z)<=21,"node outside walkable land: "+id);
  assert.ok(!nodes.has(id));nodes.set(id,{x,z,links:new Set()});
 }
 for(const loop of loops)for(let i=0;i<loop.length;i++){
  const a=loop[i][0],b=loop[(i+1)%loop.length][0];
  nodes.get(a).links.add(b);nodes.get(b).links.add(a);
 }
 for(const [a,b] of bridges){
  assert.ok(nodes.has(a)&&nodes.has(b),"missing bridge node");
  nodes.get(a).links.add(b);nodes.get(b).links.add(a);
 }
 const seen=new Set(["c0"]),queue=["c0"];
 for(let i=0;i<queue.length;i++){
  const from=nodes.get(queue[i]);
  for(const neighbor of from.links)if(!seen.has(neighbor)){seen.add(neighbor);queue.push(neighbor)}
 }
 assert.equal(seen.size,nodes.size,"all five districts must be reachable");
 assert.equal(nodes.size,40);
 for(const [id,n] of nodes){
  for(const next of n.links){
   const other=nodes.get(next);
   assert.ok(Math.hypot(n.x-other.x,n.z-other.z)<=12.5,id+" path has suspicious jump");
  }
 }
 for(const id of (world.match(/startNode:"[^"]+"/g)||[])){
  assert.ok(nodes.has(id.slice(11,-1)),id+" walk spawn is missing from graph");
 }
 assert.ok(walk.includes("chooseNextWalkNode"));
 assert.ok(walk.includes("seedForFriend"));
});
test("P4 natural locomotion alternates planted feet and arms without frame-driven setState",()=>{
 const chars=read("web-spa/src/town/three/TownCharacters.tsx");
 const scene=read("web-spa/src/town/three/TownScene.tsx");
 assert.ok(chars.includes("const leftLeg=useRef<Group>"));
 assert.ok(chars.includes("const rightLeg=useRef<Group>"));
 assert.ok(chars.includes("const leftArm=useRef<Group>"));
 assert.ok(chars.includes("const rightArm=useRef<Group>"));
 assert.ok(chars.includes("Math.sin(s.walk+Math.PI)"));
 assert.ok(chars.includes("s.walk+=motion.moved*8.9"));
 assert.ok(chars.includes('s.phase="Walking"'));
 assert.ok(chars.includes('s.phase="Arriving"'));
 assert.ok(chars.includes("if(!selected&&!reducedMotion)"));
 assert.ok(chars.includes("if(!group||!torso||document.hidden)return"));
 assert.ok(chars.includes("selected&&!reducedMotion"));
 assert.ok(scene.includes("onMove={trackActor}"));
 assert.ok(scene.includes("WALK_GRAPH[PEOPLE.find"));
 assert.ok(!chars.includes("setStep("));
});
