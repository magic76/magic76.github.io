import {islandSurfaceHeight} from './magicNavigation';
import {MAGIC_MATERIALS,type MagicPalette} from './magicPalette';
/** Oversized heroic silhouette with a clear entry axis (+Z). */
export function MagicCastle3D({colors,night,ice}:{colors:MagicPalette;night:boolean;ice:boolean}){
 const wall=ice?'#B4E8F3':'#FFF1DA',roof=ice?'#8CCBE2':colors.roof;
 return <group position={[0,islandSurfaceHeight(0,-.55)+.34,-.55]}>
  <group scale={1.9}>
   <mesh position={[0,.09,0]}><cylinderGeometry args={[2.12,2.4,.24,10]}/><meshStandardMaterial color={ice?'#D2ECF4':'#D9C3A6'} {...MAGIC_MATERIALS.stone}/></mesh>
   <mesh position={[0,1.0,0]}><boxGeometry args={[2.65,1.85,1.72]}/><meshStandardMaterial color={wall} {...MAGIC_MATERIALS.architecture}/></mesh>
   <mesh position={[0,2.13,0]} rotation={[0,Math.PI/4,0]}><coneGeometry args={[1.85,1.0,4]}/><meshStandardMaterial color={roof} flatShading roughness={.78}/></mesh>
   <mesh position={[0,.67,.89]}><boxGeometry args={[.72,1.22,.1]}/><meshStandardMaterial color={ice?'#4786AC':'#765770'}/></mesh>
   {[-1.3,1.3].map((x,i)=><group key={i} position={[x,0,.36]}>
    <mesh position={[0,1.42,0]}><cylinderGeometry args={[.53,.63,3.05,8]}/><meshStandardMaterial color={wall} {...MAGIC_MATERIALS.architecture}/></mesh>
    <mesh position={[0,3.29,0]}><coneGeometry args={[.82,1.34,8]}/><meshStandardMaterial color={roof} flatShading roughness={.73}/></mesh>
    <mesh position={[0,1.6,.54]}><sphereGeometry args={[.2,8,8]}/><meshStandardMaterial color="#FFDC9A" emissive="#FFC879" emissiveIntensity={night?1.4:.28}/></mesh>
   </group>)}
   <group position={[0,0,-1.0]}>
    <mesh position={[0,2,0]}><cylinderGeometry args={[.5,.62,4.0,8]}/><meshStandardMaterial color={wall} {...MAGIC_MATERIALS.architecture}/></mesh>
    <mesh position={[0,4.35,0]}><coneGeometry args={[.8,1.4,8]}/><meshStandardMaterial color={roof} roughness={.7}/></mesh>
    <mesh position={[0,3.0,.43]}><sphereGeometry args={[.19,8,8]}/><meshStandardMaterial color="#FFECB0" emissive="#FFD18B" emissiveIntensity={night?1.7:.35}/></mesh>
   </group>
   <mesh position={[0,.56,1.08]}><boxGeometry args={[3.5,.85,.34]}/><meshStandardMaterial color={wall} {...MAGIC_MATERIALS.architecture}/></mesh>
   {ice&&<mesh position={[0,4.95,-1]}><octahedronGeometry args={[.44,0]}/><meshStandardMaterial color="#B5F8FC" emissive="#6DDAF2" emissiveIntensity={night?1.3:.5}/></mesh>}
  </group>
 </group>;
}
