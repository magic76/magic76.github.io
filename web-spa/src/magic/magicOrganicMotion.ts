export type MagicOrganicGaitPose={
 bodyY:number;
 bodyPitch:number;
 headPitch:number;
 headYaw:number;
 legPitch:[number,number,number,number];
 legRoll:[number,number,number,number];
 tailYaw:number;
 tailPitch:number;
};

const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));

/** Deterministic renderer-owned quadruped motion. AI never supplies per-frame transforms. */
export function magicOrganicGaitPose(elapsedSeconds:number,motionScale=1):MagicOrganicGaitPose{
 const t=Math.max(0,Number.isFinite(elapsedSeconds)?elapsedSeconds:0);
 const scale=clamp(Number.isFinite(motionScale)?motionScale:1,0,1);
 const gait=t*5.2,bodyWave=Math.sin(gait*2);
 const phases=[0,Math.PI,Math.PI,0] as const;
 return {
  bodyY:bodyWave*.018*scale,
  bodyPitch:bodyWave*.018*scale,
  headPitch:-bodyWave*.035*scale,
  headYaw:Math.sin(t*1.15)*.025*scale,
  legPitch:phases.map(phase=>Math.sin(gait+phase)*.32*scale) as MagicOrganicGaitPose["legPitch"],
  legRoll:phases.map(phase=>Math.sin(gait+phase)*.025*scale) as MagicOrganicGaitPose["legRoll"],
  tailYaw:Math.sin(t*1.55)*.22*scale,
  tailPitch:Math.sin(t*.9)*.055*scale,
 };
}
