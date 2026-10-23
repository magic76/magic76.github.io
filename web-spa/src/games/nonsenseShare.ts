import type {NonsenseLanguage} from "./nonsenseTopics";
import type {NonsenseVerdict} from "./nonsenseJudge";

type ShareCard={topic:string;judgeName:string;score:NonsenseVerdict;language:NonsenseLanguage;link:string};
type ShareOutcome="shared"|"downloaded"|"copied"|"cancelled";

function wrapCanvasText(ctx:CanvasRenderingContext2D,text:string,maxWidth:number,maxLines:number):string[]{
 const result:string[]=[];
 let line="";
 for(const char of Array.from(text)){
  if(char==="\n"){result.push(line);line="";continue;}
  if(ctx.measureText(line+char).width>maxWidth&&line){result.push(line);line=char;}
  else line+=char;
 }
 if(line)result.push(line);
 if(result.length>maxLines){
  result.length=maxLines;
  let tail=result[maxLines-1];
  while(tail&&ctx.measureText(tail+"…").width>maxWidth)tail=tail.slice(0,-1);
  result[maxLines-1]=tail+"…";
 }
 return result;
}
function rounded(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number,color:string){
 ctx.beginPath();if(typeof ctx.roundRect==="function")ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);ctx.fillStyle=color;ctx.fill();
}
function paintText(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,width:number,maxLines:number,lineHeight:number){
 const lines=wrapCanvasText(ctx,text,width,maxLines);
 lines.forEach((line,i)=>ctx.fillText(line,x,y+i*lineHeight));
 return lines.length;
}
/** This image contains only topic, selected judge, Gemini verdict and public link — never transcript. */
export function renderNonsenseCard(card:ShareCard):HTMLCanvasElement{
 const canvas=document.createElement("canvas");
 canvas.width=1080;canvas.height=1350;
 const ctx=canvas.getContext("2d");
 if(!ctx)throw Error("Canvas unavailable");
 const zh=card.language==="zh",score=card.score;
 const gradient=ctx.createLinearGradient(0,0,1080,1350);
 gradient.addColorStop(0,"#241f34");gradient.addColorStop(.57,"#3b2540");gradient.addColorStop(1,"#663c39");
 ctx.fillStyle=gradient;ctx.fillRect(0,0,1080,1350);
 ctx.fillStyle="#f9d79c";ctx.font="bold 36px system-ui,sans-serif";ctx.fillText("CREW  /  PLAY",78,100);
 ctx.font="bold 23px system-ui,sans-serif";ctx.fillStyle="#e9af91";ctx.fillText("✦ NONSENSE CHAMPIONSHIP ✦",78,148);
 rounded(ctx,62,199,956,1030,44,"#fff9f0");
 ctx.fillStyle="#926047";ctx.font="bold 29px system-ui,sans-serif";
 ctx.fillText(zh?"今日荒謬命題":"TODAY'S ABSURD CLAIM",112,284);
 ctx.fillStyle="#2c2c33";ctx.font="bold 48px system-ui,sans-serif";
 const topicLines=paintText(ctx,card.topic,112,364,855,3,67);
 const infoTop=385+(topicLines-1)*32;
 ctx.fillStyle="#8d5e4a";ctx.font="bold 30px system-ui,sans-serif";
 ctx.fillText((zh?"評審：":"JUDGE: ")+card.judgeName,112,infoTop+73);
 ctx.fillStyle="#b56b4b";ctx.font="900 168px system-ui,sans-serif";
 ctx.fillText(String(score.total),104,infoTop+278);
 ctx.font="bold 39px system-ui,sans-serif";ctx.fillText("/ 100",446,infoTop+264);
 ctx.fillStyle="#58443d";ctx.font="bold 28px system-ui,sans-serif";
 const names=zh?["創意與荒謬度","歪理邏輯","切合題目","表達與完整度"]:["Creativity","Absurd logic","Relevance","Structure"];
 const amounts=[score.creativity,score.logic,score.relevance,score.delivery];
 const limits=[35,25,20,20];
 for(let i=0;i<4;i++){
  const y=infoTop+335+i*75;
  ctx.fillStyle="#57483e";ctx.fillText(names[i],112,y);
  ctx.textAlign="right";ctx.fillStyle="#ac684d";ctx.fillText(amounts[i]+" / "+limits[i],925,y);ctx.textAlign="left";
  rounded(ctx,112,y+16,814,9,5,"#ead9ce");
  rounded(ctx,112,y+16,814*(amounts[i]/limits[i]),9,5,"#c37755");
 }
 const feedbackTop=infoTop+655;
 rounded(ctx,107,feedbackTop-46,865,194,24,"#f2e4d7");
 ctx.font="27px system-ui,sans-serif";ctx.fillStyle="#503b37";
 paintText(ctx,score.comment,137,feedbackTop+2,795,4,38);
 ctx.fillStyle="#f7dec0";ctx.font="bold 30px system-ui,sans-serif";
 ctx.fillText("3SSSI.COM  /  CREW PLAY",79,1299);
 return canvas;
}
function pngBlob(canvas:HTMLCanvasElement):Blob{
 // Web Share requires a transient user activation. toBlob() is asynchronous and
 // may consume that gesture in Android WebView before navigator.share can run.
 // A synchronous PNG capture keeps the share call in the original click turn.
 const data=canvas.toDataURL("image/png");
 if(!data.startsWith("data:image/png;base64,"))throw Error("PNG encoding failed");
 const encoded=data.slice("data:image/png;base64,".length);
 const binary=atob(encoded),bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return new Blob([bytes],{type:"image/png"});
}
export async function shareNonsenseScorecard(card:ShareCard):Promise<ShareOutcome>{
 const blob=pngBlob(renderNonsenseCard(card));
 const file=new File([blob],"crew-nonsense-score.png",{type:"image/png"});
 const message=(card.language==="zh"?"我的 Crew 胡說大賽成績：":"My Crew Nonsense Championship score: ")+card.score.total+"/100 — "+card.topic+"\n"+card.link;
 const shareData:ShareData={title:"Crew Nonsense Championship",text:message,files:[file]};
 if(typeof navigator.share==="function"&&typeof navigator.canShare==="function"&&navigator.canShare({files:[file]})){
  try{await navigator.share(shareData);return "shared";}
  catch(e){if(e instanceof DOMException&&e.name==="AbortError")return "cancelled";}
 }
 // Android WebView and desktop can save the card without Web Share API support.
 if(typeof URL.createObjectURL==="function"){
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="crew-nonsense-score.png";document.body.appendChild(a);
  a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
  return "downloaded";
 }
 if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(message);return "copied";}
 throw Error("Sharing is unsupported");
}
