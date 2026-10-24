import {useMemo} from "react";
import {Shape,DoubleSide} from "three";
import {coastPoint} from "./TownNavigation";
import {WALK_GRAPH} from "./TownWalkGraph";

function outline(inset:number):Shape{
 const shape=new Shape();
 for(let i=0;i<=96;i++){
  const [x,z]=coastPoint(i/96*Math.PI*2,inset);
  if(i===0)shape.moveTo(x,z);else shape.lineTo(x,z);
 }
 shape.closePath();
 return shape;
}
export function TownIsland(){
 const beach=useMemo(()=>outline(0),[]);
 const grass=useMemo(()=>outline(.95),[]);
 const wetSand=useMemo(()=>outline(-.85),[]);
 const edges=useMemo(()=>{
  const seen=new Set<string>();
  const segments:{id:string;x:number;z:number;angle:number;length:number}[]=[];
  for(const [a,node] of Object.entries(WALK_GRAPH))for(const b of node.neighbors){
   const id=[a,b].sort().join("-");
   if(seen.has(id))continue;
   seen.add(id);
   const next=WALK_GRAPH[b].point;
   const dx=next[0]-node.point[0],dz=next[1]-node.point[1];
   segments.push({id,x:(node.point[0]+next[0])/2,z:(node.point[1]+next[1])/2,
    angle:Math.atan2(dx,dz),length:Math.hypot(dx,dz)});
  }
  return segments;
 },[]);
 return <group>
  {/* Ocean is below the coast so it clearly marks the edge of the walkable land. */}
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.58,.5]}>
   <planeGeometry args={[190,160]}/><meshStandardMaterial color="#75b8c4" roughness={.61} metalness={.06} side={DoubleSide}/>
  </mesh>
  <mesh position={[0,-.18,.5]} rotation={[Math.PI/2,0,0]}>
   <extrudeGeometry args={[wetSand,{depth:.15,bevelEnabled:false,curveSegments:1}]}/>
   <meshStandardMaterial color="#badbd1" roughness={.93}/>
  </mesh>
  <mesh position={[0,-.10,.5]} rotation={[Math.PI/2,0,0]}>
   <extrudeGeometry args={[beach,{depth:.48,bevelEnabled:false,curveSegments:1}]}/>
   <meshStandardMaterial color="#eedbb5" roughness={1}/>
  </mesh>
  <mesh position={[0,.025,.5]} rotation={[Math.PI/2,0,0]} receiveShadow>
   <extrudeGeometry args={[grass,{depth:.66,bevelEnabled:false,curveSegments:1}]}/>
   <meshStandardMaterial color="#a7c49c" roughness={1}/>
  </mesh>
  {/* Low-poly winding sidewalks follow precisely the pedestrian routing graph. */}
  {edges.map(e=><group key={e.id} position={[e.x,.058,e.z]} rotation={[0,e.angle,0]}>
   <mesh rotation={[-Math.PI/2,0,0]} receiveShadow>
    <planeGeometry args={[2.22,e.length+.75]}/>
    <meshStandardMaterial color="#ddd5be" roughness={1}/>
   </mesh>
   <mesh rotation={[-Math.PI/2,0,0]} position={[0,.003,0]}>
    <planeGeometry args={[1.78,e.length+.6]}/>
    <meshStandardMaterial color="#e9ddc7" roughness={1}/>
   </mesh>
  </group>)}
  {/* Bays and coastal stone outcrops emphasize island shape in wide view. */}
  {[[24,19],[-23,17],[23,-17],[-24,-18]] .map(([x,z],i)=><group key={i} position={[x,-.28,z]}>
   <mesh rotation={[0,i*.7,0]}><dodecahedronGeometry args={[1.25,0]}/>
    <meshStandardMaterial color={i%2?"#adbab0":"#c6c4ae"} roughness={1}/></mesh>
   <mesh position={[.65,-.15,.5]}><dodecahedronGeometry args={[.7,0]}/>
    <meshStandardMaterial color="#b5b9ad" roughness={1}/></mesh>
  </group>)}
 </group>;
}
