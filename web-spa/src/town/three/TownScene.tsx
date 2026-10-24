import {Suspense,useEffect} from "react";
import {Canvas,useThree} from "@react-three/fiber";
import {TownEnvironment} from "./TownEnvironment";
import {TownCharacters} from "./TownCharacters";
import {TownCameraController} from "./TownCameraController";
import {type FriendId,type PlaceId,type Selection} from "./world";

type Props={night:boolean;reducedMotion:boolean;selected:Selection;reset:number;
 onFriend:(id:FriendId)=>void;onPlace:(id:PlaceId)=>void;onFailure:()=>void};
function ContextWatch({onFailure}: {onFailure:()=>void}){
 const {gl}=useThree();
 useEffect(()=>{
  const lost=(event:Event)=>{event.preventDefault();onFailure()};
  gl.domElement.addEventListener("webglcontextlost",lost);
  return()=>gl.domElement.removeEventListener("webglcontextlost",lost);
 },[gl,onFailure]);
 return null;
}
export function TownScene({night,reducedMotion,selected,reset,onFriend,onPlace,onFailure}:Props){
 const cameraFocus=selected?.type==="place"
  ?({cafe:[-5,1.2,-1.75],studio:[4.7,1.35,-1.75],play:[-2.2,1.25,5.3],garden:[5.45,.3,4.5]} as const)[selected.id]
  :selected?.type==="person"
   ?null : null;
 const friendFocus=selected?.type==="person"
  ?({zoe:[-5,.95,0],yuna:[-3.7,.95,.85],theo:[3.8,.95,.3],hugo:[0,.95,.1],bella:[-1.25,.95,6.4],noah:[3.5,.95,5.8]} as const)[selected.id]
  :null;
 const focus=friendFocus??cameraFocus;
 return <Canvas className="crew-town-3d-canvas"
   camera={{position:[14,16,23],fov:typeof window!=="undefined"&&window.innerWidth<720?54:36,near:.1,far:120}}
   dpr={[1,Math.min(1.5,typeof window!=="undefined"?window.devicePixelRatio:1.5)]}
   gl={{antialias:true,alpha:false,powerPreference:"low-power",stencil:false}}
   frameloop={reducedMotion?"demand":"always"}
   onCreated={({gl})=>{gl.setClearColor(night?"#303f56":"#eaf0e3")}}
   fallback={<div role="status">WebGL unavailable</div>}>
  <color attach="background" args={[night?"#303f56":"#eaf0e3"]}/>
  <fog attach="fog" args={[night?"#303f56":"#eaf0e3",32,67]}/>
  <hemisphereLight args={[night?"#8ea8d9":"#fff8e9","#75857b",night?.95:1.7]}/>
  <ambientLight intensity={night?.45:.65}/>
  <directionalLight position={[-5,13,8]} color={night?"#b7c6eb":"#fff0d0"} intensity={night?1.2:2.0}/>
  <directionalLight position={[10,7,-6]} color={night?"#718ebd":"#d4e8d9"} intensity={night?.3:.65}/>
  <Suspense fallback={null}>
   <TownEnvironment night={night} onSelect={onPlace}/>
   <TownCharacters reducedMotion={reducedMotion}
    selected={selected?.type==="person"?selected.id:null} onSelect={onFriend}/>
  </Suspense>
  <TownCameraController focus={focus} reducedMotion={reducedMotion} reset={reset}/>
  <ContextWatch onFailure={onFailure}/>
 </Canvas>;
}
