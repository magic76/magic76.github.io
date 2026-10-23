import type {NewsScene} from "./nonsenseNewsEngine";
import type {NonsenseLanguage} from "./nonsenseTopics";
type EndingCard={topic:string;scene:NewsScene;language:NonsenseLanguage;link:string};
function lines(ctx:CanvasRenderingContext2D,text:string,width:number,limit:number){
 const out:string[]=[];let line="";
 for(const char of Array.from(text)){
  if(ctx.measureText(line+char).width>width&&line){out.push(line);line=char;}else line+=char;
 }
 if(line)out.push(line);
 if(out.length>limit){out.length=limit;out[limit-1]=out[limit-1].slice(0,-2)+"…";}
 return out;
}
export function renderNewsEndingCard(card:EndingCard):HTMLCanvasElement{
 if(card.scene.type!=="finale")throw Error("Only the real ending can be shared");
 const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1350;
 const ctx=canvas.getContext("2d");if(!ctx)throw Error("Canvas unavailable");
 const gradient=ctx.createLinearGradient(0,0,1080,1350);
 gradient.addColorStop(0,"#0d2040");gradient.addColorStop(1,"#8a2748");
 ctx.fillStyle=gradient;ctx.fillRect(0,0,1080,1350);
 ctx.fillStyle="#fff";ctx.font="bold 44px system-ui,sans-serif";ctx.fillText("CREW NEWS  ● LIVE",72,115);
 ctx.fillStyle="#ffd9b5";ctx.font="bold 31px system-ui,sans-serif";
 ctx.fillText(card.language==="zh"?"荒謬新聞直播 · 大結局":"ABSURD NEWS · THE FINALE",72,200);
 ctx.fillStyle="#fff";ctx.font="bold 64px system-ui,sans-serif";
 lines(ctx,card.scene.headline,940,5).forEach((line,i)=>ctx.fillText(line,72,325+i*88));
 ctx.fillStyle="#ffd1a0";ctx.font="bold 32px system-ui,sans-serif";
 ctx.fillText(card.language==="zh"?"最後變成了這樣：":"THE UNEXPECTED OUTCOME",72,785);
 ctx.fillStyle="#fff";ctx.font="35px system-ui,sans-serif";
 lines(ctx,card.scene.ending,924,7).forEach((line,i)=>ctx.fillText(line,72,868+i*54));
 ctx.fillStyle="#d8e6ff";ctx.font="24px system-ui,sans-serif";
 lines(ctx,card.topic,930,2).forEach((line,i)=>ctx.fillText(line,72,1185+i*35));
 ctx.fillStyle="#ffd9b5";ctx.font="bold 30px system-ui,sans-serif";ctx.fillText("3SSSI.COM / CREW PLAY",72,1304);
 return canvas;
}
export async function shareNewsEnding(card:EndingCard):Promise<"shared"|"downloaded"|"copied"|"cancelled">{
 const canvas=renderNewsEndingCard(card);
 const data=canvas.toDataURL("image/png");
 const binary=atob(data.split(",")[1]||"");const bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 const file=new File([bytes],"crew-news-ending.png",{type:"image/png"});
 const message=card.scene.headline+"\n"+card.scene.ending+"\n"+card.link;
 try{
  if(navigator.share&&navigator.canShare?.({files:[file]})){
   await navigator.share({title:"Crew News",files:[file],text:message});
   return "shared";
  }
 }catch(error){if((error as Error)?.name==="AbortError")return "cancelled";}
 try{
  const a=document.createElement("a");a.href=data;a.download="crew-news-ending.png";
  document.body.appendChild(a);a.click();a.remove();return "downloaded";
 }catch{/* Android WebView may block downloads */}
 if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(message);return "copied";}
 throw Error("Sharing unavailable");
}
