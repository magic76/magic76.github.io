import {useMemo,useRef} from "react";
import {useFrame} from "@react-three/fiber";
import {BufferAttribute,BufferGeometry,Color,Points} from "three";
import type {MagicCreatorPart} from "./world";
/** One short-lived bounded Points draw call per casting creature. */
export function MagicCasting3D({animated,progress,seed,parts,popTimes,finishAt}:{
 animated:boolean;progress:{current:number};seed:number;parts:MagicCreatorPart[];
 popTimes:{current:number[]};finishAt:{current:number};}){
 const node=useRef<Points>(null);
 const geometry=useMemo(()=>{
  const geometry=new BufferGeometry(),positions=new Float32Array(180*3),colors=new Float32Array(180*3);
  const warm=new Color("#ffe3a4");for(let i=0;i<180;i++)colors.set(warm.toArray(),i*3);
  geometry.setAttribute("position",new BufferAttribute(positions,3));geometry.setAttribute("color",new BufferAttribute(colors,3));
  geometry.setDrawRange(0,0);return geometry;
 },[]);
 useFrame(({clock})=>{
  const points=node.current;if(!points)return;
  const elapsed=progress.current,completion=Math.min(1,elapsed/5.6);
  points.visible=animated&&completion>.005&&elapsed<5.95;
  if(!points.visible)return;
  const pos=geometry.getAttribute("position") as BufferAttribute;
  let count=0;const t=clock.elapsedTime;
  if(completion<.9){
   for(let i=0;i<54;i++){
    const phase=Math.max(0,Math.min(1,(elapsed-i*.014)/.9));
    const radius=(2.5+i%7*.15)*(1-phase),a=i*2.399+t*1.6+seed*.001;
    pos.setXYZ(count++,Math.cos(a)*radius,1.2+(i%11)*.18*(1-phase),Math.sin(a)*radius);
   }
  }
  for(let i=0;i<parts.length;i++){
   const age=elapsed-(popTimes.current[i]??-100);
   if(age<0||age>.35)continue;
   const part=parts[i],radius=(age/.35)*.58;
   for(let j=0;j<8;j++){
    const angle=j*Math.PI/4+seed*.002;
    pos.setXYZ(count++,part.x+Math.cos(angle)*radius,part.y+Math.sin(angle)*radius,part.z+Math.cos(angle*2)*radius);
   }
  }
  const ringAge=elapsed-finishAt.current;
  if(finishAt.current>=0&&ringAge>=0&&ringAge<.35){
   const radius=.4+ringAge*5;
   for(let i=0;i<30;i++){
    const angle=i/30*Math.PI*2;
    pos.setXYZ(count++,Math.cos(angle)*radius,1.1,Math.sin(angle)*radius);
   }
  }
  geometry.setDrawRange(0,count);pos.needsUpdate=true;
 });
 return <points ref={node} geometry={geometry} visible={false} frustumCulled={false}>
  <pointsMaterial vertexColors transparent opacity={.8} depthWrite={false} size={.11} sizeAttenuation/>
 </points>;
}
