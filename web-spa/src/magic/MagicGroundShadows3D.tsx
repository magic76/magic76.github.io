import {useEffect,useRef} from 'react';
import {Object3D,type InstancedMesh} from 'three';
import {MAGIC_TREES,MAGIC_DISTRICTS} from './magicLayout';
import {islandSurfaceHeight} from './magicNavigation';
/** Layout-coupled, static grounding. No realtime shadows. */
export function MagicGroundShadows3D({hidden=[],reducedMotion=false}:{hidden?:number[];reducedMotion?:boolean}){
 const mesh=useRef<InstancedMesh>(null);
 const hiddenKey=hidden.join(",");
 useEffect(()=>{
  if(!mesh.current)return;
  const tmp=new Object3D();
  const places=[...MAGIC_TREES.map(p=>({x:p.x,z:p.z,r:.77*p.scale})),
   ...MAGIC_DISTRICTS.map(p=>({x:p.x,z:p.z,r:1.65})),{x:0,z:-.55,r:3.4}];
  const hide=new Set(hidden);
  places.forEach((p,i)=>{
   tmp.position.set(p.x,islandSurfaceHeight(p.x,p.z)+.06,p.z);
   tmp.rotation.set(-Math.PI/2,0,0);const visibility=i<MAGIC_TREES.length&&hide.has(i)?.001:1;tmp.scale.set(p.r*visibility,p.r*.76*visibility,1);
   tmp.updateMatrix();mesh.current!.setMatrixAt(i,tmp.matrix);
  });mesh.current.instanceMatrix.needsUpdate=true;
 },[hiddenKey,reducedMotion]);
 return <instancedMesh ref={mesh} args={[undefined,undefined,MAGIC_TREES.length+MAGIC_DISTRICTS.length+1]} frustumCulled={false} renderOrder={2}>
  <circleGeometry args={[1,12]}/><meshBasicMaterial color="#47623B" transparent opacity={.32} depthWrite={false} polygonOffset polygonOffsetFactor={-1}/>
 </instancedMesh>;
}
