import {RoundedBox} from "@react-three/drei";
import type {MagicCreatorPart} from "./world";

/** Lightweight, bounded surface language for any AI-authored part.
 * The engine decides exactly which meshes and materials exist. An LLM controls
 * only the validated `profile` enum and ratios, never shaders or asset URLs.
 * Armor, engineering and organic finishes reuse the SAME flexible geometry
 * grammar across robots, animals, vehicles, buildings and abstract sculptures.
 */
export function MagicPartAccents3D({part}:{part:MagicCreatorPart}){
 const profile=part.profile??"smooth";
 if(profile==="smooth")return null;
 const isGlass=part.material==="glass";
 const metal=part.material==="metal"||profile==="mechanical";
 const trim=part.color==="slate"?"#c4d6e1":part.color==="gold"?"#fff1bd":"#e7f5ec";
 const round=part.shape==="sphere"||part.shape==="capsule";
 const long=part.shape==="leaf"||part.shape==="cone";
 if(profile==="armor")return <group>
  <RoundedBox args={[.71,.63,.13]} radius={.08} smoothness={4}
   position={[0,.04,.53]}>
   <meshStandardMaterial color={trim} metalness={metal?.75:.22} roughness={.31}
    transparent={isGlass} opacity={isGlass?.68:1}/>
  </RoundedBox>
  <RoundedBox args={[.55,.39,.075]} radius={.06} smoothness={3}
   position={[0,.05,.612]}>
   <meshStandardMaterial color="#415d70" metalness={.55} roughness={.39}/>
  </RoundedBox>
  {[-1,1].map(sign=><group key={sign}>
   <mesh position={[sign*.34,-.23,.61]}>
    <sphereGeometry args={[.066,12,9]}/>
    <meshStandardMaterial color="#e7c875" metalness={.84} roughness={.22}/>
   </mesh>
   <mesh position={[sign*.29,.33,.6]} rotation={[0,0,sign*.26]}>
    <capsuleGeometry args={[.055,.25,5,10]}/>
    <meshStandardMaterial color={trim} metalness={.62} roughness={.3}/>
   </mesh>
   <mesh position={[sign*(long?.46:.4),.05,.48]} rotation={[0,0,sign*(long?.62:.35)]}>
    <coneGeometry args={[.09,long?.42:.28,8]}/>
    <meshStandardMaterial color="#536c7b" metalness={.58} roughness={.35}/>
   </mesh>
  </group>)}
  <mesh position={[0,.04,.669]}>
   <torusGeometry args={[.135,.029,9,24]}/>
   <meshStandardMaterial color="#83cfe5" emissive="#64bfe9" emissiveIntensity={.45}
    metalness={.25} roughness={.21}/>
  </mesh>
  {round&&<mesh position={[0,-.28,.6]} scale={[.34,.07,.055]}>
   <sphereGeometry args={[1,14,8]}/>
   <meshStandardMaterial color="#273f4d" metalness={.72} roughness={.28}/>
  </mesh>}
 </group>;
 if(profile==="mechanical")return <group>
  <mesh position={[0,.08,.55]}>
   <cylinderGeometry args={[.3,.3,.09,28]}/>
   <meshStandardMaterial color="#607885" metalness={.78} roughness={.31}/>
  </mesh>
  <mesh position={[0,.08,.606]} rotation={[Math.PI/2,0,0]}>
   <torusGeometry args={[.245,.039,10,32]}/>
   <meshStandardMaterial color={trim} metalness={.84} roughness={.23}/>
  </mesh>
  <mesh position={[0,.08,.615]}>
   <sphereGeometry args={[.16,22,14]}/>
   <meshStandardMaterial color="#79cfed" emissive="#65c5ef" emissiveIntensity={.6}
    metalness={.2} roughness={.15}/>
  </mesh>
  {[-1,1].map(sign=><group key={sign}>
   <mesh position={[sign*.34,-.25,.53]} scale={[.1,.07,.055]}>
    <sphereGeometry args={[1,12,8]}/>
    <meshStandardMaterial color={trim} metalness={.65} roughness={.2}/>
   </mesh>
   {[0,.14,.28].map((y,i)=><mesh key={i} position={[sign*.38,y-.12,.545]}>
    <boxGeometry args={[.12,.025,.025]}/>
    <meshStandardMaterial color="#374e59" metalness={.65} roughness={.36}/>
   </mesh>)}
  </group>)}
  {round&&[-1,1].map(sign=><mesh key={"optic"+sign} position={[sign*.13,.1,.735]}>
   <sphereGeometry args={[.042,10,8]}/>
   <meshStandardMaterial color="#d8f8ff" emissive="#6edcff" emissiveIntensity={1.1}
    metalness={.15} roughness={.12}/>
  </mesh>)}
  {long&&<group position={[0,-.18,.57]}>
   {[-1,0,1].map(i=><mesh key={i} position={[i*.11,0,0]}>
    <boxGeometry args={[.055,.19,.035]}/>
    <meshStandardMaterial color="#2e4653" metalness={.7} roughness={.32}/>
   </mesh>)}
  </group>}
 </group>;
 return <group>
  {[-1,0,1].map((j,i)=><mesh key={i} position={[j*.25,-.14+Math.abs(j)*.08,.49]}
   rotation={[0,j*.3,j*.27]} scale={[.12,.4,.06]}>
   <sphereGeometry args={[1,14,10]}/>
   <meshStandardMaterial color={trim} metalness={.12} roughness={.67}
    transparent opacity={.72}/>
  </mesh>)}
  <mesh position={[0,.28,.46]}>
   <sphereGeometry args={[.13,16,12]}/>
   <meshStandardMaterial color="#f7efba" emissive="#f8dca3" emissiveIntensity={.26}/>
  </mesh>
  {long&&[-1,1].map(sign=><mesh key={sign} position={[sign*.27,.08,.5]}
   rotation={[0,0,sign*.62]} scale={[.1,.34,.045]}>
   <sphereGeometry args={[1,12,8]}/>
   <meshStandardMaterial color={trim} roughness={.58} transparent opacity={.78}/>
  </mesh>)}
  {round&&<group position={[0,-.08,.57]}>
   {[-1,0,1].map(i=><mesh key={i} position={[i*.16,0,0]} scale={[.055,.055,.035]}>
    <sphereGeometry args={[1,10,7]}/>
    <meshStandardMaterial color="#fff3bd" emissive="#f5d990" emissiveIntensity={.34}/>
   </mesh>)}
  </group>}
 </group>;
}
