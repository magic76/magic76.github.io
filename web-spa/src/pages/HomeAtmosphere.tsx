/** Decorative-only ambience; fixed CSS particles instead of an always-running canvas. */
const MOTES=[
 [43,25,3,0,6.8],[49,70,2,1.7,8.1],[57,14,3,2.8,7.5],
 [58,49,4,.8,8.4],[63,83,2,3.1,6.6],[66,30,3,1.4,7.7],
 [70,61,4,2.5,8.2],[74,11,2,.3,6.9],[77,39,3,1.8,7.6],
 [80,76,3,3.4,8.8],[83,22,4,.6,7.2],[86,56,2,2.1,6.5],
 [89,86,3,1.2,8.5],[91,38,3,2.6,7.3],[95,16,2,.9,8.6],
 [96,71,3,3.2,7.8],[53,91,2,1.1,9.1],[72,93,2,2.7,8]
] as const;

export function HomeAtmosphere(){
 return <div className="crew-home-atmosphere" aria-hidden="true">
  <span className="crew-home-atmosphere-halo"/>
  <span className="crew-home-atmosphere-ring outer"/>
  <span className="crew-home-atmosphere-ring inner"/>
  <span className="crew-home-atmosphere-core"/>
  {MOTES.map(([x,y,size,delay,duration],i)=><span key={i} className={"crew-home-mote "+(i%4===0?"aqua":"violet")}
   style={{left:x+"%",top:y+"%",width:size+"px",height:size+"px",animationDelay:"-"+delay+"s",animationDuration:duration+"s"}}/>)}
 </div>;
}
