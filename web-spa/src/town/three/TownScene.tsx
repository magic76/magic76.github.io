import {Component,Suspense,useCallback,useEffect,useRef,useState} from "react";
import type {ReactNode} from "react";
import {Canvas,useThree} from "@react-three/fiber";
import {TownEnvironment} from "./TownEnvironment";
import {TownDecorations} from "./TownDecorations";
import {TownDistricts} from "./TownDistricts";
import {TownSimpleWorld} from "./TownSimpleWorld";
import {TownCharacters} from "./TownCharacters";
import {TownCameraController} from "./TownCameraController";
import type {TownViewMode} from "./TownCameraController";
import {PEOPLE,type DistrictId,type FriendId,type PlaceId,type Selection} from "./world";
import {WALK_GRAPH} from "./TownWalkGraph";
import {LANDMARKS} from "./TownLayout";

type Props={night:boolean;zh:boolean;district:DistrictId;view:TownViewMode;reducedMotion:boolean;selected:Selection;reset:number;
 onFriend:(id:FriendId)=>void;onPlace:(id:PlaceId)=>void;onDeselect:()=>void;onFailure:(reason:string)=>void;onSimplified:(reason:string)=>void};
class TownModelsBoundary extends Component<{children:ReactNode;fallback:ReactNode;onFailure:(reason:string)=>void},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 componentDidCatch(error:Error){this.props.onFailure(error.message.slice(0,170))}
 render(){return this.state.failed?this.props.fallback:this.props.children}
}
function ContextWatch({onFailure}: {onFailure:(reason:string)=>void}){
 const {gl}=useThree();
 useEffect(()=>{
  const lost=(event:Event)=>{event.preventDefault();onFailure("webgl-context-lost")};
  gl.domElement.addEventListener("webglcontextlost",lost);
  return()=>gl.domElement.removeEventListener("webglcontextlost",lost);
 },[gl,onFailure]);
 return null;
}
export function TownScene({night,zh,district,view,reducedMotion,selected,reset,onFriend,onPlace,onDeselect,onFailure,onSimplified}:Props){
 const actorPositions=useRef<Partial<Record<FriendId,[number,number]>>>({});
 const trackActor=useCallback((id:FriendId,x:number,z:number)=>{
  const point=actorPositions.current[id];
  if(point){point[0]=x;point[1]=z}else actorPositions.current[id]=[x,z];
 },[]);
 const [visible,setVisible]=useState(true);
 useEffect(()=>{
  const sync=()=>setVisible(!document.hidden);
  sync();document.addEventListener("visibilitychange",sync);
  return()=>document.removeEventListener("visibilitychange",sync);
 },[]);
 const cameraFocus=selected?.type==="place"
  ?({cafe:[LANDMARKS.cafe[0],1.2,LANDMARKS.cafe[1]+1.25],studio:[LANDMARKS.studio[0],1.35,LANDMARKS.studio[1]+1.25],play:[LANDMARKS.play[0],1.25,LANDMARKS.play[1]+1.3],garden:[LANDMARKS.pond[0],.3,LANDMARKS.pond[1]]} as const)[selected.id]
  :selected?.type==="person"
   ?null : null;
 // Use the actor's actual walking position when selection changes, not a stale landmark.
 const friendFocus=selected?.type==="person"
  ?(()=>{
   const position=actorPositions.current[selected.id]
    ??WALK_GRAPH[PEOPLE.find(person=>person.id===selected.id)?.startNode??"c0"].point;
   return position?[position[0],.95,position[1]] as const:null;
  })():null;
 const focus=friendFocus??cameraFocus;
 return <Canvas className="crew-town-3d-canvas" onPointerMissed={onDeselect}
   camera={{position:typeof window!=="undefined"&&window.innerWidth<720?[1.1,8.95,11.75]:[5.1,9.9,13.9],fov:typeof window!=="undefined"&&window.innerWidth<720?46:40,near:.1,far:230}}
   dpr={[1,Math.min(1.5,typeof window!=="undefined"?window.devicePixelRatio:1.5)]}
   gl={{antialias:true,alpha:false,powerPreference:"low-power",stencil:false}}
   frameloop={reducedMotion||!visible?"demand":"always"}
   onCreated={({gl})=>{gl.setClearColor(night?"#303f56":"#eaf0e3")}}
   fallback={<span>WebGL unavailable</span>}>
  <color attach="background" args={[night?"#303f56":"#eaf0e3"]}/>
  <fog attach="fog" args={[night?"#303f56":"#eaf0e3",100,220]}/>
  <hemisphereLight args={[night?"#8ea8d9":"#fff8e9","#75857b",night?.95:1.7]}/>
  <ambientLight intensity={night?.45:.65}/>
  <directionalLight position={[-5,13,8]} color={night?"#b7c6eb":"#fff0d0"} intensity={night?1.2:2.0}/>
  <directionalLight position={[10,7,-6]} color={night?"#718ebd":"#d4e8d9"} intensity={night?.3:.65}/>
  <TownCharacters reducedMotion={reducedMotion}
   selected={selected?.type==="person"?selected.id:null} onSelect={onFriend} onMove={trackActor}/>
  <TownModelsBoundary onFailure={onSimplified} fallback={<TownSimpleWorld onSelect={onPlace}/>}>
   <Suspense fallback={null}>
    <TownEnvironment night={night} zh={zh} selected={selected?.type==="place"?selected.id:null} onSelect={onPlace}/>
    <TownDecorations reducedMotion={reducedMotion} night={night}/>
    <TownDistricts zh={zh} night={night}/>
   </Suspense>
  </TownModelsBoundary>
  <TownCameraController focus={focus} view={view} district={district} reducedMotion={reducedMotion} reset={reset}/>
  <ContextWatch onFailure={onFailure}/>
 </Canvas>;
}
