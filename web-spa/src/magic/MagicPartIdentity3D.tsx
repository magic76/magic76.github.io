import {RoundedBox} from "@react-three/drei";
import type {MagicCreatorPart} from "./world";

/** Engine-owned, strictly bounded secondary geometry; detail is an enum.
 * These tiny functional cues make a head read as a face, a body as a machine
 * and a tool as an artifact without consuming more of the AI's 12-part budget.
 * GPU LOD (nearby only) is controlled by MagicCreations3D.
 */
export function MagicPartIdentity3D({part}:{part:MagicCreatorPart}){
 const detail=part.detail;
 if(!detail)return null;
 const layer=part.profile==="armor"||part.profile==="mechanical"?.16:0;
 const front={
  box:.55,sphere:.67,capsule:.39,cylinder:.53,cone:.55,
  torus:.21,octahedron:.67,leaf:.31
 }[part.shape]+layer;
 const accent=part.color==="gold"?"#fff0ba":part.color==="rose"?"#ffe3ef":
  part.color==="azure"?"#d7f4ff":"#e5fff6";
 if(detail==="face")return <group position={[0,0,front]}>
  <RoundedBox args={[.75,.4,.085]} radius={.11} smoothness={4} position={[0,.09,0]}>
   <meshStandardMaterial color="#293f50" roughness={.19} metalness={.62}/>
  </RoundedBox>
  {[-1,1].map(sign=><group key={sign} position={[sign*.205,.12,.059]}>
   <mesh scale={[.15,.105,.025]}>
    <sphereGeometry args={[1,16,12]}/>
    <meshStandardMaterial color={accent} emissive="#80d7fc" emissiveIntensity={.82}
     roughness={.12} metalness={.1}/>
   </mesh>
   <mesh position={[-sign*.025,.03,.026]} scale={[.032,.022,.01]}>
    <sphereGeometry args={[1,9,7]}/>
    <meshBasicMaterial color="#ffffff"/>
   </mesh>
  </group>)}
  <RoundedBox args={[.34,.08,.06]} radius={.025} smoothness={3}
   position={[0,-.21,.025]}>
   <meshStandardMaterial color="#b8c9d1" roughness={.32} metalness={.68}/>
  </RoundedBox>
 </group>;
 if(detail==="core")return <group position={[0,0,front]}>
  <mesh rotation={[Math.PI/2,0,0]}>
   <torusGeometry args={[.285,.07,12,34]}/>
   <meshStandardMaterial color="#dce5ee" metalness={.83} roughness={.26}/>
  </mesh>
  <mesh position={[0,0,.035]}>
   <sphereGeometry args={[.223,24,18]}/>
   <meshStandardMaterial color="#76d3f1" emissive="#6fd3ff" emissiveIntensity={.72}
    metalness={.19} roughness={.2}/>
  </mesh>
  {[-1,1].map(sign=><RoundedBox key={sign} position={[sign*.4,0,-.02]} args={[.16,.12,.13]} radius={.04} smoothness={3}>
   <meshStandardMaterial color={accent} metalness={.73} roughness={.27}/>
  </RoundedBox>)}
 </group>;
 if(detail==="vent")return <group position={[0,0,front]}>
  <RoundedBox args={[.68,.39,.09]} radius={.055} smoothness={3}>
   <meshStandardMaterial color="#3e5664" metalness={.8} roughness={.37}/>
  </RoundedBox>
  {[-2,-1,0,1,2].map(i=><mesh key={i} position={[i*.117,0,.064]}>
   <boxGeometry args={[.057,.28,.043]}/>
   <meshStandardMaterial color={i%2===0?"#9ec0ca":"#bad0d4"} metalness={.72} roughness={.31}/>
  </mesh>)}
 </group>;
 if(detail==="thruster")return <group position={[0,-.09,-front]} rotation={[0,Math.PI,0]}>
  <mesh rotation={[Math.PI/2,0,0]}>
   <torusGeometry args={[.3,.077,10,32]}/>
   <meshStandardMaterial color="#a8c0c9" metalness={.83} roughness={.28}/>
  </mesh>
  <mesh position={[0,0,.048]}>
   <circleGeometry args={[.215,26]}/>
   <meshStandardMaterial color="#438fa8" emissive="#5cccf9" emissiveIntensity={.68}
    metalness={.2} roughness={.2} side={2}/>
  </mesh>
  {[-1,1].map(sign=><mesh key={sign} position={[sign*.28,-.28,.02]}
   rotation={[0,0,-sign*.25]}>
   <capsuleGeometry args={[.07,.14,5,10]}/>
   <meshStandardMaterial color={accent} roughness={.3} metalness={.7}/>
  </mesh>)}
 </group>;
 return <group position={[0,0,front]}>
  {[0,1,2,3].map(i=><mesh key={i} position={[
   Math.cos(i*Math.PI/2)*.29,Math.sin(i*Math.PI/2)*.29,0]}
   rotation={[0,0,i*Math.PI/2]} scale={[.1,.17,.052]}>
   <octahedronGeometry args={[1,0]}/>
   <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={.32}
    roughness={.2} metalness={.17}/>
  </mesh>)}
  <mesh position={[0,0,.025]} rotation={[0,0,Math.PI/4]}>
   <octahedronGeometry args={[.19,1]}/>
   <meshStandardMaterial color="#9ddce7" emissive="#65cbdf" emissiveIntensity={.5}/>
  </mesh>
 </group>;
}
