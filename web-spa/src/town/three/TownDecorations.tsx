import {useRef} from "react";
import {Html} from "@react-three/drei";
import {useFrame} from "@react-three/fiber";
import {Group} from "three";

type Props={night:boolean;reducedMotion:boolean};
const BUNTING=["#ebaa9a","#ffdfa3","#9ec5b2","#a6becf","#eeb8a8","#e0d4a0","#a5c7b0"];
/** All props are native primitives and local geometry: no new image or font requests. */
function TownWelcomeGate(){
 return <group position={[0,0,-3.85]}>
  {[-1.58,1.58].map((x,i)=><group key={i} position={[x,0,0]}>
   <mesh position={[0,1.24,0]}><cylinderGeometry args={[.12,.17,2.48,8]}/><meshStandardMaterial color="#fff4d9" roughness={.88}/></mesh>
   <mesh position={[0,2.42,0]}><sphereGeometry args={[.21,12,9]}/><meshStandardMaterial color="#f2ba9b"/></mesh>
   <mesh position={[0,.1,0]}><cylinderGeometry args={[.28,.3,.2,10]}/><meshStandardMaterial color="#739887"/></mesh>
  </group>)}
  <mesh position={[0,2.52,0]}><boxGeometry args={[3.25,.31,.24]}/><meshStandardMaterial color="#7a9a88" roughness={1}/></mesh>
  {BUNTING.map((color,i)=><mesh key={i} position={[-1.25+i*.415,2.22,.16]} rotation={[0,0,Math.PI]}>
   <coneGeometry args={[.19,.35,3]}/><meshStandardMaterial color={color} roughness={.9} side={2}/>
  </mesh>)}
  <Html position={[0,2.85,.23]} center distanceFactor={10} zIndexRange={[3,1]} style={{pointerEvents:"none"}}>
   <span className="crew-town-3d-world-sign">CREW TOWN</span>
  </Html>
 </group>;
}
function CafeTerrace(){
 return <group>
  {([[-7.05,.15],[-6.95,1.85]] as const).map(([x,z],i)=><group key={i} position={[x,0,z]}>
   <mesh position={[0,.46,0]}><cylinderGeometry args={[.06,.1,.84,9]}/><meshStandardMaterial color="#dfba8d"/></mesh>
   <mesh position={[0,.84,0]}><cylinderGeometry args={[.47,.47,.09,14]}/><meshStandardMaterial color="#fff1d7"/></mesh>
   <mesh position={[0,1.48,0]}><cylinderGeometry args={[.035,.035,1.3,8]}/><meshStandardMaterial color="#eee2cb"/></mesh>
   <mesh position={[0,2.14,0]}><coneGeometry args={[.94,.49,12]}/><meshStandardMaterial color={i?"#d5a9a7":"#a1c2b2"} flatShading/></mesh>
   {[-.74,.74].map((offset,k)=><group key={k} position={[offset,0,.04]}>
    <mesh position={[0,.4,0]}><boxGeometry args={[.37,.12,.4]}/><meshStandardMaterial color="#bd987e"/></mesh>
    <mesh position={[0,.62,-.16]}><boxGeometry args={[.38,.55,.10]}/><meshStandardMaterial color="#dfc5a2"/></mesh>
    <mesh position={[0,.19,0]}><cylinderGeometry args={[.035,.035,.36,6]}/><meshStandardMaterial color="#997d6a"/></mesh>
   </group>)}
  </group>)}
 </group>;
}
const BLOOMS:[number,number,string][]=[
 [-8.5,-3.6,"#edb4aa"],[-8.2,3.8,"#f4d894"],[-6.4,4.65,"#d6a9c7"],
 [-4.4,3.35,"#e8c89d"],[-2.6,-4.8,"#edb4aa"],[2.35,-4.65,"#f2cf9f"],
 [3.55,2.7,"#d6a9c7"],[7.45,7.1,"#e5a2a1"],[8.85,-1.6,"#f4d894"],
 [8.0,-4.3,"#a1c9be"],[-6.95,-3.7,"#a1c9be"],[1.8,6.2,"#edb4aa"]
];
function BloomGarden(){
 return <group>
  {BLOOMS.map(([x,z,color],i)=><group key={i} position={[x,0,z]}>
   <mesh position={[0,.22,0]}><cylinderGeometry args={[.29,.22,.36,9]}/><meshStandardMaterial color="#cda58d" roughness={.95}/></mesh>
   <mesh position={[0,.48,0]}><sphereGeometry args={[.37,8,7]}/><meshStandardMaterial color="#76a78e" flatShading/></mesh>
   {[-1,0,1].map((n)=><mesh key={n} position={[n*.21,.67+(n===0?.08:0),n===0?-.03:.1]}>
    <sphereGeometry args={[.16,9,7]}/><meshStandardMaterial color={color} roughness={1}/>
   </mesh>)}
  </group>)}
 </group>;
}
function PondLife(){
 return <group>
  {([[4.8,4.02,.22],[5.95,4.05,.28],[5.1,5.55,.19],[6.6,5.5,.25]] as const).map(([x,z,r],i)=>
   <group key={i} position={[x,.116,z]}>
    <mesh rotation={[-Math.PI/2,0,.3+i*.5]}>
     <circleGeometry args={[r,14]}/><meshStandardMaterial color={i%2?"#649f89":"#7caf96"} side={2}/>
    </mesh>
    {i!==2&&<mesh position={[.055,.09,.035]}><sphereGeometry args={[.09,8,6]}/><meshStandardMaterial color={i%2?"#fff0cf":"#f3bdc1"}/></mesh>}
   </group>)}
 </group>;
}
function Butterfly({x,z,color,index,reducedMotion}:{x:number;z:number;color:string;index:number;reducedMotion:boolean}){
 const ref=useRef<Group>(null);
 useFrame(({clock},dt)=>{
  const group=ref.current;
  if(!group||document.hidden||reducedMotion)return;
  const t=clock.elapsedTime*.75+index*2.4;
  group.position.set(x+Math.sin(t)*.55,1.43+Math.sin(t*2.1)*.21,z+Math.cos(t*1.25)*.47);
  group.rotation.y=t*.7;
  group.rotation.z=Math.sin(t*5)*.11;
 });
 return <group ref={ref} position={[x,1.43,z]}>
  <mesh><capsuleGeometry args={[.032,.17,3,6]}/><meshStandardMaterial color="#735b59"/></mesh>
  {[-1,1].map(side=><group key={side} position={[side*.12,.06,0]} rotation={[0,0,side*.45]}>
   <mesh scale={[1,.75,.25]}><sphereGeometry args={[.19,10,7]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.08} side={2}/></mesh>
  </group>)}
 </group>;
}
export function TownDecorations({night,reducedMotion}:Props){
 return <group>
  <TownWelcomeGate/>
  <CafeTerrace/>
  <BloomGarden/>
  <PondLife/>
  {!night&&<group>
   <Butterfly x={-6.5} z={2.65} color="#f6c4b0" index={0} reducedMotion={reducedMotion}/>
   <Butterfly x={2.75} z={3.65} color="#c8c4ed" index={1} reducedMotion={reducedMotion}/>
   <Butterfly x={7.35} z={5.6} color="#f5dc94" index={2} reducedMotion={reducedMotion}/>
  </group>}
 </group>;
}
