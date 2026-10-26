import {islandSurfaceHeight} from './magicNavigation';
import {MAGIC_MATERIALS,type MagicPalette} from './magicPalette';
/** Split parapet keeps a real visible gate aligned with the +Z path. */
export function MagicCastle3D({colors,night,ice}:{colors:MagicPalette;night:boolean;ice:boolean}){
 const wall=ice?'#B4E8F3':'#FFF1DA',roof=ice?'#8CCBE2':colors.roof;
 const glow=ice?'#9BEAFF':'#FFC879',inside=ice?'#D5FFFF':'#FFE3A0';
 const windowMaterial=<meshStandardMaterial color={inside} emissive={glow} emissiveIntensity={night?2.5:.48} toneMapped={false}/>;
 const windowAt=(x:number,y:number,z:number,key:string)=>
  <group key={key} position={[x,y,z]}>
   <mesh position={[0,0,-.012]}><boxGeometry args={[.26,.43,.065]}/><meshStandardMaterial color={ice?'#568FA4':'#69516B'}/></mesh>
   <mesh position={[0,0,.038]}><boxGeometry args={[.18,.35,.07]}/>{windowMaterial}</mesh>
  </group>;
 return <group position={[0,islandSurfaceHeight(0,-.55)+.34,-.55]}>
  <group scale={1.9}>
   <mesh position={[0,.09,0]}><cylinderGeometry args={[2.12,2.4,.24,10]}/><meshStandardMaterial color={ice?'#D2ECF4':'#D9C3A6'} {...MAGIC_MATERIALS.stone}/></mesh>
   <mesh position={[0,1.0,0]}><boxGeometry args={[2.65,1.85,1.72]}/><meshStandardMaterial color={wall} {...MAGIC_MATERIALS.architecture}/></mesh>
   <mesh position={[0,2.13,0]} rotation={[0,Math.PI/4,0]}><coneGeometry args={[1.85,1.0,4]}/><meshStandardMaterial color={roof} flatShading roughness={.78}/></mesh>
   <mesh position={[0,.68,.89]}><boxGeometry args={[.68,1.18,.10]}/><meshStandardMaterial color={ice?'#4786AC':'#765770'}/></mesh>
   {[-.72,.72].map((x,i)=>windowAt(x,1.2,.90,'facade'+i))}
   {[-1.3,1.3].map((x,i)=><group key={i} position={[x,0,.36]}>
    <mesh position={[0,1.42,0]}><cylinderGeometry args={[.53,.63,3.05,8]}/><meshStandardMaterial color={wall} {...MAGIC_MATERIALS.architecture}/></mesh>
    <mesh position={[0,3.29,0]}><coneGeometry args={[.82,1.34,8]}/><meshStandardMaterial color={roof} flatShading roughness={.73}/></mesh>
    {windowAt(0,1.52,.55,'t'+i+'a')}{windowAt(0,2.26,.43,'t'+i+'b')}
   </group>)}
   <group position={[0,0,-1.0]}>
    <mesh position={[0,2,0]}><cylinderGeometry args={[.5,.62,4.0,8]}/><meshStandardMaterial color={wall} {...MAGIC_MATERIALS.architecture}/></mesh>
    <mesh position={[0,4.35,0]}><coneGeometry args={[.8,1.4,8]}/><meshStandardMaterial color={roof} roughness={.7}/></mesh>
    {windowAt(0,2.3,.52,'spire1')}{windowAt(0,3.05,.41,'spire2')}
   </group>
   {[-1,1].map(sign=><mesh key={sign} position={[sign*1.12,.55,1.08]}><boxGeometry args={[1.24,.85,.34]}/><meshStandardMaterial color={wall} {...MAGIC_MATERIALS.architecture}/></mesh>)}
   <mesh position={[0,1.08,1.08]}><boxGeometry args={[.98,.22,.34]}/><meshStandardMaterial color={wall} {...MAGIC_MATERIALS.architecture}/></mesh>
   {ice&&<mesh position={[0,4.95,-1]}><octahedronGeometry args={[.44,0]}/><meshStandardMaterial color="#B5F8FC" emissive="#6DDAF2" emissiveIntensity={night?1.3:.5}/></mesh>}
  </group>
 </group>;
}
