import {useEffect,useMemo,useRef} from "react";
import {useFrame} from "@react-three/fiber";
import {AdditiveBlending,BufferAttribute,BufferGeometry,CanvasTexture,Color,DynamicDrawUsage,Points,PointsMaterial,NormalBlending} from "three";
export const MAGIC_PARTICLE_KINDS=["sparkle","star","heart","bubble","flame","flower","leaf","snow","note","z"] as const;
export type MagicParticleKind=typeof MAGIC_PARTICLE_KINDS[number];
export type MagicParticle={x:number;y:number;z:number;size?:number;alpha?:number};
const emitters=new Map<string,{kind:MagicParticleKind;points:MagicParticle[]}>();
export function publishMagicParticles(id:string,kind:MagicParticleKind,points:MagicParticle[]){emitters.set(id,{kind,points})}
export function removeMagicParticles(id:string){emitters.delete(id)}
function makeTexture(kind:MagicParticleKind){
 const canvas=document.createElement("canvas");canvas.width=64;canvas.height=64;
 const ctx=canvas.getContext("2d")!;ctx.clearRect(0,0,64,64);ctx.fillStyle="#fff";ctx.strokeStyle="#fff";ctx.lineWidth=5;
 ctx.translate(32,32);
 if(kind==="z"){ctx.font="bold 48px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("Z",0,1)}
 else if(kind==="heart"){ctx.beginPath();ctx.moveTo(0,22);ctx.bezierCurveTo(-45,-6,-20,-32,0,-12);ctx.bezierCurveTo(20,-32,45,-6,0,22);ctx.fill()}
 else if(kind==="note"){ctx.font="bold 48px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("♫",0,0)}
 else if(kind==="bubble"){ctx.beginPath();ctx.arc(0,0,23,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(-9,-10,5,0,Math.PI*2);ctx.fill()}
 else if(kind==="star"||kind==="sparkle"||kind==="snow"||kind==="flower"){
  const n=kind==="flower"?5:kind==="snow"?6:4;ctx.beginPath();for(let i=0;i<n*2;i++){const a=i*Math.PI/n-Math.PI/2,r=i%2?kind==="flower"?16:8:26;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath();ctx.fill()}
 else {ctx.beginPath();ctx.ellipse(0,0,kind==="leaf"?17:12,25,kind==="leaf"?-.5:0,0,Math.PI*2);ctx.fill()}
 const t=new CanvasTexture(canvas);t.needsUpdate=true;return t;
}
function Layer({kind}:{kind:MagicParticleKind}){
 const object=useRef<Points>(null);
 const resources=useMemo(()=>{
  const g=new BufferGeometry(),positions=new Float32Array(256*3),colors=new Float32Array(256*3);
  const pos=new BufferAttribute(positions,3).setUsage(DynamicDrawUsage),col=new BufferAttribute(colors,3).setUsage(DynamicDrawUsage);
  g.setAttribute("position",pos);g.setAttribute("color",col);g.setDrawRange(0,0);
  const texture=makeTexture(kind);
  const mat=new PointsMaterial({map:texture,transparent:true,depthWrite:false,vertexColors:true,
   blending:["sparkle","star","flame"].includes(kind)?AdditiveBlending:NormalBlending,size:kind==="bubble"?.31:kind==="z"?.47:.34,sizeAttenuation:true});
  const palette=new Color(kind==="heart"?"#ff9fc7":kind==="bubble"?"#a8e9ff":kind==="z"?"#dce8ff":"#ffe2a4");
  return {g,pos,col,mat,texture,palette};
 },[kind]);
 useEffect(()=>()=>{resources.g.dispose();resources.mat.dispose();resources.texture.dispose()},[resources]);
 useFrame(()=>{
  let count=0;
  const palette=resources.palette;
  for(const entry of emitters.values()){
   if(entry.kind!==kind)continue;
   for(const p of entry.points){if(count===256)break;
    resources.pos.setXYZ(count,p.x,p.y,p.z);resources.col.setXYZ(count,palette.r,palette.g,palette.b);count++}
   if(count===256)break;
  }
  resources.g.setDrawRange(0,count);if(object.current)object.current.visible=count>0;
  if(count){resources.pos.needsUpdate=true;resources.col.needsUpdate=true}
 });
 return <points ref={object} geometry={resources.g} material={resources.mat} visible={false} frustumCulled={false}/>;
}
export function MagicParticleLayers3D(){return <group>{MAGIC_PARTICLE_KINDS.map(k=><Layer key={k} kind={k}/>)}</group>}
