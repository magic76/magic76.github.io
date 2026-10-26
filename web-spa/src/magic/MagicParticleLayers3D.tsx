import {useEffect,useMemo,useRef} from "react";
import {useFrame} from "@react-three/fiber";
import {AdditiveBlending,BufferAttribute,BufferGeometry,CanvasTexture,Color,DynamicDrawUsage,Points,PointsMaterial,NormalBlending} from "three";
export const MAGIC_PARTICLE_KINDS=["sparkle","star","heart","bubble","flame","flower","leaf","snow","note","z","glow","drop","petal","crystal"] as const;
export type MagicParticleKind=typeof MAGIC_PARTICLE_KINDS[number];
export type MagicParticle={x:number;y:number;z:number;size?:number;alpha?:number;color?:number;minPx?:number};
const emitters=new Map<string,{kind:MagicParticleKind;points:MagicParticle[]}>();
export function publishMagicParticles(id:string,kind:MagicParticleKind,points:MagicParticle[]){emitters.set(id,{kind,points})}
export function removeMagicParticles(id:string){emitters.delete(id)}
function makeTexture(kind:MagicParticleKind){
 const canvas=document.createElement("canvas");canvas.width=128;canvas.height=128;
 const ctx=canvas.getContext("2d")!;ctx.clearRect(0,0,128,128);ctx.fillStyle="#fff";ctx.strokeStyle="#fff";ctx.lineWidth=5;
 ctx.translate(64,64);
 if(kind==="glow"){const gradient=ctx.createRadialGradient(0,0,2,0,0,42);gradient.addColorStop(0,"rgba(255,255,255,1)");gradient.addColorStop(.5,"rgba(255,255,255,.7)");gradient.addColorStop(1,"rgba(255,255,255,0)");ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(0,0,42,0,Math.PI*2);ctx.fill()}
 else if(kind==="drop"){ctx.beginPath();ctx.moveTo(0,-31);ctx.bezierCurveTo(-30,5,-25,30,0,32);ctx.bezierCurveTo(25,30,30,5,0,-31);ctx.fill()}
 else if(kind==="petal"){ctx.beginPath();ctx.moveTo(0,30);ctx.bezierCurveTo(-40,-4,-18,-35,0,-31);ctx.bezierCurveTo(22,-32,42,-4,0,30);ctx.fill()}
 else if(kind==="crystal"){ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.lineTo(Math.cos(a)*30,Math.sin(a)*30)}ctx.closePath();ctx.fill()}
 else if(kind==="z"){ctx.font="bold 48px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("Z",0,1)}
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
  const g=new BufferGeometry(),positions=new Float32Array(256*3),colors=new Float32Array(256*3),sizes=new Float32Array(256*2),alphas=new Float32Array(256);
  const pos=new BufferAttribute(positions,3).setUsage(DynamicDrawUsage),col=new BufferAttribute(colors,3).setUsage(DynamicDrawUsage);
  g.setAttribute("position",pos);g.setAttribute("color",col);
  const sz=new BufferAttribute(sizes,2).setUsage(DynamicDrawUsage),al=new BufferAttribute(alphas,1).setUsage(DynamicDrawUsage);
  g.setAttribute("aSize",sz);g.setAttribute("aAlpha",al);g.setDrawRange(0,0);
  const texture=makeTexture(kind);
  const mat=new PointsMaterial({map:texture,transparent:true,depthWrite:false,vertexColors:true,
   blending:["sparkle","star","flame"].includes(kind)?AdditiveBlending:NormalBlending,size:kind==="bubble"?.31:kind==="z"?.47:.34,sizeAttenuation:true});
  mat.onBeforeCompile=shader=>{
   shader.uniforms.uDpr={value:Math.min(1.5,typeof window==="undefined"?1:window.devicePixelRatio||1)};
   shader.vertexShader="attribute vec2 aSize; attribute float aAlpha; varying float vAlpha; uniform float uDpr;\n"+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace("gl_PointSize = size;","gl_PointSize = size;");
   shader.vertexShader=shader.vertexShader.replace("#include <points_vertex>","#include <points_vertex>\n gl_PointSize=max(gl_PointSize*aSize.x,aSize.y*uDpr); vAlpha=aAlpha;");
   shader.fragmentShader="varying float vAlpha;\n"+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace("#include <color_fragment>","#include <color_fragment>\n diffuseColor.a *= vAlpha;");
  };
  const palette=new Color(kind==="heart"?"#ff9fc7":kind==="bubble"?"#a8e9ff":kind==="z"?"#dce8ff":"#ffe2a4");
  return {g,pos,col,sz,al,mat,texture,palette};
 },[kind]);
 useEffect(()=>()=>{resources.g.dispose();resources.mat.dispose();resources.texture.dispose()},[resources]);
 useFrame(()=>{
  let count=0;
  const palette=resources.palette;
  for(const entry of emitters.values()){
   if(entry.kind!==kind)continue;
   for(const p of entry.points){if(count===256)break;
    resources.pos.setXYZ(count,p.x,p.y,p.z);if(p.color!==undefined){palette.setHex(p.color);resources.col.setXYZ(count,palette.r,palette.g,palette.b)}else{palette.setHex(kind==="heart"?0xff9fc7:kind==="bubble"?0xa8e9ff:kind==="z"?0xdce8ff:0xffe2a4);resources.col.setXYZ(count,palette.r,palette.g,palette.b)}
    resources.sz.setXY(count,p.size??1,p.minPx??3);resources.al.setX(count,p.alpha??1);count++}
   if(count===256)break;
  }
  resources.g.setDrawRange(0,count);if(object.current)object.current.visible=count>0;
  if(count){resources.pos.needsUpdate=true;resources.col.needsUpdate=true;resources.sz.needsUpdate=true;resources.al.needsUpdate=true}
 });
 return <points ref={object} geometry={resources.g} material={resources.mat} visible={false} frustumCulled={false}/>;
}
export function MagicParticleLayers3D(){return <group>{MAGIC_PARTICLE_KINDS.map(k=><Layer key={k} kind={k}/>)}</group>}
