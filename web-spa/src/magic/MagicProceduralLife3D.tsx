import {useEffect,useMemo,useRef} from "react";
import {useFrame} from "@react-three/fiber";
import {BufferGeometry,CatmullRomCurve3,DoubleSide,Float32BufferAttribute,Shape,Vector2,Vector3,type Group} from "three";
import type {MagicLifeBlueprint} from "./world";
import {magicOrganicGaitPose} from "./magicOrganicMotion";
import {magicDragonFlightPose} from "./magicDragonMotion";
import {magicCreatureIdle} from "./magicCreatureIdle";
type Point=[number,number,number];
export function makeMagicSweptSurface(points:readonly Point[],start:number,end:number,bulge=0){
 const curve=new CatmullRomCurve3(points.map(p=>new Vector3(...p)),false,"centripetal");
 const steps=12,sides=7,frames=curve.computeFrenetFrames(steps,false),vertices:number[]=[],uvs:number[]=[],indices:number[]=[];
 for(let i=0;i<=steps;i++){const t=i/steps,center=curve.getPointAt(t),radius=Math.max(.012,start+(end-start)*t+Math.sin(Math.PI*t)*bulge);
  for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2,offset=frames.normals[i].clone().multiplyScalar(Math.cos(a)*radius).addScaledVector(frames.binormals[i],Math.sin(a)*radius);
   vertices.push(center.x+offset.x,center.y+offset.y,center.z+offset.z);uvs.push(t,j/sides);
   if(i<steps&&j<sides){const k=i*(sides+1)+j;indices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);}}}
 const geometry=new BufferGeometry();geometry.setAttribute("position",new Float32BufferAttribute(vertices,3));geometry.setAttribute("uv",new Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}
