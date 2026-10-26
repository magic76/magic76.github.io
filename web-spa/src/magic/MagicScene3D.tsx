import {useEffect,useMemo,useRef,useState,type ComponentRef} from "react";
import {Canvas,useFrame,useThree, type ThreeEvent} from "@react-three/fiber";
import {OrbitControls} from "@react-three/drei";
import {Color,Group,Vector3} from "three";
import {safeMagicAnchor,type MagicObjectKind,type MagicObject,type MagicSpell,type MagicWorld} from "./world";
import {ringStep,ringPoint,islandSurfaceHeight} from "./magicNavigation";
import {MagicWonders3D} from "./MagicWonders3D";
import {MagicCreations3D} from "./MagicCreations3D";
import {MagicDragonModel3D,MagicFoxModel3D} from "./MagicProceduralLife3D";
import {MagicOwlModel3D,MagicChestModel3D,MagicCrystalModel3D,MagicPortalModel3D,MagicTreeModel3D} from "./MagicResidents3D";
import {
 MAGIC_OVERVIEW_POSITION,
 getMagicOverviewPosition,
} from "./magicCamera";
import {MagicLighting3D} from "./MagicLighting3D";
import {MagicTerrain3D} from "./MagicTerrain3D";
import {MagicGroundShadows3D} from "./MagicGroundShadows3D";
import {MagicForest3D,MagicDistricts3D} from "./MagicScenery3D";
import {MagicCastle3D} from "./MagicCastle3D";
import {MagicPaths3D} from "./MagicPaths3D";
import {BIOMES,MAGIC_MATERIALS} from "./magicPalette";
import {MAGIC_TREES,MAGIC_DISTRICTS,magicCreationSites} from "./magicLayout";
import {getMagicFocusPose,magicHiddenTrees,type MagicOccluder,type MagicSubject} from "./magicFocus";
import {useMagicFrameloop} from "./useMagicFrameloop";

// The renderer receives only the strictly validated world reducer output.
// Gemini never passes raw markup, geometry, scripts, material properties or URLs.
type Props={label?:string;world:MagicWorld;reducedMotion:boolean;onInteract:(kind:MagicObjectKind)=>void;onFailure:()=>void;focusId:number|null;focusCreationId:number|null;onSelectCreation:(id:number)=>void;viewVersion:number};
const PLOTS:[[number,number],[number,number],[number,number],[number,number],[number,number],[number,number]]=[
 [-3.25,-.5],[3.15,-.7],[-2.7,2.65],[2.7,2.55],[-4,.8],[3.95,.95]
];
const ISLAND_LINEAR_SCALE=Math.sqrt(10); // radius grows sqrt(10): actual terrain area grows 10x
const ISLAND_X_RADIUS=5.65*ISLAND_LINEAR_SCALE;
const ISLAND_Z_RADIUS=4.75*ISLAND_LINEAR_SCALE;

