import {useEffect,useRef} from "react";
import type {ComponentRef} from "react";
import {useFrame,useThree} from "@react-three/fiber";
import {OrbitControls} from "@react-three/drei";
import {PerspectiveCamera,Vector3} from "three";

type Props={focus:readonly [number,number,number]|null;reducedMotion:boolean;reset:number};
export function TownCameraController({focus,reducedMotion,reset}:Props){
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
  target.current.set(focus?.[0]??0,(focus?.[1]??.2)-(focus?.25:0),focus?.[2]??.6);
  // Above and in front of the landmark: the selection remains visible above the bottom sheet.
  // Overview is at least 15% closer; selection zooms in further.
  const offset=focus
   ?mobile?(narrow?new Vector3(4.8,5.9,8.6):new Vector3(4.3,5.2,7.3)):new Vector3(4.9,5.8,8.1)
   :mobile?(narrow?new Vector3(14.7,18.5,25):new Vector3(12.7,15.7,23.4))
     :new Vector3(11.9,14,19.8);
  if(camera instanceof PerspectiveCamera){camera.fov=mobile?(narrow?52:49):34;camera.updateProjectionMatrix()}
  eye.current.copy(target.current).add(offset);
  moving.current=true;
  if(reducedMotion){
   camera.position.copy(eye.current);
   controls.current?.target.copy(target.current);
   controls.current?.update();
   moving.current=false;
  }
  invalidate();
 },[focus?.[0],focus?.[1],focus?.[2],reset,reducedMotion,camera,invalidate,mobile,narrow]);

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
   enableDamping={!reducedMotion} dampingFactor={.085} enablePan={false}
   rotateSpeed={.58} zoomSpeed={.7} minDistance={7.5} maxDistance={50}
   minPolarAngle={.33} maxPolarAngle={1.16}
   minAzimuthAngle={-Math.PI} maxAzimuthAngle={Math.PI}
   target={[0,.2,.6]}
   onStart={()=>{interacting.current=true;moving.current=false}}
   onEnd={()=>{interacting.current=false}}
 />;
}
