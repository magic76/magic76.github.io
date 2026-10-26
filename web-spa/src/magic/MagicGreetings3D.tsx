import {useEffect,useMemo} from "react";
import {useFrame} from "@react-three/fiber";
import {publishMagicParticles,removeMagicParticles,type MagicParticle} from "./MagicParticleLayers3D";
export function MagicGreetings3D({greeting}:{greeting:{emission?:{x:number;y:number;z:number;until:number;kind:"heart"|"sparkle"}}}){
 const pts=useMemo<MagicParticle[]>(()=>[],[]);
 useEffect(()=>()=>removeMagicParticles("greetings"),[]);
 useFrame(({clock})=>{
  const e=greeting.emission,t=clock.elapsedTime;
  if(!e||t>=e.until){removeMagicParticles("greetings");return}
  pts.length=0;for(let i=0;i<8;i++){const a=i*2.399;pts.push({x:e.x+Math.cos(a)*.42,y:e.y+(1.5-(e.until-t))*.55+(i%4)*.16,z:e.z+Math.sin(a)*.42})}
  publishMagicParticles("greetings",e.kind,pts)
 });return null;
}