// Keep animations deterministic and collision-safe without allocating new geometry
// or React state per animation frame. All objects stay on the visible island ring.
function SceneObject({object,position,animated,reacting,focused,peers,worldObjects,onClick}:{object:MagicObject;position:[number,number];animated:boolean;reacting:boolean;focused:boolean;peers:Map<number,[number,number]>;worldObjects:MagicObject[];onClick:(event:ThreeEvent<MouseEvent>)=>void}){
 const {kind,id}=object;
 const root=useRef<Group>(null),bob=useRef<Group>(null),arrival=useRef<number|null>(null);
 const initial=useRef<[number,number,number] | null>(null);
 const creature=kind==="dragon"||kind==="owl"||kind==="fox";
 const air=kind==="dragon"?1.75:kind==="owl"?.85:0;
 // Initial placement is above the island mesh, not at y=.98 where
 // a large dragon torso and its wings previously clipped into the island.
 if(initial.current===null)initial.current=[position[0],islandSurfaceHeight(...position)+air,position[1]];
 useFrame(({clock},delta)=>{
  if(!root.current)return;
  const time=clock.elapsedTime,seed=id*2.399;
  const roaming=creature&&object.x===undefined;
  const target:readonly [number,number]=roaming?
   focused?[position[0]+Math.cos(time*.34+seed)*.75,position[1]+Math.sin(time*.34+seed)*.75]:
   ringPoint(time*(kind==="fox"?.21:kind==="dragon"?.12:.16)+seed,.76+(id%3)*.045):position;
  const current=root.current.position,from:[number,number]=[current.x,current.z];
  const obstacles:[number,number][]=[];
  for(const other of worldObjects){
   if(other.id===id)continue;
   const known=peers.get(other.id);
   if(known){obstacles.push(known);continue}
   const plot=PLOTS[other.slot]??PLOTS[0];
   obstacles.push(other.x!==undefined&&other.z!==undefined?
    safeMagicAnchor(other.x,other.z):safeMagicAnchor(plot[0]/3.7,plot[1]/3.25));
  }
  const speed=kind==="dragon"?2.5:kind==="fox"?1.65:1.75;
  const next=animated?ringStep(from,target,Math.min(delta,.07)*speed,obstacles):position;
  const dx=next[0]-current.x,dz=next[1]-current.z;
  current.set(next[0],islandSurfaceHeight(next[0],next[1])+air+
   (animated&&creature&&kind!=="fox"?Math.sin(time*1.7+seed)*.12:0),next[1]);
  peers.set(id,[current.x,current.z]);
  if(animated&&creature&&Math.hypot(dx,dz)>.0001){
   const heading=Math.atan2(dx,dz);
   root.current.rotation.y+=Math.atan2(Math.sin(heading-root.current.rotation.y),
    Math.cos(heading-root.current.rotation.y))*Math.min(1,delta*3);
  }
  if(!bob.current)return;
  if(animated&&kind==="dragon"){
   arrival.current=(arrival.current??0)+Math.min(delta,.25);// delta age survives clock resets
   const progress=Math.min(1,arrival.current/3.15);
   const eased=1-Math.pow(1-progress,3);
   bob.current.position.set((focused?-1.1:-4)*(1-eased),(focused?1.4:3.8)*(1-eased),(focused?-.8:-3)*(1-eased));
   bob.current.rotation.y=(1-eased)*1.5;
  }else if(animated&&kind==="fox")bob.current.position.y=Math.abs(Math.sin(time*5+seed))*.055;
  else bob.current.position.set(0,0,0);
 });
 return <group ref={root} position={initial.current} onClick={onClick}>
  <group ref={bob}>
   {kind==="dragon"?<MagicDragonModel3D animated={animated} size={reacting?1.06:1}/>:null}
   {kind==="portal"?<MagicPortalModel3D/>:null}
   {kind==="chest"?<MagicChestModel3D animated={animated}/>:null}
   {kind==="crystal"?<MagicCrystalModel3D/>:null}
   {kind==="owl"?<MagicOwlModel3D animated={animated}/>:null}
   {kind==="fox"?<MagicFoxModel3D animated={animated}/>:null}
   {kind==="tree"?<MagicTreeModel3D/>:null}
  </group>
 </group>;
}
function SceneParticles({weather,effect,revision,animated}:{weather:MagicWorld["weather"];effect:MagicSpell|null;revision:number;animated:boolean}){
 const group=useRef<Group>(null);
 const particles=useMemo(()=>Array.from({length:28},(_,i)=>({
  x:Math.sin(i*17.17)*6,z:Math.cos(i*9.3)*4.5,y:1.7+(i%7)*.8
 })),[]);
 useFrame(({clock})=>{
  if(group.current&&animated)group.current.position.y=-(clock.elapsedTime*.5)%2;
 });
 return <group>
  {weather==="rain"||weather==="snow"?<group ref={group}>
   {particles.map((p,i)=><mesh key={i} position={[p.x,p.y,p.z]} rotation={weather==="rain"?[0,0,-.14]:[0,0,0]}>
    {weather==="snow"?<sphereGeometry args={[.065,5,4]}/>:<cylinderGeometry args={[.015,.015,.4,4]}/>}
    <meshBasicMaterial color={weather==="snow"?"#ffffff":"#98c8e7"} transparent opacity={.85}/>
   </mesh>)}
  </group>:null}
  {effect?<group key={revision} position={[0,3.55,.6]}>
   {Array.from({length:12},(_,i)=><mesh key={i} position={[Math.cos(i*2.4)*2.15,Math.sin(i*1.8)*.9,Math.sin(i*2.4)*2.2]}>
    <octahedronGeometry args={[.16+(i%3)*.09,0]}/>
    <meshBasicMaterial color={effect==="fire"?"#ff9b66":effect==="heal"?"#a4f4ac":effect==="wind"?"#b8edee":"#f9e4ad"}/>
   </mesh>)}
  </group>:null}
 </group>;
}
function SceneEvents({event,animated}:{event:MagicWorld["event"];animated:boolean}){
 const root=useRef<Group>(null);
 useFrame(({clock})=>{
  if(animated&&root.current)root.current.rotation.y=Math.sin(clock.elapsedTime*.25)*.11;
 });
 if(!event)return null;
 if(event==="rainbow")return <group position={[0,2,-2.8]}>
  {["#f19da9","#ffd28f","#fff6b3","#a8d9ba","#a2baf0","#d8aeea"].map((color,i)=>
   <mesh key={color} position={[0,0,-i*.045]}>
    <torusGeometry args={[4.8-i*.24,.13,8,48,Math.PI]}/>
    <meshBasicMaterial color={color} transparent opacity={.88} side={2}/>
   </mesh>)}
 </group>;
 if(event==="aurora")return <group ref={root} position={[0,6.55,-2.85]}>
  {["#6ae1c0","#95bdf4","#d4a0e8"].map((color,i)=><mesh key={i} position={[i*.3,i*.25,-i*.3]} rotation={[0,0,.16+i*.11]}>
   <planeGeometry args={[10.8-i,1.15]}/>
   <meshBasicMaterial color={color} transparent opacity={.29} side={2} depthWrite={false}/>
  </mesh>)}
 </group>;
 if(event==="meteor")return <group ref={root}>
  {Array.from({length:13},(_,i)=>{
   const a=i*2.39;
   return <group key={i} position={[Math.sin(a)*4,4.2+(i%6)*.7,Math.cos(a)*4]}>
    <mesh rotation={[0,0,-.65]}>
     <coneGeometry args={[.14+(i%3)*.06,.65+(i%4)*.22,5]}/>
     <meshBasicMaterial color={i%2?"#ffa965":"#fff1ab"}/>
    </mesh>
    <mesh position={[0,.35,0]}><sphereGeometry args={[.14,6,6]}/>
     <meshBasicMaterial color="#fff3cd"/></mesh>
   </group>
  })}
 </group>;
 return <group ref={root}>
  {Array.from({length:28},(_,i)=>{
   const a=i*2.399,rad=3.5+(i%3)*.5;
   return <mesh key={i} position={[Math.cos(a)*rad,2.5+(i%4)*.29,Math.sin(a)*rad]}>
    <sphereGeometry args={[.14,6,6]}/>
    <meshBasicMaterial color={["#fff0b4","#dfa8ea","#a9ede3"][i%3]}/>
   </mesh>;
  })}
 </group>;
}
/** Distinct landmark silhouettes turn a palette change into actual geography. */
function BiomeLandmarks({theme,night}:{theme:MagicWorld["theme"];night:boolean}){
 if(theme==="forest")return <group>
  {[-1,1].map((sign)=><group key={sign} position={[sign*5.9,1.1,-2.6]}>
   <mesh position={[0,.48,0]}><cylinderGeometry args={[.23,.34,1.2,7]}/><meshStandardMaterial color="#e0c8aa"/></mesh>
   <mesh position={[0,1.18,0]} scale={[1.2,.52,1.1]}>
    <sphereGeometry args={[.9,12,8]}/><meshStandardMaterial color="#d96883" roughness={.82}/></mesh>
   {[-.45,.23,.55].map((x,i)=><mesh key={i} position={[x,1.58,i*.16-.2]}>
    <sphereGeometry args={[.15,7,5]}/><meshBasicMaterial color="#fff2c7"/></mesh>)}
   <mesh position={[0,.51,.32]}><sphereGeometry args={[.17,8,8]}/>
    <meshStandardMaterial color="#e9ffb2" emissive="#b1f47b" emissiveIntensity={night?1.4:.22}/></mesh>
  </group>)}
  <mesh position={[0,1.5,-6.4]} rotation={[-Math.PI/2,0,0]}>
   <torusGeometry args={[1.2,.13,8,32]}/><meshStandardMaterial color="#8ec5a2" emissive="#61c990" emissiveIntensity={.25}/></mesh>
 </group>;
 if(theme==="candy")return <group>
  {[-1,1].map((sign)=><group key={sign} position={[sign*6.1,1.07,-2.6]}>
   <mesh position={[0,.9,0]}><cylinderGeometry args={[.18,.21,1.85,10]}/><meshStandardMaterial color="#faf6e0"/></mesh>
   <mesh position={[0,2.02,0]}><torusGeometry args={[.7,.25,8,20]}/>
    <meshStandardMaterial color={sign===1?"#f9b7d9":"#b5ddfc"} metalness={.12} roughness={.4}/></mesh>
   <mesh position={[0,2.02,0]} rotation={[0,0,Math.PI/4]}>
    <boxGeometry args={[.95,.16,.18]}/><meshStandardMaterial color="#fff5bf"/></mesh>
  </group>)}
  {[-1.3,1.3].map((x,i)=><group key={i} position={[x,1.16,3.3]}>
   <mesh position={[0,.28,0]}><cylinderGeometry args={[.33,.33,.56,8]}/>
    <meshStandardMaterial color="#e7a67d"/></mesh>
   <mesh position={[0,.72,0]}><sphereGeometry args={[.58,12,8]}/>
    <meshStandardMaterial color={i===0?"#f5bddb":"#f2e5a3"}/></mesh>
   <mesh position={[0,1.08,0]}><sphereGeometry args={[.14,8,6]}/><meshBasicMaterial color="#e86b91"/></mesh>
  </group>)}
 </group>;
 return <group>
  {[-1,1].map(sign=><group key={sign} position={[sign*6.3,.97,-2.6]}>
   <mesh position={[0,.63,0]}><cylinderGeometry args={[.65,.86,1.26,6]}/>
    <meshStandardMaterial color="#c1d6eb" flatShading/></mesh>
   <mesh position={[0,1.84,0]}><octahedronGeometry args={[.84,0]}/>
    <meshStandardMaterial color="#b4ddfa" emissive="#83add9" emissiveIntensity={night?.4:.08} flatShading/></mesh>
  </group>)}
  <mesh position={[0,1.13,3.55]}><torusGeometry args={[.88,.18,8,24]}/>
   <meshStandardMaterial color="#edc98e" metalness={.35} roughness={.4}/></mesh>
 </group>;
}
/**
 * A short, bounded cinematic beat attached to a validated world revision.
 * Camera choreography and effects are local only; permanent changes live in
 * the reducer. No arbitrary Gemini camera parameters or meshes are accepted.
 */
