import {useEffect,useMemo,useRef} from "react";
import {MagicCasting3D} from "./MagicCasting3D";
import {MagicParticleLayers3D} from "./MagicParticleLayers3D";
import {MagicGreetings3D} from "./MagicGreetings3D";
import {MagicReactions3D} from "./MagicReactions3D";
import {useFrame,type ThreeEvent} from "@react-three/fiber";
import {RoundedBox} from "@react-three/drei";
import {Mesh,Vector3,type Group} from "three";
import {safeMagicAnchor,type MagicCreation,type MagicCreatorPart} from "./world";
import {creationGroundClearance,islandSurfaceHeight,magicPartPivot} from "./magicNavigation";
import {magicCreationSites} from "./magicLayout";
import {MagicPartAccents3D} from "./MagicPartAccents3D";
import {MagicCreationLife3D} from "./MagicCreationLife3D";
import {magicWishTraits} from "./magicWish";
import {MagicCuteFace3D,MagicPartIdentity3D} from "./MagicPartIdentity3D";
import {MagicDragonModel3D,MagicFoxModel3D,MagicRobotModel3D} from "./MagicProceduralLife3D";
const LINK_UP=new Vector3(0,1,0);

const PALETTE={
 gold:"#f9cf70",rose:"#efa3c8",azure:"#83c9f4",mint:"#89dcb5",
 violet:"#bd9ff2",coral:"#f2a18b",ivory:"#fff1d2",slate:"#72899d"
} as const;
const MATERIAL={
 stone:{roughness:.9,metalness:0,opacity:1,emissiveIntensity:0},
 wood:{roughness:1,metalness:0,opacity:1,emissiveIntensity:0},
 metal:{roughness:.82,metalness:.1,opacity:1,emissiveIntensity:.02},
 glass:{roughness:.82,metalness:0,opacity:1,emissiveIntensity:.2},
 glow:{roughness:.78,metalness:0,opacity:1,emissiveIntensity:.48}
} as const;
// The old creator used elapsed/3.8; keep this migration note until the broad
// Magic regression is updated to assert the staged timing contract directly.
const ASSEMBLY_SECONDS=5.6;
const ease=(v:number)=>{const a=Math.max(0,Math.min(1,v));return a*a*(3-2*a)};
/** Build a readable three-beat reveal without adding semantic fields to the AI
 * payload: large fixed pieces establish the silhouette, articulated parts show
 * function next, then small details finish the identity. Original part order is
 * only used as a deterministic tie-breaker. */
export function magicAssemblyOrder(parts:MagicCreatorPart[]){
 return parts.map((part,index)=>({part,index,score:
  (part.joint&&part.joint!=="fixed"?1:0)+(part.size<.72?2:0)}))
  .sort((a,b)=>a.score-b.score||b.part.size-a.part.size||a.index-b.index)
  .reduce<number[]>((r,item,rank)=>(r[item.index]=rank,r),[]);
}
/** Geometry still comes exclusively from validated part enums. Rounded edges,
 * ornament rims and material-specific highlights lend recognizable depth; no
 * downloaded assets, custom shaders or AI executable payloads. */
