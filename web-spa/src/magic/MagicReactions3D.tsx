import {useEffect,useMemo,useRef} from "react";
import {useFrame,useThree} from "@react-three/fiber";
import {BufferGeometry,Float32BufferAttribute,CanvasTexture,DoubleSide,LinearFilter,Mesh,MeshBasicMaterial,Vector3} from "three";
import {islandSurfaceHeight} from "./magicNavigation";
import {magicCreationElements,magicFindReaction,magicFindSoloReaction,magicPickReaction,type MagicReactionId,type ReactionCandidate} from "./magicReactions";
import {magicWishTraits,magicWishKind} from "./magicWish";
import {readMagicCodex} from "./magicCodexStore";
import {renderMagicReaction,type ReactionPool} from "./magicReactionRecipes";
import {MAGIC_PARTICLE_KINDS,publishMagicParticles,removeMagicParticles} from "./MagicParticleLayers3D";
import type {MagicCreation} from "./world";
type ReactPose={x:number;z:number;w:number;look:number;dance?:boolean};
type Neighbor={x:number;z:number;look?:number;until?:number;ready?:number;react?:ReactPose};
type Active={id:MagicReactionId;a:number;b:number;x:number;z:number;start:number;announced:boolean;slot:number};
const activeSeconds=5;
const eased=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t)};
const palette:Record<string,number>={fire:0xffa66b,ice:0xbfe9ff,water:0x6ec8ff,flower:0xff9fc7,star:0xfff1a8,music:0xc9a8ff,wind:0xd8fff1,heart:0xff8fb8};
const allKinds=MAGIC_PARTICLE_KINDS;
function ringTexture(){const c=document.createElement("canvas");c.width=c.height=128;const a=c.getContext("2d")!;
 const g=a.createRadialGradient(64,64,30,64,64,63);g.addColorStop(0,"#ffffff00");g.addColorStop(.6,"#ffffff00");g.addColorStop(.76,"#ffffffa9");g.addColorStop(.84,"#ffffffac");g.addColorStop(1,"#ffffff00");a.fillStyle=g;a.fillRect(0,0,128,128);
 const t=new CanvasTexture(c);t.magFilter=LinearFilter;t.minFilter=LinearFilter;return t;}
function rainbowTexture(){const c=document.createElement("canvas");c.width=128;c.height=2;const ctx=c.getContext("2d")!;
 const g=ctx.createLinearGradient(0,0,128,0);["#ff8f8f","#ffc27a","#fff08a","#9fe8a0","#8fd3ff","#a9a4ff","#d9a6ff"].forEach((color,i)=>g.addColorStop(i/6,color));ctx.fillStyle=g;ctx.fillRect(0,0,128,2);
 const tex=new CanvasTexture(c);tex.magFilter=LinearFilter;tex.minFilter=LinearFilter;return tex;}
function rainbowGeometry(){const geom=new BufferGeometry(),positions:number[]=[],uv:number[]=[],indices:number[]=[];
 for(let i=0;i<=48;i++){const a=Math.PI*i/48;for(let side=0;side<2;side++){
  const r=1.5+(side===0?-.19:.19);positions.push(Math.cos(a)*r,Math.sin(a)*r,0);uv.push(side,i/48);
 }}
 for(let i=0;i<48;i++){const v=i*2;indices.push(v,v+1,v+2,v+1,v+3,v+2)}
 geom.setAttribute("position",new Float32BufferAttribute(positions,3));geom.setAttribute("uv",new Float32BufferAttribute(uv,2));geom.setIndex(indices);geom.computeVertexNormals();return geom;}