function MagicCinematic({cue,point,overviewPosition,focusCamera}:{cue:NonNullable<MagicWorld["cue"]>;point:[number,number];overviewPosition:Vector3;focusCamera:Vector3}){
 const glyph=useRef<Group>(null),started=useRef<number|null>(null);
 const destination=useMemo(()=>cue==="dragon_arrival"?focusCamera.clone():new Vector3(4.4,6.9,8.2),[cue,focusCamera]);
 const overview=overviewPosition;
 useFrame(({clock,camera},delta)=>{
  started.current=(started.current??0)+Math.min(delta,.25);// clock resets on resume
  const elapsed=started.current;
  const smooth=Math.min(1,delta*2.5);
  camera.position.lerp(elapsed>2.3?overview:destination,smooth);
  camera.lookAt(cue==="dragon_arrival"?point[0]:0,cue==="dragon_arrival"?2.4:2.7,cue==="dragon_arrival"?point[1]:0);
  if(glyph.current){
   const phase=Math.min(1,elapsed/1.6);
   glyph.current.rotation.z=elapsed*1.9;
   glyph.current.scale.setScalar(.3+phase*2.5);
  }
 });
 return <group ref={glyph} position={[cue==="dragon_arrival"?point[0]:0,3.2,cue==="dragon_arrival"?point[1]:.2]}>
  {[1,1.44,1.89].map((radius,i)=><mesh key={i} rotation={[Math.PI/2,0,0]}>
   <torusGeometry args={[radius,.065,7,38]}/>
   <meshBasicMaterial color={cue==="dragon_arrival"?"#ffd088":"#9feafa"} transparent opacity={.78-i*.17}/>
  </mesh>)}
  {Array.from({length:12},(_,i)=><mesh key={i} position={[Math.cos(i*2.399)*2.3,Math.sin(i*1.5)*1.6,Math.sin(i*2.399)*1.2]}>
   <octahedronGeometry args={[.15+(i%3)*.07,0]}/>
   <meshBasicMaterial color={cue==="dragon_arrival"?"#ffb76f":"#c7f7ff"}/>
  </mesh>)}
 </group>;
}
function SceneContent({world,reducedMotion,onInteract,onFailure,focusId,focusCreationId,onSelectCreation,viewVersion}:Props){
 const colors=BIOMES[world.theme],night=world.time==="night";
 const [cinematic,setCinematic]=useState(false);
 useEffect(()=>{
  if(!world.cue||reducedMotion){setCinematic(false);return}
  setCinematic(true);
  const timer=window.setTimeout(()=>setCinematic(false),3800);
  return()=>window.clearTimeout(timer);
 },[world.revision,world.cue,reducedMotion]);
 const {gl,invalidate,camera,size}=useThree();
 const overviewPosition=useMemo(
  ()=>getMagicOverviewPosition(size.width/Math.max(size.height,1),42),
  [size.width,size.height]
 );
 const orbit=useRef<ComponentRef<typeof OrbitControls>>(null);
 const scriptedView=useRef(true);
 useEffect(()=>{scriptedView.current=true;invalidate()},[focusId,viewVersion,overviewPosition,invalidate]);
 const occluders=useMemo<MagicOccluder[]>(()=>[
  ...MAGIC_TREES.map((p,index)=>({x:p.x,z:p.z,ground:islandSurfaceHeight(p.x,p.z),height:2.55*p.scale,radius:.88*p.scale,kind:'tree' as const,index})),
  ...MAGIC_DISTRICTS.map(p=>({x:p.x,z:p.z,ground:islandSurfaceHeight(p.x,p.z),height:2.6,radius:2.15,kind:'district' as const})),
  {x:0,z:-.55,ground:islandSurfaceHeight(0,-.55),height:7.5,radius:4.5,kind:'castle' as const}
 ],[]);
 const aspect=size.width/Math.max(size.height,1);
 const selected=useMemo(()=>{
  const focus=world.objects.find(obj=>obj.id===focusId);
  const creation=world.creations.find(c=>c.id===focusCreationId);
  if(!focus&&!creation)return null;
  let x=0,z=0,height=2.7,radius=.9;
  if(focus){
   const slot=PLOTS[focus.slot]??PLOTS[0];
   [x,z]=focus.x!==undefined&&focus.z!==undefined?safeMagicAnchor(focus.x,focus.z):safeMagicAnchor(slot[0]/3.7,slot[1]/3.25);
   height=focus.kind==='dragon'?3:1.8;
  }
  if(creation){
   [x,z]=magicCreationSites(world.creations,safeMagicAnchor).get(creation.id)??safeMagicAnchor(creation.x,creation.z);
   height=creation.blueprint?.kind==='dragon'?2.2:creation.blueprint?2:2.2;
   radius=creation.blueprint?.kind==='dragon'?1.8:1.25;
  }
  const subject:MagicSubject={x,z,ground:islandSurfaceHeight(x,z),height,radius};
  return {...getMagicFocusPose(subject,occluders,aspect),subject};
 },[world.objects,world.creations,focusId,focusCreationId,occluders,aspect]);
 const cameraGoal=useMemo(()=>selected?new Vector3(...selected.camera):overviewPosition,[selected,overviewPosition]);
 const targetGoal=useMemo(()=>selected?new Vector3(...selected.target):new Vector3(0,1.05,0),[selected]);
 const focusSeconds=useRef(0);
 const castingGoal=useMemo(()=>new Vector3(),[]);
 useEffect(()=>{focusSeconds.current=0},[focusCreationId,viewVersion]);
 useFrame((_,delta)=>{
  if(cinematic||!scriptedView.current||!orbit.current)return;
  const factor=reducedMotion?1:Math.min(1,delta*2.4);
  focusSeconds.current+=Math.min(delta,.1);
  const casting=focusCreationId!==null&&!reducedMotion&&focusSeconds.current<4.5;
  const progress=Math.min(1,focusSeconds.current/4.5);
  const ease=progress*progress*(3-2*progress);
  const goal=casting?castingGoal.copy(cameraGoal).sub(targetGoal).multiplyScalar(1+.18*(1-ease)).add(targetGoal):cameraGoal;
  camera.position.lerp(goal,factor);
  orbit.current.target.lerp(targetGoal,factor);
  orbit.current.update();
  if(camera.position.distanceTo(cameraGoal)<.03&&orbit.current.target.distanceTo(targetGoal)<.03)
   scriptedView.current=false;
 });
 const dragonPoint=useMemo(()=>{
  const dragon=[...world.objects].reverse().find(o=>o.kind==='dragon');
  if(!dragon)return [0,0] as [number,number];
  const plot=PLOTS[dragon.slot]??PLOTS[0];
  return dragon.x!==undefined&&dragon.z!==undefined?safeMagicAnchor(dragon.x,dragon.z):safeMagicAnchor(plot[0]/3.7,plot[1]/3.25);
 },[world.objects]);
 const cinematicPose=useMemo(()=>getMagicFocusPose({x:dragonPoint[0],z:dragonPoint[1],ground:islandSurfaceHeight(...dragonPoint),height:3.8,radius:1.7},occluders,aspect),[dragonPoint,occluders,aspect]);
 // After a manual orbit, recompute which trees block the focused subject.
 const manualOrbit=useRef(false);
 const [manualHidden,setManualHidden]=useState<number[]|null>(null);
 useEffect(()=>{manualOrbit.current=false;setManualHidden(null)},[focusId,focusCreationId,viewVersion]);
 const hiddenTrees=manualHidden??selected?.hiddenTrees??(cinematic&&world.cue==='dragon_arrival'?cinematicPose.hiddenTrees:[]);
 const peerPositions=useRef(new Map<number,[number,number]>());
 useEffect(()=>{const active=new Set(world.objects.map(obj=>obj.id));for(const id of peerPositions.current.keys())if(!active.has(id))peerPositions.current.delete(id)},[world.objects]);
 useEffect(()=>{
  const lose=(ev:Event)=>{ev.preventDefault();onFailure()};
  gl.domElement.addEventListener("webglcontextlost",lose);
  return()=>gl.domElement.removeEventListener("webglcontextlost",lose);
 },[gl,onFailure]);
 useEffect(()=>invalidate(),[world.revision,world.weather,world.time,reducedMotion,invalidate]);

 return <>
  <MagicLighting3D world={world} colors={colors}/>
  <MagicTerrain3D colors={colors}/>
  <MagicPaths3D colors={colors}/>
  <MagicGroundShadows3D hidden={hiddenTrees} reducedMotion={reducedMotion}/>
   <MagicDistricts3D colors={colors} night={night}/>
  <MagicCastle3D colors={colors} night={night} ice={world.castle==="ice"}/>
  <BiomeLandmarks theme={world.theme} night={night}/>
  <MagicForest3D colors={colors} hidden={hiddenTrees} reducedMotion={reducedMotion}/>
  {world.objects.map(obj=>{
   const plot=PLOTS[obj.slot]??PLOTS[0];
   const [x,z]=obj.x!==undefined&&obj.z!==undefined?
    safeMagicAnchor(obj.x,obj.z):safeMagicAnchor(plot[0]/3.7,plot[1]/3.25);
   return <SceneObject key={obj.id} object={obj} position={[x,z]} animated={!reducedMotion} reacting={world.adventureStep===3} focused={focusId===obj.id}
    peers={peerPositions.current} worldObjects={world.objects}
    onClick={ev=>{ev.stopPropagation();onInteract(obj.kind)}}/>;
  })}
  <MagicWonders3D wonders={world.wonders} animated={!reducedMotion}/>
  <MagicCreations3D creations={world.creations} animated={!reducedMotion} night={night}
   onSelect={onSelectCreation}/>
  <SceneParticles weather={world.weather} effect={world.effect} revision={world.revision} animated={!reducedMotion}/>
  {cinematic&&world.cue&&<MagicCinematic key={world.revision} cue={world.cue} overviewPosition={overviewPosition}
    focusCamera={new Vector3(...cinematicPose.camera)} point={dragonPoint}/>}
  <SceneEvents event={world.event} animated={!reducedMotion}/>
  <OrbitControls ref={orbit} makeDefault enabled={!cinematic} onStart={()=>{scriptedView.current=false;manualOrbit.current=true;}}
   onChange={()=>{if(!manualOrbit.current||!selected)return;const next=magicHiddenTrees(camera.position.toArray(),selected.subject,occluders);
    setManualHidden(prev=>prev&&prev.join()===next.join()?prev:next);}}
   enablePan enableDamping={!reducedMotion} minDistance={focusId!==null||focusCreationId!==null?7:11} maxDistance={110}
   minPolarAngle={Math.PI*.18} maxPolarAngle={Math.PI*.46} target={[0,1.05,0]}/>
 </>;
}
export function MagicScene3D(props:Props){
 const night=props.world.time==="night";
 const {frameloop,onCreated}=useMagicFrameloop(props.reducedMotion);
 return <Canvas className="magic-three-canvas" aria-label={props.label??""} role="img"
   camera={{position:MAGIC_OVERVIEW_POSITION.toArray(),fov:42,near:.1,far:180}}
   dpr={[1,Math.min(1.5,typeof window!=="undefined"?window.devicePixelRatio:1.5)]}
   gl={{antialias:true,alpha:false,powerPreference:"low-power",stencil:false}}
   frameloop={frameloop}
   fallback={<span>3D unavailable</span>}
   onCreated={state=>{onCreated(state);state.gl.setClearColor(new Color(night?"#243658":"#b6d9e6"))}}>
  <SceneContent {...props}/>
 </Canvas>;
}
