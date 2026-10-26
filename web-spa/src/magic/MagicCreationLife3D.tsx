import {useEffect,useMemo,useRef} from "react";
import {useFrame} from "@react-three/fiber";
import {Group,Vector3} from "three";
import type {MagicCreatorAura} from "./world";
import {publishMagicParticles,removeMagicParticles,type MagicParticle,type MagicParticleKind} from "./MagicParticleLayers3D";
let counter=0;
export function MagicCreationLife3D({aura,animated,night,seed,assembledRef,sleeping}:{
 aura?:MagicCreatorAura;animated:boolean;night:boolean;seed:number;assembledRef:{current:number};sleeping:boolean}){
 const id=useMemo(()=>"life:"+(counter++),[]),ref=useRef<Group>(null),world=useMemo(()=>new Vector3(),[]);
 const points=useMemo<MagicParticle[]>(()=>[],[]);
 useEffect(()=>()=>removeMagicParticles(id),[id]);
 useFrame(({clock,camera})=>{
  if(!animated||assembledRef.current<.98||(!aura&&!sleeping)){removeMagicParticles(id);return}
  ref.current?.getWorldPosition(world);points.length=0;
  const t=clock.elapsedTime+seed*.01,count=camera.position.length()>45?6:12;
  for(let i=0;i<(sleeping?3:count);i++){
   const a=i*2.399+t*(aura==="stars"||aura==="music"?.5:.12),r=.65+((i*7)%5)*.16;
   let y=1.05+((i*.37+t*.3)%2.1);
   if(aura==="flowers"||aura==="leaves"||aura==="ice")y=2.75-((t*.29+i*.23)%2.1);
   if(aura==="music")y=1.4+Math.abs(Math.sin(t*1.7+i))*.85;
   if(aura==="fire")y=.7+((t*1.5+i*.23)%2.1);
   if(sleeping)y=2.2+((t*.24+i*.6)%1.3);
   points.push({x:world.x+Math.cos(a)*r*(sleeping?.35:1),y:world.y+y,z:world.z+Math.sin(a)*r*(sleeping?.35:1)});
  }
  const type:MagicParticleKind=sleeping?"z":aura==="bubbles"?"bubble":aura==="flowers"?"flower":aura==="leaves"?"leaf":aura==="ice"?"snow":aura==="music"?"note":aura==="hearts"?"heart":aura==="fire"?"flame":"star";
  publishMagicParticles(id,type,points);
 });
 return <group ref={ref}/>;
}
