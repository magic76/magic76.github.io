/** Small, deterministic idle gestures. No allocations or React state in the frame loop. */
export function magicBlink(t:number,offset=0){
 const period=3.7+(Math.abs(offset)%13)*.09;
 const phase=((t+offset*.37)%period+period)%period;
 if(phase>.16)return 1;
 const x=phase/.16;
 return .1+.9*Math.abs(2*x-1);
}
export function magicCreatureIdle(t:number,animated=true,offset=0){
 if(!animated)return {bob:0,look:0,tilt:0,breath:1,blink:1,tail:0,squash:1};
 const v=t+offset*.47;
 return {bob:Math.sin(v*1.25)*.028,look:Math.sin(v*.42)*.095,
  tilt:Math.sin(v*.65)*.035,breath:1+Math.sin(v*1.6)*.014,
  blink:magicBlink(t,offset),tail:Math.sin(v*.83)*.12,
  squash:1+Math.sin(v*2.1)*.024};
}
