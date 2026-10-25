import {useEffect,useMemo,useRef} from "react";
import {useFrame} from "@react-three/fiber";
import {BufferGeometry,CatmullRomCurve3,DoubleSide,Float32BufferAttribute,Shape,Vector2,Vector3,type Group} from "three";
import type {MagicLifeBlueprint} from "./world";

type Point=[number,number,number];
/** A continuous swept surface, with tapered ends and a stable transported frame.
 * A face/wing/tail is ONE generated surface rather than independent spheres and
 * cylinders. No user-supplied mesh/code or runtime geometry work per frame.
 */
export function makeMagicSweptSurface(points:readonly Point[],start:number,end:number,bulge=0){
 const curve=new CatmullRomCurve3(points.map(p=>new Vector3(...p)),false,"centripetal");
 const steps=32,sides=10,frames=curve.computeFrenetFrames(steps,false);
 const vertices:number[]=[],uvs:number[]=[],indices:number[]=[];
 for(let i=0;i<=steps;i++){
  const t=i/steps,center=curve.getPointAt(t);
  const radius=Math.max(.012,start+(end-start)*t+Math.sin(Math.PI*t)*bulge);
  for(let j=0;j<=sides;j++){
   const a=j/sides*Math.PI*2;
   const offset=frames.normals[i].clone().multiplyScalar(Math.cos(a)*radius)
    .addScaledVector(frames.binormals[i],Math.sin(a)*radius);
   vertices.push(center.x+offset.x,center.y+offset.y,center.z+offset.z);
   uvs.push(t,j/sides);
   if(i<steps&&j<sides){
    const k=i*(sides+1)+j;
    indices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);
   }
  }
 }
 const geometry=new BufferGeometry();
 geometry.setAttribute("position",new Float32BufferAttribute(vertices,3));
 geometry.setAttribute("uv",new Float32BufferAttribute(uvs,2));
 geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
 return geometry;
}
function Sweep({points,from,to,bulge=0,color,roughness=.78,metalness=0}:{
 points:Point[];from:number;to:number;bulge?:number;color:string;roughness?:number;metalness?:number
}){
 const signature=JSON.stringify(points);
 const geometry=useMemo(()=>makeMagicSweptSurface(points,from,to,bulge),[signature,from,to,bulge]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry}>
  <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} side={DoubleSide}/>
 </mesh>;
}
function Oval({at,scale,color,metal=0}:{
 at:Point;scale:Point;color:string;metal?:number
}){
 return <mesh position={at} scale={scale}><sphereGeometry args={[1,28,20]}/>
  <meshStandardMaterial color={color} roughness={metal?.34:.83} metalness={metal}/>
 </mesh>;
}
function Ear({side,color}:{side:number;color:string}){
 const contour=useMemo(()=>{
  const shape=new Shape();shape.moveTo(0,0);shape.quadraticCurveTo(-.14,.26,-.15,.53);
  shape.quadraticCurveTo(.04,.5,.23,.04);shape.closePath();return shape;
 },[]);
 return <group position={[side*.29,1.32,.73]} rotation={[0,side*.2,-side*.15]}
   scale={[side,1,1]}>
  <mesh><extrudeGeometry args={[contour,{depth:.09,bevelEnabled:true,bevelThickness:.032,bevelSize:.032,bevelSegments:3,steps:1}]}/>
   <meshStandardMaterial color={color} roughness={.85}/>
  </mesh>
  <mesh position={[.006,.19,.1]} scale={[.09,.22,.012]}>
   <sphereGeometry args={[1,16,12]}/><meshStandardMaterial color="#f8c6ae"/>
  </mesh>
 </group>;
}
/** Fox: one flowing spine and brush tail, four articulated paws, tapered snout.
 * All body volumes intersect smoothly rather than leaving a gap between blocks.
 */
