import type {FortuneCardModel} from "./fortuneCardModel";
import {fortuneCopy,fortuneLocale} from "./fortuneJourneyI18n";

/** A single public archetype card, shared by the reading and identity entry points.
 * Never pass raw chart facts or birth profiles to this Canvas renderer.
 */
type Palette={accent:string;line:string;mist:string;chip:string};
const palette:Record<FortuneCardModel["mode"],Palette>={
 bazi:{accent:"#62508b",line:"#a18cce",mist:"#f5f1fc",chip:"#ece6f8"},
 tarot:{accent:"#554093",line:"#9d88da",mist:"#f3efff",chip:"#e8e2fc"},
 vedic:{accent:"#246482",line:"#77bbd0",mist:"#edf8fb",chip:"#e4f3fa"}
};
type Copy={headings:readonly [string,string,string];action:string;reminder:string;traits:string};
const cardCopy:Record<string,Copy>={
 "zh-TW":{headings:["命格輪廓","行動線索","成長提醒"],action:"從這兩個特質出發，回想自己在合作、抉擇與面對改變時，通常怎麼開始第一步。",reminder:"遇到壓力或不同意見時，試著多留一些選擇空間。命格是一個反思線索，不是替自己貼上的標籤。",traits:"命格關鍵詞"},
 en:{headings:["Archetype","Your approach","Growth reminder"],action:"Use these traits to reflect on how you collaborate, choose a direction and take your first step.",reminder:"When pressure rises or views differ, leave room for another approach. A card is a prompt for reflection, not a verdict.",traits:"Key traits"},
 ja:{headings:["タイプの特徴","行動のヒント","成長のヒント"],action:"この特徴をヒントに、協力するときや大切な選択をするときの自分の行動を振り返ってみましょう。",reminder:"意見が分かれたときは別の選択肢にも目を向けましょう。このカードは自己理解のためのヒントです。",traits:"特徴"},
 es:{headings:["Tu arquetipo","Cómo actúas","Para crecer"],action:"Usa estos rasgos para reflexionar sobre cómo colaboras, decides y das el primer paso.",reminder:"Ante la presión o el desacuerdo, considera otra perspectiva. La carta invita a reflexionar, no a etiquetarte.",traits:"Rasgos clave"},
 "pt-BR":{headings:["Seu arquétipo","Como você age","Para evoluir"],action:"Use esses traços para pensar em como você colabora, toma decisões e dá o primeiro passo.",reminder:"Diante de pressão ou divergências, considere outras opções. Esta carta é um convite à reflexão, não um rótulo.",traits:"Traços principais"},
 id:{headings:["Arketipemu","Cara bertindak","Untuk berkembang"],action:"Gunakan sifat ini untuk merenungkan caramu bekerja sama, memilih arah, dan mengambil langkah pertama.",reminder:"Saat tertekan atau berbeda pendapat, sisakan ruang untuk cara lain. Kartu ini bahan refleksi, bukan label.",traits:"Sifat utama"},
 fr:{headings:["Votre archétype","Votre approche","Piste de progrès"],action:"Ces traits invitent à réfléchir à votre façon de collaborer, de choisir et de faire le premier pas.",reminder:"Sous pression ou en cas de désaccord, envisagez une autre voie. Cette carte invite à réfléchir, sans vous définir.",traits:"Traits clés"},
 de:{headings:["Dein Archetyp","Deine Herangehensweise","Impuls zum Wachsen"],action:"Nutze diese Merkmale, um über Zusammenarbeit, Entscheidungen und erste Schritte nachzudenken.",reminder:"Bei Druck oder Meinungsverschiedenheiten lohnt sich ein zweiter Blick. Die Karte ist ein Denkanstoß, kein Urteil.",traits:"Merkmale"},
 ko:{headings:["나의 유형","행동의 단서","성장을 위한 힌트"],action:"이 특징을 통해 협업하고 선택하고 첫걸음을 내딛는 자신의 방식을 돌아보세요.",reminder:"압박이나 의견 차이가 있을 때 다른 선택지도 떠올려 보세요. 이 카드는 자기 성찰을 위한 힌트입니다.",traits:"핵심 특성"},
 vi:{headings:["Kiểu tính cách","Cách hành động","Gợi ý phát triển"],action:"Hãy dùng những đặc điểm này để suy ngẫm về cách bạn hợp tác, lựa chọn và bắt đầu hành động.",reminder:"Khi áp lực hoặc bất đồng xuất hiện, hãy cân nhắc hướng khác. Lá thẻ là gợi ý tự nhìn lại, không phải nhãn dán.",traits:"Đặc điểm chính"},
 th:{headings:["ลักษณะของคุณ","แนวทางการลงมือทำ","แนวทางเติบโต"],action:"ใช้ลักษณะเหล่านี้ทบทวนวิธีร่วมมือ ตัดสินใจ และเริ่มลงมือของคุณ",reminder:"เมื่อเผชิญแรงกดดันหรือความเห็นต่าง ลองเปิดใจต่อทางเลือกอื่น การ์ดนี้ช่วยให้ทบทวนตัวเอง ไม่ใช่คำตัดสิน",traits:"ลักษณะเด่น"}
};

