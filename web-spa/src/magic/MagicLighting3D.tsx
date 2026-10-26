import type {MagicWorld} from "./world";
import {MAGIC_LIGHTING,type MagicPalette} from "./magicPalette";
import {MagicAtmosphere3D} from "./MagicAtmosphere3D";

type Props={world:MagicWorld;colors:MagicPalette};
export function MagicLighting3D({world,colors}:Props){
 const night=world.time==="night";
 const light=night?MAGIC_LIGHTING.night:MAGIC_LIGHTING.day;
 return <>
  <MagicAtmosphere3D sky={colors.sky} night={night}/>
  <hemisphereLight args={[light.hemisphereSky,light.hemisphereGround,light.hemisphereIntensity]}/>
  <ambientLight color={light.ambientColor} intensity={light.ambientIntensity}/>
  <directionalLight position={[-8,13,10]} color={light.sunColor} intensity={light.sunIntensity} castShadow={false}/>
  <pointLight position={[0,4,0]} color={light.magicColor} intensity={light.magicIntensity} distance={10} decay={2}/>
 </>;
}