export function MagicFoxModel3D({animated=true,size=1,color="#dc8558"}:{
 animated?:boolean;size?:number;color?:string
}){
 const legs=useRef<(Group|null)[]>([]),tail=useRef<Group>(null);
 useFrame(({clock})=>{
  const t=clock.elapsedTime;
  legs.current.forEach((node,i)=>{if(node)node.rotation.x=animated?
   Math.sin(t*5.8+([0,Math.PI,Math.PI,0][i]))*.28:0;});
  if(tail.current)tail.current.rotation.y=animated?Math.sin(t*1.7)*.16:0;
 });
 return <group scale={size}>
  <Sweep points={[[0,.73,-.73],[0,.78,-.27],[0,.78,.24],[0,.84,.68]]}
   from={.42} to={.34} bulge={.09} color={color}/>
  <Oval at={[0,.73,.37]} scale={[.37,.42,.39]} color={color}/>
  <Sweep points={[[0,.77,.38],[0,.98,.52],[0,1.13,.68]]}
   from={.32} to={.33} color={color}/>
  <Oval at={[0,1.17,.77]} scale={[.4,.36,.32]} color={color}/>
  <Sweep points={[[0,1.08,.94],[0,1.02,1.17],[0,.97,1.39]]}
   from={.26} to={.075} color="#f7e3bd"/>
  <Oval at={[0,.96,1.39]} scale={[.105,.066,.074]} color="#2e2c33"/>
  {[-1,1].map(side=><group key={side}>
   <Ear side={side} color={color}/>
   <Oval at={[side*.205,1.2,1.032]} scale={[.056,.061,.03]} color="#202d2e"/>
   <Oval at={[side*.189,1.226,1.062]} scale={[.018,.019,.009]} color="#fff5df"/>
  </group>)}
  <group ref={tail} position={[0,.87,-.83]}>
   <Sweep points={[[0,0,0],[0,.18,-.37],[0,.44,-.73],[0,.51,-1.04]]}
    from={.18} to={.055} bulge={.2} color={color}/>
   <Sweep points={[[0,.39,-.77],[0,.48,-.95],[0,.51,-1.07]]}
    from={.24} to={.035} color="#fff5d9"/>
  </group>
  {[-1,1].flatMap((side,si)=>[-.55,.48].map((z,zi)=>{
   const i=si*2+zi;
   return <group key={i} ref={node=>{legs.current[i]=node}}
    position={[side*.29,.65,z]}>
    <Sweep points={[[0,0,0],[side*.02,-.2,.015],[side*.04,-.43,.045]]}
     from={.13} to={.095} color={color}/>
    <Oval at={[side*.04,-.45,.14]} scale={[.125,.095,.22]} color="#765347"/>
   </group>;
  }))}
 </group>;
}
function Wing({sign,color}:{sign:-1|1;color:string}){
 const shape=useMemo(()=>{
  const s=new Shape();s.moveTo(0,0);s.quadraticCurveTo(.35,.48,.84,1.08);
  s.quadraticCurveTo(1.13,.57,1.49,.95);s.quadraticCurveTo(1.37,.31,1.83,.42);
  s.quadraticCurveTo(1.33,-.02,1.25,-.23);s.quadraticCurveTo(.85,.18,.72,-.32);
  s.quadraticCurveTo(.34,.09,0,0);return s;
 },[]);
 return <group scale={[sign,1,1]}>
  <mesh position={[0,0,-.035]}>
   <shapeGeometry args={[shape]}/>
   <meshStandardMaterial color={color} side={DoubleSide} roughness={.7} metalness={.04}/>
  </mesh>
  <Sweep points={[[0,0,0],[.44,.52,0],[.84,1.08,0]]}
   from={.095} to={.04} color="#865565"/>
  <Sweep points={[[.4,.42,.015],[1.01,.43,.015],[1.49,.95,.015]]}
   from={.06} to={.025} color="#a16a69"/>
  <Sweep points={[[.7,.14,.015],[1.28,.07,.015],[1.83,.42,.015]]}
   from={.05} to={.02} color="#a16a69"/>
 </group>;
}
/** Dragon: an S-curved neck/tail, continuous torso, membrane wings with veins.
 * Two membranes animate at the shoulder, not around body-centered cones.
 */
export function MagicDragonModel3D({animated=true,size=1,color="#c46b65"}:{
 animated?:boolean;size?:number;color?:string
}){
 const wings=useRef<(Group|null)[]>([]),tail=useRef<Group>(null);
 useFrame(({clock})=>{
  const t=clock.elapsedTime;
  wings.current.forEach((node,i)=>{if(node)node.rotation.z=animated?
   (i===0?-1:1)*(Math.sin(t*3.2)*.24+.06):0});
  if(tail.current)tail.current.rotation.y=animated?Math.sin(t*1.3)*.1:0;
 });
 return <group scale={size}>
  <Sweep points={[[0,.6,-.83],[0,.82,-.3],[0,.87,.29],[0,.95,.68]]}
   from={.48} to={.39} bulge={.11} color={color}/>
  <Oval at={[0,.66,.34]} scale={[.43,.34,.49]} color="#e5a27d"/>
  <Sweep points={[[0,.88,.5],[0,1.26,.64],[0,1.66,.76],[0,1.81,.94]]}
   from={.32} to={.21} color={color}/>
  <Sweep points={[[0,1.86,.9],[0,1.83,1.2],[0,1.72,1.49]]}
   from={.36} to={.115} color={color}/>
  <Sweep points={[[0,1.68,1.1],[0,1.61,1.38],[0,1.57,1.55]]}
   from={.2} to={.05} color="#e9af87"/>
  {[-1,1].map(sign=><group key={sign}>
   <Oval at={[sign*.205,1.9,1.226]} scale={[.063,.07,.04]} color="#ffe4ab"/>
   <Oval at={[sign*.2,1.9,1.266]} scale={[.032,.042,.016]} color="#32303c"/>
   <Sweep points={[[sign*.25,2.04,1.01],[sign*.37,2.36,.86],[sign*.49,2.5,.73]]}
    from={.12} to={.014} color="#f6dfb0"/>
  </group>)}
  <group ref={tail} position={[0,.79,-.75]}>
   <Sweep points={[[0,0,0],[0,.03,-.43],[0,.17,-.93],[0,.32,-1.36],[0,.27,-1.72]]}
    from={.34} to={.015} bulge={.04} color={color}/>
   {[0,1,2,3].map(i=><Sweep key={i}
    points={[[0,.25,-.31-i*.32],[0,.47,-.4-i*.32],[0,.57,-.49-i*.32]]}
    from={.085} to={.012} color="#eab99d"/>)}
  </group>
  {([-1,1] as const).map((sign,i)=><group key={sign}
   ref={node=>{wings.current[i]=node}} position={[sign*.36,1.15,-.05]}>
    <Wing sign={sign} color={i===0?"#e3a587":"#f0bd98"}/>
  </group>)}
  {[-1,1].flatMap(sign=>[-.58,.43].map(z=>
   <group key={sign+":"+z} position={[sign*.32,.56,z]}>
    <Sweep points={[[0,0,0],[sign*.09,-.27,.05],[sign*.12,-.46,.16]]}
     from={.15} to={.08} color={color}/>
    <Oval at={[sign*.12,-.48,.21]} scale={[.13,.08,.18]} color="#91535a"/>
   </group>))}
 </group>;
}
const PALETTES={gold:["#e8c37c","#5b8499"],rose:["#e7a2ba","#61849c"],azure:["#94cfe9","#556d91"],
 mint:["#a4d8bc","#4c8286"],violet:["#c5b5ee","#637396"],coral:["#ec9d80","#626e89"],
 ivory:["#f3e9ce","#718995"],slate:["#a4b7c6","#536d7d"]} as const;
