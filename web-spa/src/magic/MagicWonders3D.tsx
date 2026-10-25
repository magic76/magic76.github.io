import {useMemo,useRef} from "react";
import {useFrame} from "@react-three/fiber";
import type {Group} from "three";
import {safeMagicAnchor,type MagicWonder} from "./world";
import {islandSurfaceHeight} from "./magicNavigation";

/**
 * Renderer-owned magic visual grammar. The LLM chooses *typed parameters*, not
 * Three.js geometry, shaders, code or external assets. Limit to 4 wonders,
 * 16 low-poly fragments per wonder and bounded motion for mobile GPUs.
 */
const COLORS={
 aurora:["#75f8d3","#91aaff","#e6a8ff"],
 ember:["#ffab62","#ef5e81","#ffe9ad"],
 rose:["#f6a9d7","#fdd4e4","#c7a6ff"],
 gold:["#f8d577","#fff3b0","#b7efd9"],
 ocean:["#7adcf3","#9ae9d4","#b2c8ff"]
} as const;
function rand(seed:number,index:number){
 const value=Math.sin(seed*.0097+index*37.719)*43758.5453;
 return value-Math.floor(value);
}
export function MagicWonders3D({wonders,animated}:{wonders:MagicWonder[];animated:boolean}){
 return <group>
  {wonders.map(wonder=><WonderEffect key={wonder.id} wonder={wonder} animated={animated}/>)}
 </group>;
}
function WonderEffect({wonder,animated}:{wonder:MagicWonder;animated:boolean}){
 const root=useRef<Group>(null);
 const colors=COLORS[wonder.palette];
 const anchor=useMemo(()=>safeMagicAnchor(wonder.x,wonder.z),[wonder.x,wonder.z]);
 // Distinct effects have different lowest extents (large orbit rings dip far
 // below their local origins). Scale their clearance with the actual object.
 const liftFactor={vortex:1.05,garden:.55,orbit:1.9,comet:.85,lanterns:.5}[wonder.shape];
 const restingY=islandSurfaceHeight(anchor[0],anchor[1])+wonder.size*liftFactor+.38;
 const particles=useMemo(()=>Array.from({length:14},(_,i)=>({
  a:i*2.399+rand(wonder.seed,i)*.5,
  r:.7+rand(wonder.seed,i+15)*1.5,
  h:rand(wonder.seed,i+30)*2.7,
  size:.15+rand(wonder.seed,i+46)*.23
 })),[wonder.seed]);
 useFrame(({clock})=>{
  if(!root.current||!animated)return;
  const t=clock.elapsedTime+wonder.seed*.013;
  root.current.rotation.y=wonder.motion==="spin"?t*.49:Math.sin(t*.43)*.18;
  const lift=wonder.motion==="rise"?Math.sin(t*.8)*.32:
   wonder.motion==="bloom"?Math.sin(t*1.4)*.18:0;
  root.current.position.y=restingY+lift;
  const pulse= wonder.motion==="bloom"?1+Math.sin(t*1.8)*.12:1;
  root.current.scale.setScalar(wonder.size*pulse);
 });
 return <group position={[anchor[0],0,anchor[1]]}>
  <group ref={root} position={[0,restingY,0]} scale={wonder.size}>
   {wonder.shape==="vortex"&&<group>
    {Array.from({length:5},(_,i)=><mesh key={i} position={[0,i*.43,0]} rotation={[.28,i*.4,.24]}>
     <torusGeometry args={[.62+i*.16,.075,8,28]}/>
     <meshBasicMaterial color={colors[i%3]} transparent opacity={.78} depthWrite={false}/>
    </mesh>)}
    {particles.slice(0,9).map((p,i)=><mesh key={i} position={[Math.cos(p.a)*p.r*.68,p.h,Math.sin(p.a)*p.r*.68]}>
     <octahedronGeometry args={[p.size,0]}/><meshStandardMaterial color={colors[i%3]}
      emissive={colors[i%3]} emissiveIntensity={.55} flatShading/>
    </mesh>)}
   </group>}
   {wonder.shape==="garden"&&<group>
    {particles.map((p,i)=><group key={i} position={[Math.cos(p.a)*p.r*.75,-.25,Math.sin(p.a)*p.r*.75]}>
     <mesh position={[0,.3+p.h*.19,0]}><cylinderGeometry args={[.06,.11,.65+p.h*.4,5]}/>
      <meshStandardMaterial color={colors[(i+1)%3]}/></mesh>
     <mesh position={[0,.7+p.h*.4,0]} rotation={[.14*i,.7*i,.1*i]}>
      <octahedronGeometry args={[.23+p.size*.45,0]}/>
      <meshStandardMaterial color={colors[i%3]} emissive={colors[i%3]} emissiveIntensity={.4}
       transparent opacity={.88} roughness={.23} metalness={.13}/></mesh>
    </group>)}
   </group>}
   {wonder.shape==="orbit"&&<group position={[0,.65,0]}>
    <mesh><icosahedronGeometry args={[.58,1]}/><meshStandardMaterial color={colors[0]}
      emissive={colors[0]} emissiveIntensity={.75} flatShading/></mesh>
    {[1.1,1.52,1.95].map((r,i)=><mesh key={i} rotation={[.45+i*.48,.27*i,.29+i*.35]}>
     <torusGeometry args={[r,.07,8,42]}/>
     <meshBasicMaterial color={colors[(i+1)%3]} transparent opacity={.85} depthWrite={false}/>
    </mesh>)}
    {particles.slice(0,8).map((p,i)=><mesh key={i} position={[Math.cos(p.a)*1.65,
      Math.sin(p.a*.75)*.77,Math.sin(p.a)*1.65]}>
     <sphereGeometry args={[p.size*.52,8,6]}/><meshStandardMaterial color={colors[i%3]}
      emissive={colors[i%3]} emissiveIntensity={.4}/></mesh>)}
   </group>}
   {wonder.shape==="comet"&&<group>
    {particles.map((p,i)=><group key={i}
     position={[Math.cos(p.a)*p.r*.75,p.h*.9+.5,Math.sin(p.a)*p.r*.75]}
     rotation={[.2,0,-.45]}>
      <mesh><sphereGeometry args={[p.size*.65,7,6]}/><meshBasicMaterial color={colors[i%3]}/></mesh>
      <mesh position={[0,-.46,0]}><coneGeometry args={[p.size*.45,.94,6]}/>
       <meshBasicMaterial color={colors[(i+1)%3]} transparent opacity={.55}/></mesh>
     </group>)}
   </group>}
   {wonder.shape==="lanterns"&&<group>
    {particles.map((p,i)=><group key={i} position={[Math.cos(p.a)*p.r*.73,p.h+.25,Math.sin(p.a)*p.r*.73]}>
     <mesh><boxGeometry args={[p.size*1.2,p.size*1.55,p.size*1.2]}/>
      <meshStandardMaterial color={colors[i%3]} emissive={colors[i%3]}
       emissiveIntensity={.8} transparent opacity={.84}/></mesh>
     <mesh position={[0,-p.size*.95,0]}><cylinderGeometry args={[.018,.018,p.size*.46,4]}/>
      <meshBasicMaterial color={colors[(i+1)%3]}/></mesh>
    </group>)}
   </group>}
  </group>
 </group>;
}
