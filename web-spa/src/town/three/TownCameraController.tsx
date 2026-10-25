import {useEffect,useRef} from "react";
import type {ComponentRef} from "react";
import {useFrame,useThree} from "@react-three/fiber";
import {OrbitControls} from "@react-three/drei";
import {PerspectiveCamera,Vector3} from "three";
import {DISTRICTS,type DistrictId} from "./world";

export type TownViewMode="close"|"overview";
type Props={focus:readonly [number,number,number]|null;district:DistrictId;view:TownViewMode;reducedMotion:boolean;reset:number};
export function TownCameraController({focus,district,view,reducedMotion,reset}:Props){
 const controls=useRef<ComponentRef<typeof OrbitControls>>(null);
 const target=useRef(new Vector3(0,.2,.6));
 const eye=useRef(new Vector3(11.9,14,19.8));
 const moving=useRef(true);
 const interacting=useRef(false);
 const {camera,invalidate,size}=useThree();
 const mobile=size.width<720;
 const aspect=size.width/Math.max(1,size.height);
 // Preserve the outer paths on especially tall phone screens.
 const narrow=mobile&&aspect<.62;

 useEffect(()=>{
  // Center the selected character or building just above the bottom sheet.
  // A human-scale initial view makes the town feel explorable immediately.
  // The original wide orbit is always available through the Overview control.
  const streetAnchor=mobile?([-4.3,.85,-.25] as const):([-2.7,.9,-.3] as const);
  const districtAnchor=DISTRICTS.find(d=>d.id===district)?.point??streetAnchor;
  const anchor=focus??(view==="close"?(district==="center"?streetAnchor:districtAnchor):null);
  target.current.set(anchor?.[0]??0,(anchor?.[1]??.2)-(focus?.25:0),anchor?.[2]??.6);
  // Overview is at least 15% closer; selection zooms in further.
  const offset=focus
   ?mobile?(narrow?new Vector3(4.8,5.9,8.6):new Vector3(4.3,5.2,7.3)):new Vector3(4.9,5.8,8.1)
   :view==="close"
     ?mobile?(narrow?new Vector3(5.4,8.1,12):new Vector3(4.7,6.4,10.8))
       :new Vector3(7.8,9,14.2)
     :mobile?new Vector3(54,74,89):new Vector3(34,42,67);
  if(camera instanceof PerspectiveCamera){
   camera.fov=focus?mobile?47:37:view==="close"?mobile?46:40:mobile?52:48;
   camera.updateProjectionMatrix();
  }
  eye.current.copy(target.current).add(offset);
  moving.current=true;
  if(reducedMotion){
   camera.position.copy(eye.current);
   controls.current?.target.copy(target.current);
   controls.current?.update();
   moving.current=false;
  }
  invalidate();
 },[focus?.[0],focus?.[1],focus?.[2],reset,reducedMotion,camera,invalidate,mobile,narrow,view,district]);

 useFrame((_state,dt)=>{
  if(document.hidden||!moving.current||interacting.current)return;
  const c=controls.current;if(!c)return;
  const alpha=1-Math.exp(-Math.min(dt,.05)*4.3);
  camera.position.lerp(eye.current,alpha);
  c.target.lerp(target.current,alpha);
  c.update();
  if(camera.position.distanceToSquared(eye.current)<.003&&c.target.distanceToSquared(target.current)<.002)moving.current=false;
 });
 return <OrbitControls ref={controls} makeDefault
   enableDamping={!reducedMotion} dampingFactor={.085} enablePan
   screenSpacePanning={false} panSpeed={1.15}
   rotateSpeed={.58} zoomSpeed={.7} minDistance={6.5} maxDistance={140}
   minPolarAngle={.28} maxPolarAngle={1.27}
   minAzimuthAngle={-Math.PI} maxAzimuthAngle={Math.PI}
   target={[0,.2,.6]}
   onStart={()=>{interacting.current=true;moving.current=false}}
   onEnd={()=>{interacting.current=false}}
   onChange={()=>{
    if(moving.current)return;
    // Keep right-drag/two-finger pan inside the expanded world boundary.
    const c=controls.current;if(!c)return;
    const x=Math.max(-23,Math.min(23,c.target.x));
    const z=Math.max(-19,Math.min(20,c.target.z));
    const dx=x-c.target.x,dz=z-c.target.z;
    if(dx||dz){c.target.x=x;c.target.z=z;camera.position.x+=dx;camera.position.z+=dz}
   }}
 />;
}
