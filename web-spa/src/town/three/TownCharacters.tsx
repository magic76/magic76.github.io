import {useEffect,useRef,useState} from "react";
import {Html,useCursor} from "@react-three/drei";
import {useFrame} from "@react-three/fiber";
import type {ThreeEvent} from "@react-three/fiber";
import {Group,MathUtils} from "three";
import type {Mesh} from "three";
import {PEOPLE,type FriendId} from "./world";
import {WALK_GRAPH,chooseNextWalkNode,nextSeed,seedForFriend} from "./TownWalkGraph";
import {advanceWithAvoidance,type TrafficPositions} from "./TownTraffic";

type Phase="Idle"|"Walking"|"Arriving"|"Interacting"|"Talking";
const SKIN="#eac5ad";
function Actor({id,coat,hair,skin,outfit,startNode,traffic,reducedMotion,selected,onSelect,onMove}:{
 id:FriendId;coat:string;hair:string;skin:string;outfit:"dress"|"jacket";startNode:string;traffic:TrafficPositions;
 reducedMotion:boolean;selected:boolean;onSelect:(id:FriendId)=>void;onMove:(id:FriendId,x:number,z:number)=>void;
}){
 const root=useRef<Group>(null);
 const body=useRef<Group>(null);
 const leftLeg=useRef<Group>(null);
 const rightLeg=useRef<Group>(null);
 const leftArm=useRef<Group>(null);
 const rightArm=useRef<Group>(null);
 const [hovered,setHovered]=useState(false);
 useCursor(hovered);
 useEffect(()=>{
  const [x,z]=WALK_GRAPH[startNode].point;
  traffic.set(id,{x,z});
  return()=>{traffic.delete(id)};
 },[traffic,id,startNode]);
 // Per-actor refs keep all 16 walk cycles off the React render loop.
 // Stable per-friend seeds vary route, stride, pace and pauses without re-renders.
 const step=useRef({
  node:startNode,previous:null as string|null,next:null as string|null,
  phase:"Idle" as Phase,clock:0,walk:0,
  seed:seedForFriend(id),pause:.25+(seedForFriend(id)%9)*.12,
  speed:1.02+(seedForFriend(id)%7)*.09,blocked:0
 });
 useFrame((state,dt)=>{
  const group=root.current,torso=body.current;
  if(!group||!torso||document.hidden)return;
  const s=step.current,delta=Math.min(dt,.05);
  // Even stationary or selected residents occupy space for everyone else.
  const position=traffic.get(id);
  if(position){position.x=group.position.x;position.z=group.position.z}
  else traffic.set(id,{x:group.position.x,z:group.position.z});
  onMove(id,group.position.x,group.position.z);
  let walking=false;
  if(!selected&&!reducedMotion){
   s.clock+=delta;
   if(s.phase==="Idle"&&s.clock>=s.pause){
    s.seed=nextSeed(s.seed);
    s.next=chooseNextWalkNode(s.node,s.previous,s.seed);
    s.phase="Walking";s.clock=0;
   }
   if(s.phase==="Walking"&&s.next){
    const target=WALK_GRAPH[s.next]?.point;
    if(!target){s.phase="Idle";s.next=null}
    else{
     const dx=target[0]-group.position.x,dz=target[1]-group.position.z;
     const dist=Math.hypot(dx,dz);
     const fromX=group.position.x,fromZ=group.position.z;
     const motion=advanceWithAvoidance(id,fromX,fromZ,
      target[0],target[1],s.speed*delta,traffic);
     group.position.x=motion.x;group.position.z=motion.z;
     const occupied=traffic.get(id);
     if(occupied){occupied.x=motion.x;occupied.z=motion.z}
     walking=motion.moved>.001;
     if(walking){
      s.blocked=0;
      const targetHeading=Math.atan2(motion.x-fromX,motion.z-fromZ);
      const difference=MathUtils.euclideanModulo(targetHeading-group.rotation.y+Math.PI,Math.PI*2)-Math.PI;
      group.rotation.y+=MathUtils.clamp(difference,-delta*4.6,delta*4.6);
      s.walk+=motion.moved*8.9;
     }else if(motion.blocked){
      s.blocked+=delta;
      if(s.blocked>2.2){
       s.seed=nextSeed(s.seed);
       s.blocked=0;
       // Return to a safe junction instead of clipping through an obstructed road.
       const here=WALK_GRAPH[s.node].point;
       if(Math.hypot(here[0]-motion.x,here[1]-motion.z)>.3)s.next=s.node;
       else s.next=chooseNextWalkNode(s.node,s.next,s.seed);
      }
     }
     if(Math.hypot(target[0]-group.position.x,target[1]-group.position.z)<.05){
      group.position.x=target[0];group.position.z=target[1];
      s.previous=s.node;s.node=s.next;s.next=null;
      s.phase="Arriving";s.clock=0;walking=false;s.blocked=0;
     }
    }
   }else if(s.phase==="Arriving"&&s.clock>.18){s.phase="Interacting";s.clock=0}
   else if(s.phase==="Interacting"&&s.clock>.36){s.phase="Talking";s.clock=0}
   else if(s.phase==="Talking"&&s.clock>.42){
    s.phase="Idle";s.clock=0;s.seed=nextSeed(s.seed);
    s.pause=.4+(s.seed%190)/100;
   }
  }
  if(selected){
   // When tapped, stop in place, face the camera and greet the visitor.
   const facing=Math.atan2(state.camera.position.x-group.position.x,state.camera.position.z-group.position.z);
   const diff=MathUtils.euclideanModulo(facing-group.rotation.y+Math.PI,Math.PI*2)-Math.PI;
   group.rotation.y+=reducedMotion?diff:MathUtils.clamp(diff,-delta*4.6,delta*4.6);
  }
  const stride=walking?Math.sin(s.walk):0;
  const opposite=walking?Math.sin(s.walk+Math.PI):0;
  if(leftLeg.current){
   leftLeg.current.rotation.x=MathUtils.damp(leftLeg.current.rotation.x,stride*.53,12,delta);
   leftLeg.current.position.y=.39+(walking?Math.max(0,stride)*.055:0);
  }
  if(rightLeg.current){
   rightLeg.current.rotation.x=MathUtils.damp(rightLeg.current.rotation.x,opposite*.53,12,delta);
   rightLeg.current.position.y=.39+(walking?Math.max(0,opposite)*.055:0);
  }
  torso.position.y=MathUtils.damp(torso.position.y,walking?Math.abs(Math.sin(s.walk))*.052:0,11,delta);
  torso.rotation.z=MathUtils.damp(torso.rotation.z,walking?Math.sin(s.walk)*.035:0,9,delta);
  if(leftArm.current){
   leftArm.current.rotation.x=MathUtils.damp(leftArm.current.rotation.x,walking?opposite*.38:0,10,delta);
   leftArm.current.rotation.z=MathUtils.damp(leftArm.current.rotation.z,-.08,9,delta);
  }
  if(rightArm.current){
   rightArm.current.rotation.x=MathUtils.damp(rightArm.current.rotation.x,walking?stride*.38:0,10,delta);
   rightArm.current.rotation.z=selected&&!reducedMotion
    ?1.45+Math.sin(state.clock.elapsedTime*5)*.13
    :MathUtils.damp(rightArm.current.rotation.z,.08,10,delta);
  }
 });
 const pick=(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();onSelect(id)};
 const isDress=outfit==="dress";
 const isLongHair=isDress;
 // Keep the outfit and floating name on the same actor id, never list order.
 return <group ref={root} position={[WALK_GRAPH[startNode].point[0],.025,WALK_GRAPH[startNode].point[1]]} onClick={pick}
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
  {/* Hip-jointed legs, alternate foot lift and planted pauses instead of a sliding body. */}
  {[-.13,.13].map((x,i)=><group key={i} ref={i===0?leftLeg:rightLeg} position={[x,.39,0]}>
   <mesh position={[0,-.14,0]}>
    <capsuleGeometry args={[isDress?.072:.09,.13,4,10]}/>
    <meshStandardMaterial color={isDress?"#e4c1aa":"#667277"}/>
   </mesh>
   <mesh position={[0,-.29,.11]}>
    <boxGeometry args={[isDress?.19:.22,.15,.33]}/>
    <meshStandardMaterial color={id==="bella"?"#8e687e":id==="yuna"?"#6b8b7d":"#645851"}/>
   </mesh>
  </group>)}
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
   {/* Shoulder-jointed arms swing opposite the legs; right arm waves when chosen. */}
   {[-1,1].map(side=><group key={side} ref={side<0?leftArm:rightArm}
     position={[side*(isDress?.275:.305),.80,.025]} rotation={[0,0,-side*.08]}>
    <mesh position={[0,-.14,0]}>
     <capsuleGeometry args={[isDress?.072:.083,.19,4,8]}/><meshStandardMaterial color={coat}/>
    </mesh>
    <mesh position={[0,-.36,.09]}>
     <sphereGeometry args={[.085,10,8]}/><meshStandardMaterial color={skin||SKIN}/>
    </mesh>
   </group>)}
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
 const traffic=useRef<TrafficPositions>(new Map()).current;
 return <group>{PEOPLE.map(person=><Actor key={person.id} {...person} traffic={traffic}
  selected={selected===person.id} reducedMotion={reducedMotion} onSelect={onSelect} onMove={onMove}/>)}</group>;
}
