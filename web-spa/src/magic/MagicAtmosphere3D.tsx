import {useEffect,useMemo,useRef} from 'react';
import {BackSide,Color,Object3D,ShaderMaterial,type InstancedMesh,type Mesh} from 'three';
import {useFrame} from '@react-three/fiber';
import {MAGIC_NIGHT_SKY} from './magicPalette';
/** Camera-locked unlit gradient, colorspace-correct; no ACES washout. */
export function MagicAtmosphere3D({sky,night}:{sky:string;night:boolean}){
 const dome=useRef<Mesh>(null);
 useFrame(({camera})=>{if(dome.current)dome.current.position.copy(camera.position)});
 const shader=useMemo(()=>new ShaderMaterial({
  uniforms:{topColor:{value:new Color()},horizonColor:{value:new Color()},bottomColor:{value:new Color()}},
  vertexShader:`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform vec3 topColor;uniform vec3 horizonColor;uniform vec3 bottomColor;varying vec3 vDir;void main(){float y=normalize(vDir).y;vec3 col=mix(bottomColor,horizonColor,smoothstep(-.75,-.22,y));col=mix(col,topColor,smoothstep(-.22,.25,y));gl_FragColor=vec4(col,1.);
#include <colorspace_fragment>
}`, 
  side:BackSide,depthWrite:false,toneMapped:false,
 }),[]);
 useEffect(()=>{
  shader.uniforms.topColor.value.set(night?'#535E9A':sky);
  shader.uniforms.horizonColor.value.set(night?'#374774':'#E1DEE9');
  shader.uniforms.bottomColor.value.set(night?MAGIC_NIGHT_SKY:'#F5E9D7');
 },[shader,sky,night]);
 useEffect(()=>()=>shader.dispose(),[shader]);
 return <>
  <color attach="background" args={[night?MAGIC_NIGHT_SKY:sky]}/>
  <fog attach="fog" args={[night?'#374774':'#D7DDE4',90,155]}/>
  <mesh ref={dome} material={shader} renderOrder={-100} frustumCulled={false}>
   <sphereGeometry args={[170,16,8]}/>
  </mesh>
  <MagicClouds3D night={night}/>
 </>;
}
function MagicClouds3D({night}:{night:boolean}){
 const mesh=useRef<InstancedMesh>(null);
 useEffect(()=>{
  if(!mesh.current)return;const o=new Object3D();
  const clouds=[[-27,-4,-32,7],[-15,-9,-39,9],[21,-5,-32,8],[35,-12,-12,7],[-38,-11,9,8],[3,-14,-41,11],[33,-14,19,8]];
  clouds.forEach(([x,y,z,r],i)=>{
   o.position.set(x,y,z);o.rotation.set(0,i*.6,0);o.scale.set(r,1.1+(i%3)*.35,r*.43);
   o.updateMatrix();mesh.current!.setMatrixAt(i,o.matrix);
  });mesh.current.instanceMatrix.needsUpdate=true;
 },[]);
 return <instancedMesh ref={mesh} args={[undefined,undefined,7]} frustumCulled={false}>
  <icosahedronGeometry args={[1,1]}/>
  <meshBasicMaterial color={night?'#8B92BB':'#FFF8ED'} transparent opacity={night?.3:.58} depthWrite={false} fog={false} toneMapped={false}/>
 </instancedMesh>;
}
