/* Small synthesized effects: no audio downloads, no autoplay. */
(()=>{
 let ctx;
 const AC=window.AudioContext||window.webkitAudioContext;
 let muted=false;
 try{muted=localStorage.getItem('creatureLabMuted')==='1';}catch{}
 function play(kind){
  if(muted||!AC)return;
  try{
   ctx ||= new AC();
   if(ctx.state==='suspended')ctx.resume().catch(()=>{});
   const now=ctx.currentTime;
   const notes=kind==='evolve'?[440,554,659,880]:kind==='gift'?[523,784,1047]:kind==='hatch'?[330,494,659]:[600];
   notes.forEach((freq,i)=>{
    const start=now+i*(kind==='pet'?0:.075),duration=kind==='pet'?.085:.18;
    const oscillator=ctx.createOscillator(),gain=ctx.createGain();
    oscillator.type=kind==='pet'?'sine':'triangle';
    oscillator.frequency.setValueAtTime(freq,start);
    if(kind==='pet')oscillator.frequency.exponentialRampToValueAtTime(420,start+duration);
    gain.gain.setValueAtTime(.0001,start);
    gain.gain.exponentialRampToValueAtTime(kind==='pet'?.045:.035,start+.015);
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    oscillator.connect(gain);gain.connect(ctx.destination);
    oscillator.start(start);oscillator.stop(start+duration+.01);
   });
  }catch{}
 }
 function setMuted(value){
  muted=!!value;
  try{localStorage.setItem('creatureLabMuted',muted?'1':'0');}catch{}
  const button=document.getElementById('creatureSoundToggle');
  if(button){button.textContent=muted?'🔇 音效關閉':'🔊 音效開啟';button.setAttribute('aria-pressed',String(!muted));}
 }
 window.creatureSfx={play,setMuted};
 document.addEventListener('DOMContentLoaded',()=>{
  const button=document.getElementById('creatureSoundToggle');
  if(button){setMuted(muted);button.addEventListener('click',()=>setMuted(!muted));}
 });
})();
