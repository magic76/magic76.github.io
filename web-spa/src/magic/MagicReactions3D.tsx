import {useEffect,useMemo,useRef} from "react";
import {useFrame,useThree} from "@react-three/fiber";
import {BufferGeometry,Float32BufferAttribute,CanvasTexture,DoubleSide,LinearFilter,Mesh,MeshBasicMaterial,Vector3} from "three";
import {islandSurfaceHeight} from "./magicNavigation";
import {magicCreationElements,magicFindReaction,magicFindSoloReaction,magicPickReaction,type MagicReactionId,type ReactionCandidate} from "./magicReactions";
import {magicWishTraits,magicWishKind} from "./magicWish";
import {readMagicCodex} from "./magicCodexStore";
import {renderMagicReaction,makeReactionPool,resetReactionPool,REACTION_VISUALS,dragonFrostLayout,type ReactionPool} from "./magicReactionRecipes";
import {MAGIC_PARTICLE_KINDS,publishMagicParticles,removeMagicParticles} from "./MagicParticleLayers3D";
import type {MagicCreation} from "./world";
type ReactPose={x:number;z:number;w:number;look:number;dance?:boolean};
type Neighbor={x:number;z:number;look?:number;until?:number;ready?:number;react?:ReactPose};
type Active={id:MagicReactionId;a:number;b:number;x:number;z:number;start:number;announced:boolean;slot:number;ax:number;az:number;bx:number;bz:number;distance:number};
const activeSeconds=5;
const eased=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t)};
const allKinds=MAGIC_PARTICLE_KINDS;
function ringTexture(){const c=document.createElement("canvas");c.width=c.height=128;const a=c.getContext("2d")!;
 const g=a.createRadialGradient(64,64,30,64,64,63);g.addColorStop(0,"#ffffff00");g.addColorStop(.6,"#ffffff00");g.addColorStop(.76,"#ffffffa9");g.addColorStop(.84,"#ffffffac");g.addColorStop(1,"#ffffff00");a.fillStyle=g;a.fillRect(0,0,128,128);
 const t=new CanvasTexture(c);t.magFilter=LinearFilter;t.minFilter=LinearFilter;return t;}
function themedDecalTexture(){const c=document.createElement("canvas");c.width=c.height=128;const ctx=c.getContext("2d")!;
 const tex=new CanvasTexture(c);tex.magFilter=LinearFilter;tex.minFilter=LinearFilter;return {canvas:c,ctx,tex};}
function drawDecal(ctx:CanvasRenderingContext2D,id:MagicReactionId,age:number){
 ctx.clearRect(0,0,128,128);const center=64;
 if(id==="star_lake"){
  const grad=ctx.createRadialGradient(center,center,3,center,center,59);
  grad.addColorStop(0,"rgba(42,63,143,.65)");grad.addColorStop(.72,"rgba(42,63,143,.55)");grad.addColorStop(1,"rgba(110,200,255,0)");
  ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);return;
 }
 if(id==="frost_carpet"){
  ctx.strokeStyle="rgba(47,143,255,.68)";ctx.lineWidth=3;ctx.lineCap="round";
  const radius=52*Math.min(1,Math.max(0,(age-1)/.8));
  for(let k=0;k<6;k++){const a=k*Math.PI/3;ctx.beginPath();ctx.moveTo(center,center);
   ctx.lineTo(center+Math.cos(a)*radius,center+Math.sin(a)*radius);ctx.stroke();
   for(let j=1;j<4;j++){const r=radius*j/4,px=center+Math.cos(a)*r,py=center+Math.sin(a)*r;
    ctx.beginPath();ctx.moveTo(px-Math.sin(a)*5,py+Math.cos(a)*5);ctx.lineTo(px+Math.sin(a)*5,py-Math.cos(a)*5);ctx.stroke()}
  }return;
 }
 if(id==="ripple_splash"){
  ctx.strokeStyle="rgba(31,111,224,.95)";ctx.lineWidth=7;
  for(let k=0;k<3;k++){const t=(age-1.4-k*.4)/1.4;if(t<=0||t>=1)continue;
   ctx.globalAlpha=(1-t)*.9;ctx.beginPath();ctx.arc(center,center,6+54*t,0,Math.PI*2);ctx.stroke();
  }ctx.globalAlpha=1;return;
 }
 const grad=ctx.createRadialGradient(64,64,35,64,64,63);grad.addColorStop(0,"#ffffff00");grad.addColorStop(.55,"#ffffff00");grad.addColorStop(.76,"#ffffffb0");grad.addColorStop(.84,"#ffffffbd");grad.addColorStop(1,"#ffffff00");
 ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);
}
function rainbowTexture(){const c=document.createElement("canvas");c.width=128;c.height=2;const ctx=c.getContext("2d")!;
 const g=ctx.createLinearGradient(0,0,128,0);["#ff8f8f","#ffc27a","#fff08a","#9fe8a0","#8fd3ff","#a9a4ff","#d9a6ff"].forEach((color,i)=>g.addColorStop(i/6,color));ctx.fillStyle=g;ctx.fillRect(0,0,128,2);
 const pixels=ctx.getImageData(0,0,128,2);
 for(let x=0;x<128;x++){const edge=Math.min(1,x/9,(127-x)/9);
  for(let y=0;y<2;y++)pixels.data[(y*128+x)*4+3]=Math.round(255*Math.max(0,edge));}
 ctx.putImageData(pixels,0,0);
 const tex=new CanvasTexture(c);tex.magFilter=LinearFilter;tex.minFilter=LinearFilter;return tex;}
