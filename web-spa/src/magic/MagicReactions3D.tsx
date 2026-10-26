import {useEffect,useMemo,useRef} from "react";
import {useFrame,useThree} from "@react-three/fiber";
import {MeshBasicMaterial,PlaneGeometry,Mesh,DoubleSide,Vector3,CanvasTexture,LinearFilter,BufferGeometry,Float32BufferAttribute} from "three";
import {islandSurfaceHeight} from "./magicNavigation";
import {magicCreationElements,magicFindReaction,magicPickReaction,type MagicReactionId,type ReactionCandidate} from "./magicReactions";
import {magicWishTraits,magicWishKind} from "./magicWish";
import {publishMagicParticles,removeMagicParticles,type MagicParticle} from "./MagicParticleLayers3D";
import type {MagicCreation} from "./world";

type Neighbor={x:number;z:number;look?:number;until?:number;ready?:number;react?:{x:number;z:number;w:number;look:number;dance?:boolean}};
type Active={id:MagicReactionId;a:number;b:number;x:number;z:number;start:number;announced:boolean;slot:number};
const palette:Record<string,number>={fire:0xffb26e,ice:0xbfe9ff,water:0x8fd3ff,flower:0xffaacc,star:0xffeda4,music:0xc9a8ff,wind:0xd8fff1,heart:0xff8fb8};
const empty:MagicParticle[][]=Array.from({length:2},()=>[]);
/** Two fixed slots, particle buffers are shared with all regular creature emitters. */
export function MagicReactions3D({creations,neighbors,animated,night,castleIce,greeting}:{creations:MagicCreation[];neighbors:Map<number,Neighbor>;animated:boolean;night:boolean;castleIce:boolean;greeting:{busyUntil:number};}){
 const active=useRef<Active[]>([]),cooldown=useRef(new Map<string,number>()),last=useRef(-100),focused=useRef<number|null>(null);
 const {camera,gl,invalidate}=useThree();const center=useMemo(()=>new Vector3(),[]);
 const decals=useRef<(Mesh|null)[]>([]);
 const viewportCheck=()=>{if(typeof document==="undefined"||document.hidden)return false;const r=gl.domElement.getBoundingClientRect();return r.bottom>=0&&r.top<=window.innerHeight&&r.right>=0&&r.left<=window.innerWidth};
 useEffect(()=>{
  const tick=()=>{
   if(!viewportCheck())return;const now=performance.now()/1000;
   const coarse=typeof window!=="undefined"&&window.matchMedia?.("(pointer:coarse)").matches;
   if(active.current.length>=(coarse?1:2)||now-last.current<8||now<greeting.busyUntil)return;
   const candidates:(ReactionCandidate&{a:number;b:number;x:number;z:number})[]=[];
   for(let i=0;i<creations.length;i++)for(let j=i+1;j<creations.length;j++){
    const a=creations[i],b=creations[j],pa=neighbors.get(a.id),pb=neighbors.get(b.id);
    if(!pa||!pb||(pa.ready??0)<.98||(pb.ready??0)<.98)continue;
    if(night&&([a,b].some(c=>c.motion==="still"||c.motion==="walk")))continue;
    const distance=Math.hypot(pa.x-pb.x,pa.z-pb.z);if(distance>7.2)continue;
    const x=(pa.x+pb.x)/2,z=(pa.z+pb.z)/2;
    center.set(x,islandSurfaceHeight(x,z)+2,z).project(camera);
    if(Math.abs(center.x)>1.05||Math.abs(center.y)>1.05)continue;
    const tags=(c:MagicCreation)=>magicCreationElements(c,{aura:c.aura??magicWishTraits(c.label+" "+c.idea).aura,kind:c.blueprint?.kind??magicWishKind(c.label+" "+c.idea)});
    const id=magicFindReaction(tags(a),tags(b),{night,castleIce,distanceToCastle:Math.hypot(x,z+.55)});if(!id)continue;
    candidates.push({id,key:[a.id,b.id].join(":"),a:a.id,b:b.id,x,z,distance,focused:a.id===focused.current||b.id===focused.current});
   }
   const rec:Record<string,number>={};for(const [k,v] of cooldown.current)rec[k]=v;
   const chosen=magicPickReaction(candidates,{pairs:rec,lastStart:last.current,active:active.current.length,limit:coarse?1:2},now);
   if(!chosen)return;const c=candidates.find(v=>v===chosen);if(!c)return;
   const used=new Set(active.current.map(a=>a.slot));const slot=used.has(0)?1:0;
   active.current.push({id:c.id,a:c.a,b:c.b,x:c.x,z:c.z,start:now,announced:false,slot});
   cooldown.current.set(c.key,now);last.current=now;greeting.busyUntil=now+5;
   if(!animated)invalidate();
  };
  const timer=setInterval(tick,250);return()=>{clearInterval(timer);for(let i=0;i<2;i++)for(const kind of ["sparkle","star","heart","bubble","flame","flower","leaf","snow","note","z","glow","drop","petal","crystal"])removeMagicParticles(`reaction:${i}:${kind}`)};
 },[creations,neighbors,camera,gl,greeting,night,castleIce,animated,invalidate,center]);
 useFrame(()=>{
  const now=performance.now()/1000;
  for(let slot=0;slot<2;slot++){
   const r=active.current.find(a=>a.slot===slot);
   if(!r)continue;const age=now-r.start;
   if(age>=1.4&&!r.announced){r.announced=true;window.dispatchEvent(new CustomEvent("crew-magic-reaction",{detail:{id:r.id}}))}
   const alpha=animated?Math.max(0,Math.min(1,(age-.95)/.3,(4.4-age)/1)):Math.max(0,Math.min(1,(2.5-age)*5));
   const spark:MagicParticle[]=empty[slot];spark.length=0;
   const count=animated?32:8;const color=palette[r.id.includes("frost")||r.id.includes("ice")?"ice":r.id.includes("flower")?"flower":r.id.includes("heart")?"heart":r.id.includes("water")?"water":"fire"];
   for(let i=0;i<count;i++){
    const angle=i*2.39996+age*(animated?1.2:0),rad=animated?Math.min(1.8,Math.max(0,age-1.2)*1.3)*(0.5+(i%7)/13):.8;
    const height=animated?Math.max(0,age-1.35)*(.55+(i%5)*.21):.6;
    spark.push({x:r.x+Math.cos(angle)*rad,y:islandSurfaceHeight(r.x,r.z)+.5+height,z:r.z+Math.sin(angle)*rad,
     alpha:alpha*.85,size:i%6===0?2.4:1.4,color,minPx:i%6===0?9:4});
   }
   const primary=r.id==="heart_bouquet"?"heart":r.id==="flower_ring"||r.id==="petal_swirl"?"petal":r.id==="frost_carpet"||r.id==="dragon_frost"?"crystal":r.id==="ripple_splash"?"drop":r.id==="music_dance"?"note":r.id==="cat_fish_chase"?"bubble":r.id==="snow_fairy"?"snow":"star";
   for(const kind of ["star","heart","petal","crystal","drop","note","bubble","snow"]){if(kind!==primary)removeMagicParticles(`reaction:${slot}:${kind}`)}
   publishMagicParticles(`reaction:${slot}:${primary}`,primary,spark);
   if(decals.current[slot]){const mesh=decals.current[slot]!;mesh.visible=alpha>.02;mesh.position.set(r.x,islandSurfaceHeight(r.x,r.z)+.08,r.z);mesh.scale.setScalar(1+Math.min(1,Math.max(0,age-1.4))*1.1);(mesh.material as MeshBasicMaterial).opacity=alpha*.35}

  }
  const retained=active.current.filter(r=>now-r.start<(animated?5:2.5));
  if(retained.length!==active.current.length){for(const old of active.current){if(retained.includes(old))continue;for(const kind of ["star","heart","petal","crystal","drop","note","bubble","snow"])removeMagicParticles(`reaction:${old.slot}:${kind}`)}active.current=retained;if(!animated)invalidate()}
 });
 return <group>{[0,1].map(slot=><mesh key={slot} ref={node=>{decals.current[slot]=node}} rotation={[-Math.PI/2,0,0]} visible={false} renderOrder={2}>
  <planeGeometry args={[2.4,2.4]}/><meshBasicMaterial color="#ffe5af" transparent depthWrite={false} opacity={.3} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2}/>
 </mesh>)}</group>;
}
