import{geminiKey}from"../lib/runtime";
import type{TeacherProfile}from"./teacherProfiles";
import type{AccentStrength,SpeakingPace}from"../store/teacherStore";
import{buildAccentPrompt,buildPacePrompt}from"./teacherAccent";

export type PreviewState="connecting"|"playing"|"finished"|"error";
export type PreviewStatus={state:PreviewState;message?:string};

function previewLine(language:string){
 const lang=language.toLowerCase();
 if(lang.startsWith("日")||lang.startsWith("ja"))return"こんにちは。今日は何を練習したいですか。";
 if(lang.startsWith("韓")||lang.startsWith("ko"))return"안녕하세요. 오늘은 무엇을 연습하고 싶으세요?";
 if(lang.startsWith("西")||lang.startsWith("es"))return"Hola, mucho gusto. ¿Qué te gustaría practicar hoy?";
 if(lang.startsWith("法")||lang.startsWith("fr"))return"Bonjour, enchanté. Qu'est-ce que vous aimeriez pratiquer aujourd'hui ?";
 if(lang.startsWith("中")||lang.startsWith("zh"))return"你好，很高興認識你。今天想練習什麼？";
 if(lang.startsWith("越")||lang.startsWith("vi"))return"Xin chào, rất vui được gặp bạn. Hôm nay bạn muốn luyện tập gì?";
 if(lang.startsWith("泰")||lang.startsWith("th"))return"สวัสดี ยินดีที่ได้รู้จัก วันนี้คุณอยากฝึกอะไร";
 if(lang.startsWith("葡")||lang.startsWith("pt"))return"Olá, prazer em conhecer você. O que você gostaria de praticar hoje?";
 if(lang.startsWith("印")||lang.startsWith("id"))return"Halo, senang bertemu dengan Anda. Apa yang ingin Anda latih hari ini?";
 if(lang.startsWith("德")||lang.startsWith("de"))return"Hallo, schön dich kennenzulernen. Was möchtest du heute üben?";
 if(lang.startsWith("義")||lang.startsWith("it"))return"Ciao, piacere di conoscerti. Cosa vorresti esercitare oggi?";
 return"Hello, nice to meet you. What would you like to practice today?";
}

/** One response only, no microphone and no conversation/history side effects. */
export function previewTeacherVoice(profile:TeacherProfile,targetLanguage:string,onStatus:(status:PreviewStatus)=>void,opts?:{voice?:string;languageStyle?:string;accentStrength?:AccentStrength;customAccent?:string;speakingPace?:SpeakingPace}):()=>void{
 const key=geminiKey();
 if(!key){onStatus({state:"error",message:"請先到設定新增 Gemini Key，再使用試聽。"});return()=>{}}
 const AudioCtor=window.AudioContext;
 if(!AudioCtor){onStatus({state:"error",message:"瀏覽器不支援語音播放。"});return()=>{}}
 let socket:WebSocket|null=null,ctx:AudioContext|null=null;
 let closed=false,played=false,sent=false,deadline=0,nextTime=0;
 const players=new Set<AudioBufferSourceNode>();
 function stop(){
  if(closed)return;closed=true;
  window.clearTimeout(deadline);
  if(socket){try{socket.close(1000,"preview-end")}catch{}socket=null}
  for(const node of players){try{node.stop()}catch{}try{node.disconnect()}catch{}}
  players.clear();if(ctx)void ctx.close().catch(()=>{});ctx=null;
 }
 function fail(message:string){if(closed)return;stop();onStatus({state:"error",message})}
 function finish(){if(closed)return;onStatus({state:"finished"});stop()}
 function onAudio(encoded:string,mime:string){
  if(!ctx||closed)return;
  const sampleRate=Number(/rate=(\d+)/.exec(mime)?.[1]||24000);
  if(!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>48000)return;
  let raw:string;
  try{raw=atob(encoded)}catch{return}
  if(raw.length<2)return;
  const count=Math.floor(raw.length/2),buffer=ctx.createBuffer(1,count,sampleRate),channel=buffer.getChannelData(0);
  for(let i=0;i<count;i++){
   const n=raw.charCodeAt(i*2)|(raw.charCodeAt(i*2+1)<<8);
   channel[i]=(n>32767?n-65536:n)/32768;
  }
  const node=ctx.createBufferSource();node.buffer=buffer;node.connect(ctx.destination);
  node.onended=()=>{players.delete(node);try{node.disconnect()}catch{}};
  players.add(node);
  nextTime=Math.max(nextTime,ctx.currentTime+.04);
  node.start(nextTime);nextTime+=buffer.duration;
  if(!played){played=true;onStatus({state:"playing"})}
 }
 onStatus({state:"connecting"});
 void(async()=>{
  try{
   ctx=new AudioCtor({sampleRate:48000});await ctx.resume();
   if(closed)return;
   const model="gemini-3.8-live";
   socket=new WebSocket("wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key="+encodeURIComponent(key));
   socket.onopen=()=>{
    if(closed)return;
    socket?.send(JSON.stringify({setup:{model:"models/"+model,
     generationConfig:{responseModalities:["AUDIO"],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:opts?.voice||profile.recommendedVoice}}}},
     systemInstruction:{parts:[{text:"You are "+profile.name+", a fictional Crew Teacher tutor. " + profile.personality + " Teaching strategy: " + profile.teachingStrategy + " "+buildAccentPrompt(targetLanguage,opts?.languageStyle||"auto",opts?.accentStrength,opts?.customAccent)+" "+buildPacePrompt(opts?.speakingPace)+" Give exactly one natural, short spoken response in the target language. Never claim real credentials or introduce yourself."}]}}}));
   };
   socket.onmessage=async(event:MessageEvent)=>{
    if(closed)return;
    try{
     const msg=JSON.parse(typeof event.data==="string"?event.data:await (event.data as Blob).text());
     if(msg.setupComplete||msg.setup_complete){
      if(sent)return;sent=true;
      const sample=previewLine(targetLanguage);
      socket?.send(JSON.stringify({clientContent:{turns:[{role:"user",parts:[{text:"[ONE-TURN AUDITION] Reply as the tutor to this learner: "+sample+" Correct at most one actual mistake, and ask one brief follow-up. No introduction, under 35 words."}]}],turnComplete:true}}));
     }
     const content=msg.serverContent||msg.server_content||{};
     for(const part of content.modelTurn?.parts||content.model_turn?.parts||[]){
      const audio=part.inlineData||part.inline_data;
      if(audio?.data&&String(audio.mimeType||audio.mime_type||"").startsWith("audio/pcm"))onAudio(audio.data,audio.mimeType||audio.mime_type);
     }
     if(content.turnComplete||content.turn_complete){
      if(!played){fail("老師試聽沒有收到語音，請再試一次。");return}
      if(ctx){const remaining=Math.max(0,nextTime-ctx.currentTime);window.clearTimeout(deadline);deadline=window.setTimeout(finish,Math.ceil(remaining*1000)+200)}
     }
    }catch{fail("無法讀取老師語音，請再試一次。")}
   };
   socket.onerror=()=>fail("語音試聽連線失敗，請重試。");
   socket.onclose=()=>{if(!closed&&!played)fail("試聽連線已中斷，請重試。")};
   deadline=window.setTimeout(()=>fail("語音試聽逾時，請重試。"),20000);
  }catch{fail("無法啟動語音試聽，請檢查瀏覽器設定。")}
 })();
 return stop;
}
