import type{FortuneReading}from"./types";

export function formatFortuneShareDate(value:string):string{
 const date=new Date(value);
 return Number.isNaN(date.getTime())?"":date.toLocaleString("zh-TW",{year:"numeric",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit",hour12:false});
}
function wrap(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,max:number,lineHeight:number,maxLines:number){
 const words=Array.from(text||"");let line="",lines:string[]=[];
 for(const ch of words){
  if(ch==="\n"){lines.push(line);line="";if(lines.length>=maxLines)break;continue}
  const t=line+ch;
  if(ctx.measureText(t).width>max&&line){lines.push(line);line=ch;if(lines.length>=maxLines)break}else line=t;
 }
 if(line&&lines.length<maxLines)lines.push(line);
 lines.forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight));
 return y+lines.length*lineHeight;
}
/** Reading card shares its palette and approved Q-style character art with the identity card. */
export function renderFortuneShareCard(reading:FortuneReading,oneLine:string,art?:HTMLImageElement|null):HTMLCanvasElement{
 const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1350;
 const ctx=canvas.getContext("2d");if(!ctx)throw Error("Canvas unavailable");
 const mode={bazi:"八字",tarot:"塔羅生命靈數",vedic:"印度星盤"}[reading.mode];
 const grad=ctx.createLinearGradient(0,0,1080,1350);
 grad.addColorStop(0,"#fff8e8");grad.addColorStop(1,"#f0ecff");
 ctx.fillStyle=grad;ctx.fillRect(0,0,1080,1350);
 ctx.fillStyle="#4d3a79";ctx.font="700 35px system-ui,sans-serif";ctx.fillText("CREW FORTUNE",76,98);
 ctx.fillStyle="#78698b";ctx.font="500 25px system-ui,sans-serif";ctx.fillText(mode+" · 命盤探索",76,147);
 ctx.save();ctx.shadowColor="rgba(63,39,99,.12)";ctx.shadowBlur=38;ctx.shadowOffsetY=15;
 ctx.fillStyle="#fff";ctx.beginPath();ctx.roundRect(72,182,936,1052,38);ctx.fill();ctx.restore();
 const imageX=112,imageY=216,imageW=856,imageH=453;
 const artReady=Boolean(art?.complete&&art.naturalWidth>0&&art.naturalHeight>0);
 ctx.save();ctx.beginPath();ctx.roundRect(imageX,imageY,imageW,imageH,24);ctx.clip();
 const artworkBg=ctx.createLinearGradient(imageX,imageY,imageX+imageW,imageY+imageH);
 artworkBg.addColorStop(0,"#f1e7ff");artworkBg.addColorStop(1,"#fff3dc");
 ctx.fillStyle=artworkBg;ctx.fillRect(imageX,imageY,imageW,imageH);
 if(artReady&&art){
  const scale=Math.min(imageW/art.naturalWidth,imageH/art.naturalHeight);
  const width=art.naturalWidth*scale,height=art.naturalHeight*scale;
  ctx.drawImage(art,imageX+(imageW-width)/2,imageY+(imageH-height)/2,width,height);
 }else{
  // Keep a polished symbolic fallback if approved art is not loaded.
  ctx.fillStyle="rgba(255,255,255,.5)";ctx.beginPath();ctx.arc(540,432,188,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#b39bda";ctx.beginPath();ctx.arc(540,432,138,0,Math.PI*2);ctx.fill();
  ctx.textAlign="center";ctx.fillStyle="#fff";ctx.font="700 78px system-ui,sans-serif";
  ctx.fillText(reading.mode==="bazi"?"八字":reading.mode==="tarot"?"塔羅":"星盤",540,462);
  ctx.textAlign="left";
 }
 ctx.restore();
 ctx.fillStyle="#806e9d";ctx.font="700 24px system-ui,sans-serif";ctx.fillText("MY FORTUNE READING",112,729);
 ctx.fillStyle="#261f35";ctx.font="700 43px system-ui,sans-serif";
 const titleEnd=wrap(ctx,reading.summary||mode,112,794,848,57,2);
 const separatorY=Math.max(853,titleEnd+12);
 ctx.strokeStyle="#e4dcf0";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(112,separatorY);ctx.lineTo(968,separatorY);ctx.stroke();
 ctx.fillStyle="#756394";ctx.font="700 27px system-ui,sans-serif";
 ctx.fillText(reading.ai?.trim()?"命盤重點":"命盤一句話",112,separatorY+52);
 // AI reports can be long; the prominent headline is the existing one-line chart summary.
 ctx.fillStyle="#352b46";ctx.font="29px system-ui,sans-serif";
 const headline=(oneLine||reading.summary||mode).trim();
 wrap(ctx,headline,112,separatorY+104,847,43,Math.max(1,Math.min(5,Math.floor((1132-separatorY-104)/43)+1)));
 ctx.strokeStyle="#e4dcf0";ctx.beginPath();ctx.moveTo(112,1153);ctx.lineTo(968,1153);ctx.stroke();
 ctx.fillStyle="#78698b";ctx.font="24px system-ui,sans-serif";
 ctx.fillText(formatFortuneShareDate(reading.createdAt),112,1197);
 ctx.fillStyle="#52456f";ctx.font="22px system-ui,sans-serif";
 ctx.fillText("命理象徵僅供自我探索與參考",76,1272);
 ctx.fillStyle="#503886";ctx.font="700 29px system-ui,sans-serif";
 ctx.fillText("3sssi.com/fortune",76,1321);
 return canvas;
}
export async function buildFortuneShareFile(reading:FortuneReading,oneLine="",art?:HTMLImageElement|null):Promise<File>{
 const canvas=renderFortuneShareCard(reading,oneLine,art);
 // File construction stays synchronous before calling the native share sheet on mobile.
 const png=canvas.toDataURL("image/png"),binary=atob(png.split(",")[1]||"");
 const bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return new File([bytes],"crew-fortune.png",{type:"image/png"});
}
export async function shareFortuneReading(reading:FortuneReading,oneLine="",art?:HTMLImageElement|null):Promise<"shared"|"downloaded"|"cancelled">{
 const canvas=renderFortuneShareCard(reading,oneLine,art);
 const png=canvas.toDataURL("image/png"),binary=atob(png.split(",")[1]||"");
 const bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 const file=new File([bytes],"crew-fortune.png",{type:"image/png"});
 if(navigator.share&&navigator.canShare?.({files:[file]})){
  try{await navigator.share({title:"Crew Fortune",text:(oneLine||reading.summary)+"\nhttps://www.3sssi.com/fortune/reading?mode="+reading.mode,files:[file]});return "shared"}
  catch(e){if((e as Error)?.name==="AbortError")return "cancelled"}
 }
 const link=document.createElement("a");link.href=png;link.download=file.name;
 document.body.appendChild(link);link.click();link.remove();
 return "downloaded";
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
 ctx.font="bold 24px sans-serif";ctx.fillText("3sssi.com",825,1317);
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
