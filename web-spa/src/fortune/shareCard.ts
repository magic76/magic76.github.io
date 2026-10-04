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