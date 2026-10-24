import {useMemo} from "react";
import {Shape,DoubleSide,BufferGeometry,Float32BufferAttribute} from "three";
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
 // All 50 paths are batched into two geometries: no 100 extra draw calls.
 const buildPavement=(width:number,y:number)=>{
  const done=new Set<string>(),vertices:number[]=[];
  for(const [a,node] of Object.entries(WALK_GRAPH))for(const b of node.neighbors){
   const id=[a,b].sort().join("-");
   if(done.has(id))continue;done.add(id);
   const other=WALK_GRAPH[b].point;
   const dx=other[0]-node.point[0],dz=other[1]-node.point[1],len=Math.hypot(dx,dz);
   if(len<.001)continue;
   const ux=dx/len,uz=dz/len,px=-uz*width/2,pz=ux*width/2;
   const ax=node.point[0]-ux*.35,az=node.point[1]-uz*.35;
   const bx=other[0]+ux*.35,bz=other[1]+uz*.35;
   const a1=[ax+px,y,az+pz],a2=[ax-px,y,az-pz],b1=[bx+px,y,bz+pz],b2=[bx-px,y,bz-pz];
   vertices.push(...a1,...a2,...b1,...b1,...a2,...b2);
  }
  const geometry=new BufferGeometry();
  geometry.setAttribute("position",new Float32BufferAttribute(vertices,3));
  geometry.computeVertexNormals();
  return geometry;
 };
 const roadEdge=useMemo(()=>buildPavement(2.3,.057),[]);
 const roadCenter=useMemo(()=>buildPavement(1.74,.062),[]);
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
  {/* A continuous winding pavement mesh follows the graph around all five districts. */}
  <mesh geometry={roadEdge}>
   <meshBasicMaterial color="#cec3a6" side={DoubleSide}/>
  </mesh>
  <mesh geometry={roadCenter}>
   <meshBasicMaterial color="#e9ddc7" side={DoubleSide}/>
  </mesh>
  {/* Bays and coastal stone outcrops emphasize island shape in wide view. */}
  {[[24,19],[-23,17],[23,-17],[-24,-18]] .map(([x,z],i)=><group key={i} position={[x,-.28,z]}>
   <mesh rotation={[0,i*.7,0]}><dodecahedronGeometry args={[1.25,0]}/>
    <meshStandardMaterial color={i%2?"#adbab0":"#c6c4ae"} roughness={1}/></mesh>
   <mesh position={[.65,-.15,.5]}><dodecahedronGeometry args={[.7,0]}/>
    <meshStandardMaterial color="#b5b9ad" roughness={1}/></mesh>
  </group>)}
 </group>;
}
