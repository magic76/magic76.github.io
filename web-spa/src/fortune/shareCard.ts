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


/** Render a compact public daily card. Profile and chart details are never read. */
function wrap(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,max:number,lineHeight:number,maxLines:number){
 const chars=Array.from(text||"");let line="",lines:string[]=[];
 for(const char of chars){
  if(char==="\n"){lines.push(line);line="";if(lines.length>=maxLines)break;continue;}
  const next=line+char;
  if(ctx.measureText(next).width>max&&line){lines.push(line);line=char;if(lines.length>=maxLines)break}else line=next;
 }
 if(line&&lines.length<maxLines)lines.push(line);
 lines.forEach((value,i)=>ctx.fillText(value,x,y+i*lineHeight));
 return y+lines.length*lineHeight;
}
export type DailyShareLabels={doLabel:string;avoidLabel:string;luckyColor:string;disclaimer:string;kindLabel:string;};
async function dailyArt(src:string|undefined):Promise<HTMLImageElement|null>{
 if(!src||!/^\/fortune\/identity\/art\/(?:tarot-\d+|bazi-[a-z]+)\.webp$/.test(src))return null;
 const image=new Image();
 return new Promise(resolve=>{
  image.onload=()=>resolve(image);
  image.onerror=()=>resolve(null);
  image.src=src;
 });
}
export async function buildDailyShareFile(card:import("./dailyCard").DailyCard,labels:DailyShareLabels):Promise<File>{
 const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1350;
 const ctx=canvas.getContext("2d");
 if(!ctx)throw new Error("Canvas is unavailable");
 const gradient=ctx.createLinearGradient(0,0,1080,1350);
 gradient.addColorStop(0,"#fff8eb");gradient.addColorStop(.55,"#eee7ff");gradient.addColorStop(1,"#e7eeff");
 ctx.fillStyle=gradient;ctx.fillRect(0,0,1080,1350);
 ctx.fillStyle="#fdf0ff";ctx.beginPath();ctx.arc(940,140,270,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#c5a7d2";ctx.font="27px sans-serif";for(const [x,y] of [[90,270],[975,285],[112,733],[930,750]])ctx.fillText("✦",x,y);
 ctx.fillStyle="#33284e";ctx.font="bold 41px sans-serif";ctx.fillText("CREW FORTUNE",76,103);
 ctx.font="28px sans-serif";ctx.fillStyle="#6b5a7e";ctx.fillText(card.date+"  ·  "+labels.kindLabel,76,158);
 // Approved Q-character illustration; same-origin source, graceful art fallback.
 const art=await dailyArt(card.artSrc);
 ctx.fillStyle="#ffffffa8";ctx.fillRect(70,177,940,474);
 if(art){
  const width=835,height=470;
  ctx.drawImage(art,122,179,width,height);
 }else{
  ctx.fillStyle="#9975bb";ctx.font="225px sans-serif";ctx.textAlign="center";ctx.fillText("✦",540,535);ctx.textAlign="left";
 }
 ctx.fillStyle="#2b2340";ctx.font="bold 59px sans-serif";
 const end=wrap(ctx,card.headline,76,710,930,63,2);
 ctx.fillStyle="#5d516d";ctx.font="30px sans-serif";wrap(ctx,card.theme,76,end+18,930,40,2);
 ctx.fillStyle="#ffffffdd";ctx.fillRect(73,950,934,213);
 ctx.fillStyle="#634a8f";ctx.font="bold 28px sans-serif";ctx.fillText(labels.doLabel+" ✦",99,1007);
 ctx.fillStyle="#2b243e";ctx.font="bold 35px sans-serif";wrap(ctx,card.do[0],99,1072,856,44,2);
 ctx.fillStyle="#736a7c";ctx.font="24px sans-serif";
 wrap(ctx,labels.avoidLabel+" · "+card.avoid,81,1212,914,32,1);
 ctx.fillStyle=card.luckyColor.hex;ctx.beginPath();ctx.arc(91,1258,12,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#645773";ctx.font="22px sans-serif";ctx.fillText(labels.luckyColor+" · "+card.luckyColor.name,116,1266);
 ctx.font="18px sans-serif";ctx.fillStyle="#7e7387";wrap(ctx,labels.disclaimer,78,1304,580,20,1);
 ctx.font="bold 25px sans-serif";ctx.fillStyle="#554072";ctx.textAlign="right";ctx.fillText("3sssi.com/fortune",1003,1304);ctx.textAlign="left";
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
