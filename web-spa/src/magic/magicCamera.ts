import {Vector3} from "three";

const SCALE=Math.sqrt(10);
export const MAGIC_CAMERA_TARGET=new Vector3(0,1.05,0);
const VIEW_DIRECTION=new Vector3(12.5,11.4,18.7).normalize();
// Keep this constant for the existing camera regression test and the initial Canvas.
export const MAGIC_OVERVIEW_POSITION=new Vector3(12.5*SCALE,11.4*SCALE,18.7*SCALE).multiplyScalar(.82);

/** Fit the *horizontal* island extent, rather than applying an arbitrary mobile multiplier.
 * Bounding sphere conservatively includes an island radius of ~18, tall objects and orbit.
 * Vertical fit is also respected. The minimum distance preserves desktop composition.
 */
export function getMagicOverviewPosition(aspect:number,fov=42):Vector3{
 const a=Number.isFinite(aspect)?Math.max(.45,aspect):1;
 const vfov=fov*Math.PI/180;
 const hfov=2*Math.atan(Math.tan(vfov/2)*a);
 const fitWidth=18.8/Math.tan(hfov/2);
 const fitHeight=13.5/Math.tan(vfov/2);
 const distance=Math.max(MAGIC_OVERVIEW_POSITION.distanceTo(MAGIC_CAMERA_TARGET),fitWidth,fitHeight)*1.06;
 return MAGIC_CAMERA_TARGET.clone().addScaledVector(VIEW_DIRECTION,distance);
}
