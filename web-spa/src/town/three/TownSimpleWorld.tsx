import type {ThreeEvent} from "@react-three/fiber";
import type {PlaceId} from "./world";

// Lightweight 3D safety net: no network fetch, texture dependency or model loader.
function Cabin({x,z,roof,body,select}:{x:number;z:number;roof:string;body:string;select:()=>void}){
 const click=(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();select()};
 return <group position={[x,.13,z]} onClick={click}>
  <mesh position={[0,1.03,0]}><boxGeometry args={[2.65,2.05,2.32]}/><meshStandardMaterial color={body}/></mesh>
  <mesh position={[0,2.47,0]} rotation={[0,Math.PI/4,0]}>
   <coneGeometry args={[2.25,1.32,4]}/><meshStandardMaterial color={roof}/></mesh>
  <mesh position={[0,.68,1.2]}><boxGeometry args={[.63,1.3,.06]}/><meshStandardMaterial color="#886f60"/></mesh>
  {[-.72,.72].map(x=><mesh key={x} position={[x,1.43,1.21]}><boxGeometry args={[.48,.53,.07]}/><meshStandardMaterial color="#cbe5df"/></mesh>)}
 </group>;
}
function LittleTree({x,z,scale=1}:{x:number;z:number;scale?:number}){
 return <group position={[x,.02,z]} scale={scale}>
  <mesh position={[0,.72,0]}><cylinderGeometry args={[.09,.14,1.44,7]}/><meshStandardMaterial color="#997f69"/></mesh>
  <mesh position={[0,1.66,0]}><coneGeometry args={[.77,1.72,7]}/><meshStandardMaterial color="#729c83"/></mesh>
 </group>;
}
export function TownSimpleWorld({onSelect}:{onSelect:(id:PlaceId)=>void}){
 return <group>
  <mesh position={[0,-.40,.3]}><boxGeometry args={[21.5,.8,17.3]}/><meshStandardMaterial color="#b9cba8"/></mesh>
  <mesh position={[0,.04,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[1.9,13]}/><meshStandardMaterial color="#e9dfc6"/></mesh>
  <mesh position={[0,.048,-1]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[15,1.2]}/><meshStandardMaterial color="#e9dfc6"/></mesh>
  <Cabin x={-5} z={-3} body="#f0d8c8" roof="#ba8382" select={()=>onSelect("cafe")}/>
  <Cabin x={4.7} z={-3} body="#d6e5df" roof="#7ca9aa" select={()=>onSelect("studio")}/>
  <Cabin x={-2.3} z={4.2} body="#f3ddb5" roof="#d1b37e" select={()=>onSelect("play")}/>
  <group onClick={(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();onSelect("garden")}}>
   <mesh position={[5.7,.052,4.65]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[2.25,36]}/><meshStandardMaterial color="#82b7ba"/></mesh>
   <mesh position={[7.7,.7,1.8]}><cylinderGeometry args={[1,1,1.42,6]}/><meshStandardMaterial color="#cbb79b"/></mesh>
   <mesh position={[7.7,1.74,1.8]}><coneGeometry args={[1.46,.90,6]}/><meshStandardMaterial color="#93756c"/></mesh>
  </group>
  {([[-8,-5],[-7,3],[-6,6],[-.5,-5.7],[2,-6],[8,6],[-8,-1],[9,-4],[1,6.3]] as const)
   .map(([x,z],i)=><LittleTree key={i} x={x} z={z} scale={i%2===0?1.1:.85}/>)}
 </group>;
}