function PartMesh({part,detailRef,autoFace,animated,showAccents,showIdentity,maxPartY,night}:{part:MagicCreatorPart;detailRef:(node:Group|null)=>void;autoFace:boolean;animated:boolean;showAccents:boolean;showIdentity:boolean;maxPartY:number;night:boolean}){
 const surface=MATERIAL[part.material],color=PALETTE[part.color];
 const finish=<meshStandardMaterial color={color} emissive={color}
  roughness={surface.roughness} metalness={surface.metalness}
  emissiveIntensity={surface.emissiveIntensity*(night&&(part.material==="glass"||part.material==="glow")?1.8:1)} flatShading/>;
 return <group rotation={[part.shape==="torus"&&part.joint==="wheel"&&part.y>=maxPartY*.6?Math.PI/2-.42:0,(part.yaw??0)*Math.PI/180,0]}
  scale={[part.width??1,part.height??1,part.depth??1]}>
  {part.shape==="box"?
   <RoundedBox args={[1,1,1]} radius={.13} smoothness={1}>{finish}</RoundedBox>:
   <mesh scale={part.shape==="leaf"?[1.35,.58,.38]:[1,1,1]}>
    {part.shape==="sphere"?<sphereGeometry args={[.63,10,8]}/>:
     part.shape==="cone"?<coneGeometry args={[.57,1.18,7]}/>:
     part.shape==="cylinder"?<cylinderGeometry args={[.5,.5,1,8]}/>:
     part.shape==="torus"?<torusGeometry args={[.54,.15,6,12]}/>:
     part.shape==="capsule"?<capsuleGeometry args={[.34,.84,5,8]}/>:
     part.shape==="leaf"?<sphereGeometry args={[.65,10,8]}/>:
     <octahedronGeometry args={[.65,0]}/>}
    {finish}
   </mesh>}
  <group ref={detailRef}>
   {showAccents&&<MagicPartAccents3D part={part}/>}
   {showIdentity&&<MagicPartIdentity3D part={part} animated={animated}/>}
   {autoFace&&<MagicCuteFace3D front={part.shape==="sphere"?.64:part.shape==="capsule"?.39:.56} animated={animated} seed={part.y*9} scale={Math.max(.82,Math.min(1.15,part.size))}/>}
  </group>
 </group>;
}
function Creature({creation,site,animated,night,neighbors,greeting,creationsById,onSelect}:{creation:MagicCreation;
 site:[number,number];animated:boolean;night:boolean;neighbors:Map<number,{x:number;z:number;look?:number;until?:number;ready?:number;react?:{x:number;z:number;w:number;look:number;dance?:boolean}}>;greeting:{busyUntil:number;nextAt:number;emission?:{x:number;y:number;z:number;until:number;kind:"heart"|"sparkle"}};creationsById:Map<number,MagicCreation>;onSelect:(id:number)=>void}){
 const base=useRef<Group>(null);
 const body=useRef<Group>(null);
 const groups=useRef<(Group|null)[]>([]);
 const links=useRef<(Mesh|null)[]>([]);
 const detailGroups=useRef<(Group|null)[]>([]);
 const linkDirection=useMemo(()=>new Vector3(),[]);
 const linkMidpoint=useMemo(()=>new Vector3(),[]);
 const started=useRef<number|null>(null);
 useEffect(()=>()=>{neighbors.delete(creation.id)},[neighbors,creation.id]);
 const nextGreeting=useRef(0);const greetingUntil=useRef(0);const greetingTo=useRef<number|null>(null);
 const phases=useRef<number[]>([]);
 const prevPhases=useRef<number[]>([]);
 const popTimes=useRef<number[]>([]);
 const finishAt=useRef(-1);
 const stage=useRef(0);
 const progress=useRef(0);
 const aura=creation.aura??magicWishTraits(creation.label+" "+creation.idea).aura;
 const groundClearance=useMemo(()=>creation.blueprint?.kind==="dragon"?.22:creation.blueprint?.1:creationGroundClearance(creation.parts),[creation.parts,creation.blueprint]);
 const assemblyOrder=useMemo(()=>magicAssemblyOrder(creation.parts),[creation.parts]);
 const autoFaceIndex=useMemo(()=>creation.parts.some(p=>p.detail==="face")?-1:creation.parts.reduce((best,p,i,arr)=>
  (["sphere","box","capsule"].includes(p.shape)&&(!arr[best]||p.size*(p.width??1)*(p.height??1)>arr[best].size*(arr[best].width??1)*(arr[best].height??1)))?i:best,-1),[creation.parts]);
 const maxPartY=useMemo(()=>Math.max(0,...creation.parts.map(p=>p.y)),[creation.parts]);
 const modelScale=useMemo(()=>{
  if(creation.blueprint)return 1;
  let low=Infinity,high=-Infinity,wide=0;
  for(const p of creation.parts){const y=p.y;const radius=p.size*(p.height??1)*.8;low=Math.min(low,y-radius);high=Math.max(high,y+radius);wide=Math.max(wide,Math.abs(p.x)+p.size*(p.width??1)*.7,Math.abs(p.z)+p.size*(p.depth??1)*.7)}
  const tall=Number.isFinite(high-low)?high-low:0;
  return Math.min(1,tall>0?2.7/tall:1,wide>0?2.0/wide:1);
 },[creation.parts,creation.blueprint]);
 const pivots=useMemo(()=>creation.parts.map(magicPartPivot),[creation.parts]);
 const origin=site;
 // Each part starts outside the silhouette or under ground and converges to
 // its AI-defined target. No fixed character skeletons or prefab models.
 useFrame(({clock,camera},delta)=>{
  if(!base.current)return;
  // Detail-level switch: up close show all fine facial / ornamental surfaces;
  // at overview scale skip hundreds of tiny meshes invisible on a 390px screen.
  // GPU visibility only, no per-frame React setState or geometry allocations.
  const showDetail=base.current.position.distanceToSquared(camera.position)<30*30;
  for(const node of detailGroups.current)if(node)node.visible=showDetail;
  // Age from frame deltas, not clock.elapsedTime: R3F resets the clock to 0
  // whenever the off-screen pause (frameloop "never") resumes, which used to
  // replay the whole assembly after scrolling back to the island.
  started.current=(started.current??0)+Math.min(delta,.25);
  const elapsed=started.current;
  const completion=animated?Math.min(1,elapsed/ASSEMBLY_SECONDS):1;
  const assembled=ease(Math.max(0,(completion-.82)/.18));
  stage.current=assembled;
  if(animated&&assembled>=.98&&finishAt.current<0)finishAt.current=elapsed;
  progress.current=elapsed;
  const socialTime=performance.now()/1000;
  const t=socialTime+creation.seed*.0033;
  const drift=animated?Math.sin(t*.85)*.045:0;
  const walk=animated&&!night&&creation.motion==="walk"?.45:0;
  const radius=creation.motion==="orbit"&&animated?.46:0;
  const desiredX=origin[0]+walk*Math.sin(t*.58)+radius*Math.cos(t*.7);
  const desiredZ=origin[1]+walk*Math.cos(t*.58)+radius*Math.sin(t*.7);
  const current=base.current.position;
  const self=neighbors.get(creation.id)??{x:current.x,z:current.z};
  self.x=current.x;self.z=current.z;self.ready=assembled;neighbors.set(creation.id,self);
  const asleep=night&&(creation.motion==="walk"||creation.motion==="still");
  if(animated&&!asleep&&assembled>.98&&socialTime>=nextGreeting.current&&socialTime>=greeting.busyUntil&&socialTime>=greeting.nextAt){
   nextGreeting.current=socialTime+7+(creation.seed%6);
   let chosen:number|undefined;let best=Infinity;
   for(const [id,p] of neighbors){
    if(id===creation.id||Math.hypot(p.x-current.x,p.z-current.z)>6.5)continue;
    const other=creationsById.get(id);
    if(night&&other&&(other.motion==="walk"||other.motion==="still"))continue;
    const rank=id===creation.friendOf?-100:id;
    if(rank<best){best=rank;chosen=id}
   }
   if(chosen!==undefined){
    const friend=neighbors.get(chosen)!;
    self.look=chosen;self.until=socialTime+2.5;
    friend.look=creation.id;friend.until=socialTime+2.5;
    greeting.busyUntil=socialTime+2.5;greeting.nextAt=socialTime+8.5;
    greeting.emission={x:(current.x+friend.x)/2,y:2,z:(current.z+friend.z)/2,
     until:socialTime+1.5,kind:creation.mood==="gentle"?"heart":"sparkle"};
   }
  }
  const alpha=animated?Math.min(1,delta*3):1;
  const react=self.react;
  const finalX=react?desiredX+(react.x-desiredX)*react.w:desiredX;
  const finalZ=react?desiredZ+(react.z-desiredZ)*react.w:desiredZ;
  current.set(current.x+(finalX-current.x)*alpha,
   current.y+((islandSurfaceHeight(finalX,finalZ)+groundClearance*modelScale+
    (creation.motion==="hover"?.2+drift:0))-current.y)*alpha,
   current.z+(finalZ-current.z)*alpha);
  // Chibi faces carry the charm: non-spinning creations turn (damped) to face
  // the viewer, with a small walk/idle sway on top.
  {
   const friend=animated&&!asleep&&self.look!==undefined&&(self.until??0)>socialTime?neighbors.get(self.look):undefined;
   const face=(react&&react.w>.01?react.look:friend?Math.atan2(friend.x-current.x,friend.z-current.z):Math.atan2(camera.position.x-current.x,camera.position.z-current.z))+
    (!animated?0:creation.motion==="walk"?Math.sin(t*.3)*.18:creation.motion==="still"?Math.sin(t*.27)*.08:0);
   const turn=Math.atan2(Math.sin(face-base.current.rotation.y),Math.cos(face-base.current.rotation.y));
   base.current.rotation.y+=turn*(animated?Math.min(1,delta*2.2):1);
  }
  // Give every finished creation a small seed/mood-driven physical signature.
  // This makes two structurally similar wishes feel alive without adding geometry
  // or per-frame React state, so the mobile GPU budget stays bounded.
  if(body.current){
   const personality=creation.mood==="mischievous"?1.35:creation.mood==="brave"?.82:1;
   const pulse=animated&&assembled>.98?Math.sin(t*(1.7+creation.seed%5*.13))*personality:0;
   const sway=animated&&assembled>.98?Math.sin(t*(.72+creation.seed%3*.11))*personality:0;
   const asleep=night&&(creation.motion==="walk"||creation.motion==="still")&&assembled>.98;
   const breathe=1+pulse*(asleep?.007:.018);
   // High-level anatomical creations materialize as a continuous silhouette,
   // not a cloud of disconnected primitives. Reduced-motion shows full form.
   const sculptReveal=creation.blueprint?(animated?ease((completion-.12)/.72):1):1;
   body.current.scale.set(modelScale*breathe*sculptReveal,modelScale*(1-pulse*.012)*sculptReveal,modelScale*breathe*sculptReveal);
   body.current.rotation.z=creation.mood==="curious"?sway*.065:creation.mood==="brave"?sway*.008:sway*.025;
   body.current.rotation.x=asleep?.11:0;
   body.current.position.y=react?.dance&&animated?Math.max(0,Math.sin(socialTime*Math.PI*3.2))*.14:
    animated&&assembled>.98&&creation.mood==="curious"?Math.max(0,pulse)*.035:0;
   if(react?.dance&&animated)body.current.rotation.z+=Math.sin(socialTime*Math.PI*3.2)*.06;
  }
  creation.parts.forEach((part,i)=>{
   const element=groups.current[i];if(!element)return;
   const rank=assemblyOrder[i]??i;
   const count=Math.max(1,creation.parts.length-1);
   // Stable silhouette -> articulated functional parts -> smaller detail reveal.
   const delay=.05+(rank/count)*.5;
   const phase=ease((completion-delay)/.38);
   phases.current[i]=phase;
   if(animated&&phase>=.98&&(prevPhases.current[i]??0)<.98)popTimes.current[i]=elapsed;
   prevPhases.current[i]=phase;
   const angle=creation.seed*.017+i*2.399;
   const far=2.6+(i%4)*.38;
   const startX=creation.assembly==="stack"?part.x:
    creation.assembly==="bloom"?0:Math.cos(angle)*far;
   // Start stack pieces above the silhouette: building from underground
   // previously made most of the animation invisible inside the island.
   const startY=creation.assembly==="stack"?part.y+3:
    creation.assembly==="bloom"?part.y+1.4:part.y+1.8+Math.sin(angle)*.5;
   const startZ=creation.assembly==="stack"?part.z:
    creation.assembly==="bloom"?0:Math.sin(angle)*far;
   const spiral=creation.assembly==="spiral"?(1-phase)*Math.PI*2:0;
   const pivot=pivots[i];
   // The node itself is the physical joint. Shift its origin to the authored
   // shoulder, hip or wing root while offsetting the visual mesh back below.
   // At zero rotation the actual part center still equals the AI's XYZ target.
   const popAge=elapsed-(popTimes.current[i]??-99);
   const overshoot=animated&&popAge>=0&&popAge<.18?Math.sin(popAge/.18*Math.PI)*.12:0;
   const size=Math.max(.04,phase)*(1+overshoot)*part.size;
   element.position.set(
    part.x*phase+startX*(1-phase)+Math.sin(spiral+i)*.13*(1-phase)+pivot[0]*size,
    part.y*phase+startY*(1-phase)+pivot[1]*size,
    part.z*phase+startZ*(1-phase)+pivot[2]*size);
   // The AI can articulate individual authored parts without shaders, scripts or
   // additional draw calls. Joints remain still during assembly and with reduce-motion.
   const active=animated&&assembled>.98;
   const tempo=t*(1.1+(creation.seed%7)*.08);
   const swing=Math.sin(tempo*2.4+i*.8);
   const joint=part.joint??"fixed";
   element.rotation.set(
    active&&joint==="hinge"?swing*.38*(creation.motion==="walk"?1.35:1):
     0,
    (1-phase)*(i+1)*1.6+(active&&joint==="tail"?swing*.46:0)+(active&&joint==="wheel"?t*.78:0),
    active&&joint==="flap"?Math.sin(tempo*2.1)*(part.x<0?-1:1)*.62:0);
   element.scale.setScalar(size);
  });
  // Physical articulated links follow the exact animated part centers.
  // Endpoints are model-authored through a strictly acyclic index graph.
  // No React state, geometry creation or object allocation in the render loop.
  creation.parts.forEach((part,i)=>{
   const rod=links.current[i];
   if(!rod)return;
   const from=groups.current[part.connectTo??-1],to=groups.current[i];
   if(!from||!to||part.connectTo===undefined){rod.visible=false;return}
   linkDirection.subVectors(to.position,from.position);
   const length=linkDirection.length();
   // Hairline rods are sub-pixel at overview distance; skip their draws there.
   const parent=creation.parts[part.connectTo];
   const rest=Math.hypot(part.x-parent.x,part.y-parent.y,part.z-parent.z);
   rod.visible=showDetail&&length>.3&&(!animated||completion>.54)&&phases.current[i]>=.97&&phases.current[part.connectTo]>=.97&&length<=Math.max(.3,rest)*1.35;
   if(!rod.visible)return;
   linkMidpoint.copy(from.position).addScaledVector(linkDirection,.5);
   rod.position.copy(linkMidpoint);
   rod.quaternion.setFromUnitVectors(LINK_UP,linkDirection.multiplyScalar(1/length));
   const radius=.041+part.size*.014;
   rod.scale.set(radius,length,radius);
  });
 });
 return <>
  <mesh position={[origin[0],islandSurfaceHeight(origin[0],origin[1])+.045,origin[1]]}
   rotation={[-Math.PI/2,0,0]}>
   <circleGeometry args={[1.05,24]}/>
   <meshBasicMaterial color="#293a36" transparent opacity={.15} depthWrite={false}/>
  </mesh>
  <group ref={base}
   position={[origin[0],islandSurfaceHeight(origin[0],origin[1])+groundClearance*modelScale,origin[1]]}
   onClick={(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();onSelect(creation.id)}}>
  <group ref={body} scale={modelScale}>
   <MagicCasting3D animated={animated} progress={progress} seed={creation.seed} parts={creation.parts} popTimes={popTimes} finishAt={finishAt}/>
   <MagicCreationLife3D aura={aura} animated={animated} night={night} seed={creation.seed} assembledRef={stage} sleeping={night&&(creation.motion==="walk"||creation.motion==="still")}/>
   {creation.blueprint?.kind==="robot"&&
    <MagicRobotModel3D blueprint={creation.blueprint} animated={animated}/>}
   {creation.blueprint?.kind==="fox"&&
    <MagicFoxModel3D animated={animated} size={creation.blueprint.body}
     color={PALETTE[creation.blueprint.palette]} headScale={creation.blueprint.head}
     tailScale={creation.blueprint.tail}/>}
   {creation.blueprint?.kind==="dragon"&&
    <MagicDragonModel3D animated={animated} size={creation.blueprint.body}
     color={PALETTE[creation.blueprint.palette]} headScale={creation.blueprint.head}
     tailScale={creation.blueprint.tail} wingScale={creation.blueprint.wings}/>}
   {creation.parts.map((part,i)=><mesh key={"link-"+i}
    ref={node=>{links.current[i]=node}}
    visible={false}>
    <cylinderGeometry args={[1,1,1,7]}/>
    <meshStandardMaterial color="#a2c7b8" metalness={0} roughness={.88} flatShading/>
   </mesh>)}
   {creation.parts.map((part,i)=>{
    const pivot=pivots[i];
    return <group key={i} ref={node=>{groups.current[i]=node}}>
     <group position={[-pivot[0],-pivot[1],-pivot[2]]}>
      <PartMesh part={part} autoFace={i===autoFaceIndex} animated={animated} showAccents={assemblyOrder[i]<6} showIdentity={creation.parts.slice(0,i).filter(p=>!!p.detail).length<4} detailRef={node=>{detailGroups.current[i]=node}} maxPartY={maxPartY} night={night}/>
     </group>
    </group>;
   })}
  </group>
 </group>
 </>;
}
export function MagicCreations3D({creations,animated,night=false,castleIce=false,focusedId=null,onSelect}:{creations:MagicCreation[];
 animated:boolean;night?:boolean;castleIce?:boolean;focusedId?:number|null;onSelect:(id:number)=>void}){
 const sites=useMemo(()=>magicCreationSites(creations,safeMagicAnchor),[creations]);
 const neighbors=useMemo(()=>new Map<number,{x:number;z:number;look?:number;until?:number}>(),[]);
 const creationsById=useMemo(()=>new Map(creations.map(c=>[c.id,c])),[creations]);
 const greeting=useMemo(()=>({busyUntil:0,nextAt:0,emission:undefined as undefined|{x:number;y:number;z:number;until:number;kind:"heart"|"sparkle"}}),[]);
 return <group><MagicParticleLayers3D/><MagicGreetings3D greeting={greeting}/><MagicReactions3D creations={creations} neighbors={neighbors} greeting={greeting} animated={animated} night={night} castleIce={castleIce} focusedId={focusedId}/>{creations.map(c=><Creature key={c.id+":"+c.revision} creation={c}
  site={sites.get(c.id)??safeMagicAnchor(c.x,c.z)} animated={animated} night={night} neighbors={neighbors} greeting={greeting} creationsById={creationsById} onSelect={onSelect}/>)}</group>;
}
