import {useEffect,useMemo,useRef} from "react";
import {Canvas,useFrame,useThree, type ThreeEvent} from "@react-three/fiber";
import {OrbitControls} from "@react-three/drei";
import {Color,Group,MathUtils} from "three";
import type {MagicObjectKind,MagicSpell,MagicWorld} from "./world";

// The renderer receives only the strictly validated world reducer output.
// Gemini never passes raw markup, geometry, scripts, material properties or URLs.
type Props={world:MagicWorld;reducedMotion:boolean;onInteract:(kind:MagicObjectKind)=>void;onFailure:()=>void};
const PLOTS:[[number,number],[number,number],[number,number],[number,number],[number,number],[number,number]]=[
 [-3.25,-.5],[3.15,-.7],[-2.7,2.65],[2.7,2.55],[-4,.8],[3.95,.95]
];
const BIOMES={
 sky:{ground:"#a5d59f",side:"#797eac",roof:"#866fae",tree:"#70b19d",detail:"#e0dbb6",sky:"#a7d0ee"},
 forest:{ground:"#72b285",side:"#526e78",roof:"#d3a568",tree:"#3c916b",detail:"#cce1a4",sky:"#9ec5a6"},
 candy:{ground:"#efbbcc",side:"#a78db2",roof:"#f199b3",tree:"#e990b9",detail:"#fff0c1",sky:"#eec7e9"}
} as const;

