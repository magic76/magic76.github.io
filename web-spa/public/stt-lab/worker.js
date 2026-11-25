// Local-only ASR. One model per worker; no speech upload.
let running=false;
self.onmessage=async({data})=>{
 if(running)return;
 running=true;
 try{
  const {model,language,pcm}=data;
  if(!["tiny","base"].includes(model)||!(pcm instanceof Float32Array)||!pcm.length||pcm.length>320000)throw Error("Invalid input");
  const started=performance.now();
  const {pipeline,env}=await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js");
  env.allowLocalModels=false;
  env.useBrowserCache=true;
  env.backends.onnx.wasm.numThreads=1;
  const asr=await pipeline("automatic-speech-recognition","Xenova/whisper-"+model,{
   device:"wasm",dtype:"q8",progress_callback:p=>{
    if(p.status==="progress")self.postMessage({type:"progress",file:p.file,percent:Math.round(p.progress||0)});
    else if(p.status==="initiate")self.postMessage({type:"progress",file:p.file});
   }
  });
  const loaded=performance.now();
  const options={task:"transcribe",return_timestamps:false};
  if(language!=="auto")options.language=language;
  const result=await asr(pcm,options);
  const ended=performance.now();
  self.postMessage({type:"result",text:String(result.text||"").trim(),loadMs:loaded-started,inferMs:ended-loaded});
 }catch(e){self.postMessage({type:"error",message:String(e?.message||e)})}
};
