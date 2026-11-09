/** Render real Live text deltas smoothly, even when a server delivers a whole sentence in one frame. */
export function createTypingReveal(onText:(visible:string)=>void,intervalMs=16){
 let visible="",target="",timer:ReturnType<typeof setInterval>|null=null;
 let waiting:Array<()=>void>=[];
 let stopped=false;
 const resolveWaiting=()=>{for(const resolve of waiting.splice(0))resolve()};
 const halt=()=>{if(timer!==null){clearInterval(timer);timer=null}};
 const tick=()=>{
  if(stopped)return;
  if(!target.startsWith(visible)){
   // Gemini may revise a speculative transcription; never append old words.
   let common=0;
   while(common<visible.length&&common<target.length&&visible[common]===target[common])common++;
   visible=visible.slice(0,common);
  }
  if(visible.length<target.length){
   visible=target.slice(0,visible.length+1);
   onText(visible);
  }
  if(visible===target){halt();resolveWaiting()}
 };
 const push=(value:string)=>{
  if(stopped)return;
  if(typeof value!=="string")return;
  target=value;
  if(timer===null&&visible!==target)timer=setInterval(tick,Math.max(4,intervalMs));
 };
 return{
  push,
  finish(value:string){
   if(stopped)return Promise.resolve();
   push(value);
   if(visible===target)return Promise.resolve();
   return new Promise<void>(resolve=>waiting.push(resolve));
  },
  cancel(){stopped=true;halt();resolveWaiting()}
 };
}
