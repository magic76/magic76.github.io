import type{FortuneReading}from"./types";

function wrap(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,max:number,lineHeight:number,maxLines:number){
 const words=Array.from(text||"");let line="",lines:string[]=[];
 for(const ch of words){const t=line+ch;if(ctx.measureText(t).width>max&&line){lines.push(line);line=ch;if(lines.length>=maxLines)break}else line=t}
 if(line&&lines.length<maxLines)lines.push(line);
 lines.forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight));
 return y+lines.length*lineHeight;
}
export async function buildFortuneShareFile(reading:FortuneReading){
 const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext("2d")!;
 const mode={bazi:"八字",tarot:"塔羅生命靈數",vedic:"印度星盤"}[reading.mode];
 const grad=ctx.createLinearGradient(0,0,1080,1350);grad.addColorStop(0,"#f8f5ee");grad.addColorStop(1,"#ece7dd");ctx.fillStyle=grad;ctx.fillRect(0,0,1080,1350);
 ctx.fillStyle="#1b1b18";ctx.font="700 42px sans-serif";ctx.fillText("Crew Fortune",72,94);
 ctx.font="700 24px sans-serif";ctx.fillStyle="#7a6f61";ctx.fillText(mode,72,142);
 ctx.fillStyle="#1b1b18";ctx.font="700 58px sans-serif";let y=250;
 y=wrap(ctx,reading.summary||mode,72,y,936,72,3)+30;
 ctx.strokeStyle="#d5cec1";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(72,y);ctx.lineTo(1008,y);ctx.stroke();y+=60;
 ctx.font="600 28px sans-serif";ctx.fillStyle="#3e3a34";ctx.fillText("白話摘要",72,y);y+=48;
 ctx.font="400 28px sans-serif";ctx.fillStyle="#49453f";y=wrap(ctx,reading.ai||"固定計算結果已完成。",72,y,936,46,14)+40;
 ctx.font="400 22px sans-serif";ctx.fillStyle="#847c70";ctx.fillText(new Date(reading.createdAt).toLocaleString(),72,1270);
 return new Promise<File>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(new File([blob],"crew-fortune.png",{type:"image/png"})):reject(new Error("無法建立分享卡")),"image/png"));
}
export async function shareFortuneReading(reading:FortuneReading){
 const file=await buildFortuneShareFile(reading);
 if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title:"Crew Fortune",text:reading.summary,files:[file]});return}
 const url=URL.createObjectURL(file);const a=document.createElement("a");a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
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
