import {useEffect,useRef} from "react";
import type {ComponentRef} from "react";
import {useFrame,useThree} from "@react-three/fiber";
import {OrbitControls} from "@react-three/drei";
import {PerspectiveCamera,Vector3} from "three";

type Props={focus:readonly [number,number,number]|null;reducedMotion:boolean;reset:number};
export function TownCameraController({focus,reducedMotion,reset}:Props){
 const controls=useRef<ComponentRef<typeof OrbitControls>>(null);
 const target=useRef(new Vector3(0,.15,.2));
 const eye=useRef(new Vector3(14,16,23));
 const moving=useRef(true);
 const interacting=useRef(false);
 const {camera,invalidate,size}=useThree();
 const mobile=size.width<700;

 useEffect(()=>{
  target.current.set(focus?.[0]??0,focus?.[1]??.15,focus?.[2]??.2);
  // Above and in front of the landmark: the selection remains visible above the bottom sheet.
  const offset=focus?new Vector3(6.4,7.8,10.4):mobile?new Vector3(17,21,29):new Vector3(14,16,23);
  if(camera instanceof PerspectiveCamera){camera.fov=mobile?54:36;camera.updateProjectionMatrix()}
  eye.current.copy(target.current).add(offset);
  moving.current=true;
  if(reducedMotion){
   camera.position.copy(eye.current);
   controls.current?.target.copy(target.current);
   controls.current?.update();
   moving.current=false;
  }
  invalidate();
 },[focus?.[0],focus?.[1],focus?.[2],reset,reducedMotion,camera,invalidate,mobile]);

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
   target={[0,.15,.2]}
   onStart={()=>{interacting.current=true;moving.current=false}}
   onEnd={()=>{interacting.current=false}}
 />;
}