function FloatingIsland({colors}:{colors:(typeof BIOMES)[keyof typeof BIOMES]}){
 const rocks=useMemo(()=>Array.from({length:18},(_,i)=>({
  x:Math.cos(i*2.4)*3.2,z:Math.sin(i*2.4)*2.7,s:.56+(i%4)*.18,y:-.85-(i%3)*.2
 })),[]);
 return <group>
  <mesh position={[0,-.08,0]} scale={[1,.38,1]}>
   <icosahedronGeometry args={[5.65,1]}/><meshStandardMaterial color={colors.side} flatShading roughness={1}/>
  </mesh>
  <mesh position={[0,.55,0]} scale={[1,.18,.84]}>
   <sphereGeometry args={[5.65,28,12]}/><meshStandardMaterial color={colors.ground} roughness={1}/>
  </mesh>
  <mesh position={[0,.66,1.15]} rotation={[-Math.PI/2,0,0]}>
   <torusGeometry args={[2.2,.11,6,60,Math.PI]}/><meshStandardMaterial color={colors.detail} roughness={.8}/>
  </mesh>
  {rocks.map((rock,i)=><mesh key={i} position={[rock.x,rock.y,rock.z]} rotation={[i*.2,i*.4,i*.12]} scale={[rock.s,rock.s*1.5,rock.s]}>
   <dodecahedronGeometry args={[1,0]}/><meshStandardMaterial color={i%3===0?"#aaa2a5":colors.side} flatShading roughness={1}/>
  </mesh>)}
 </group>;
}
function Castle({colors,night}:{colors:(typeof BIOMES)[keyof typeof BIOMES];night:boolean}){
 return <group position={[0,1.35,-.55]}>
  <mesh position={[0,.8,0]}><boxGeometry args={[2.5,1.8,1.55]}/><meshStandardMaterial color="#f4e9db" roughness={.9}/></mesh>
  <mesh position={[0,1.8,0]}><coneGeometry args={[1.85,.95,4]}/><meshStandardMaterial color={colors.roof} flatShading/></mesh>
  <mesh position={[0,.35,.81]}><boxGeometry args={[.66,1,.12]}/><meshStandardMaterial color="#665a74"/></mesh>
  <mesh position={[0,.54,.88]}><sphereGeometry args={[.09,8,8]}/><meshStandardMaterial color="#ffdc8a" emissive="#ffb85a" emissiveIntensity={night?.9:.15}/></mesh>
  {[-1.12,1.12].map((x,i)=><group key={i} position={[x,0,.25]}>
   <mesh position={[0,1.06,0]}><cylinderGeometry args={[.51,.57,2.7,8]}/><meshStandardMaterial color="#eae0d8" flatShading/></mesh>
   <mesh position={[0,2.67,0]}><coneGeometry args={[.77,1.25,8]}/><meshStandardMaterial color={colors.roof} flatShading/></mesh>
   <mesh position={[0,1.38,.56]}><sphereGeometry args={[.19,8,8]}/><meshStandardMaterial color="#fff6bb" emissive="#ffdb9a" emissiveIntensity={night?1.2:.24}/></mesh>
   <mesh position={[0,3.4,0]}><sphereGeometry args={[.12,8,8]}/><meshStandardMaterial color="#ffdc98" emissive="#ffc871" emissiveIntensity={night?1.4:.35}/></mesh>
  </group>)}
  <mesh position={[0,2.4,-.8]}><cylinderGeometry args={[.38,.45,2.4,8]}/><meshStandardMaterial color="#e9dbd1"/></mesh>
  <mesh position={[0,3.95,-.8]}><coneGeometry args={[.61,1.1,8]}/><meshStandardMaterial color={colors.roof}/></mesh>
 </group>;
}
function MagicTree({x,z,colors,variant=0}:{x:number;z:number;colors:(typeof BIOMES)[keyof typeof BIOMES];variant?:number}){
 return <group position={[x,.99,z]} scale={.73+(variant%3)*.13}>
  <mesh position={[0,.47,0]}><cylinderGeometry args={[.13,.21,1.1,7]}/><meshStandardMaterial color="#96745f"/></mesh>
  {variant%2===0?<mesh position={[0,1.44,0]}><coneGeometry args={[.82,1.8,7]}/><meshStandardMaterial color={colors.tree} flatShading roughness={1}/></mesh>
   :<mesh position={[0,1.58,0]} scale={[.88,.91,.88]}><icosahedronGeometry args={[1,0]}/><meshStandardMaterial color={colors.tree} flatShading roughness={1}/></mesh>}
 </group>;
}
function Dragon({animated}:{animated:boolean}){
 const wings=useRef<Group>(null),root=useRef<Group>(null);
 useFrame(({clock})=>{
  if(!animated)return;
  if(root.current)root.current.position.y=Math.sin(clock.elapsedTime*2)*.18;
  if(wings.current)wings.current.rotation.z=Math.sin(clock.elapsedTime*5)*.34;
 });
 return <group ref={root} scale={.84}>
  <mesh position={[0,.65,0]} scale={[.78,.55,.9]}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color="#df8069"/></mesh>
  <mesh position={[0,1.26,.5]} rotation={[.35,0,0]}><coneGeometry args={[.44,1.12,7]}/><meshStandardMaterial color="#d56e66"/></mesh>
  <mesh position={[0,1.83,.78]}><sphereGeometry args={[.37,10,8]}/><meshStandardMaterial color="#ed987b"/></mesh>
  <group ref={wings}>{[-1,1].map(sign=><mesh key={sign} position={[sign*.74,1.09,-.08]} rotation={[0,0,sign*.72]}>
   <coneGeometry args={[.73,1.7,3]}/><meshStandardMaterial color="#e8b077" side={2} flatShading/>
  </mesh>)}</group>
  {[-1,1].map(sign=><mesh key={sign} position={[sign*.22,2.2,.8]} rotation={[0,0,sign*.3]}>
   <coneGeometry args={[.13,.54,7]}/><meshStandardMaterial color="#f9deac"/>
  </mesh>)}
 </group>;
}
function SceneObject({kind,position,animated,onClick}:{kind:MagicObjectKind;position:[number,number,number];animated:boolean;onClick:(event:ThreeEvent<MouseEvent>)=>void}){
 const bob=useRef<Group>(null);
 useFrame(({clock})=>{if(animated&&bob.current&&kind!=="dragon")bob.current.position.y=Math.sin(clock.elapsedTime*1.6+position[0])*.13});
 return <group position={position} onClick={onClick}>
  <group ref={bob}>
   {kind==="dragon"?<Dragon animated={animated}/>:null}
   {kind==="portal"?<group>
    <mesh position={[0,.91,0]} rotation={[0,0,.08]}><torusGeometry args={[.87,.22,10,24]}/><meshStandardMaterial color="#ae7dd5" emissive="#8d62d1" emissiveIntensity={.6}/></mesh>
    <mesh position={[0,.91,0]}><circleGeometry args={[.73,24]}/><meshBasicMaterial color="#79c7e1" transparent opacity={.56} side={2}/></mesh>
   </group>:null}
   {kind==="chest"?<group>
    <mesh position={[0,.45,0]}><boxGeometry args={[1.12,.69,.76]}/><meshStandardMaterial color="#906342"/></mesh>
    <mesh position={[0,.87,0]}><boxGeometry args={[1.2,.22,.81]}/><meshStandardMaterial color="#e8be69"/></mesh>
    <mesh position={[0,.5,.4]}><boxGeometry args={[.16,.3,.05]}/><meshStandardMaterial color="#f8df83"/></mesh>
   </group>:null}
   {kind==="crystal"?<mesh position={[0,.85,0]} rotation={[.17,.4,.17]}>
    <octahedronGeometry args={[.83,0]}/><meshStandardMaterial color="#99d6e7" emissive="#5c9ac2" emissiveIntensity={.45} flatShading/>
   </mesh>:null}
   {kind==="owl"?<group>
    <mesh position={[0,.83,0]} scale={[.58,.66,.47]}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color="#b79879"/></mesh>
    {[-1,1].map(sign=><group key={sign}>
     <mesh position={[sign*.23,1.04,.43]}><sphereGeometry args={[.16,10,8]}/><meshStandardMaterial color="#fff9df"/></mesh>
     <mesh position={[sign*.23,1.04,.57]}><sphereGeometry args={[.073,8,8]}/><meshStandardMaterial color="#32343d"/></mesh>
    </group>)}
    <mesh position={[0,.85,.51]} rotation={[Math.PI/2,0,0]}><coneGeometry args={[.12,.25,4]}/><meshStandardMaterial color="#ebbe73"/></mesh>
   </group>:null}
   {kind==="tree"?<group><mesh position={[0,.55,0]}><cylinderGeometry args={[.18,.25,1,8]}/><meshStandardMaterial color="#9e806e"/></mesh><mesh position={[0,1.65,0]}><icosahedronGeometry args={[1.1,0]}/><meshStandardMaterial color="#85c4a5" flatShading/></mesh></group>:null}
  </group>
 </group>;
}
function SceneParticles({weather,effect,revision,animated}:{weather:MagicWorld["weather"];effect:MagicSpell|null;revision:number;animated:boolean}){
 const group=useRef<Group>(null);
 const particles=useMemo(()=>Array.from({length:28},(_,i)=>({
  x:Math.sin(i*17.17)*6,z:Math.cos(i*9.3)*4.5,y:1.7+(i%7)*.8
 })),[]);
 useFrame(({clock})=>{
  if(group.current&&animated)group.current.position.y=-(clock.elapsedTime*.5)%2;
 });
 return <group>
  {weather==="rain"||weather==="snow"?<group ref={group}>
   {particles.map((p,i)=><mesh key={i} position={[p.x,p.y,p.z]} rotation={weather==="rain"?[0,0,-.14]:[0,0,0]}>
    {weather==="snow"?<sphereGeometry args={[.065,5,4]}/>:<cylinderGeometry args={[.015,.015,.4,4]}/>}
    <meshBasicMaterial color={weather==="snow"?"#ffffff":"#98c8e7"} transparent opacity={.85}/>
   </mesh>)}
  </group>:null}
  {effect?<group key={revision} position={[0,3.55,.6]}>
   {Array.from({length:12},(_,i)=><mesh key={i} position={[Math.cos(i*2.4)*2.15,Math.sin(i*1.8)*.9,Math.sin(i*2.4)*2.2]}>
    <octahedronGeometry args={[.16+(i%3)*.09,0]}/>
    <meshBasicMaterial color={effect==="fire"?"#ff9b66":effect==="heal"?"#a4f4ac":effect==="wind"?"#b8edee":"#f9e4ad"}/>
   </mesh>)}
  </group>:null}
 </group>;
}
function SceneContent({world,reducedMotion,onInteract,onFailure}:Props){
 const colors=BIOMES[world.theme],night=world.time==="night";
 const {gl,invalidate}=useThree();
 useEffect(()=>{
  const lose=(ev:Event)=>{ev.preventDefault();onFailure()};
  gl.domElement.addEventListener("webglcontextlost",lose);
  return()=>gl.domElement.removeEventListener("webglcontextlost",lose);
 },[gl,onFailure]);
 useEffect(()=>invalidate(),[world.revision,world.weather,world.time,reducedMotion,invalidate]);
 const trees=useMemo(()=>Array.from({length:17},(_,i)=>{
  const angle=i*2.399,rad=3.6+(i%3)*.38;
  return [Math.cos(angle)*rad,Math.sin(angle)*rad] as const;
 }),[]);
 return <>
  <color attach="background" args={[colors.sky]}/>
  <fog attach="fog" args={[colors.sky,22,35]}/>
  <hemisphereLight args={[night?"#6c85be":"#fff4df",night?"#52636b":"#8da5a3",night?.8:2.1]}/>
  <ambientLight intensity={night?.55:.8}/>
  <directionalLight position={[-5,9,7]} intensity={night?1.2:2} color={night?"#c2cbed":"#fff6e6"}/>
  <pointLight position={[0,4,0]} intensity={night?2.3:.8} color="#e6cbff" distance={10}/>
  <FloatingIsland colors={colors}/>
  <Castle colors={colors} night={night}/>
  {trees.map(([x,z],i)=><MagicTree key={i} x={x} z={z} variant={i} colors={colors}/>)}
  {world.objects.map(obj=>{
   const plot=PLOTS[obj.slot]??PLOTS[0];
   return <SceneObject key={obj.id} kind={obj.kind} position={[plot[0],.98,plot[1]]} animated={!reducedMotion}
    onClick={ev=>{ev.stopPropagation();onInteract(obj.kind)}}/>;
  })}
  <SceneParticles weather={world.weather} effect={world.effect} revision={world.revision} animated={!reducedMotion}/>
  <OrbitControls makeDefault enablePan={false} enableDamping={!reducedMotion} minDistance={9} maxDistance={21}
   minPolarAngle={Math.PI*.18} maxPolarAngle={Math.PI*.46} target={[0,1.05,0]}/>
 </>;
}
export function MagicScene3D(props:Props){
 const night=props.world.time==="night";
 return <Canvas className="magic-three-canvas" aria-label="3D magic world" role="img"
   camera={{position:[8.5,8.5,11.7],fov:42,near:.1,far:60}}
   dpr={[1,Math.min(1.5,typeof window!=="undefined"?window.devicePixelRatio:1.5)]}
   gl={{antialias:true,alpha:false,powerPreference:"low-power",stencil:false}}
   frameloop={props.reducedMotion?"demand":"always"}
   fallback={<span>3D unavailable</span>}
   onCreated={({gl})=>gl.setClearColor(new Color(night?"#243658":"#b6d9e6"))}>
  <SceneContent {...props}/>
 </Canvas>;
}
