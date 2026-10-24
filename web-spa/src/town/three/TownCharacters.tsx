import {useRef} from "react";
import {useFrame} from "@react-three/fiber";
import type {ThreeEvent} from "@react-three/fiber";
import {Group,MathUtils} from "three";
import {PEOPLE,type FriendId,type Waypoint} from "./world";

type Phase="Idle"|"Walking"|"Arriving"|"Interacting"|"Talking";
const SKIN="#eac5ad";
function Actor({id,coat,hair,skin,route,reducedMotion,selected,onSelect}:{
 id:FriendId;coat:string;hair:string;skin:string;route:ReadonlyArray<Waypoint>;
 reducedMotion:boolean;selected:boolean;onSelect:(id:FriendId)=>void;
}){
 const root=useRef<Group>(null);
 const body=useRef<Group>(null);
 const legs=useRef<Group>(null);
 const step=useRef({segment:0,phase:"Idle" as Phase,clock:0,walk:0});
 useFrame((state,dt)=>{
  const group=root.current, torso=body.current,feet=legs.current;
  if(!group||!torso||!feet||document.hidden)return;
  const s=step.current, delta=Math.min(dt,.06);
  if(reducedMotion||selected){s.phase="Idle";s.clock=0;group.position.set(route[0][0],.11,route[0][1]);torso.position.y=0;feet.rotation.x=0;return}
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
    feet.rotation.x=Math.sin(s.walk)*.22;
    torso.position.y=Math.abs(Math.sin(s.walk))*.028;
   }
  }
  if(s.phase==="Arriving"&&s.clock>.48){s.phase="Interacting";s.clock=0;feet.rotation.x=0}
  if(s.phase==="Interacting"&&s.clock>1.1){s.phase="Talking";s.clock=0}
  if(s.phase==="Talking"&&s.clock>1.5){s.phase="Idle";s.clock=0}
  if(s.phase!=="Walking"){feet.rotation.x*=.83;torso.position.y=Math.sin(state.clock.elapsedTime*1.7+id.length)*.018}
 });
 const pick=(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();onSelect(id)};
 const isLongHair=id==="zoe"||id==="bella"||id==="yuna";
 return <group ref={root} position={[route[0][0],.11,route[0][1]]} onClick={pick}>
  <mesh position={[0,.01,0]} rotation={[-Math.PI/2,0,0]}>
   <circleGeometry args={[.36,18]}/><meshBasicMaterial color="#40594c" transparent opacity={.15} depthWrite={false}/>
  </mesh>
  <group ref={legs}>
   {[-.13,.13].map((x,i)=><group key={i}>
    <mesh position={[x,.31,.02]}><capsuleGeometry args={[.094,.24,4,8]}/><meshStandardMaterial color="#667277"/></mesh>
    <mesh position={[x,.14,.095]}><boxGeometry args={[.20,.14,.34]}/><meshStandardMaterial color="#645851"/></mesh>
   </group>)}
  </group>
  <group ref={body}>
   <mesh position={[0,.78,0]}><capsuleGeometry args={[.28,.42,5,10]}/><meshStandardMaterial color={coat} roughness={.93}/></mesh>
   {[-1,1].map(side=><mesh key={side} position={[side*.32,.77,.025]} rotation={[0,0,-side*.15]}>
    <capsuleGeometry args={[.095,.34,4,8]}/><meshStandardMaterial color={coat}/>
   </mesh>)}
   <mesh position={[0,1.40,0]}><sphereGeometry args={[.29,16,12]}/><meshStandardMaterial color={skin||SKIN} roughness={.91}/></mesh>
   {isLongHair&&<mesh position={[0,1.46,-.105]}><sphereGeometry args={[.31,12,10]}/><meshStandardMaterial color={hair}/></mesh>}
   <mesh position={[0,1.61,-.02]} scale={[1.03,.56,.94]}>
    <sphereGeometry args={[.30,14,10]}/><meshStandardMaterial color={hair}/></mesh>
   {[-.105,.105].map((x,i)=><mesh key={i} position={[x,1.41,.269]}>
    <sphereGeometry args={[.025,8,6]}/><meshStandardMaterial color="#4f4340"/>
   </mesh>)}
   {id==="theo"&&<group position={[0,1.42,.292]}>
     {[-.11,.11].map((x,i)=><mesh key={i} position={[x,0,0]}><torusGeometry args={[.078,.018,4,10]}/><meshStandardMaterial color="#54646a"/></mesh>)}
    </group>}
   {id==="hugo"&&<mesh position={[0,1.15,.02]}><torusGeometry args={[.27,.058,6,16]}/><meshStandardMaterial color="#f3d5a5"/></mesh>}
   {id==="bella"&&<mesh position={[.27,.68,-.24]}><boxGeometry args={[.25,.38,.19]}/><meshStandardMaterial color="#d8be98"/></mesh>}
  </group>
  {selected&&<mesh position={[0,.035,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.42,.48,32]}/><meshBasicMaterial color="#fff7c9"/></mesh>}
 </group>;
}
export function TownCharacters({selected,reducedMotion,onSelect}:{
 selected:FriendId|null;reducedMotion:boolean;onSelect:(id:FriendId)=>void;
}){
 return <group>{PEOPLE.map(person=><Actor key={person.id} {...person}
  selected={selected===person.id} reducedMotion={reducedMotion} onSelect={onSelect}/>)}</group>;
}
