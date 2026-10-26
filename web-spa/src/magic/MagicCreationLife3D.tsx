import {useMemo,useRef} from "react";
import {useFrame} from "@react-three/fiber";
import {BufferAttribute,BufferGeometry,Color,Points} from "three";
import type {MagicCreatorAura} from "./world";
export function MagicCreationLife3D({aura,animated,night,seed,assembledRef,sleeping}:{aura?:MagicCreatorAura;animated:boolean;night:boolean;seed:number;assembledRef:{current:number};sleeping:boolean}){
 const cloud=useRef<Points>(null);
 const geometry=useMemo(()=>{
  const g=new BufferGeometry(),positions=new Float32Array(36*3),colors=new Float32Array(36*3);
  const base=new Color(aura==="fire"?"#ffab62":aura==="ice"||aura==="bubbles"?"#b7eaff":aura==="hearts"?"#ff9dca":"#ffe4a0");
  for(let i=0;i<36;i++){colors.set(base.toArray(),i*3)}
  g.setAttribute("position",new BufferAttribute(positions,3));g.setAttribute("color",new BufferAttribute(colors,3));g.setDrawRange(0,0);return g;
 },[aura]);
 useFrame(({clock,camera})=>{
  const node=cloud.current;if(!node)return;
  const show=animated&&assembledRef.current>.98&&(Boolean(aura)||sleeping);
  node.visible=show;if(!show)return;
  const positions=geometry.getAttribute("position") as BufferAttribute;
  const t=clock.elapsedTime+seed*.01,count=camera.position.length()>45?6:12;
  for(let i=0;i<count;i++){
   const a=i*2.399+t*(aura==="stars"||aura==="music"?.5:.12),rad=.65+((i*7)%5)*.16;
   let y=1.05+((i*.37+t*.3)%2.1);
   if(aura==="flowers"||aura==="leaves"||aura==="ice")y=2.75-((t*.29+i*.23)%2.1);
   if(aura==="music")y=1.4+Math.abs(Math.sin(t*1.7+i))*.85;
   if(aura==="fire")y=.7+((t*1.5+i*.23)%2.1);
   if(sleeping){y=2.2+((t*.24+i*.6)%1.3)}
   positions.setXYZ(i,Math.cos(a)*rad*(sleeping?.35:1),y,Math.sin(a)*rad*(sleeping?.35:1));
  }
  geometry.setDrawRange(0,count);positions.needsUpdate=true;
 });
 return <points ref={cloud} geometry={geometry} visible={false} frustumCulled={false}>
  <pointsMaterial size={night?.16:.13} vertexColors transparent opacity={.8} depthWrite={false} sizeAttenuation/>
 </points>;
}
