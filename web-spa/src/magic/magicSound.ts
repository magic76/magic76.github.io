// WebAudio only. Caller must first activate from a direct user gesture.
let context:AudioContext|null=null;
export function activateMagicAudio(){
 if(typeof window==="undefined")return;
 const Constructor=window.AudioContext;
 if(!Constructor)return;
 context??=new Constructor();
 if(context.state==="suspended")void context.resume();
}
export function playMagicSound(kind:"chime"|"pop"){
 const ctx=context;if(!ctx||ctx.state!=="running")return;
 const notes=kind==="chime"?[523.25,659.25,783.99]:[880];
 notes.forEach((frequency,i)=>{
  const start=ctx.currentTime+i*(kind==="chime"?.12:0);
  const oscillator=ctx.createOscillator(),gain=ctx.createGain();
  oscillator.type="sine";oscillator.frequency.setValueAtTime(frequency,start);
  gain.gain.setValueAtTime(.0001,start);
  gain.gain.exponentialRampToValueAtTime(kind==="chime"?.055:.065,start+.022);
  gain.gain.exponentialRampToValueAtTime(.0001,start+(kind==="chime"?.33:.16));
  oscillator.connect(gain);gain.connect(ctx.destination);
  oscillator.start(start);oscillator.stop(start+(kind==="chime"?.35:.18));
  oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()};
 });
}
export function magicHaptic(enabled:boolean,reducedMotion:boolean){
 if(enabled&&!reducedMotion&&typeof navigator!=="undefined"&&typeof navigator.vibrate==="function")navigator.vibrate([12,40,18]);
}
