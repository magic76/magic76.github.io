/** Return the nearest centered snap item, independent of touch or pointer type. */
export function nearestCenterIndex(centers,viewportCenter){
 if(!Number.isFinite(viewportCenter)||!centers.length)return -1;
 let best=-1,distance=Infinity;
 centers.forEach((center,index)=>{
  const next=Math.abs(center-viewportCenter);
  if(Number.isFinite(next)&&next<distance){best=index;distance=next;}
 });
 return best;
}
