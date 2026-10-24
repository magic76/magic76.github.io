import {useMemo,useState} from "react";
import {Html,useCursor,useGLTF} from "@react-three/drei";
import type {ThreeEvent} from "@react-three/fiber";
import {DoubleSide,Mesh,MeshStandardMaterial,Object3D} from "three";
import {PLACES,type PlaceId} from "./world";

const ASSET="/assets/town/crew-town-art-kit.glb";
const TREES:[number,number,number][]=[
 [-8,-5.7,.95],[-7.2,-6.2,.84],[-8,1.2,.92],[-7.7,4.5,1.03],[-6.2,6.3,1.16],
 [-4.5,7.1,.9],[-.5,7.2,.8],[1.0,6.7,.96],[8.7,-5.9,.9],[7.5,-6.5,.8],
 [2.2,-5.8,.91],[-1.2,-5.8,1.02],[9,2.7,.97],[9.1,6.5,.88],
 [1.25,3.65,.8],[-8.6,-1.1,.8],[-5.9,3.1,.7]
];
const LAMPS:[number,number][]=[[-3,-1.3],[1,-1.9],[2.35,2.2],[-4,5.95],[8,2.65]];
const FLOWERS:[number,number][]=[[-7,-1],[-6.6,.3],[-1.1,-3.2],[1.9,-3.9],[.5,5.6],[7.7,5.9],[8,6.8],[-6.7,5.2]];
function Model({object,position=[0,0,0],scale=1,rotation=0}:{
 object:Object3D;position?:[number,number,number];scale?:number;rotation?:number;
}){
 const clone=useMemo(()=>object.clone(true),[object]);
 return <primitive object={clone} position={position} scale={scale} rotation={[0,rotation,0]} />;
}
function Ground(){
 return <group>
  <mesh position={[0,-.55,.5]} receiveShadow><boxGeometry args={[21.5,.9,16.9]}/><meshStandardMaterial color="#b3b39b" roughness={1}/></mesh>
  <mesh position={[0,-.06,.5]} receiveShadow><boxGeometry args={[21.7,.13,17.1]}/><meshStandardMaterial color="#a3bea0" roughness={1}/></mesh>
  <mesh position={[0,.03,.5]} rotation={[-Math.PI/2,0,0]} receiveShadow>
   <planeGeometry args={[21.2,16.6]}/><meshStandardMaterial color="#a7c49c" roughness={1} side={DoubleSide}/>
  </mesh>
  {/* Broken-up, stone-edged village footpaths. All routes remain outside building footprints. */}
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,.049,.35]}><planeGeometry args={[2.3,13.1]}/><meshStandardMaterial color="#d9d4bd" roughness={1}/></mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,.051,-1.05]}><planeGeometry args={[16.4,1.27]}/><meshStandardMaterial color="#e4ddc8" roughness={1}/></mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[-2,.052,5.85]}><planeGeometry args={[6.9,1.18]}/><meshStandardMaterial color="#dfd5bc" roughness={1}/></mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[4.8,.051,1.95]}><planeGeometry args={[7.3,1.15]}/><meshStandardMaterial color="#dfd5bc" roughness={1}/></mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[5.65,.076,4.78]}>
   <circleGeometry args={[2.48,40]}/><meshStandardMaterial color="#efe1c4" roughness={1}/>
  </mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[5.65,.083,4.78]}>
   <circleGeometry args={[2.29,48]}/><meshStandardMaterial color="#87bbc1" metalness={.08} roughness={.29}/>
  </mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[5.65,.091,4.78]}>
   <ringGeometry args={[1.67,1.70,48]}/><meshBasicMaterial color="#d0e2db" transparent opacity={.62} depthWrite={false}/>
  </mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[5.65,.093,4.78]}>
   <ringGeometry args={[1.01,1.04,48]}/><meshBasicMaterial color="#d0e2db" transparent opacity={.46} depthWrite={false}/>
  </mesh>
 </group>
}
function AmbientDetails({night}: {night:boolean}){
 const pebbles=useMemo(()=>Array.from({length:90},(_,i)=>{
  const x=-9.7+((i*3.73)%19.4),z=-7.3+((i*7.31)%15.0);
  const nearCenter=Math.abs(x)<1.4||Math.abs(z+1)<1;
  return {x,z,scale:.04+(i%4)*.022,hide:nearCenter||((x-5.65)**2+(z-4.78)**2<6.4)};
 }),[]);
 return <group>
  {pebbles.filter(p=>!p.hide).map((p,i)=><mesh key={i} position={[p.x,.065,p.z]} scale={[p.scale,.027,p.scale*1.5]}>
   <dodecahedronGeometry args={[1,0]}/><meshStandardMaterial color={i%3===0?"#f3dfc4":"#e3dec8"}/>
  </mesh>)}
  {night&&LAMPS.map(([x,z],i)=><group key={i}>
   <pointLight position={[x,2.4,z]} color="#ffd0a1" intensity={.54} distance={5.8} decay={2}/>
   <mesh position={[x,.097,z]} rotation={[-Math.PI/2,0,0]}>
    <circleGeometry args={[.83,18]}/>
    <meshBasicMaterial color="#ffe0a5" transparent opacity={.16} depthWrite={false}/>
   </mesh>
  </group>)}
 </group>;
}
export function TownEnvironment({night,zh,selected,onSelect}: {night:boolean;zh:boolean;selected:PlaceId|null;onSelect:(id:PlaceId)=>void}){
 const [hovered,setHovered]=useState<PlaceId|null>(null);
 useCursor(hovered!==null);
 const {scene}=useGLTF(ASSET);
 const roots=useMemo(()=>{
  const ids=["cafe","studio","play","gazebo","tree","bench","lantern","flowers"];
  const map=new Map<string,Object3D>();
  for(const id of ids){const model=scene.getObjectByName(id);if(!model)throw Error("Missing 3D model: "+id);map.set(id,model)}
  return map;
 },[scene]);
 const pick=(id:PlaceId)=>(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();onSelect(id)};
 const hover=(id:PlaceId)=>(event:ThreeEvent<PointerEvent>)=>{event.stopPropagation();setHovered(id)};
 const leave=(id:PlaceId)=>(event:ThreeEvent<PointerEvent>)=>{event.stopPropagation();setHovered(current=>current===id?null:current)};
 return <group>
  <Ground/>
  <group position={[-5,.08,-3]} onClick={pick("cafe")} onPointerOver={hover("cafe")} onPointerOut={leave("cafe")}>
   <Model object={roots.get("cafe")!} scale={1.12}/>
  </group>
  <group position={[4.7,.08,-3]} onClick={pick("studio")} onPointerOver={hover("studio")} onPointerOut={leave("studio")}>
   <Model object={roots.get("studio")!} scale={1.07}/>
  </group>
  <group position={[-2.2,.08,4]} onClick={pick("play")} onPointerOver={hover("play")} onPointerOut={leave("play")}>
   <Model object={roots.get("play")!} scale={1.08}/>
  </group>
  <group position={[8,.08,1.65]} onClick={pick("garden")} onPointerOver={hover("garden")} onPointerOut={leave("garden")}>
   <Model object={roots.get("gazebo")!} scale={.66}/>
  </group>
  {TREES.map(([x,z,scale],i)=><Model key={"tree"+i} object={roots.get("tree")!}
    position={[x,.06,z]} rotation={(i*.75)%6.28} scale={scale}/>)}
  {LAMPS.map(([x,z],i)=><Model key={"lamp"+i} object={roots.get("lantern")!}
    position={[x,.05,z]} scale={.86}/>)}
  {[[-3.2,-.3],[-5.9,.8],[3.25,5.9],[7.9,3.3]].map(([x,z],i)=><Model key={"bench"+i}
    object={roots.get("bench")!} position={[x,.05,z]} rotation={i*.8} scale={1.2}/>)}
  {FLOWERS.map(([x,z],i)=><Model key={"flower"+i} object={roots.get("flowers")!}
    position={[x,.04,z]} scale={.84+(i%3)*.17}/>)}
  {/* Native click targets are invisible but deliberately located above the roofs/lake. */}
  <mesh position={[5.65,.3,4.78]} onClick={pick("garden")}>
    <cylinderGeometry args={[2.22,2.22,.06,40]}/>
    <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
  </mesh>
  {/* A lightweight ground halo makes the active destination discoverable. */}
  {PLACES.filter(place=>place.id===hovered||place.id===selected).map(place=>
   <mesh key={place.id} position={[place.point[0],.12,place.point[2]]} rotation={[-Math.PI/2,0,0]}>
    <ringGeometry args={[1.45,1.67,36]}/>
    <meshBasicMaterial color="#fff9d8" transparent opacity={.86} depthWrite={false}/>
   </mesh>)}
  {/* Floating destination labels follow the buildings in the 3D world. */}
  {PLACES.map(place=><Html key={place.id} position={[place.point[0],3,place.point[2]]}
    center distanceFactor={13} zIndexRange={[3,1]} style={{pointerEvents:"none"}}>
    <span className="crew-town-3d-landmark">
     <span aria-hidden="true">{{cafe:"☕",studio:"✦",play:"◆",garden:"❀"}[place.id]}</span>
     {zh?place.zh:place.en}
    </span>
   </Html>)}
  <AmbientDetails night={night}/>
 </group>
}
useGLTF.preload(ASSET);