export function MagicRobotModel3D({blueprint,animated=true}:{blueprint:MagicLifeBlueprint;animated?:boolean}){
 const limbs=useRef<(Group|null)[]>([]);
 const profile=useMemo(()=>[new Vector2(.29,0),new Vector2(.48,.12),new Vector2(.55,.45),
  new Vector2(.46,.72),new Vector2(.33,.89),new Vector2(.26,1.04)],[]);
 const [shell,accent]=PALETTES[blueprint.palette],t=blueprint.style==="sturdy"?1.17:blueprint.style==="sleek"?.87:1;
 useFrame(({clock})=>{
  const time=clock.elapsedTime;
  limbs.current.forEach((node,i)=>{if(node)node.rotation.x=animated?
   Math.sin(time*3.8+(i===0||i===3?0:Math.PI))*.27:0;});
 });
 return <group scale={[blueprint.body*t,blueprint.body,blueprint.body*t]}>
  <group position={[0,.83,0]}>
   <mesh><latheGeometry args={[profile,32]}/>
    <meshStandardMaterial color={shell} metalness={.65} roughness={.3}/>
   </mesh>
   <mesh position={[0,.55,.49]} scale={[.34,.31,.055]}>
    <sphereGeometry args={[1,24,16]}/>
    <meshStandardMaterial color={accent} metalness={.78} roughness={.25}/>
   </mesh>
   <mesh position={[0,.55,.56]}>
    <torusGeometry args={[.19,.047,10,32]}/>
    <meshStandardMaterial color="#bdeaf5" emissive="#80d5f4" emissiveIntensity={.58}/>
   </mesh>
  </group>
  <group position={[0,2.12,0]} scale={blueprint.head}>
   <mesh scale={[.43,.35,.31]}>
    <sphereGeometry args={[1,28,20]}/>
    <meshStandardMaterial color={accent} metalness={.72} roughness={.3}/>
   </mesh>
   <mesh position={[0,.03,.3]} scale={[.35,.16,.07]}>
    <sphereGeometry args={[1,20,14]}/>
    <meshStandardMaterial color="#294653" metalness={.65} roughness={.18}/>
   </mesh>
   {[-1,1].map(sign=><Oval key={sign} at={[sign*.17,.04,.36]}
    scale={[.075,.06,.026]} color="#92eeff" metal={.24}/>)}
  </group>
  {[-1,1].flatMap((sign,si)=>[0,1].map((arm,ai)=>{
   const index=si*2+ai;
   return <group key={index} position={[sign*(arm?.44:.57),arm?.72:1.62,0]}
     ref={node=>{limbs.current[index]=node}}>
    <Sweep points={[[0,0,0],[sign*.035,arm?-.32:-.25,.02],[sign*.055,arm?-.56:-.54,.12]]}
     from={arm?.18:.16} to={arm?.115:.1} color={arm?accent:shell} metalness={.62}/>
    <Oval at={[sign*.06,arm?-.6:-.58,.14]}
     scale={[arm?.19:.16,.12,.2]} color={shell} metal={.65}/>
   </group>;
  }))}
  {blueprint.style==="mystic"&&<mesh position={[0,2.58,0]}>
   <torusGeometry args={[.45,.045,8,32]}/>
   <meshStandardMaterial color="#c6f4f3" emissive="#7dcdeb" emissiveIntensity={.46}/>
  </mesh>}
 </group>;
}