const slotPools=Array.from({length:2},()=>Object.fromEntries(allKinds.map(k=>[k,[]])) as unknown as ReactionPool);
export function MagicReactions3D({creations,neighbors,animated,night,castleIce,greeting,focusedId=null}:{creations:MagicCreation[];neighbors:Map<number,Neighbor>;animated:boolean;night:boolean;castleIce:boolean;greeting:{busyUntil:number};focusedId?:number|null}){
 const {camera,gl,invalidate}=useThree();const projection=useMemo(()=>new Vector3(),[]);
 const active=useRef<Active[]>([]),lastStart=useRef(-100),pairs=useRef(new Map<string,number>());
 const decals=useRef<(Mesh|null)[]>([]),rainbows=useRef<(Mesh|null)[]>([]);
 const textures=useMemo(()=>({ring:ringTexture(),rainbow:rainbowTexture(),rainbowGeom:rainbowGeometry()}),[]);
 useEffect(()=>()=>{textures.ring.dispose();textures.rainbow.dispose();textures.rainbowGeom.dispose()},[textures]);
 const clear=(slot:number)=>{for(const k of allKinds)removeMagicParticles(`reaction:${slot}:${k}`);
  if(decals.current[slot])decals.current[slot]!.visible=false;
  if(rainbows.current[slot])rainbows.current[slot]!.visible=false;
  slotPools[slot]&&allKinds.forEach(k=>{slotPools[slot][k].length=0});};
 const display=(r:Active,now:number)=>{
  const age=now-r.start,slot=r.slot,pool=slotPools[slot];for(const k of allKinds)pool[k].length=0;
  renderMagicReaction(r.id,Math.min(age,4.4),r.x,r.z,islandSurfaceHeight(r.x,r.z),pool,animated);
  for(const k of allKinds)if(pool[k].length)publishMagicParticles(`reaction:${slot}:${k}`,k,pool[k]);else removeMagicParticles(`reaction:${slot}:${k}`);
  const mesh=decals.current[slot];if(mesh){const fade=animated?Math.min(1,Math.max(0,(age-1)/.4),Math.max(0,(4.4-age)/1)):Math.min(1,age*5,(2.5-age)*5);
   mesh.visible=fade>.02;mesh.position.set(r.x,islandSurfaceHeight(r.x,r.z)+.07,r.z);mesh.scale.setScalar(animated?1+Math.min(1,Math.max(0,age-1.4))*1.2:1.3);
   (mesh.material as MeshBasicMaterial).opacity=fade*.48;(mesh.material as MeshBasicMaterial).color.setHex(palette[r.id.includes("frost")||r.id.includes("ice")?"ice":r.id.includes("flower")?"flower":r.id.includes("heart")?"heart":r.id.includes("water")?"water":"fire"]);}
  const rainbow=rainbows.current[slot];if(rainbow){const show=r.id==="steam_rainbow"&&age>=1.6&&age<4.4;rainbow.visible=show;
   if(show){rainbow.position.set(r.x,islandSurfaceHeight(r.x,r.z)+1.15,r.z);rainbow.rotation.y=Math.atan2(camera.position.x-r.x,camera.position.z-r.z);
    rainbow.scale.set(Math.max(.001,eased((age-1.6)/.6)),1,1);(rainbow.material as MeshBasicMaterial).opacity=Math.min(1,(age-1.6)*4,4.4-age);}}
 };
 useEffect(()=>{
  const tick=()=>{
   const now=performance.now()/1000;
   // Both lifetime and discovery are independent of R3F's paused clock.
   for(let i=active.current.length-1;i>=0;i--){const r=active.current[i],age=now-r.start;
    if(age>=1.4&&!r.announced){r.announced=true;window.dispatchEvent(new CustomEvent("crew-magic-reaction",{detail:{id:r.id}}));}
    if(age>=(animated?activeSeconds:2.5)){const a=neighbors.get(r.a),b=neighbors.get(r.b);if(a?.react)a.react.w=0;if(b?.react)b.react.w=0;clear(r.slot);active.current.splice(i,1);invalidate();}
    else if(!animated&&age<2.5){display(r,now);invalidate();}
   }
   if(document.hidden)return;const b=gl.domElement.getBoundingClientRect();if(b.bottom<0||b.top>innerHeight||b.right<0||b.left>innerWidth)return;
   const coarse=window.matchMedia?.("(pointer:coarse)").matches,limit=coarse?1:2;
   if(active.current.length>=limit||now-lastStart.current<8||now<greeting.busyUntil)return;
   const candidate:(ReactionCandidate&{a:number;b:number;x:number;z:number})[]=[];
   const tags=new Map<number,string[]>();for(const c of creations)tags.set(c.id,magicCreationElements(c,{aura:c.aura??magicWishTraits(c.label+" "+c.idea).aura,kind:c.blueprint?.kind??magicWishKind(c.label+" "+c.idea)}));
   const discovered=new Set(readMagicCodex().found.map(x=>x.id));
   const add=(id:MagicReactionId,a:number,bId:number,x:number,z:number,distance:number)=>{
    projection.set(x,islandSurfaceHeight(x,z)+2,z).project(camera);
    if(Math.abs(projection.x)>1.05||Math.abs(projection.y)>1.05)return;
    const key=bId<0?String(a)+":solo:"+id:[Math.min(a,bId),Math.max(a,bId)].join(":");
    candidate.push({id,key,a,b:bId,x,z,distance,focused:a===focusedId||bId===focusedId,discovered:discovered.has(id)});};
   for(let i=0;i<creations.length;i++){
    const a=creations[i],pa=neighbors.get(a.id);if(!pa||(pa.ready??0)<.98||a.motion==="still"&&night||a.motion==="walk"&&night)continue;
    const solo=magicFindSoloReaction(tags.get(a.id)??[],{night,castleIce,distanceToCastle:Math.hypot(pa.x,pa.z+.55)});
    if(solo)add(solo,a.id,-1,pa.x,pa.z,0);
    for(let j=i+1;j<creations.length;j++){const c=creations[j],pb=neighbors.get(c.id);if(!pb||(pb.ready??0)<.98||night&&(c.motion==="still"||c.motion==="walk"))continue;
     const distance=Math.hypot(pa.x-pb.x,pa.z-pb.z);if(distance>7.2)continue;
     const x=(pa.x+pb.x)*.5,z=(pa.z+pb.z)*.5;
     const id=magicFindReaction(tags.get(a.id)??[],tags.get(c.id)??[],{night:false,castleIce:false,distanceToCastle:100});
     if(id)add(id,a.id,c.id,x,z,distance);
    }
   }
   const cd:Record<string,number>={};for(const [k,v] of pairs.current)cd[k]=v;
   const selected=magicPickReaction(candidate,{pairs:cd,lastStart:lastStart.current,active:active.current.length,limit},now);
   if(!selected)return;const c=candidate.find(x=>x===selected);if(!c)return;
   const slot=active.current.some(v=>v.slot===0)?1:0;
   active.current.push({id:c.id,a:c.a,b:c.b,x:c.x,z:c.z,start:now,announced:false,slot});lastStart.current=now;pairs.current.set(c.key,now);
   greeting.busyUntil=now+5;invalidate();
  };
  const timer=window.setInterval(tick,250);return()=>{window.clearInterval(timer);for(let i=0;i<2;i++)clear(i)};
 },[creations,neighbors,animated,night,castleIce,greeting,camera,gl,invalidate,focusedId,projection]);
 useFrame(()=>{if(!animated)return;const now=performance.now()/1000;
  for(const r of active.current){display(r,now);const age=now-r.start;
   const approach=eased(age/1),returning=1-eased((age-4)/1),weight=Math.min(approach,returning);
   const pa=neighbors.get(r.a),pb=neighbors.get(r.b);if(!pa)continue;
   const set=(p:Neighbor,other:Neighbor|undefined,dir:number)=>{
    const d=other?Math.atan2(other.x-p.x,other.z-p.z):Math.atan2(-p.x,-p.z);
    const travel=r.id==="cat_fish_chase"?Math.min(1.2,weight*.95):weight*Math.min(.8,other?Math.max(0,Math.hypot(p.x-other.x,p.z-other.z)-2)/2:0);
    const a=r.id==="cat_fish_chase"?(age-1)*Math.PI*4/2.8+dir*.35:d;
    if(p.react){p.react.x=p.x+Math.sin(a)*travel;p.react.z=p.z+Math.cos(a)*travel;p.react.w=weight;p.react.look=d;p.react.dance=r.id==="music_dance";}
    else p.react={x:p.x+Math.sin(a)*travel,z:p.z+Math.cos(a)*travel,w:weight,look:d,dance:r.id==="music_dance"};};
   set(pa,pb,0);if(pb)set(pb,pa,1);
  }
 });
 return <group>{[0,1].map(slot=><group key={slot}>
  <mesh ref={n=>{decals.current[slot]=n}} rotation={[-Math.PI/2,0,0]} visible={false} renderOrder={2}>
   <planeGeometry args={[3.5,3.5]}/><meshBasicMaterial map={textures.ring} color="#c9dff0" transparent opacity={0} depthWrite={false} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2}/>
  </mesh>
  <mesh ref={n=>{rainbows.current[slot]=n}} visible={false}>
   <primitive object={textures.rainbowGeom} attach="geometry"/><meshBasicMaterial map={textures.rainbow} transparent depthWrite={false} side={DoubleSide} toneMapped={false}/>
  </mesh>
 </group>)}</group>;
}
