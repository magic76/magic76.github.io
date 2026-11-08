import type {FortuneReading} from "./types";
import {buildFortuneCardModel} from "./fortuneCardModel";
import {renderCollectibleCard,collectiblePngFile,nativeCollectibleShare} from "./fortuneCardCanvas";
import {fortuneInviteUrl} from "./fortuneInvite";
import {fortuneInvitation} from "./fortuneJourneyI18n";

export function formatFortuneShareDate(value:string):string{
 const date=new Date(value);
 return Number.isNaN(date.getTime())?"":date.toLocaleString("zh-TW",{year:"numeric",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit",hour12:false});
}
/** Legacy reading API now uses the same model and artwork layout as the identity card.
 * Public Canvas never receives a profile or any arbitrary report body.
 */
export function renderFortuneShareCard(reading:FortuneReading,oneLine="",art?:HTMLImageElement|null,locale="zh-TW"):HTMLCanvasElement{
 const model=buildFortuneCardModel(reading.mode,reading.result,locale,oneLine);
 return renderCollectibleCard(model,art,new Date(),locale);
}
export async function buildFortuneShareFile(reading:FortuneReading,oneLine="",art?:HTMLImageElement|null,locale="zh-TW"):Promise<File>{
 return collectiblePngFile(renderFortuneShareCard(reading,oneLine,art,locale));
}
/** Explicit sharing only; desktop no longer silently downloads a file. */
export async function shareFortuneReading(reading:FortuneReading,oneLine="",art?:HTMLImageElement|null,locale="zh-TW"):Promise<"shared"|"cancelled"|"unsupported">{
 const model=buildFortuneCardModel(reading.mode,reading.result,locale,oneLine);
 const file=await buildFortuneShareFile(reading,oneLine,art,locale);
 const url=fortuneInviteUrl(reading.mode,model.id,locale);
 return nativeCollectibleShare(file,fortuneInvitation(locale,model.title,url),url);
}

/** Daily cards retain their bounded multi-line layout, independently of collectible cards. */
function wrap(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,max:number,lineHeight:number,maxLines:number){
 const words=Array.from(text||"");let line="",lines:string[]=[];
 for(const ch of words){
  if(ch==="\n"){lines.push(line);line="";if(lines.length>=maxLines)break;continue}
  const next=line+ch;
  if(ctx.measureText(next).width>max&&line){lines.push(line);line=ch;if(lines.length>=maxLines)break}else line=next;
 }
 if(line&&lines.length<maxLines)lines.push(line);
 lines.forEach((value,i)=>ctx.fillText(value,x,y+i*lineHeight));
 return y+lines.length*lineHeight;
}

/** Daily sharing is an explicit allowlist: never read profile or any chart fields. */
export type DailyShareLabels={
 doLabel:string;avoidLabel:string;luckyColor:string;disclaimer:string;kindLabel:string;
};
export async function buildDailyShareFile(card:import("./dailyCard").DailyCard,labels:DailyShareLabels):Promise<File>{
 const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1350;
 const ctx=canvas.getContext("2d");
 if(!ctx)throw new Error("Canvas is unavailable");
 const gradient=ctx.createLinearGradient(0,0,1080,1350);
 gradient.addColorStop(0,"#fff9f0");gradient.addColorStop(1,"#efebfc");
 ctx.fillStyle=gradient;ctx.fillRect(0,0,1080,1350);
 ctx.fillStyle="#23202b";ctx.font="bold 46px sans-serif";ctx.fillText("Crew Fortune",78,111);
 ctx.font="28px sans-serif";ctx.fillStyle="#746d80";ctx.fillText(card.date,78,168);
 ctx.font="bold 27px sans-serif";ctx.fillText(labels.kindLabel,78,217);
 ctx.fillStyle="#24212d";ctx.font="bold 62px sans-serif";
 wrap(ctx,card.headline,78,327,925,80,2);
 ctx.font="31px sans-serif";ctx.fillStyle="#524e5b";
 wrap(ctx,card.theme,78,503,923,49,2);
 ctx.strokeStyle="#dad3e2";ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(78,616);ctx.lineTo(1002,616);ctx.stroke();
 ctx.fillStyle="#35303e";ctx.font="bold 31px sans-serif";
 ctx.fillText(labels.doLabel,78,677);
 ctx.font="29px sans-serif";
 wrap(ctx,"• "+card.do[0],78,734,924,39,2);
 wrap(ctx,"• "+card.do[1],78,819,924,39,2);
 ctx.font="bold 31px sans-serif";ctx.fillText(labels.avoidLabel,78,910);
 ctx.font="29px sans-serif";wrap(ctx,card.avoid,78,959,924,39,2);
 // A wide, labelled swatch uses the formerly empty lower part of the picture.
 ctx.fillStyle="#ffffffc0";ctx.fillRect(78,1046,924,143);
 ctx.fillStyle=card.luckyColor.hex;ctx.fillRect(78,1046,184,143);
 ctx.fillStyle="#35303e";ctx.font="bold 25px sans-serif";ctx.fillText(labels.luckyColor,293,1091);
 ctx.font="29px sans-serif";wrap(ctx,card.luckyColor.name+" · "+card.luckyColor.element,293,1144,668,36,2);
 ctx.fillStyle="#706879";ctx.font="23px sans-serif";
 wrap(ctx,labels.disclaimer,78,1244,916,31,2);
 ctx.font="bold 29px sans-serif";ctx.fillText("3sssi.com/fortune",78,1317);
 return new Promise<File>((resolve,reject)=>canvas.toBlob(blob=>blob?
  resolve(new File([blob],"crew-fortune-daily.png",{type:"image/png"})):
  reject(new Error("Could not create daily share card")),"image/png"));
}
export async function shareDailyCard(card:import("./dailyCard").DailyCard,labels:DailyShareLabels):Promise<void>{
 const file=await buildDailyShareFile(card,labels);
 if(navigator.share&&navigator.canShare?.({files:[file]})){
  try{await navigator.share({title:"Crew Fortune",text:card.headline,files:[file]});return;}
  catch(error){if((error as Error)?.name==="AbortError")return;}
 }
 const url=URL.createObjectURL(file),link=document.createElement("a");
 link.href=url;link.download=file.name;link.click();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
