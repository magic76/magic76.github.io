export type MagicDragonFlightPose={
 bodyY:number;
 bodyPitch:number;
 neckPitch:number;
 neckYaw:number;
 wingPitch:[number,number];
 wingRoll:[number,number];
 tailYaw:number;
 tailPitch:number;
};

/** Renderer-owned dragon flight cycle. AI blueprints cannot inject animation code. */
export function magicDragonFlightPose(time:number,motionScale=1):MagicDragonFlightPose{
 const scale=Math.max(0,Math.min(1,Number.isFinite(motionScale)?motionScale:0));
 if(scale===0)return {bodyY:0,bodyPitch:0,neckPitch:0,neckYaw:0,wingPitch:[0,0],wingRoll:[0,0],tailYaw:0,tailPitch:0};
 const flap=Math.sin(time*2.7),glide=Math.sin(time*.72),counter=Math.sin(time*2.7+Math.PI/2);
 return {
  bodyY:(.025+counter*.035)*scale,
  bodyPitch:(-.055+glide*.035)*scale,
  neckPitch:(.07-counter*.045)*scale,
  neckYaw:glide*.055*scale,
  wingPitch:[-.08*scale,-.08*scale],
  wingRoll:[(-.18-flap*.42)*scale,(.18+flap*.42)*scale],
  tailYaw:-glide*.14*scale,
  tailPitch:(.045+counter*.055)*scale,
 };
}
