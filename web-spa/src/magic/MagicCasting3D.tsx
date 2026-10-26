import {useEffect,useMemo,useRef} from "react";
import {useFrame} from "@react-three/fiber";
import {Group,Vector3} from "three";
import {publishMagicParticles,removeMagicParticles,type MagicParticle} from "./MagicParticleLayers3D";
import type {MagicCreatorPart} from "./world";
let sequence=0;
export function MagicCasting3D({animated,progress,seed,parts,popTimes,finishAt}:{
 animated:boolean;progress:{current:number};seed:number;parts:MagicCreatorPart[];
 popTimes:{current:number[]};finishAt:{current:number};}){
 const id=useMemo(()=>"cast:"+(sequence++),[]),anchor=useRef<Group>(null),world=useMemo(()=>new Vector3(),[]);
 const points=useMemo<MagicParticle[]>(()=>[],[]);
 useEffect(()=>()=>removeMagicParticles(id),[id]);
 useFrame(({clock})=>{
  points.length=0;const elapsed=progress.current;if(!animated||elapsed<=0||elapsed>5.95){removeMagicParticles(id);return}
  anchor.current?.getWorldPosition(world);const t=clock.elapsedTime,completion=Math.min(1,elapsed/5.6);
  if(completion<.9)for(let i=0;i<54;i++){
   const phase=Math.max(0,Math.min(1,(elapsed-i*.014)/.9)),r=(2.5+i%7*.15)*(1-phase),a=i*2.399+t*1.6+seed*.001;
   points.push({x:world.x+Math.cos(a)*r,y:world.y+1.2+(i%11)*.18*(1-phase),z:world.z+Math.sin(a)*r})
  }
  for(let i=0;i<parts.length;i++){
   const age=elapsed-(popTimes.current[i]??-100);if(age<0||age>.35)continue;
   const part=parts[i],r=age/.35*.58;
   for(let j=0;j<8;j++){const a=j*Math.PI/4+seed*.002;points.push({x:world.x+part.x+Math.cos(a)*r,y:world.y+part.y+Math.sin(a)*r,z:world.z+part.z+Math.cos(a*2)*r})}
  }
  const age=elapsed-finishAt.current;
  if(finishAt.current>=0&&age>=0&&age<.35)for(let i=0;i<30;i++){
   const a=i/30*Math.PI*2,r=.4+age*5;points.push({x:world.x+Math.cos(a)*r,y:world.y+1.1,z:world.z+Math.sin(a)*r})
  }
  publishMagicParticles(id,"sparkle",points);
 });
 return <group ref={anchor}/>;
}
