import type {FortuneIdentity} from "./identity";

const invitation=(zh:boolean,mode:string)=>{
 const url="https://www.3sssi.com/fortune/reading?mode="+encodeURIComponent(mode);
 return {url,text:zh?"我在 Crew Fortune 算出了自己的命格身份！換你看看，你是哪一型？":"I found my symbolic fortune archetype on Crew Fortune. What's yours?"};
};
function wrap(ctx:CanvasRenderingContext2D,text:string,width:number,limit:number):string[]{
 const parts:string[]=[];let line="";
 for(const ch of Array.from(text)){
  if(ch==="\n"){parts.push(line);line="";continue}
  if(ctx.measureText(line+ch).width>width&&line){parts.push(line);line=ch}else line+=ch;
 }
 if(line)parts.push(line);
 if(parts.length>limit){
  parts.length=limit;let last=parts[limit-1]||"";
  while(last&&ctx.measureText(last+"…").width>width)last=last.slice(0,-1);
  parts[limit-1]=last+"…";
 }
 return parts;
}
function paint(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,width:number,limit:number,step:number){
 wrap(ctx,text,width,limit).forEach((line,i)=>ctx.fillText(line,x,y+i*step));
}
const localeZh=(locale:string)=>/^zh(?:-|$)/i.test(locale);
/** Only the allowlisted identity DTO enters the renderer, never a FortuneReading or birth profile. */
export function renderIdentityShareCard(identity:FortuneIdentity,locale:string):HTMLCanvasElement{
 const zh=localeZh(locale),canvas=document.createElement("canvas");
 canvas.width=1080;canvas.height=1350;
 const ctx=canvas.getContext("2d");if(!ctx)throw Error("Canvas unavailable");
 const grad=ctx.createLinearGradient(0,0,1080,1350);grad.addColorStop(0,"#fff8e8");grad.addColorStop(1,"#f0ecff");
 ctx.fillStyle=grad;ctx.fillRect(0,0,1080,1350);
 ctx.fillStyle="#4d3a79";ctx.font="700 35px system-ui,sans-serif";ctx.fillText("CREW FORTUNE",76,98);
 ctx.font="500 25px system-ui,sans-serif";ctx.fillStyle="#78698b";ctx.fillText(zh?"命格身份探索":"YOUR FORTUNE ARCHETYPE",76,147);
 ctx.fillStyle="#ffffff";ctx.beginPath();ctx.roundRect(72,194,936,1034,38);ctx.fill();
 ctx.fillStyle="#e9dffc";ctx.beginPath();ctx.arc(540,305,64,0,Math.PI*2);ctx.fill();
 ctx.textAlign="center";ctx.font="700 39px system-ui,sans-serif";ctx.fillStyle="#56418f";
 const symbol=identity.mode==="tarot"?identity.symbol.slice(0,2):identity.symbol.slice(0,2);
 ctx.fillText(symbol,540,320);ctx.textAlign="left";
 ctx.fillStyle="#261f35";ctx.font="700 57px system-ui,sans-serif";
 paint(ctx,identity.title,112,428,850,2,70);
 const blocks=[
  [zh?"核心特質":"CORE THEME",identity.core],
  ...(identity.behavior?[[zh?"你可能有的習慣":"HOW YOU MAY ACT",identity.behavior]]:[]),
  ...(identity.tension?[[zh?"值得留意的另一面":"ANOTHER SIDE TO CONSIDER",identity.tension]]:[])
 ];
 let y=505;
 for(const [label,body] of blocks){
  ctx.fillStyle="#756394";ctx.font="700 27px system-ui,sans-serif";ctx.fillText(label,113,y);
  ctx.fillStyle="#30293a";ctx.font="29px system-ui,sans-serif";paint(ctx,body,113,y+49,852,3,42);
  y+=177;
 }
 ctx.strokeStyle="#dcd1ed";ctx.beginPath();ctx.moveTo(112,1032);ctx.lineTo(965,1032);ctx.stroke();
 ctx.fillStyle="#756394";ctx.font="700 25px system-ui,sans-serif";ctx.fillText(zh?"命盤依據":"CHART EVIDENCE",112,1081);
 ctx.fillStyle="#4f4962";ctx.font="22px system-ui,sans-serif";
 identity.evidence.slice(0,3).forEach((line,i)=>paint(ctx,line,112,1121+i*32,849,1,30));
 ctx.fillStyle="#52456f";ctx.font="24px system-ui,sans-serif";
 paint(ctx,zh?"命理象徵供自我探索，不是經驗驗證的人格判定。":"Symbolic reflection, not an evidence-based personality assessment.",78,1268,920,2,31);
 ctx.fillStyle="#503886";ctx.font="700 28px system-ui,sans-serif";ctx.fillText("3sssi.com/fortune",78,1322);
 return canvas;
}
function pngFile(canvas:HTMLCanvasElement):File{
 // Synchronous preparation preserves mobile Web Share user activation.
 const data=canvas.toDataURL("image/png"),binary=atob(data.split(",")[1]||"");
 const bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return new File([bytes],"crew-fortune-identity.png",{type:"image/png"});
}
export async function shareIdentityCard(identity:FortuneIdentity,locale:string):Promise<"shared"|"downloaded"|"cancelled">{
 const canvas=renderIdentityShareCard(identity,locale),file=pngFile(canvas);
 const {url,text}=invitation(localeZh(locale),identity.mode),message=text+"\n"+url;
 if(navigator.share&&navigator.canShare?.({files:[file]})){
  try{await navigator.share({title:"Crew Fortune",files:[file],text:message});return "shared"}
  catch(e){if((e as Error).name==="AbortError")return "cancelled"}
 }
 const a=document.createElement("a");a.href=canvas.toDataURL("image/png");a.download=file.name;
 document.body.appendChild(a);a.click();a.remove();return "downloaded";
}
export function identityInviteUrl(mode:string):string{return invitation(true,mode).url}
