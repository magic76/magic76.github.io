import {useMemo,useRef} from "react";
import {useFrame,type ThreeEvent} from "@react-three/fiber";
import type {Group} from "three";
import {safeMagicAnchor,type MagicCreation,type MagicCreatorPart} from "./world";

const PALETTE={
 gold:"#f9cf70",rose:"#efa3c8",azure:"#83c9f4",mint:"#89dcb5",
 violet:"#bd9ff2",coral:"#f2a18b",ivory:"#fff1d2",slate:"#72899d"
} as const;
const MATERIAL={
 stone:{roughness:.9,metalness:0,opacity:1,emissiveIntensity:0},
 wood:{roughness:1,metalness:0,opacity:1,emissiveIntensity:0},
 metal:{roughness:.27,metalness:.82,opacity:1,emissiveIntensity:.04},
 glass:{roughness:.12,metalness:.1,opacity:.61,emissiveIntensity:.15},
 glow:{roughness:.36,metalness:.15,opacity:1,emissiveIntensity:.78}
} as const;
const ease=(v:number)=>{const a=Math.max(0,Math.min(1,v));return a*a*(3-2*a)};
function PartMesh({part}:{part:MagicCreatorPart}){
 const surface=MATERIAL[part.material],color=PALETTE[part.color];
 const geometry=part.shape==="box"?<boxGeometry args={[1,1,1]}/>:
  part.shape==="sphere"?<sphereGeometry args={[.63,12,9]}/>:
  part.shape==="cone"?<coneGeometry args={[.57,1.18,9]}/>:
  part.shape==="cylinder"?<cylinderGeometry args={[.5,.5,1,10]}/>:
  part.shape==="torus"?<torusGeometry args={[.54,.17,7,16]}/>:
  <octahedronGeometry args={[.65,0]}/>;
 return <mesh castShadow={false} receiveShadow={false}>
  {geometry}
  <meshStandardMaterial color={color} emissive={color}
   roughness={surface.roughness} metalness={surface.metalness}
   emissiveIntensity={surface.emissiveIntensity} transparent={part.material==="glass"}
   opacity={surface.opacity} flatShading={part.material==="stone"}/>
 </mesh>;
}
function Creature({creation,creations,animated,onSelect}:{creation:MagicCreation;
 creations:MagicCreation[];animated:boolean;onSelect:(id:number)=>void}){
 const base=useRef<Group>(null);
 const body=useRef<Group>(null);
 const groups=useRef<(Group|null)[]>([]);
 const started=useRef<number|null>(null);
 const owner=creations.find(c=>c.id===creation.friendOf);
 const origin=useMemo(()=>{
  if(owner){
   const [x,z]=safeMagicAnchor(owner.x,owner.z);
   return [x+(creation.id%2===0?1.7:-1.7),z-.15] as const;
  }
  return safeMagicAnchor(creation.x,creation.z);
 },[owner?.x,owner?.z,creation.x,creation.z,creation.id]);
 // Each part starts outside the silhouette or under ground and converges to
 // its AI-defined target. No fixed character skeletons or prefab models.
 useFrame(({clock},delta)=>{
  if(!base.current)return;
  if(started.current===null)started.current=clock.elapsedTime;
  const elapsed=clock.elapsedTime-started.current;
  const completion=animated?Math.min(1,elapsed/3.8):1;
  const assembled=ease(Math.max(0,(completion-.72)/.28));
  const t=clock.elapsedTime+creation.seed*.0033;
  const drift=animated?Math.sin(t*.85)*.13:0;
  const walk=animated&&creation.motion==="walk"?.32:0;
  const radius=creation.motion==="orbit"&&animated?.46:0;
  const desiredX=origin[0]+walk*Math.sin(t*.58)+radius*Math.cos(t*.7);
  const desiredZ=origin[1]+walk*Math.cos(t*.58)+radius*Math.sin(t*.7);
  const current=base.current.position;
  const alpha=animated?Math.min(1,delta*3):1;
  current.set(current.x+(desiredX-current.x)*alpha,
   current.y+((1.55+(creation.motion==="hover"?.38+drift:0))-current.y)*alpha,
   current.z+(desiredZ-current.z)*alpha);
  base.current.rotation.y=creation.motion==="spin"&&animated?t*.55:
   creation.motion==="walk"&&animated?Math.sin(t*.65)*.32:0;
  if(animated&&creation.motion==="still")base.current.rotation.y=Math.sin(t*.27)*.08;
  // Give every finished creation a small seed/mood-driven physical signature.
  // This makes two structurally similar wishes feel alive without adding geometry
  // or per-frame React state, so the mobile GPU budget stays bounded.
  if(body.current){
   const personality=creation.mood==="mischievous"?1.35:creation.mood==="brave"?.82:1;
   const pulse=animated&&assembled>.98?Math.sin(t*(1.7+creation.seed%5*.13))*personality:0;
   const sway=animated&&assembled>.98?Math.sin(t*(.72+creation.seed%3*.11))*personality:0;
   const breathe=1+pulse*.018;
   body.current.scale.set(breathe,1-pulse*.012,breathe);
   body.current.rotation.z=sway*.025;
   body.current.position.y=animated&&assembled>.98&&creation.mood==="curious"?Math.max(0,pulse)*.035:0;
  }
  creation.parts.forEach((part,i)=>{
   const element=groups.current[i];if(!element)return;
   const delay=i*.12+.04;
   const phase=ease((completion*3.8-delay)/1.45);
   const angle=creation.seed*.017+i*2.399;
   const far=2.6+(i%4)*.38;
   const startX=creation.assembly==="stack"?part.x:
    creation.assembly==="bloom"?0:Math.cos(angle)*far;
   const startY=creation.assembly==="stack"?part.y-3:
    creation.assembly==="bloom"?1.2:part.y+1.8+Math.sin(angle)*.5;
   const startZ=creation.assembly==="stack"?part.z:
    creation.assembly==="bloom"?0:Math.sin(angle)*far;
   const spiral=creation.assembly==="spiral"?(1-phase)*Math.PI*2:0;
   element.position.set(
    part.x*phase+startX*(1-phase)+Math.sin(spiral+i)*.13*(1-phase),
    part.y*phase+startY*(1-phase),part.z*phase+startZ*(1-phase));
   // The AI can articulate individual authored parts without shaders, scripts or
   // additional draw calls. Joints remain still during assembly and with reduce-motion.
   const active=animated&&assembled>.98;
   const tempo=t*(1.1+(creation.seed%7)*.08);
   const swing=Math.sin(tempo*2.4+i*.8);
   const joint=part.joint??"fixed";
   element.rotation.set(
    active&&joint==="hinge"?swing*.38*(creation.motion==="walk"?1.35:1):
     active&&joint==="wheel"?tempo*3:0,
    (1-phase)*(i+1)*1.6+(active&&joint==="tail"?swing*.46:0),
    active&&joint==="flap"?Math.sin(tempo*2.1)*(part.x<0?-1:1)*.62:0);
   element.scale.setScalar(Math.max(.04,phase)*part.size);
  });
 });
 return <group ref={base} position={[origin[0],1.55,origin[1]]}
   onClick={(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();onSelect(creation.id)}}>
  <group ref={body}>
   {creation.parts.map((part,i)=><group key={i} ref={node=>{groups.current[i]=node}}>
    <PartMesh part={part}/>
   </group>)}
  </group>
 </group>;
}
export function MagicCreations3D({creations,animated,onSelect}:{creations:MagicCreation[];
 animated:boolean;onSelect:(id:number)=>void}){
 return <group>{creations.map(c=><Creature key={c.id+":"+c.revision} creation={c}
  creations={creations} animated={animated} onSelect={onSelect}/>)}</group>;
}
