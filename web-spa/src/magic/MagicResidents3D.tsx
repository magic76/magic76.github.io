import {useRef} from "react";
import {useFrame} from "@react-three/fiber";
import type {Group} from "three";
import {magicCreatureIdle} from "./magicCreatureIdle";
function Puff({position,scale,color}:{position:[number,number,number];scale:[number,number,number];color:string}){return <mesh position={position} scale={scale}><sphereGeometry args={[1,10,8]}/><meshStandardMaterial color={color} roughness={.9} flatShading/></mesh>}
export function MagicOwlModel3D({animated=true}:{animated?:boolean}){
 const head=useRef<Group>(null),eyes=useRef<Group>(null);
 useFrame(({clock})=>{const idle=magicCreatureIdle(clock.elapsedTime,animated,4);if(head.current)head.current.rotation.z=idle.tilt*1.5;if(eyes.current)eyes.current.scale.y=idle.blink;});
 return <group><Puff position={[0,.72,0]} scale={[.54,.66,.47]} color="#b9987f"/>
  <group ref={head} position={[0,1.18,.15]}><Puff position={[0,0,0]} scale={[.49,.44,.42]} color="#c8ab90"/>
   {[-1,1].map(sign=><group key={sign}>
    <mesh position={[sign*.34,.36,-.02]} rotation={[0,0,-sign*.3]}><coneGeometry args={[.16,.28,5]}/><meshStandardMaterial color="#b9987f" roughness={.88} flatShading/></mesh>
    <Puff position={[sign*.21,.005,.38]} scale={[.21,.22,.055]} color="#f8eed8"/>
   </group>)}
   <group ref={eyes}>{[-1,1].map(sign=><group key={sign}>
    <Puff position={[sign*.21,0,.435]} scale={[.115,.15,.046]} color="#323d3a"/>
    <Puff position={[sign*.245,.055,.47]} scale={[.032,.04,.014]} color="#ffffff"/>
   </group>)}</group>
   <mesh position={[0,-.16,.47]} rotation={[Math.PI/2,0,0]}><coneGeometry args={[.09,.19,4]}/><meshStandardMaterial color="#edc481" roughness={.85}/></mesh>
  </group>
  {[-1,1].map(sign=><group key={sign}><Puff position={[sign*.5,.7,0]} scale={[.17,.34,.3]} color="#a98572"/><Puff position={[sign*.22,.14,.18]} scale={[.1,.13,.12]} color="#e2b97b"/></group>)}
 </group>;
}
export function MagicChestModel3D({animated=true}:{animated?:boolean}){
 const lid=useRef<Group>(null);useFrame(({clock})=>{if(lid.current)lid.current.rotation.x=animated?-.09*(.5+.5*Math.sin(clock.elapsedTime*.48)):0});
 return <group><mesh position={[0,.45,0]}><boxGeometry args={[.98,.64,.73]}/><meshStandardMaterial color="#b98b66" roughness={.9} flatShading/></mesh>
  <group ref={lid} position={[0,.77,-.32]}><mesh position={[0,.13,.32]} scale={[1.04,.24,.8]}><boxGeometry args={[1,1,1]}/><meshStandardMaterial color="#e1bd83" roughness={.9}/></mesh></group>
  <mesh position={[0,.55,.385]}><boxGeometry args={[.16,.22,.055]}/><meshStandardMaterial color="#f7dea2" roughness={.8}/></mesh>
 </group>;
}
export function MagicCrystalModel3D(){return <group><mesh position={[0,.72,0]} rotation={[.12,.4,.12]}><octahedronGeometry args={[.62,0]}/><meshStandardMaterial color="#afdfe2" emissive="#91c3cf" emissiveIntensity={.22} roughness={.85} flatShading/></mesh><mesh position={[0,.19,0]}><cylinderGeometry args={[.37,.45,.32,6]}/><meshStandardMaterial color="#dfd5ac" roughness={.9} flatShading/></mesh></group>}
export function MagicPortalModel3D(){return <group><mesh position={[0,.88,-.055]}><ringGeometry args={[.75,1.04,16]}/><meshBasicMaterial color="#ab78ec" transparent opacity={.29} blending={2} depthWrite={false} side={2}/></mesh><mesh position={[0,.88,0]} rotation={[0,0,.08]}><torusGeometry args={[.87,.17,6,16]}/><meshStandardMaterial color="#a36cda" emissive="#8d62d1" emissiveIntensity={.78} roughness={.81} flatShading/></mesh><mesh position={[0,.88,-.05]}><circleGeometry args={[.77,16]}/><meshBasicMaterial color="#79c7e1" transparent opacity={.56} depthWrite={false} side={2}/></mesh></group>}
export function MagicTreeModel3D(){return <group><mesh position={[0,.5,0]}><cylinderGeometry args={[.16,.22,1,7]}/><meshStandardMaterial color="#ad9479" roughness={.9} flatShading/></mesh><mesh position={[0,1.44,0]}><icosahedronGeometry args={[.96,0]}/><meshStandardMaterial color="#80bba0" roughness={.9} flatShading/></mesh></group>}
