import {useRef,useState} from "react";
import {Html,useCursor} from "@react-three/drei";
import {useFrame} from "@react-three/fiber";
import type {ThreeEvent} from "@react-three/fiber";
import {Group,MathUtils} from "three";
import type {Mesh} from "three";
import {PEOPLE,type FriendId,type Waypoint} from "./world";

type Phase="Idle"|"Walking"|"Arriving"|"Interacting"|"Talking";
const SKIN="#eac5ad";
function Actor({id,coat,hair,skin,outfit,route,reducedMotion,selected,onSelect,onMove}:{
 id:FriendId;coat:string;hair:string;skin:string;outfit:"dress"|"jacket";route:ReadonlyArray<Waypoint>;
 reducedMotion:boolean;selected:boolean;onSelect:(id:FriendId)=>void;onMove:(id:FriendId,x:number,z:number)=>void;
}){
 const root=useRef<Group>(null);
 const body=useRef<Group>(null);
 const legs=useRef<Group>(null);
 const waveArm=useRef<Mesh>(null);
 const [hovered,setHovered]=useState(false);
 useCursor(hovered);
 const step=useRef({segment:0,phase:"Idle" as Phase,clock:0,walk:0});
 useFrame((state,dt)=>{
  const group=root.current, torso=body.current,feet=legs.current;
  if(!group||!torso||!feet||document.hidden)return;
  const s=step.current, delta=Math.min(dt,.06);
  // Store live positions without React state updates during the animation loop.
  onMove(id,group.position.x,group.position.z);
  if(reducedMotion||selected){
   s.phase="Idle";s.clock=0;torso.position.y=0;feet.rotation.x=0;
   if(selected){
    const facing=Math.atan2(state.camera.position.x-group.position.x,state.camera.position.z-group.position.z);
    const difference=MathUtils.euclideanModulo(facing-group.rotation.y+Math.PI,Math.PI*2)-Math.PI;
    group.rotation.y+=reducedMotion?difference:MathUtils.clamp(difference,-delta*4.5,delta*4.5);
   }
   if(waveArm.current)waveArm.current.rotation.z=selected&&!reducedMotion?-.78-Math.sin(state.clock.elapsedTime*5)*.15:-.15;
   return;
  }
  if(waveArm.current)waveArm.current.rotation.z=MathUtils.damp(waveArm.current.rotation.z,-.15,9,delta);
  s.clock+=delta;
  if(s.phase==="Idle"&&s.clock>1.8){s.phase="Walking";s.clock=0}
  if(s.phase==="Walking"){
   const destination=route[(s.segment+1)%route.length];
   const dx=destination[0]-group.position.x,dz=destination[1]-group.position.z;
   const distance=Math.hypot(dx,dz);
   const speed=.52+(id.length%3)*.065;
   if(distance<.06){s.segment=(s.segment+1)%route.length;s.phase="Arriving";s.clock=0}
   else{
    const v=Math.min(speed*delta,distance);
    group.position.x+=dx/distance*v;group.position.z+=dz/distance*v;
    const heading=Math.atan2(dx,dz);
    group.rotation.y+=MathUtils.euclideanModulo(heading-group.rotation.y+Math.PI,Math.PI*2)-Math.PI > 0
      ? Math.min(.12,MathUtils.euclideanModulo(heading-group.rotation.y+Math.PI,Math.PI*2)-Math.PI)
      : Math.max(-.12,MathUtils.euclideanModulo(heading-group.rotation.y+Math.PI,Math.PI*2)-Math.PI);
    s.walk+=delta*9;
    feet.rotation.x=Math.sin(s.walk)*.13;
    torso.position.y=Math.abs(Math.sin(s.walk))*.015;
   }
  }
  if(s.phase==="Arriving"&&s.clock>.48){s.phase="Interacting";s.clock=0;feet.rotation.x=0}
  if(s.phase==="Interacting"&&s.clock>1.1){s.phase="Talking";s.clock=0}
  if(s.phase==="Talking"&&s.clock>1.5){s.phase="Idle";s.clock=0}
  if(s.phase!=="Walking"){feet.rotation.x*=.83;torso.position.y=Math.sin(state.clock.elapsedTime*1.7+id.length)*.012}
 });
 const pick=(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();onSelect(id)};
 const isDress=outfit==="dress";
 const isLongHair=isDress;
 // Keep the outfit and floating name on the same actor id, never list order.
 return <group ref={root} position={[route[0][0],.025,route[0][1]]} onClick={pick}
  onPointerOver={event=>{event.stopPropagation();setHovered(true)}}
  onPointerOut={()=>setHovered(false)}>
  {/* The larger invisible touch target helps select a small friend in overview. */}
  <mesh position={[0,1.04,.03]}>
   <capsuleGeometry args={[.52,.65,4,10]}/>
   <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
  </mesh>
  <Html position={[0,2.0,0]} center distanceFactor={12} zIndexRange={[3,1]} style={{pointerEvents:"none"}}>
   <span className={"crew-town-3d-name"+(selected?" is-selected":"")}>{id[0].toUpperCase()+id.slice(1)}</span>
  </Html>
  <mesh position={[0,.01,0]} rotation={[-Math.PI/2,0,0]}>
   <circleGeometry args={[.43,22]}/><meshBasicMaterial color="#40594c" transparent opacity={.15} depthWrite={false}/>
  </mesh>
  <group ref={legs}>
   {[-.13,.13].map((x,i)=><group key={i}>
    <mesh position={[x,.245,0]}><capsuleGeometry args={[isDress?.072:.09,.13,4,10]}/><meshStandardMaterial color={isDress?"#e4c1aa":"#667277"}/></mesh>
    <mesh position={[x,.095,.11]}><boxGeometry args={[isDress?.19:.22,.15,.33]}/><meshStandardMaterial color={id==="bella"?"#8e687e":id==="yuna"?"#6b8b7d":"#645851"}/></mesh>
   </group>)}
  </group>
  <group ref={body}>
   {isDress?
    <group>
     {/* A-line dress is a visibly different chibi silhouette from the jackets. */}
     <mesh position={[0,.64,0]}><cylinderGeometry args={[.19,.37,.69,14]}/>
      <meshStandardMaterial color={coat} roughness={.93} flatShading/></mesh>
     <mesh position={[0,.32,0]}><cylinderGeometry args={[.375,.378,.075,14]}/>
      <meshStandardMaterial color={id==="zoe"?"#f3c0a6":id==="bella"?"#dfb0c5":"#b4d5bd"} roughness={.98}/></mesh>
     <mesh position={[0,.835,.205]}><boxGeometry args={[.31,.055,.055]}/>
      <meshStandardMaterial color={id==="yuna"?"#dce9c7":"#f3d4b6"}/></mesh>
    </group>:
    <group>
     <mesh position={[0,.67,0]}><capsuleGeometry args={[.27,.27,5,12]}/>
      <meshStandardMaterial color={coat} roughness={.93}/></mesh>
     <mesh position={[0,.62,.26]}><boxGeometry args={[.29,.055,.04]}/>
      <meshStandardMaterial color="#e7d0b8" roughness={.96}/></mesh>
    </group>}
   {[-1,1].map(side=><mesh key={side} ref={side===1?waveArm:undefined} position={[side*(isDress?.275:.305),.66,.025]} rotation={[0,0,-side*.15]}>
    <capsuleGeometry args={[isDress?.072:.083,.19,4,8]}/><meshStandardMaterial color={coat}/>
   </mesh>)}
   {[-1,1].map(side=><mesh key={"hand"+side} position={[side*(isDress?.31:.335),.46,.12]}>
    <sphereGeometry args={[.085,10,8]}/><meshStandardMaterial color={skin||SKIN}/>
   </mesh>)}
   {/* Rounded oversized head + shorter body = phone-readable chibi silhouette. */}
   <mesh position={[0,1.24,0]}><sphereGeometry args={[.42,20,16]}/><meshStandardMaterial color={skin||SKIN} roughness={.91}/></mesh>
   {isLongHair&&<group>
    <mesh position={[0,1.27,-.19]} scale={[1.05,1.2,.64]}><sphereGeometry args={[.39,14,12]}/><meshStandardMaterial color={hair}/></mesh>
    {[-1,1].map(side=><mesh key={side} position={[side*.355,1.04,-.05]} rotation={[0,0,side*.12]}>
     <capsuleGeometry args={[.095,.36,5,9]}/><meshStandardMaterial color={hair}/></mesh>)}
   </group>}
   <mesh position={[0,1.51,-.06]} scale={[1.07,.53,1]}>
    <sphereGeometry args={[.42,16,12]}/><meshStandardMaterial color={hair}/></mesh>
   {/* Larger eyes, small cheeks and a smile are legible on mobile. */}
   {[-.15,.15].map((x,i)=><group key={i}>
    <mesh position={[x,1.245,.393]}><sphereGeometry args={[.059,10,8]}/><meshStandardMaterial color="#fffaf3"/></mesh>
    <mesh position={[x,1.242,.444]}><sphereGeometry args={[.035,10,8]}/><meshStandardMaterial color="#403632"/></mesh>
    <mesh position={[x-.013,1.26,.471]}><sphereGeometry args={[.013,8,6]}/><meshBasicMaterial color="#ffffff"/></mesh>
    <mesh position={[i===0?-.285:.285,1.105,.296]}><sphereGeometry args={[.048,10,8]}/><meshStandardMaterial color="#e8a6a0" transparent opacity={.78}/></mesh>
   </group>)}
   <mesh position={[0,1.085,.416]} rotation={[0,0,Math.PI]}>
    <torusGeometry args={[.048,.011,5,12,Math.PI]}/><meshStandardMaterial color="#a96967"/>
   </mesh>
   {id==="theo"&&<group position={[0,1.25,.462]}>
     {[-.15,.15].map((x,i)=><mesh key={i} position={[x,0,0]}><torusGeometry args={[.103,.015,5,14]}/><meshStandardMaterial color="#54646a"/></mesh>)}
     <mesh position={[0,.025,0]}><boxGeometry args={[.10,.018,.02]}/><meshStandardMaterial color="#54646a"/></mesh>
    </group>}
   {id==="hugo"&&<mesh position={[0,.89,.015]}><torusGeometry args={[.24,.055,6,16]}/><meshStandardMaterial color="#f3d5a5"/></mesh>}
   {id==="zoe"&&<mesh position={[.37,1.52,-.16]}><sphereGeometry args={[.185,12,10]}/><meshStandardMaterial color={hair}/></mesh>}
   {id==="yuna"&&<mesh position={[0,1.71,-.13]}><sphereGeometry args={[.18,12,10]}/><meshStandardMaterial color={hair}/></mesh>}
   {id==="bella"&&[-1,1].map(side=><mesh key={side} position={[side*.36,1.37,-.16]}><sphereGeometry args={[.16,12,10]}/><meshStandardMaterial color={hair}/></mesh>)}
   {id==="noah"&&<group>
    <mesh position={[-.18,1.65,.12]} rotation={[0,0,-.35]} scale={[.75,.65,.8]}><sphereGeometry args={[.19,10,8]}/><meshStandardMaterial color={hair}/></mesh>
    <mesh position={[0,.63,-.27]}><boxGeometry args={[.44,.48,.2]}/><meshStandardMaterial color="#bcba9c"/></mesh>
   </group>}
   {id==="bella"&&<mesh position={[.30,.63,-.22]}><boxGeometry args={[.25,.38,.19]}/><meshStandardMaterial color="#d8be98"/></mesh>}
  </group>
  {selected&&<mesh position={[0,.025,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.50,.56,32]}/><meshBasicMaterial color="#fff7c9"/></mesh>}
 </group>;
}
export function TownCharacters({selected,reducedMotion,onSelect,onMove}:{
 selected:FriendId|null;reducedMotion:boolean;onSelect:(id:FriendId)=>void;onMove:(id:FriendId,x:number,z:number)=>void;
}){
 return <group>{PEOPLE.map(person=><Actor key={person.id} {...person}
  selected={selected===person.id} reducedMotion={reducedMotion} onSelect={onSelect} onMove={onMove}/>)}</group>;
}
