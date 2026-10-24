import {isWalkable,MIN_FRIEND_DISTANCE,PERSON_RADIUS} from "./TownNavigation";
import type {FriendId} from "./world";

export type ResidentPosition={x:number;z:number};
export type TrafficPositions=Map<FriendId,ResidentPosition>;
export type WalkMove={x:number;z:number;moved:number;blocked:boolean};
const minSpaceSq=MIN_FRIEND_DISTANCE*MIN_FRIEND_DISTANCE;
// All residents consult the same frame-local position registry.
// Each actor takes a small, validated step: no teleports or overlapping circles.
export function advanceWithAvoidance(
 id:FriendId,x:number,z:number,toX:number,toZ:number,step:number,
 traffic:ReadonlyMap<FriendId,ResidentPosition>
):WalkMove{
 const dx=toX-x,dz=toZ-z,dist=Math.hypot(dx,dz);
 if(dist<.001||step<=0)return{x,z,moved:0,blocked:false};
 const ux=dx/dist,uz=dz/dist;
 let right=0,awayX=0,awayZ=0;
 // Predict conflict BEFORE bodies touch; passing residents prefer their own right side.
 for(const [otherId,other] of traffic){
  if(otherId===id)continue;
  const rx=other.x-x,rz=other.z-z;
  const separation=Math.hypot(rx,rz);
  if(separation<2.05&&separation>.001){
   const forward=(rx*ux+rz*uz)/separation;
   if(forward>-.15){
    const strength=Math.max(0,2.05-separation)/2.05;
    right+=strength*(forward>.15?1:.4);
    awayX-=rx/separation*strength*.9;
    awayZ-=rz/separation*strength*.9;
   }
  }
 }
 const desired:[[number,number],...[number,number][]]=[
  [ux+uz*right*2+awayX,uz-ux*right*2+awayZ],
  [ux+uz*.9,uz-ux*.9],[ux-uz*.9,uz+ux*.9],
  [uz,-ux],[-uz,ux],[ux,uz]
 ];
 const travel=Math.min(dist,step);
 for(const [vx,vz] of desired){
  const length=Math.hypot(vx,vz);
  if(length<.001)continue;
  const nx=x+vx/length*travel,nz=z+vz/length*travel;
  if(!isWalkable(nx,nz,PERSON_RADIUS))continue;
  let clear=true;
  for(const [otherId,other] of traffic){
   if(otherId===id)continue;
   if((nx-other.x)**2+(nz-other.z)**2<minSpaceSq){clear=false;break}
  }
  if(clear)return{x:nx,z:nz,moved:travel,blocked:false};
 }
 return{x,z,moved:0,blocked:true};
}
