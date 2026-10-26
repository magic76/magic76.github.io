import {useEffect,useMemo,useRef} from "react";
import {Object3D, type InstancedMesh} from "three";
import {islandSurfaceHeight} from "./magicNavigation";

/** Shared transparent ellipse instances: one draw call, zero shadow maps. */
export function MagicGroundShadows3D(){
 const mesh=useRef<InstancedMesh>(null);
 const places=useMemo(()=>{
  const trees=Array.from({length:17},(_,i)=>{
   const a=i*2.399,r=3.6+(i%3)*.38;
   return [Math.cos(a)*r,Math.sin(a)*r,.74] as const;
  });
  const groves=Array.from({length:28},(_,i)=>{
   const a=i*2.39996+.4,r=5.7+(i%5)*1.95;
   return [Math.cos(a)*r,Math.sin(a)*r*.83,.66] as const;
  });
  const district=Array.from({length:8},(_,i)=>{
   const a=i*Math.PI/4+.18;
   return [Math.cos(a)*12.5,Math.sin(a)*10.4,1.6] as const;
  });
  return [...trees,...groves,...district,[0,-.55,2.5] as const];
 },[]);
 useEffect(()=>{
  if(!mesh.current)return;
  const temp=new Object3D();
  places.forEach(([x,z,r],i)=>{
   temp.position.set(x,islandSurfaceHeight(x,z)+.035,z);
   temp.rotation.set(-Math.PI/2,0,0);
   temp.scale.set(r,r*.65,1);
   temp.updateMatrix();mesh.current!.setMatrixAt(i,temp.matrix);
  });
  mesh.current.instanceMatrix.needsUpdate=true;
 },[places]);
 return <instancedMesh ref={mesh} args={[undefined,undefined,places.length]} frustumCulled={false} renderOrder={2}>
  <circleGeometry args={[1,16]}/>
  <meshBasicMaterial color="#405C4C" transparent opacity={.19} depthWrite={false} polygonOffset polygonOffsetFactor={-1}/>
 </instancedMesh>;
}
