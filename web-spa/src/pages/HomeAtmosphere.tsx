import {useEffect,useRef} from "react";

export type HomeProduct="teacher"|"story"|"fortune";
type Particle={x:number;y:number;size:number;phase:number;speed:number};
type Point={x:number;y:number;size:number};

const COLORS:Record<HomeProduct|"idle",readonly [number,number,number]>={
 idle:[110,125,195],teacher:[113,90,211],story:[212,143,63],fortune:[75,123,192]
};
const noise=(seed:number,salt:number)=>{
 const value=Math.sin((seed+1)*127.1+salt*311.7)*43758.5453;
 return value-Math.floor(value);
};
const createParticles=(count:number):Particle[]=>Array.from({length:count},(_,index)=>({
 x:noise(index,1),y:noise(index,2),
 size:1+noise(index,3)*1.7,
 phase:noise(index,4)*Math.PI*2,
 speed:.3+noise(index,5)*.5
}));

/**
 * Decorative network rendered only while its hero is visible.
 * Canvas is bounded and throttled, while the aurora and glass core have CSS fallbacks.
 */
export function HomeAtmosphere({activeProduct}: {activeProduct:HomeProduct|null}){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const productRef=useRef(activeProduct);
 useEffect(()=>{productRef.current=activeProduct},[activeProduct]);

 useEffect(()=>{
  const canvas=canvasRef.current;
  const scene=canvas?.parentElement;
  const hero=scene?.closest<HTMLElement>(".crew-home-intro");
  const ctx=canvas?.getContext("2d",{alpha:true});
  if(!canvas||!scene||!hero||!ctx)return;

  const motion=window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer=window.matchMedia("(hover: hover) and (pointer: fine)");
  const saveData=Boolean((navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData);
  let width=0,height=0,mobile=false,visible=true;
  let particles:Particle[]=[];
  let pointer:{x:number;y:number}|null=null;
  let ripple:{x:number;y:number,start:number}|null=null;
  let timer:number|null=null;
  let frame:number|null=null;

  const animated=()=>!motion.matches&&!saveData;
  const stop=()=>{
   if(timer!==null){window.clearTimeout(timer);timer=null}
   if(frame!==null){window.cancelAnimationFrame(frame);frame=null}
  };
  const draw=(timestamp:number)=>{
   if(!width||!height)return;
   ctx.clearRect(0,0,width,height);
   const reduced=!animated();
   const time=reduced?0:timestamp/1000;
   const firstX=width*(mobile?.53:.43);
   const active=productRef.current;
   const rgb=COLORS[active||"idle"].join(",");
   const nodes:Point[]=particles.map(p=>{
    let x=firstX+p.x*(width-firstX);
    let y=12+p.y*Math.max(1,height-24);
    if(!reduced){
     x+=Math.sin(time*p.speed+p.phase)*8;
     y+=Math.cos(time*p.speed*.8+p.phase)*8;
     if(pointer){
      const dx=pointer.x-x,dy=pointer.y-y;
      const strength=Math.max(0,1-Math.hypot(dx,dy)/150);
      x+=dx*strength*strength*.16;
      y+=dy*strength*strength*.16;
     }
    }
    return {x,y,size:p.size};
   });
   const reach=mobile?66:88;
   ctx.lineWidth=.9;
   for(let i=0;i<nodes.length;i++){
    const a=nodes[i];
    let links=0;
    for(let j=i+1;j<nodes.length&&links<3;j++){
     const b=nodes[j];
     const distance=Math.hypot(a.x-b.x,a.y-b.y);
     if(distance>reach)continue;
     const intensity=(1-distance/reach)*(active?.4:.27);
     ctx.strokeStyle="rgba("+rgb+","+intensity.toFixed(3)+")";
     ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
     if(!reduced&&(i+j)%7===0){
      const travel=(time*.3+i*.17+j*.11)%1;
      ctx.fillStyle="rgba("+rgb+",.7)";
      ctx.beginPath();
      ctx.arc(a.x+(b.x-a.x)*travel,a.y+(b.y-a.y)*travel,1.35,0,Math.PI*2);
      ctx.fill();
     }
     links++;
    }
   }
   nodes.forEach((point,index)=>{
    if(index%6===0){
     ctx.fillStyle="rgba("+rgb+",.10)";
     ctx.beginPath();ctx.arc(point.x,point.y,point.size*3.5,0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle="rgba("+rgb+","+(active?.82:.68)+")";
    ctx.beginPath();ctx.arc(point.x,point.y,point.size,0,Math.PI*2);ctx.fill();
   });
   if(ripple){
    const progress=(timestamp-ripple.start)/850;
    if(progress>=1)ripple=null;
    else{
     ctx.strokeStyle="rgba("+rgb+","+(0.28*(1-progress)).toFixed(3)+")";
     ctx.lineWidth=1.5;
     ctx.beginPath();ctx.arc(ripple.x,ripple.y,10+progress*105,0,Math.PI*2);ctx.stroke();
    }
   }
  };
  const schedule=()=>{
   if(!animated()||!visible||document.hidden||timer!==null||frame!==null)return;
   timer=window.setTimeout(()=>{
    timer=null;
    frame=window.requestAnimationFrame(time=>{
     frame=null;
     draw(time);
     schedule();
    });
   },mobile?1000/18:1000/30);
  };
  const resize=()=>{
   const bounds=scene.getBoundingClientRect();
   const nextWidth=Math.round(bounds.width),nextHeight=Math.round(bounds.height);
   if(nextWidth<=0||nextHeight<=0)return;
   mobile=window.innerWidth<=640;
   if(nextWidth!==width||nextHeight!==height||!particles.length){
    width=nextWidth;height=nextHeight;
    const dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    particles=createParticles(mobile?22:52);
   }
   draw(performance.now());
  };
  const onPointerMove=(event:PointerEvent)=>{
   if(!finePointer.matches||!animated())return;
   const rect=scene.getBoundingClientRect();
   pointer={x:event.clientX-rect.left,y:event.clientY-rect.top};
   scene.style.setProperty("--crew-parallax-x",((pointer.x/rect.width-.5)*9).toFixed(1)+"px");
   scene.style.setProperty("--crew-parallax-y",((pointer.y/rect.height-.5)*7).toFixed(1)+"px");
  };
  const onPointerLeave=()=>{
   pointer=null;
   scene.style.removeProperty("--crew-parallax-x");
   scene.style.removeProperty("--crew-parallax-y");
  };
  const onPointerDown=(event:PointerEvent)=>{
   if(!finePointer.matches||!animated())return;
   const rect=scene.getBoundingClientRect();
   ripple={x:event.clientX-rect.left,y:event.clientY-rect.top,start:performance.now()};
  };
  const onVisibility=()=>{
   if(document.hidden)stop();
   else{resize();schedule()}
  };
  const onMotion=()=>{
   if(!animated()){stop();onPointerLeave()}
   resize();schedule();
  };
  const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(resize):null;
  observer?.observe(scene);
  const intersection=typeof IntersectionObserver!=="undefined"?new IntersectionObserver(entries=>{
   visible=Boolean(entries[0]?.isIntersecting);
   if(!visible)stop();
   else{resize();schedule()}
  }):null;
  intersection?.observe(scene);
  hero.addEventListener("pointermove",onPointerMove,{passive:true});
  hero.addEventListener("pointerleave",onPointerLeave);
  hero.addEventListener("pointerdown",onPointerDown,{passive:true});
  document.addEventListener("visibilitychange",onVisibility);
  motion.addEventListener("change",onMotion);
  window.addEventListener("resize",resize,{passive:true});
  resize();schedule();

  return ()=>{
   stop();observer?.disconnect();intersection?.disconnect();
   hero.removeEventListener("pointermove",onPointerMove);
   hero.removeEventListener("pointerleave",onPointerLeave);
   hero.removeEventListener("pointerdown",onPointerDown);
   document.removeEventListener("visibilitychange",onVisibility);
   motion.removeEventListener("change",onMotion);
   window.removeEventListener("resize",resize);
   onPointerLeave();
  };
 },[]);

 return <div className="crew-home-atmosphere" data-product={activeProduct||"idle"} aria-hidden="true">
  <span className="crew-home-aurora first"/>
  <span className="crew-home-aurora second"/>
  <canvas ref={canvasRef} className="crew-home-network"/>
  <span className="crew-home-atmosphere-halo"/>
  <span className="crew-home-atmosphere-ring outer"/>
  <span className="crew-home-atmosphere-ring inner"/>
  <span className="crew-home-atmosphere-core"/>
 </div>;
}