function rounded(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number,fill:string){
 ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();
}
function strokeRounded(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number,color:string,width=2){
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.stroke();
}
function line(ctx:CanvasRenderingContext2D,x1:number,y1:number,x2:number,y2:number,color:string,width=2){
 ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke();
}
function wrap(ctx:CanvasRenderingContext2D,value:string,maxWidth:number,maxLines:number):string[]{
 const chars=Array.from(value.trim()),out:string[]=[];let current="";
 for(let i=0;i<chars.length;i++){
  const ch=chars[i];
  if(ch==="\n"){out.push(current);current="";if(out.length===maxLines)return out;continue}
  if(ctx.measureText(current+ch).width>maxWidth&&current){
   out.push(current);current=ch;
   if(out.length===maxLines){
    let last=out[maxLines-1];
    while(last.length>1&&ctx.measureText(last+"…").width>maxWidth)last=last.slice(0,-1);
    out[maxLines-1]=last+"…";return out;
   }
  }else current+=ch;
 }
 if(current&&out.length<maxLines)out.push(current);
 return out;
}
function drawWrapped(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,maxWidth:number,maxLines=2,size=26,step=33){
 ctx.font="400 "+size+"px system-ui,sans-serif";
 const lines=wrap(ctx,value,maxWidth,maxLines);
 lines.forEach((t,i)=>ctx.fillText(t,x,y+i*step));
}
function fitTitle(ctx:CanvasRenderingContext2D,title:string,maxWidth:number){
 let size=58;
 while(size>34){
  ctx.font="800 "+size+"px system-ui,sans-serif";
  if(ctx.measureText(title).width<=maxWidth)break;
  size-=2;
 }
 ctx.font="800 "+size+"px system-ui,sans-serif";
}
function drawFrame(ctx:CanvasRenderingContext2D,paint:Palette){
 // Narrow, angular HUD border on a pale neutral field. Never add a colored outer poster.
 ctx.save();ctx.strokeStyle=paint.line;ctx.lineWidth=3;
 ctx.beginPath();
 ctx.moveTo(83,35);ctx.lineTo(995,35);ctx.lineTo(1041,80);ctx.lineTo(1041,1260);
 ctx.lineTo(994,1315);ctx.lineTo(86,1315);ctx.lineTo(39,1267);ctx.lineTo(39,81);ctx.closePath();ctx.stroke();
 ctx.strokeStyle="#ffffff";ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(112,46);ctx.lineTo(348,46);ctx.moveTo(733,46);ctx.lineTo(969,46);
 ctx.moveTo(54,117);ctx.lineTo(54,275);ctx.moveTo(1026,1081);ctx.lineTo(1026,1243);ctx.stroke();
 ctx.shadowBlur=12;ctx.shadowColor=paint.line;
 for(const [x,sgn] of [[72,1],[1008,-1]]){
  line(ctx,x,82,x+sgn*25,57,paint.line,5);
  line(ctx,x,1267,x+sgn*25,1293,paint.line,5);
 }
 ctx.restore();
 for(let i=0;i<4;i++){
  rounded(ctx,118+i*15,1292,7,7,3,paint.line);
  rounded(ctx,916+i*15,1292,7,7,3,paint.line);
 }
}
function photo(ctx:CanvasRenderingContext2D,model:FortuneCardModel,art:HTMLImageElement|null|undefined,paint:Palette){
 const x=91,y=157,w=898,h=505;
 rounded(ctx,x,y,w,h,26,paint.mist);
 const ready=Boolean(art?.complete&&art.naturalWidth>0&&art.naturalHeight>0);
 ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,26);ctx.clip();
 if(ready&&art){
  const scale=Math.min(w/art.naturalWidth,h/art.naturalHeight);
  const sw=art.naturalWidth*scale,sh=art.naturalHeight*scale;
  ctx.drawImage(art,x+(w-sw)/2,y+(h-sh)/2,sw,sh);
 }else{
  const glow=ctx.createRadialGradient(540,405,25,540,405,320);
  glow.addColorStop(0,"#ffffff");glow.addColorStop(1,paint.mist);
  ctx.fillStyle=glow;ctx.fillRect(x,y,w,h);
  ctx.fillStyle=paint.accent;ctx.font="800 120px system-ui,sans-serif";
  ctx.textAlign="center";ctx.fillText(model.symbol,540,452);ctx.textAlign="left";
 }
 ctx.restore();
 strokeRounded(ctx,x,y,w,h,26,"#ffffff",7);
 strokeRounded(ctx,x+5,y+5,w-10,h-10,23,paint.line,2);
 // Two precise corner brackets are enough to suggest tech without obscuring the character.
 line(ctx,104,181,104,226,paint.line,4);line(ctx,104,181,154,181,paint.line,4);
 line(ctx,977,593,977,638,paint.line,4);line(ctx,927,638,977,638,paint.line,4);
}
function section(ctx:CanvasRenderingContext2D,label:string,value:string,y:number,paint:Palette){
 rounded(ctx,99,y-24,7,30,4,paint.line);
 ctx.fillStyle=paint.accent;ctx.font="750 25px system-ui,sans-serif";ctx.fillText(label,124,y);
 ctx.fillStyle="#4a4557";drawWrapped(ctx,value,124,y+36,834,2,25,32);
}
export function renderCollectibleCard(model:FortuneCardModel,art?:HTMLImageElement|null,generatedAt:Date=new Date(),locale="zh-TW"):HTMLCanvasElement{
 const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1350;
 const ctx=canvas.getContext("2d");if(!ctx)throw Error("Canvas unavailable");
 const paint=palette[model.mode],lang=fortuneLocale(locale),copy=cardCopy[lang]||cardCopy.en;
 const invite=fortuneCopy(locale);
 const bg=ctx.createLinearGradient(0,0,1080,1350);
 bg.addColorStop(0,"#f9f8fc");bg.addColorStop(.55,"#f4f2f9");bg.addColorStop(1,"#eae8f5");
 ctx.fillStyle=bg;ctx.fillRect(0,0,1080,1350);
 drawFrame(ctx,paint);
 ctx.save();ctx.shadowColor="#38314b27";ctx.shadowBlur=33;ctx.shadowOffsetY=10;
 rounded(ctx,64,67,952,1202,38,"#ffffff");ctx.restore();
 strokeRounded(ctx,64,67,952,1202,38,"#ded8ef",2);
 line(ctx,85,136,995,136,paint.line,2);
 ctx.fillStyle=paint.accent;ctx.font="800 34px system-ui,sans-serif";ctx.fillText("CREW FORTUNE",92,115);
 ctx.font="600 20px system-ui,sans-serif";ctx.textAlign="right";ctx.fillText("✦  ARCHETYPE",984,114);ctx.textAlign="left";
 photo(ctx,model,art,paint);
 rounded(ctx,91,676,176,39,17,paint.chip);
 ctx.fillStyle=paint.accent;ctx.font="700 23px system-ui,sans-serif";ctx.fillText("✦ "+model.modeLabel,111,703);
 ctx.fillStyle="#28213e";fitTitle(ctx,model.title,880);ctx.fillText(model.title,94,769);
 ctx.fillStyle=paint.accent;ctx.font="600 25px system-ui,sans-serif";
 const traitLine=model.chips.length?model.chips.join("   ·   "):invite.symbolic;
 drawWrapped(ctx,traitLine,99,810,872,1,25,28);
 line(ctx,96,828,986,828,"#eae5f0",2);
 const detail=model.identity;
 const primary=detail?.core&&(lang==="zh-TW"||lang==="en")?detail.core:model.tagline;
 const behavior=detail?.behavior&&(lang==="zh-TW"||lang==="en")?detail.behavior:copy.action;
 const tension=detail?.tension&&(lang==="zh-TW"||lang==="en")?detail.tension:copy.reminder;
 section(ctx,copy.headings[0],primary,864,paint);
 line(ctx,122,937,965,937,"#eae7f2",2);
 section(ctx,copy.headings[1],behavior,964,paint);
 line(ctx,122,1038,965,1038,"#eae7f2",2);
 section(ctx,copy.headings[2],tension,1065,paint);
 line(ctx,98,1157,982,1157,"#eae7f2",2);
 ctx.fillStyle=paint.accent;ctx.font="600 20px system-ui,sans-serif";ctx.fillText(copy.traits,101,1192);
 let x=101;
 for(const chip of model.chips.slice(0,3)){
  ctx.font="650 24px system-ui,sans-serif";
  const width=Math.min(300,ctx.measureText(chip).width+54);
  if(x+width>974)break;
  rounded(ctx,x,1204,width,46,23,paint.chip);
  strokeRounded(ctx,x,1204,width,46,23,"#dcd4ee",1);
  ctx.fillStyle=paint.accent;ctx.fillText(chip,x+27,1236);x+=width+13;
 }
 // No private birth dates or individual five-element values appear in a public invite.
 const validDate=Number.isNaN(generatedAt.getTime())?new Date():generatedAt;
 const date=new Intl.DateTimeFormat(locale,{year:"numeric",month:"short",day:"numeric"}).format(validDate);
 ctx.fillStyle=paint.accent;ctx.font="600 20px system-ui,sans-serif";ctx.fillText(date,95,1303);
 ctx.font="750 26px system-ui,sans-serif";ctx.textAlign="right";
 ctx.fillText(model.cta,984,1303);ctx.textAlign="left";
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
