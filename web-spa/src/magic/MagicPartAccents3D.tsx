import type {MagicCreatorPart} from "./world";
/** Sparse, engine-owned silhouette accents; never more than two meshes. */
export function MagicPartAccents3D({part}:{part:MagicCreatorPart}){
 if(part.size<.7)return null;
 const profile=part.profile??"smooth";
 const accent=part.color==="slate"?"#cedbd5":"#f9e9bf";
 const joint=part.joint&&part.joint!=="fixed";
 if(profile==="armor")return <group>
  <mesh position={[0,.04,.56]} scale={[.57,.37,.08]}><boxGeometry args={[1,1,1]}/><meshStandardMaterial color={accent} roughness={.88}/></mesh>
  {joint&&<mesh position={[0,-.26,.58]}><sphereGeometry args={[.09,8,6]}/><meshStandardMaterial color="#d9b979" roughness={.82}/></mesh>}
 </group>;
 if(profile==="mechanical")return <group>
  <mesh position={[0,.08,.56]} scale={[.2,.2,.08]}><sphereGeometry args={[1,10,8]}/><meshStandardMaterial color="#a6d8dd" emissive="#6badc5" emissiveIntensity={.2} roughness={.78}/></mesh>
  {joint&&<mesh position={[0,-.25,.52]}><sphereGeometry args={[.085,8,6]}/><meshStandardMaterial color={accent} roughness={.85}/></mesh>}
 </group>;
 if(joint)return <mesh position={[0,0,.52]}><sphereGeometry args={[.095,8,6]}/><meshStandardMaterial color={accent} roughness={.85}/></mesh>;
 return null;
}
