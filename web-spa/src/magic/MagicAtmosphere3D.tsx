import {useEffect,useMemo,useRef} from 'react';
import {BackSide,BufferAttribute,BufferGeometry,Color,Group,Object3D,SphereGeometry,type InstancedMesh} from 'three';
import {useFrame} from '@react-three/fiber';
import {MAGIC_NIGHT_SKY} from './magicPalette';
const ss=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
/** Camera-centered gradient baked into vertex colours: one cheap unlit pass, no per-pixel math. */
export function MagicAtmosphere3D({sky,night}:{sky:string;night:boolean}){
 const dome=useRef<Group>(null);
 useFrame(({camera})=>{if(dome.current)dome.current.position.copy(camera.position);});
 const geometry=useMemo(()=>new SphereGeometry(170,20,28),[]);
 useEffect(()=>{
  const top=new Color(night?'#626BA5':sky),horizon=new Color(night?'#3F5082':'#DDE1EC'),bottom=new Color(night?MAGIC_NIGHT_SKY:'#F7EADA');
  const pos=geometry.attributes.position,colors=new Float32Array(pos.count*3),c=new Color();
  for(let i=0;i<pos.count;i++){
   const y=pos.getY(i)/170;
   c.copy(bottom).lerp(horizon,ss(-.95,-.62,y)).lerp(top,ss(-.62,-.12,y));
   colors.set([c.r,c.g,c.b],i*3);
  }
  geometry.setAttribute('color',new BufferAttribute(colors,3));
 },[geometry,sky,night]);
 const stars=useMemo(()=>{
  const g=new BufferGeometry(),p:number[]=[];let seed=7;
  const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  for(let i=0;i<320;i++){const y=-.78+rnd()*1.3,a=rnd()*Math.PI*2,r=Math.sqrt(1-y*y);p.push(Math.cos(a)*r*160,y*160,Math.sin(a)*r*160);}
  g.setAttribute('position',new BufferAttribute(new Float32Array(p),3));return g;
 },[]);
 useEffect(()=>()=>{geometry.dispose();stars.dispose();},[geometry,stars]);
 return <>
  <color attach="background" args={[night?MAGIC_NIGHT_SKY:sky]}/>
  <fog attach="fog" args={[night?'#40517F':'#BFCFE3',100,160]}/>
  <group ref={dome}>
   <mesh geometry={geometry} renderOrder={-100} frustumCulled={false}><meshBasicMaterial vertexColors side={BackSide} depthWrite={false} fog={false} toneMapped={false}/></mesh>
   {night&&<points geometry={stars} renderOrder={-99} frustumCulled={false}><pointsMaterial color="#F2E6D0" size={2.2} sizeAttenuation={false} transparent opacity={.85} depthWrite={false} fog={false} toneMapped={false}/></points>}
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
