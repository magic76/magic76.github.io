import {Html} from "@react-three/drei";
import {DISTRICTS,type DistrictId} from "./world";

type Props={zh:boolean;night:boolean};
type XY=readonly [number,number];

/** Four fully built neighborhoods outside the original 22 × 17 map. */
const EDGE_TREES:ReadonlyArray<readonly [number,number,number,string]>=[
 [-23,-18,1.15,"#88ae92"],[-20,-17,.94,"#6fa189"],[-23,-11,.9,"#9bb996"],
 [-11,-19,1.22,"#83b296"],[-8,-13,1.02,"#b9bf91"],[0,-19,1.04,"#79a690"],
 [8,-18,1.15,"#95af9b"],[12,-19,1.1,"#86ab8f"],[22,-18,.9,"#9bac87"],
 [24,-13,1.2,"#769a83"],[23,-6,.85,"#b4bc8c"],[20,-3,1.1,"#8fad96"],
 [-23,-4,1.13,"#87b39b"],[-21,3,.86,"#8aaf9b"],[-23,9,1.2,"#96b78d"],
 [-21,18,1.1,"#7aab93"],[-13,19,1.2,"#a0b894"],[-7,17,.96,"#95bc9b"],
 [0,19,1.05,"#8fac87"],[7,18,1.12,"#81ad8e"],[22,19,1.12,"#a2b58e"],
 [24,8,1.1,"#89a98d"],[23,15,.96,"#83a894"],[-9,-8,.91,"#87b69a"],
 [10,7,.85,"#9caf8d"],[-11,7,1.0,"#8fba96"]
];
function Tree({x,z,scale,color}:{x:number;z:number;scale:number;color:string}){
 return <group position={[x,0,z]} scale={scale}>
  <mesh position={[0,.7,0]}><cylinderGeometry args={[.16,.21,1.35,7]}/><meshStandardMaterial color="#977862" roughness={1}/></mesh>
  <mesh position={[0,1.8,0]}><coneGeometry args={[.85,1.85,7]}/><meshStandardMaterial color={color} roughness={1} flatShading/></mesh>
  <mesh position={[0,2.47,0]}><coneGeometry args={[.56,1.3,7]}/><meshStandardMaterial color={color} roughness={1} flatShading/></mesh>
 </group>;
}
function House({x,z,color,roof,rotation=0}:{x:number;z:number;color:string;roof:string;rotation?:number}){
 return <group position={[x,0,z]} rotation={[0,rotation,0]}>
  <mesh position={[0,.93,0]}><boxGeometry args={[2.65,1.8,2.2]}/><meshStandardMaterial color={color} roughness={.98}/></mesh>
  <mesh position={[0,2.18,0]} rotation={[0,Math.PI/4,0]} scale={[1.3,.8,1.3]}>
   <coneGeometry args={[1.68,1.28,4]}/><meshStandardMaterial color={roof} flatShading/></mesh>
  <mesh position={[0,.56,1.115]}><boxGeometry args={[.65,1.1,.08]}/><meshStandardMaterial color="#93765f"/></mesh>
  {[-.76,.76].map(side=><mesh key={side} position={[side,1.24,1.12]}>
   <boxGeometry args={[.43,.48,.08]}/><meshStandardMaterial color="#a5d0cc" emissive="#728e91" emissiveIntensity={.15}/></mesh>)}
  <mesh position={[.95,2.72,-.53]}><boxGeometry args={[.32,.8,.34]}/><meshStandardMaterial color="#c19c84"/></mesh>
 </group>;
}
function Stall({x,z,index}:{x:number;z:number;index:number}){
 const colors=["#e6a89a","#9cbdad","#e7c88e","#a8a7c5"];
 return <group position={[x,0,z]}>
  <mesh position={[0,.53,0]}><boxGeometry args={[1.7,.7,1.3]}/><meshStandardMaterial color="#d1aa82"/></mesh>
  <mesh position={[0,1.18,0]}><boxGeometry args={[1.95,.15,1.5]}/><meshStandardMaterial color={colors[index%4]}/></mesh>
  {[-.8,.8].map(side=><mesh key={side} position={[side,1.06,-.5]}>
   <boxGeometry args={[.08,1.85,.09]}/><meshStandardMaterial color="#f1e1bd"/></mesh>)}
  <mesh position={[0,1.94,0]}><boxGeometry args={[2.1,.16,1.6]}/><meshStandardMaterial color={colors[index%4]}/></mesh>
  {[-.5,0,.5].map((t,i)=><mesh key={i} position={[t,.99,.38]}>
   <sphereGeometry args={[.15,8,6]}/><meshStandardMaterial color={i%2?"#d58c79":"#a3b47e"}/></mesh>)}
 </group>;
}
function Market(){
 return <group position={[-16,0,-12]}>
  <mesh position={[0,.064,0]} rotation={[-Math.PI/2,0,0]}>
   <circleGeometry args={[5.5,28]}/><meshStandardMaterial color="#e9d7b5" roughness={1}/></mesh>
  {([[-3,-2],[2.9,-2.2],[-3,2.4],[2.9,2.4]] as XY[]).map(([x,z],i)=><Stall key={i} x={x} z={z} index={i}/>)}
  <mesh position={[0,.56,0]}><cylinderGeometry args={[.82,1.08,.6,16]}/><meshStandardMaterial color="#b6c9be"/></mesh>
  <mesh position={[0,1.05,0]}><sphereGeometry args={[.5,14,9]}/><meshStandardMaterial color="#8bc3c7" metalness={.12}/></mesh>
  <mesh position={[0,.13,0]} rotation={[-Math.PI/2,0,0]}>
   <ringGeometry args={[1.26,1.46,32]}/><meshBasicMaterial color="#ffefd1"/></mesh>
 </group>;
}
function Grove(){
 return <group position={[16,0,-12]}>
  <mesh position={[0,.06,0]} rotation={[-Math.PI/2,0,0]}>
   <circleGeometry args={[6.25,30]}/><meshStandardMaterial color="#7faf91" roughness={1}/></mesh>
  <House x={1.85} z={.3} color="#d7b594" roof="#7d9680" rotation={-.3}/>
  {([[-4.6,-3.1],[-3.7,1.2],[-1,-4.7],[4.3,-3.8],[4.5,3.8],[-1,4.7]] as XY[]).map(([x,z],i)=>
   <Tree key={i} x={x} z={z} scale={.8+(i%3)*.12} color={i%2?"#d3a781":"#a7b47d"}/>)}
  <mesh position={[-2.1,.48,1.4]}><boxGeometry args={[1.7,.25,.6]}/><meshStandardMaterial color="#b99479"/></mesh>
  {[-.7,.7].map(x=><mesh key={x} position={[-2.1+x,.23,1.4]}>
   <boxGeometry args={[.15,.45,.5]}/><meshStandardMaterial color="#947864"/></mesh>)}
 </group>;
}
function Homes(){
 const houses:[number,number,string,string][]=[
  [-2.8,-2.6,"#d9bbc3","#ac8693"],[2.7,-3,"#b7ccbf","#7eaa98"],
  [-2.8,2.8,"#edcfac","#b18c84"],[2.75,3,"#c4d4dd","#93a9b9"]
 ];
 return <group position={[-16,0,12]}>
  <mesh position={[0,.055,0]} rotation={[-Math.PI/2,0,0]}>
   <circleGeometry args={[5.7,32]}/><meshStandardMaterial color="#bad2ad" roughness={1}/></mesh>
  {houses.map(([x,z,color,roof],i)=><House key={i} x={x} z={z} color={color} roof={roof} rotation={i%2?.12:-.12}/>)}
  <mesh position={[0,.75,0]}><cylinderGeometry args={[.12,.16,1.5,8]}/><meshStandardMaterial color="#9e856b"/></mesh>
  <mesh position={[0,1.56,0]}><sphereGeometry args={[.39,12,9]}/><meshStandardMaterial color="#e6c49c"/></mesh>
  {[-5.2,5.2].map(x=><Tree key={x} x={x} z={1} scale={.85} color="#9eb595"/>)}
 </group>;
}
function Harbor({night}:{night:boolean}){
 return <group position={[16,0,12]}>
  <mesh position={[0,.073,0]} rotation={[-Math.PI/2,0,0]}>
   <circleGeometry args={[6.3,36]}/><meshStandardMaterial color="#e8d8b7"/></mesh>
  <mesh position={[0,.092,0]} rotation={[-Math.PI/2,0,0]}>
   <circleGeometry args={[5.35,40]}/><meshStandardMaterial color="#80b9c1" metalness={.09} roughness={.31}/></mesh>
  {[-3.15,-2.25,-1.35,-.45].map((z,i)=><mesh key={i} position={[1.85,.16,z]}>
   <boxGeometry args={[3.65,.22,.68]}/><meshStandardMaterial color={i%2?"#be9c80":"#d2af8b"}/></mesh>)}
  {[-1.4,1.4].map((x,i)=><group key={i} position={[x,.19,2]}>
   <mesh><boxGeometry args={[1.3,.24,2.3]}/><meshStandardMaterial color={i?"#d6a38f":"#f0ddbe"}/></mesh>
   <mesh position={[0,.35,0]}><coneGeometry args={[.56,.9,4]}/><meshStandardMaterial color="#f1f4df"/></mesh>
  </group>)}
  <group position={[-5.2,0,-1.6]}>
   <mesh position={[0,1.25,0]}><cylinderGeometry args={[.68,.87,2.5,9]}/><meshStandardMaterial color="#f0e3ce"/></mesh>
   <mesh position={[0,2.64,0]}><coneGeometry args={[1,1.1,9]}/><meshStandardMaterial color="#c98f86"/></mesh>
   <mesh position={[0,2.33,0]}><cylinderGeometry args={[.54,.54,.3,9]}/><meshStandardMaterial color={night?"#ffe1a0":"#bcd6d6"} emissive={night?"#ffe0a3":"#82a4a3"} emissiveIntensity={night?.55:.08}/></mesh>
  </group>
 </group>;
}
export function TownDistricts({zh,night}:Props){
 return <group>
  {EDGE_TREES.map(([x,z,s,c],i)=><Tree key={i} x={x} z={z} scale={s} color={c}/>)}
  <Market/><Grove/><Homes/><Harbor night={night}/>
  {DISTRICTS.filter(d=>d.id!=="center").map(d=><Html key={d.id}
   position={[d.point[0],4.15,d.point[2]]} center distanceFactor={19}
   zIndexRange={[3,1]} style={{pointerEvents:"none"}}>
   <span className="crew-town-3d-district-label">{d.icon} {zh?d.zh:d.en}</span>
  </Html>)}
 </group>;
}
