import {useRef} from "react";
import {useFrame} from "@react-three/fiber";
import type {Group} from "three";
import type {MagicCreatorPart} from "./world";
import {magicBlink} from "./magicCreatureIdle";
/** Reusable two-eye face: five meshes, no metallic mask or glass. */
export function MagicCuteFace3D({front=.54,animated=true,seed=0,scale=1}:{front?:number;animated?:boolean;seed?:number;scale?:number}){
 const eyes=useRef<Group>(null);
 useFrame(({clock})=>{if(eyes.current)eyes.current.scale.y=animated?magicBlink(clock.elapsedTime,seed):1;});
 return <group position={[0,0,front]} scale={scale}>
  <group ref={eyes}>{[-1,1].map(sign=><group key={sign} position={[sign*.19,.065,.02]}>
   <mesh scale={[.13,.18,.055]}><sphereGeometry args={[1,10,8]}/><meshStandardMaterial color="#29393c" roughness={.92}/></mesh>
   <mesh position={[-.033,.055,.05]} scale={[.038,.048,.015]}><sphereGeometry args={[1,8,6]}/><meshBasicMaterial color="#ffffff"/></mesh>
  </group>)}</group>
  <mesh position={[0,-.16,.016]} scale={[.05,.023,.018]}><sphereGeometry args={[1,8,6]}/><meshStandardMaterial color="#9f625e" roughness={.86}/></mesh>
 </group>;
}
export function MagicPartIdentity3D({part,animated=true}:{part:MagicCreatorPart;animated?:boolean}){
 const detail=part.detail;
 const front={box:.56,sphere:.62,capsule:.4,cylinder:.52,cone:.51,torus:.21,octahedron:.62,leaf:.31}[part.shape];
 if(detail==="face")return <MagicCuteFace3D front={front} animated={animated} seed={part.x*4+part.y*3}/>;
 if(detail==="core")return <mesh position={[0,0,front]}><icosahedronGeometry args={[.24,0]}/><meshStandardMaterial color="#c6e9e5" emissive="#7fbcb8" emissiveIntensity={.28} roughness={.82}/></mesh>;
 if(detail==="vent")return <mesh position={[0,0,front]} scale={[.43,.14,.045]}><boxGeometry args={[1,1,1]}/><meshStandardMaterial color="#6b8583" roughness={.89}/></mesh>;
 if(detail==="thruster")return <mesh position={[0,0,-front]} rotation={[0,Math.PI,0]}><circleGeometry args={[.23,8]}/><meshStandardMaterial color="#a6dbe5" emissive="#79c9da" emissiveIntensity={.4} roughness={.8}/></mesh>;
 if(detail)return <mesh position={[0,0,front]} rotation={[0,0,Math.PI/4]}><octahedronGeometry args={[.19,0]}/><meshStandardMaterial color="#f2dfab" roughness={.85}/></mesh>;
 return null;
}
