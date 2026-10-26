import {useEffect,useMemo,useRef} from 'react';
import {BackSide,Color,Group,Object3D,ShaderMaterial,type InstancedMesh} from 'three';
import {useFrame} from '@react-three/fiber';
import {MAGIC_NIGHT_SKY} from './magicPalette';
/** Camera-centered unlit gradient in linear space, converted to display space once. */
export function MagicAtmosphere3D({sky,night}:{sky:string;night:boolean}){
 const dome=useRef<Group>(null);
 useFrame(({camera})=>{if(dome.current)dome.current.position.copy(camera.position);});
 const shader=useMemo(()=>new ShaderMaterial({
  uniforms:{topColor:{value:new Color()},horizonColor:{value:new Color()},bottomColor:{value:new Color()},uNight:{value:0}},
  vertexShader:`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform vec3 topColor;uniform vec3 horizonColor;uniform vec3 bottomColor;uniform float uNight;varying vec3 vDir;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  void main(){vec3 d=normalize(vDir);float y=d.y;
   vec3 c=mix(bottomColor,horizonColor,smoothstep(-.95,-.62,y));
   c=mix(c,topColor,smoothstep(-.62,-.12,y));
   if(uNight>.5 && y>-.35){
    vec2 g=vec2(atan(d.z,d.x),asin(d.y))*110.,cell=floor(g);
    vec2 o=fract(g)-.5-(vec2(hash(cell+3.),hash(cell+5.))-.5)*.6;
    float star=step(.986,hash(cell))*smoothstep(.16,.04,length(o));
    float twinkle=.45+.55*hash(cell+7.);
    c=mix(c,vec3(.95,.90,.82),star*twinkle*.78);
   }
   gl_FragColor=vec4(c,1.);
   #include <colorspace_fragment>
  }`,side:BackSide,depthWrite:false,toneMapped:false,
 }),[]);
 useEffect(()=>{
  shader.uniforms.topColor.value.set(night?'#626BA5':sky);
  shader.uniforms.horizonColor.value.set(night?'#3F5082':'#DDE1EC');
  shader.uniforms.bottomColor.value.set(night?MAGIC_NIGHT_SKY:'#F7EADA');
  shader.uniforms.uNight.value=night?1:0;
 },[shader,sky,night]);
 useEffect(()=>()=>shader.dispose(),[shader]);
 return <>
  <color attach="background" args={[night?MAGIC_NIGHT_SKY:sky]}/>
  <fog attach="fog" args={[night?'#40517F':'#BFCFE3',100,160]}/>
  <group ref={dome}>
   <mesh material={shader} renderOrder={-100} frustumCulled={false}><sphereGeometry args={[170,16,8]}/></mesh>
  </group>
  <MagicClouds3D night={night}/>
 </>;
}
function MagicClouds3D({night}:{night:boolean}){
 const mesh=useRef<InstancedMesh>(null);
 const clouds=[[-27,-4,-32,5.5],[-15,-9,-39,6.5],[21,-5,-32,5.8],[35,-12,-12,5.4],[-38,-11,9,5.9],[3,-14,-41,7.8],[33,-14,19,5.5]];
 const count=clouds.length*3;
 useEffect(()=>{
  const inst=mesh.current;if(!inst)return;
  const o=new Object3D(),col=new Color();let index=0;
  clouds.forEach(([x,y,z,r],i)=>{
   for(let j=0;j<3;j++){
    const dx=(j-1)*r*.56,dz=(j%2===0?-.15:.16)*r;
    o.position.set(x+dx,y+(j===1?r*.15:0),z+dz);
    o.rotation.set(0,i*.28+j*.1,0);
    o.scale.set(r*(j===1?.77:.65),r*(j===1?.43:.32),r*(j===1?.61:.52));
    o.updateMatrix();inst.setMatrixAt(index,o.matrix);
    col.set(night?'#727DA9':j===1?'#FFF8EE':'#E8E4F0');inst.setColorAt(index,col);index++;
   }
  });inst.instanceMatrix.needsUpdate=true;if(inst.instanceColor)inst.instanceColor.needsUpdate=true;
 },[night]);
 return <instancedMesh ref={mesh} args={[undefined,undefined,count]} frustumCulled={false}>
  <icosahedronGeometry args={[1,1]}/>
  <meshBasicMaterial color="#FFFFFF" transparent opacity={night?.35:.8} depthWrite={false} fog={false} toneMapped={false}/>
 </instancedMesh>;
}
