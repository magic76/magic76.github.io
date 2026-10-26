import {useMemo} from "react";
import {BackSide,Color,DoubleSide,Object3D,ShaderMaterial, type Mesh} from "three";
import type {InstancedMesh} from "three";
import {useEffect,useRef} from "react";
import {useFrame} from "@react-three/fiber";
import {MAGIC_NIGHT_SKY} from "./magicPalette";

/** One unlit gradient-sky draw call; no HDR download or postprocessing. */
export function MagicAtmosphere3D({sky,night}:{sky:string;night:boolean}){
 const dome=useRef<Mesh>(null);
 useFrame(({camera})=>{if(dome.current)dome.current.position.copy(camera.position)});
 const shader=useMemo(()=>new ShaderMaterial({
  uniforms:{topColor:{value:new Color()},horizonColor:{value:new Color()},bottomColor:{value:new Color()}},
  vertexShader:`varying vec3 vDir; void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform vec3 topColor;uniform vec3 horizonColor;uniform vec3 bottomColor;varying vec3 vDir;void main(){float y=normalize(vDir).y;vec3 col=mix(bottomColor,horizonColor,smoothstep(-.38,.03,y));col=mix(col,topColor,smoothstep(.03,.92,y));gl_FragColor=vec4(col,1.);}`,
  side:BackSide,depthWrite:false,
 }),[]);
 useEffect(()=>{
  shader.uniforms.topColor.value.set(night?MAGIC_NIGHT_SKY:sky).multiplyScalar(night?.83:.87);
  shader.uniforms.horizonColor.value.set(night?"#50658A":"#E9E5D2");
  shader.uniforms.bottomColor.value.set(night?"#1B2B47":"#A6C5CF");
 },[shader,sky,night]);
 useEffect(()=>()=>shader.dispose(),[shader]);
 return <>
  <color attach="background" args={[night?MAGIC_NIGHT_SKY:sky]}/>
  <fog attach="fog" args={[night?"#50658A":"#C7DCD6",75,145]}/>
  <mesh ref={dome} material={shader} renderOrder={-100} frustumCulled={false}>
   <sphereGeometry args={[160,24,12]}/>
  </mesh>
  <MagicClouds3D night={night}/>
 </>;
}

function MagicClouds3D({night}:{night:boolean}){
 const mesh=useRef<InstancedMesh>(null);
 useEffect(()=>{
  if(!mesh.current)return;
  const tmp=new Object3D();
  for(let i=0;i<6;i++){
   const a=i*Math.PI*2/6+.3;
   tmp.position.set(Math.sin(a)*66,17+i%3*3,Math.cos(a)*66);
   tmp.scale.set(5+(i%3)*1.5,1.1+(i%2)*.4,2.1);
   tmp.rotation.set(0,a,0);tmp.updateMatrix();mesh.current.setMatrixAt(i,tmp.matrix);
  }
  mesh.current.instanceMatrix.needsUpdate=true;
 },[]);
 return <instancedMesh ref={mesh} args={[undefined,undefined,6]} frustumCulled={false}>
  <icosahedronGeometry args={[1,1]}/>
  <meshBasicMaterial color={night?"#7080A2":"#FFFFFF"} transparent opacity={night?.19:.48} depthWrite={false} side={DoubleSide} fog={false}/>
 </instancedMesh>;
}