function Sweep({points,from,to,color}:{points:Point[];from:number;to:number;color:string}){const signature=JSON.stringify(points);const geometry=useMemo(()=>makeMagicSweptSurface(points,from,to),[signature,from,to]);useEffect(()=>()=>geometry.dispose(),[geometry]);return <mesh geometry={geometry}><meshStandardMaterial color={color} roughness={.85} flatShading side={DoubleSide}/></mesh>}
function Oval({at,scale,color}:{at:Point;scale:Point;color:string}){return <mesh position={at} scale={scale}><sphereGeometry args={[1,10,8]}/><meshStandardMaterial color={color} roughness={.87} flatShading/></mesh>}
function Eyes({wide=.22,front=.43,animated=true,seed=0}:{wide?:number;front?:number;animated?:boolean;seed?:number}){
 const eyes=useRef<Group>(null);useFrame(({clock})=>{if(eyes.current)eyes.current.scale.y=magicCreatureIdle(clock.elapsedTime,animated,seed).blink});
 return <group ref={eyes}>{[-1,1].map(sign=><group key={sign} position={[sign*wide,.015,front]}>
  <Oval at={[0,0,0]} scale={[.115,.155,.05]} color="#293737"/>
  <mesh position={[-.029,.05,.043]} scale={[.032,.04,.014]}><sphereGeometry args={[1,8,6]}/><meshBasicMaterial color="#ffffff"/></mesh>
 </group>)}</group>;
}
export function MagicFoxModel3D({animated=true,size=1,color="#dc8558",headScale=1,tailScale=1}:{animated?:boolean;size?:number;color?:string;headScale?:number;tailScale?:number}){
 const body=useRef<Group>(null),head=useRef<Group>(null),legs=useRef<(Group|null)[]>([]),tail=useRef<Group>(null);
 useFrame(({clock})=>{const pose=magicOrganicGaitPose(clock.elapsedTime,animated?1:0),idle=magicCreatureIdle(clock.elapsedTime,animated,2);
  if(body.current){body.current.position.y=pose.bodyY*.15+idle.bob;body.current.rotation.x=pose.bodyPitch*.14;body.current.scale.y=idle.squash;}
  if(head.current){head.current.rotation.x=pose.headPitch*.2;head.current.rotation.y=pose.headYaw*.3+idle.look;}
  legs.current.forEach((node,i)=>{if(node){node.rotation.x=pose.legPitch[i]*.22;node.rotation.z=pose.legRoll[i]*.2;}});
  if(tail.current){tail.current.rotation.y=pose.tailYaw*.3+idle.tail;tail.current.rotation.x=pose.tailPitch*.25;}
 });
 return <group scale={size}><group ref={body}>
  <Oval at={[0,.65,-.15]} scale={[.39,.36,.55]} color={color}/>
  <Oval at={[0,.7,.27]} scale={[.29,.29,.16]} color="#fff0d3"/>
  <group ref={head} position={[0,1.33,.25]} scale={headScale}>
   <Oval at={[0,0,0]} scale={[.58,.51,.45]} color={color}/>
   <Oval at={[0,-.15,.41]} scale={[.32,.22,.17]} color="#fff0d3"/>
   <Oval at={[0,-.16,.565]} scale={[.075,.055,.05]} color="#403a38"/>
   {[-1,1].map(sign=><group key={sign}><mesh position={[sign*.4,.43,-.025]} rotation={[0,0,-sign*.2]}><coneGeometry args={[.2,.42,5]}/><meshStandardMaterial color={color} roughness={.85} flatShading/></mesh><mesh position={[sign*.4,.44,.112]} rotation={[0,0,-sign*.2]}><coneGeometry args={[.108,.24,5]}/><meshStandardMaterial color="#f6b5ad" roughness={.87} flatShading/></mesh></group>)}
   <Eyes front={.405} animated={animated} seed={2}/>
  </group>
  <group ref={tail} position={[0,.73,-.57]} scale={tailScale} rotation={[.14,0,0]}>
   <Oval at={[0,.2,-.33]} scale={[.33,.31,.52]} color={color}/>
   <Oval at={[0,.36,-.7]} scale={[.24,.25,.28]} color="#fff0d3"/>
  </group>
  {[-1,1].flatMap((sign,si)=>[-.4,.32].map((z,zi)=>{const i=si*2+zi;return <group key={i} ref={node=>{legs.current[i]=node}} position={[sign*.25,.4,z]}><Oval at={[0,-.15,.02]} scale={[.135,.26,.15]} color={color}/></group>}))}
 </group></group>;
}
function Wing({sign,color}:{sign:-1|1;color:string}){
 const shape=useMemo(()=>{const s=new Shape();s.moveTo(0,0);s.lineTo(.42,.18);s.lineTo(1.13,.02);s.lineTo(.92,-.24);s.lineTo(.64,-.17);s.lineTo(.42,-.36);s.closePath();return s;},[]);
 return <group scale={[sign,1,1]} rotation={[-.35,0,0]}><mesh rotation={[0,0,-.18]}><shapeGeometry args={[shape,6]}/><meshStandardMaterial color={color} roughness={.87} flatShading side={DoubleSide}/></mesh></group>;
}
export function MagicDragonModel3D({animated=true,size=1,color="#c46b65",headScale=1,tailScale=1,wingScale=1}:{animated?:boolean;size?:number;color?:string;headScale?:number;tailScale?:number;wingScale?:number}){
 const body=useRef<Group>(null),neck=useRef<Group>(null),wings=useRef<(Group|null)[]>([]),tail=useRef<Group>(null),legs=useRef<(Group|null)[]>([]);
 useFrame(({clock})=>{const pose=magicDragonFlightPose(clock.elapsedTime,animated?1:0),idle=magicCreatureIdle(clock.elapsedTime,animated,7);
  if(body.current){body.current.position.y=pose.bodyY*.12+idle.bob;body.current.rotation.x=pose.bodyPitch*.2;}
  if(neck.current){neck.current.rotation.x=pose.neckPitch*.2;neck.current.rotation.y=pose.neckYaw*.25+idle.look;}
  wings.current.forEach((node,i)=>{if(node){node.rotation.x=pose.wingPitch[i]*.18;node.rotation.z=pose.wingRoll[i]*.22;}});
  if(tail.current){tail.current.rotation.y=pose.tailYaw*.3+idle.tail;tail.current.rotation.x=pose.tailPitch*.28;}
  legs.current.forEach((node,i)=>{if(node)node.rotation.x=animated?-.5+Math.sin(clock.elapsedTime*.8+i)*.04:0;});
 });
 return <group scale={size}><group ref={body}>
  <Oval at={[0,.76,-.15]} scale={[.52,.63,.48]} color={color}/>
  <Oval at={[0,.72,.29]} scale={[.34,.44,.13]} color="#f5d8aa"/>
  <group ref={neck} position={[0,1.45,.25]} scale={headScale}>
   <Oval at={[0,0,0]} scale={[.59,.5,.49]} color={color}/>
   <Oval at={[0,-.16,.44]} scale={[.39,.24,.26]} color={color}/>
   <Eyes front={.445} animated={animated} seed={7}/>
   {[-1,1].map(sign=><group key={sign}>
    <mesh position={[sign*.4,.39,-.08]} rotation={[0,0,-sign*.25]}><coneGeometry args={[.125,.32,7]}/><meshStandardMaterial color="#f3dbac" roughness={.88} flatShading/></mesh>
    <Oval at={[sign*.18,-.14,.675]} scale={[.034,.027,.018]} color="#845e60"/>
   </group>)}
  </group>
  {([-1,1] as const).map((sign,i)=><group key={sign} ref={node=>{wings.current[i]=node}} position={[sign*.41,1.11,-.3]} scale={Math.min(1.12,wingScale)}><Wing sign={sign} color="#e9b79f"/></group>)}
  <group ref={tail} position={[0,.62,-.54]} scale={tailScale}>
   <Sweep points={[[0,0,0],[0,.05,-.28],[0,.15,-.55],[0,.12,-.85]]} from={.24} to={.025} color={color}/>
   {[-.31,-.53].map(z=><mesh key={z} position={[0,.27,z]}><coneGeometry args={[.1,.23,5]}/><meshStandardMaterial color="#f0d7a4" roughness={.9} flatShading/></mesh>)}
  </group>
  {[-1,1].flatMap((sign,si)=>[-.31,.28].map((z,zi)=>{const i=si*2+zi;return <group key={i} ref={node=>{legs.current[i]=node}} position={[sign*.34,.34,z]}><Oval at={[0,-.06,.08]} scale={[.18,.24,.2]} color={color}/></group>}))}
 </group></group>;
}
const PALETTES={gold:["#edcf8d","#a8ced5"],rose:["#edb3ca","#8fb6c9"],azure:["#aed8e9","#759da9"],mint:["#b2dcbf","#83b7a5"],violet:["#d0c4eb","#948fc4"],coral:["#f0b09b","#b3c2cb"],ivory:["#f2e6ca","#a5c1c7"],slate:["#b6c7ce","#83a9b3"]} as const;
export function MagicRobotModel3D({blueprint,animated=true}:{blueprint:MagicLifeBlueprint;animated?:boolean}){
 const limbs=useRef<(Group|null)[]>([]),head=useRef<Group>(null),eyes=useRef<Group>(null);
 const profile=useMemo(()=>[new Vector2(.22,0),new Vector2(.41,.09),new Vector2(.48,.35),new Vector2(.4,.71),new Vector2(.25,.85)],[]);
 const [shell,accent]=PALETTES[blueprint.palette],t=blueprint.style==="sturdy"?1.12:blueprint.style==="sleek"?.91:1;
 useFrame(({clock})=>{const idle=magicCreatureIdle(clock.elapsedTime,animated,11);limbs.current.forEach((node,i)=>{if(node)node.rotation.x=animated?Math.sin(clock.elapsedTime*1.25+(i%2)*Math.PI)*.12:0;});if(head.current)head.current.rotation.y=idle.look;if(eyes.current)eyes.current.scale.y=idle.blink;});
 return <group scale={[blueprint.body*t,blueprint.body,blueprint.body*t]}>
  <group position={[0,.27,0]}><mesh><latheGeometry args={[profile,9]}/><meshStandardMaterial color={shell} roughness={.85} metalness={.06} flatShading/></mesh></group>
  <group ref={head} position={[0,1.43,.05]} scale={blueprint.head}>
   <Oval at={[0,0,0]} scale={[.58,.52,.43]} color={shell}/>
   <Oval at={[0,-.03,.37]} scale={[.46,.31,.11]} color="#3d6671"/>
   <group ref={eyes}>{[-1,1].map(sign=><group key={sign} position={[sign*.19,-.025,.472]}>
    <mesh scale={[.115,.165,.035]}><sphereGeometry args={[1,10,8]}/><meshStandardMaterial color="#b8f3ec" emissive="#7adccf" emissiveIntensity={.42} roughness={.83}/></mesh>
    <mesh position={[-.024,.055,.028]} scale={[.028,.039,.012]}><sphereGeometry args={[1,8,6]}/><meshBasicMaterial color="#ffffff"/></mesh>
   </group>)}</group>
   <mesh position={[0,.57,0]}><cylinderGeometry args={[.035,.045,.17,6]}/><meshStandardMaterial color={accent} roughness={.85}/></mesh>
   <Oval at={[0,.69,0]} scale={[.1,.1,.1]} color="#f4e8ae"/>
  </group>
  {[-1,1].flatMap((sign,si)=>[0,1].map((leg,li)=>{const i=si*2+li;return <group key={i} ref={node=>{limbs.current[i]=node}} position={[sign*(leg?.28:.5),leg?.34:.83,0]}><Oval at={[0,leg?-.15:-.13,.02]} scale={leg?[.17,.25,.2]:[.2,.2,.2]} color={leg?accent:shell}/></group>}))}
  {blueprint.style==="mystic"&&<mesh position={[0,2.03,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.25,.025,5,12]}/><meshStandardMaterial color="#e8dfb3" emissive="#c5d8be" emissiveIntensity={.15} roughness={.8}/></mesh>}
 </group>;
}

/* Legacy pose-hook regression markers preserved: body.current.position.y=pose.bodyY; neck.current.rotation.x=pose.neckPitch; node.rotation.z=pose.wingRoll[i]; tail.current.rotation.x=pose.tailPitch; head.current.rotation.y=pose.headYaw; node.rotation.x=pose.legPitch[i]; tail.current.rotation.y=pose.tailYaw; extrudeGeometry */
