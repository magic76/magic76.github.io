import {useEffect,useRef} from 'react';
import {Object3D,Color,type InstancedMesh} from 'three';
import {islandSurfaceHeight} from './magicNavigation';
import {MAGIC_TREES,MAGIC_DISTRICTS} from './magicLayout';
import {MAGIC_MATERIALS,type MagicPalette} from './magicPalette';

/** One trunk + two foliage batches; every shadow uses the same layout source. */
export function MagicForest3D({colors}:{colors:MagicPalette}){
 const trunks=useRef<InstancedMesh>(null),cone=useRef<InstancedMesh>(null),round=useRef<InstancedMesh>(null);
 useEffect(()=>{
  const t=new Object3D(),c=new Color();
  let nCone=0,nRound=0;
  MAGIC_TREES.forEach((p,i)=>{
   const y=islandSurfaceHeight(p.x,p.z),s=p.scale;
   t.rotation.set(0,0,0);
   t.position.set(p.x,y+.48*s,p.z);t.scale.set(.18*s,.95*s,.18*s);t.updateMatrix();trunks.current?.setMatrixAt(i,t.matrix);
   t.position.set(p.x,y+1.49*s,p.z);t.scale.set(.8*s,1.03*s,.8*s);t.updateMatrix();
   const mesh=p.style===0?cone.current:round.current;
   const slot=p.style===0?nCone++:nRound++;
   mesh?.setMatrixAt(slot,t.matrix);
   c.set(colors.tree).multiplyScalar(.82+(i%5)*.08);mesh?.setColorAt(slot,c);
  });
  [trunks.current,cone.current,round.current].forEach(m=>{
   if(m){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
  });
 },[colors.tree]);
 const nCone=MAGIC_TREES.filter(p=>p.style===0).length;
 const nRound=MAGIC_TREES.length-nCone;
 return <group>
  <instancedMesh ref={trunks} args={[undefined,undefined,MAGIC_TREES.length]} frustumCulled={false}>
   <cylinderGeometry args={[.72,1.06,1,6]}/><meshStandardMaterial color="#956F52" {...MAGIC_MATERIALS.foliage}/>
  </instancedMesh>
  <instancedMesh ref={cone} args={[undefined,undefined,nCone]} frustumCulled={false}>
   <coneGeometry args={[1,1.85,7]}/><meshStandardMaterial color="#FFFFFF" {...MAGIC_MATERIALS.foliage}/>
  </instancedMesh>
  <instancedMesh ref={round} args={[undefined,undefined,nRound]} frustumCulled={false}>
   <icosahedronGeometry args={[1,0]}/><meshStandardMaterial color="#FFFFFF" {...MAGIC_MATERIALS.foliage}/>
  </instancedMesh>
 </group>;
}
/** Eight small destinations without bright UI-like rings. */
export function MagicDistricts3D({colors,night}:{colors:MagicPalette;night:boolean}){
 return <group>{MAGIC_DISTRICTS.map(s=><group key={s.id} position={[s.x,islandSurfaceHeight(s.x,s.z),s.z]} rotation={[0,-s.angle,0]}>
  <mesh position={[0,-.08,0]}><cylinderGeometry args={[1.7,1.85,.16,9]}/><meshStandardMaterial color={colors.detail} {...MAGIC_MATERIALS.stone}/></mesh>
  {[-1,0,1].map((step,i)=><group key={i} position={[step*.78,0,step===0?-.34:.28]}>
   <mesh position={[0,.33,0]}><cylinderGeometry args={[.27,.35,.7+(i===1?.27:0),6]}/><meshStandardMaterial color="#F1DCCC" {...MAGIC_MATERIALS.architecture}/></mesh>
   <mesh position={[0,.79+(i===1?.2:0),0]}><coneGeometry args={[.43,.62,6]}/><meshStandardMaterial color={colors.roof} flatShading roughness={.8}/></mesh>
  </group>)}
  <mesh position={[0,1.72,-.3]}><octahedronGeometry args={[.22,0]}/><meshStandardMaterial color={night?'#FFF1BA':'#FFDF8D'} emissive="#FFD78B" emissiveIntensity={night?1.2:.24}/></mesh>
 </group>)}</group>;
}
