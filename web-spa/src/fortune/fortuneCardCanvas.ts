import type {FortuneCardModel} from "./fortuneCardModel";
/** Shared renderer for reading, identity and preview. Only a public, allowlisted view model enters Canvas. */
type Palette={top:string;bottom:string;accent:string;pale:string};
const palette:Record<FortuneCardModel["mode"],Palette>={
 bazi:{top:"#fff6e5",bottom:"#f5e2c9",accent:"#805331",pale:"#f7eee0"},
 tarot:{top:"#eee7ff",bottom:"#dcd5ff",accent:"#554093",pale:"#efeafb"},
 vedic:{top:"#e1f7f8",bottom:"#d4e8fd",accent:"#22577f",pale:"#e5f3fb"}
};
function rounded(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number,fill:string){
 ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();
}
function fitted(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,w:number,lines:number,step:number):number{
 let line="",drawn=0;
 for(const ch of Array.from(text)){
  if(ch==="\n"){if(line){ctx.fillText(line,x,y+step*drawn++);line=""}continue}
  if(ctx.measureText(line+ch).width>w&&line){
   ctx.fillText(line,x,y+step*drawn++);line=ch;
   if(drawn>=lines-1)break;
  }else line+=ch;
 }
 if(drawn<lines&&line){
  while(ctx.measureText(line).width>w&&line.length>1)line=line.slice(0,-1);
  ctx.fillText(line,x,y+step*drawn++);
 }
 return drawn;
}
function shrinkToFit(ctx:CanvasRenderingContext2D,text:string,maxWidth:number,maxSize:number,minSize:number,weight="700"):number{
 let font=maxSize;
 while(font>minSize){ctx.font=weight+" "+font+"px system-ui,sans-serif";if(ctx.measureText(text).width<=maxWidth)break;font-=2}
 ctx.font=weight+" "+font+"px system-ui,sans-serif";return font;
}
export function renderCollectibleCard(model:FortuneCardModel,art?:HTMLImageElement|null,generatedAt:Date=new Date(),locale="zh-TW"):HTMLCanvasElement{
 const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1350;
 const ctx=canvas.getContext("2d");if(!ctx)throw Error("Canvas unavailable");
 const paint=palette[model.mode];
 const gradient=ctx.createLinearGradient(0,0,1080,1350);
 gradient.addColorStop(0,paint.top);gradient.addColorStop(1,paint.bottom);
 ctx.fillStyle=gradient;ctx.fillRect(0,0,1080,1350);
 ctx.fillStyle=paint.accent;ctx.font="800 37px system-ui,sans-serif";ctx.fillText("CREW FORTUNE",70,94);
 ctx.font="600 26px system-ui,sans-serif";ctx.fillText(model.modeLabel,72,145);
 ctx.save();ctx.shadowColor="rgba(30,30,50,.13)";ctx.shadowBlur=35;ctx.shadowOffsetY=15;
 rounded(ctx,62,174,956,1061,44,"#ffffff");ctx.restore();
 // The 16:9 character image is never cropped; a fallback still reads as a collectible.
 rounded(ctx,96,203,888,570,28,paint.pale);
 const imageReady=Boolean(art?.complete&&art.naturalWidth>0&&art.naturalHeight>0);
 if(imageReady&&art){
  const scale=Math.min(888/art.naturalWidth,570/art.naturalHeight);
  const width=art.naturalWidth*scale,height=art.naturalHeight*scale;
  ctx.save();ctx.beginPath();ctx.roundRect(96,203,888,570,28);ctx.clip();
  ctx.drawImage(art,96+(888-width)/2,203+(570-height)/2,width,height);ctx.restore();
 }else{
  ctx.fillStyle="#ffffff99";ctx.beginPath();ctx.arc(540,479,179,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=paint.accent;ctx.textAlign="center";
  shrinkToFit(ctx,model.symbol,270,88,48);
  ctx.fillText(model.symbol,540,504,275);ctx.textAlign="left";
 }
 ctx.fillStyle=paint.accent;ctx.font="700 24px system-ui,sans-serif";
 ctx.fillText("✦ "+model.modeLabel,101,822);
 ctx.fillStyle="#242133";ctx.font="800 54px system-ui,sans-serif";
 const titleLines=fitted(ctx,model.title,101,888,875,2,65);
 ctx.fillStyle="#4b4655";ctx.font="30px system-ui,sans-serif";
 fitted(ctx,model.tagline,101,titleLines>1?996:967,870,titleLines>1?2:3,39);
 let x=101;
 for(const chip of model.chips.slice(0,3)){
  const font=shrinkToFit(ctx,chip,305,27,22,"600");
  const width=Math.min(325,ctx.measureText(chip).width+44);
  if(x+width>984)break;
  rounded(ctx,x,1117,width,54,27,paint.pale);
  ctx.fillStyle=paint.accent;ctx.font="600 "+font+"px system-ui,sans-serif";ctx.fillText(chip,x+22,1153);
  x+=width+14;
 }
 ctx.strokeStyle="#e6e1e7";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(100,1195);ctx.lineTo(982,1195);ctx.stroke();
 ctx.fillStyle="#716d79";ctx.font="23px system-ui,sans-serif";
 const validDate=Number.isNaN(generatedAt.getTime())?new Date():generatedAt;
 const date=new Intl.DateTimeFormat(locale,{year:"numeric",month:"short",day:"numeric"}).format(validDate);
 ctx.fillText(date,101,1228);
 ctx.fillStyle=paint.accent;ctx.font="750 30px system-ui,sans-serif";
 fitted(ctx,model.cta,72,1316,933,1,35);
 return canvas;
}
export function collectiblePngFile(canvas:HTMLCanvasElement,name="crew-fortune.png"):File{
 const data=canvas.toDataURL("image/png"),binary=atob(data.split(",")[1]||"");
 const bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return new File([bytes],name,{type:"image/png"});
}
/** No fake success: the caller owns download/copy UX. Cancellation is not a failure. */
export async function nativeCollectibleShare(file:File,message:string,url:string):Promise<"shared"|"cancelled"|"unsupported">{
 if(!navigator.share)return "unsupported";
 const canFile=typeof navigator.canShare==="function"&&navigator.canShare({files:[file]});
 try{
  if(canFile)await navigator.share({title:"Crew Fortune",files:[file],text:message});
  else await navigator.share({title:"Crew Fortune",text:message.endsWith(url)?message.slice(0,-url.length).trim():message,url});
  return "shared";
 }catch(error){
  if((error as Error)?.name==="AbortError")return "cancelled";
  throw error;
 }
}