function rainbowGeometry(){const geom=new BufferGeometry(),positions:number[]=[],uv:number[]=[],indices:number[]=[];
 for(let i=0;i<=48;i++){const a=Math.PI*i/48;for(let side=0;side<2;side++){
  const r=1+(side===0?-.19:.19);positions.push(Math.cos(a)*r,Math.sin(a)*r,0);uv.push(side,i/48);
 }}
 for(let i=0;i<48;i++){const v=i*2;indices.push(v,v+1,v+2,v+1,v+3,v+2)}
 geom.setAttribute("position",new Float32BufferAttribute(positions,3));geom.setAttribute("uv",new Float32BufferAttribute(uv,2));geom.setIndex(indices);geom.computeVertexNormals();return geom;}
const slotPools=Array.from({length:2},()=>makeReactionPool(allKinds));
export function MagicReactions3D({creations,neighbors,animated,night,castleIce,greeting,focusedId=null}:{creations:MagicCreation[];neighbors:Map<number,Neighbor>;animated:boolean;night:boolean;castleIce:boolean;greeting:{busyUntil:number};focusedId?:number|null}){
 const {camera,gl,invalidate}=useThree();const projection=useMemo(()=>new Vector3(),[]);
 const active=useRef<Active[]>([]),lastStart=useRef(-100),pairs=useRef(new Map<string,number>());
 const decals=useRef<(Mesh|null)[]>([]),rainbows=useRef<(Mesh|null)[]>([]);
 const textures=useMemo(()=>({ring:ringTexture(),custom:[themedDecalTexture(),themedDecalTexture()],rainbow:rainbowTexture(),rainbowGeom:rainbowGeometry()}),[]);
 useEffect(()=>()=>{textures.ring.dispose();for(const item of textures.custom)item.tex.dispose();textures.rainbow.dispose();textures.rainbowGeom.dispose()},[textures]);
 const clear=(slot:number)=>{for(const k of allKinds)removeMagicParticles(`reaction:${slot}:${k}`);
  if(decals.current[slot])decals.current[slot]!.visible=false;
  if(rainbows.current[slot])rainbows.current[slot]!.visible=false;
  resetReactionPool(slotPools[slot]);};
 const display=(r:Active,now:number)=>{
  const age=now-r.start,slot=r.slot,pool=slotPools[slot];resetReactionPool(pool);
  renderMagicReaction(r.id,Math.min(age,4.4),r.id==="dragon_frost"?r.ax:r.x,r.id==="dragon_frost"?r.az:r.z,islandSurfaceHeight(r.id==="dragon_frost"?r.ax:r.x,r.id==="dragon_frost"?r.az:r.z),pool,animated,
   (()=>{const aim=Math.atan2(-r.ax,-.55-r.az);if(r.id!=="dragon_frost")return aim;
    return dragonFrostLayout(r.ax,r.az,camera.position.x,camera.position.z);})());
  for(const k of allKinds)if(pool.counts[k])publishMagicParticles(`reaction:${slot}:${k}`,k,pool.points[k],pool.counts[k]);else removeMagicParticles(`reaction:${slot}:${k}`);
  const mesh=decals.current[slot];if(mesh){const special=r.id==="star_lake"||r.id==="frost_carpet"||r.id==="ripple_splash";
   const item=textures.custom[slot];drawDecal(item.ctx,r.id,age);item.tex.needsUpdate=true;
   (mesh.material as MeshBasicMaterial).map=special?item.tex:textures.ring;const fade=animated?Math.min(1,Math.max(0,(age-1)/.4),Math.max(0,(4.4-age)/1)):Math.min(1,age*5,(2.5-age)*5);
   mesh.visible=fade>.02;mesh.position.set(r.x,islandSurfaceHeight(r.x,r.z)+.07,r.z);mesh.scale.setScalar((animated?Math.min(1,Math.max(.25,(age-1)*2)):1)*1.48);
   (mesh.material as MeshBasicMaterial).opacity=fade*(special?1:.7);(mesh.material as MeshBasicMaterial).color.setHex(REACTION_VISUALS[r.id].ring);}
  const rainbow=rainbows.current[slot];if(rainbow){const show=r.id==="steam_rainbow"&&age>=1.6&&age<4.4;rainbow.visible=show;
   if(show){rainbow.position.set(r.x,islandSurfaceHeight(r.x,r.z)+1.15,r.z);rainbow.rotation.y=Math.atan2(camera.position.x-r.x,camera.position.z-r.z);
    textures.rainbowGeom.setDrawRange(0,Math.max(0,Math.floor(48*eased((age-1.6)/.6))*6));rainbow.scale.setScalar(Math.max(1.6,r.distance/2+.6));(rainbow.material as MeshBasicMaterial).opacity=Math.min(1,(age-1.6)*4,4.4-age);}}
 };
 useEffect(()=>{
  const tick=()=>{
   const now=performance.now()/1000;
   // Both lifetime and discovery are independent of R3F's paused clock.
   for(let i=active.current.length-1;i>=0;i--){const r=active.current[i],age=now-r.start;
    if(age>=1.4&&!r.announced){r.announced=true;window.dispatchEvent(new CustomEvent("crew-magic-reaction",{detail:{id:r.id}}));}
    if(age>=(animated?activeSeconds:2.5)){const a=neighbors.get(r.a),b=neighbors.get(r.b);if(a?.react){a.react.w=0;a.react.dance=false}if(b?.react){b.react.w=0;b.react.dance=false}clear(r.slot);active.current.splice(i,1);invalidate();}
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
    const a=creations[i],pa=neighbors.get(a.id);if(!pa||(pa.ready??0)<.98)continue;
    const solo=magicFindSoloReaction(tags.get(a.id)??[],{night,castleIce,distanceToCastle:Math.hypot(pa.x,pa.z+.55)});
    if(solo)add(solo,a.id,-1,pa.x,pa.z,0);
    for(let j=i+1;j<creations.length;j++){const c=creations[j],pb=neighbors.get(c.id);if(!pb||(pb.ready??0)<.98)continue;
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
   active.current.push({id:c.id,a:c.a,b:c.b,x:c.x,z:c.z,start:now,announced:false,slot,ax:neighbors.get(c.a)?.x??c.x,az:neighbors.get(c.a)?.z??c.z,bx:neighbors.get(c.b)?.x??c.x,bz:neighbors.get(c.b)?.z??c.z,distance:c.distance});lastStart.current=now;pairs.current.set(c.key,now);
   greeting.busyUntil=now+5;invalidate();
  };
  const timer=window.setInterval(tick,250);return()=>{window.clearInterval(timer);for(let i=0;i<2;i++)clear(i)};
 },[creations,neighbors,animated,night,castleIce,greeting,camera,gl,invalidate,focusedId,projection]);
 useFrame(()=>{if(!animated)return;const now=performance.now()/1000;
  for(const r of active.current){display(r,now);const age=now-r.start;
   const approach=eased(age/1),returning=1-eased((age-4)/1),weight=Math.min(approach,returning);
   const pa=neighbors.get(r.a),pb=neighbors.get(r.b);if(!pa)continue;
   const set=(p:Neighbor,other:Neighbor|undefined,dir:number,originalX:number,originalZ:number)=>{
    const d=r.id==="dragon_frost"?dragonFrostLayout(p.x,p.z,camera.position.x,camera.position.z).heading:other?Math.atan2(other.x-p.x,other.z-p.z):Math.atan2(-p.x,-p.z);
    let tx=originalX,tz=originalZ,look=d;
    if(r.id==="cat_fish_chase"){
     const theta=(age-1)*Math.PI*4/2.8+dir*(Math.PI+.35);
     tx=r.x+Math.cos(theta)*2.3;tz=r.z+Math.sin(theta)*2.3;
     look=theta+Math.PI/2;
    }else if(other){
     const distance=Math.hypot(originalX-r.x,originalZ-r.z);
     const allowed=Math.min(1.2,Math.max(0,distance-1.05));
     tx=originalX+Math.sin(d)*allowed;tz=originalZ+Math.cos(d)*allowed;
    }
    if(p.react){p.react.x=tx;p.react.z=tz;p.react.w=weight;p.react.look=look;p.react.dance=r.id==="music_dance";}
    else p.react={x:tx,z:tz,w:weight,look,dance:r.id==="music_dance"};
   };
   set(pa,pb,0,r.ax,r.az);if(pb)set(pb,pa,1,r.bx,r.bz);
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
