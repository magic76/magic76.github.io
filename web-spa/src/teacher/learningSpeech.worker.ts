// Runs the existing Kitten ONNX path off the UI thread; English alone uses Nano int4.
type LearningSpeechSpeed="normal"|"slow";
type RawVoice={rows:number;cols:number;data:Float32Array};
type TinyEngine={session:any;ort:any;phonemize:(text:string,options?:any)=>Promise<string>|string;vocab:Record<string,number>;voices:Record<string,RawVoice>};
type TinyWorkerRequest={id:number;type:"prepare"|"generate";language:string;text?:string;speed?:LearningSpeechSpeed};
type WorkerScope={caches:CacheStorage;ort?:any;importScripts:(...urls:string[])=>void;postMessage:(message:unknown,transfer?:Transferable[])=>void;onmessage:((event:MessageEvent<TinyWorkerRequest>)=>void)|null};
const scope=self as unknown as WorkerScope;
const ORT_JS="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/ort.min.js";
const ORT_BASE="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/";
const PAKO_URL="https://esm.sh/pako@2.1.0";
const UCCHARAN_BASE="https://cdn.jsdelivr.net/npm/uccharan@1.0.0/";
const UCCHARAN_URL=UCCHARAN_BASE+"index.js";
const PICO_BASE="https://huggingface.co/KittenML/kitten-tts-2-pico/resolve/main/";
const NANO_BASE="https://huggingface.co/KittenML/kitten-tts-2-nano/resolve/main/";
const tinyEngines=new Map<string,Promise<TinyEngine>>();
const importExternal=(url:string)=>import(/* @vite-ignore */ url) as Promise<any>;
let ortPromise:Promise<any>|null=null;
function getRuntime():Promise<any>{
 if(!ortPromise)ortPromise=Promise.resolve().then(()=>{
  scope.importScripts(ORT_JS);
  const ort=scope.ort;if(!ort)throw Error("ORT_UNAVAILABLE");
  ort.env.wasm.numThreads=1;ort.env.wasm.wasmPaths=ORT_BASE;
  return ort;
 }).catch(error=>{ortPromise=null;throw error});
 return ortPromise;
}
async function fetchCached(url:string):Promise<Uint8Array>{
 const cacheName="koolo-learning-speech-v1";
 if("caches" in scope){
  try{
   const cache=await scope.caches.open(cacheName),hit=await cache.match(url);
   if(hit)return new Uint8Array(await hit.arrayBuffer());
   const response=await fetch(url);if(!response.ok)throw new Error("HTTP_"+response.status);
   try{await cache.put(url,response.clone())}catch{}
   return new Uint8Array(await response.arrayBuffer());
  }catch{}
 }
 const response=await fetch(url);if(!response.ok)throw new Error("HTTP_"+response.status);
 return new Uint8Array(await response.arrayBuffer());
}
function float16ToFloat(bits:number){
 const sign=(bits&0x8000)?-1:1,exp=(bits>>10)&0x1f,frac=bits&0x3ff;
 if(exp===0)return sign*Math.pow(2,-14)*(frac/1024);
 if(exp===31)return frac?NaN:sign*Infinity;
 return sign*Math.pow(2,exp-15)*(1+frac/1024);
}
function parseNPY(data:Uint8Array):RawVoice|null{
 if(data.length<10||data[0]!==0x93)return null;
 const view=new DataView(data.buffer,data.byteOffset,data.byteLength),major=data[6],base=major>=2?12:10;
 const headerLength=major>=2?view.getUint32(8,true):view.getUint16(8,true);
 const header=new TextDecoder().decode(data.slice(base,base+headerLength));
 const match=header.match(/shape[^\(]*\(([^\)]*)\)/);if(!match)return null;
 const shape=match[1].split(",").map(part=>Number(part.trim())).filter(Number.isFinite),start=base+headerLength;
 const isF16=header.includes("f2"),bytes=isF16?2:4,count=Math.floor((data.length-start)/bytes),floats=new Float32Array(count);
 const raw=new DataView(data.buffer,data.byteOffset+start,data.length-start),big=header.includes(">f");
 for(let i=0;i<count;i++)floats[i]=isF16?float16ToFloat(raw.getUint16(i*2,!big)):raw.getFloat32(i*4,!big);
 return{rows:shape.length>=2?shape[0]:1,cols:shape.length>=2?shape[1]:shape[0],data:floats};
}
async function parseNPZ(data:Uint8Array):Promise<Record<string,RawVoice>>{
 const {inflateRaw}=await importExternal(PAKO_URL),out:Record<string,RawVoice>={};
 const view=new DataView(data.buffer,data.byteOffset,data.byteLength),decoder=new TextDecoder();let offset=0;
 while(offset+30<=data.length&&view.getUint32(offset,true)===0x04034b50){
  const method=view.getUint16(offset+8,true),size=view.getUint32(offset+18,true),nameLength=view.getUint16(offset+26,true),extraLength=view.getUint16(offset+28,true);
  const nameStart=offset+30,dataStart=nameStart+nameLength+extraLength,dataEnd=dataStart+size;if(dataEnd>data.length)break;
  const name=decoder.decode(data.slice(nameStart,nameStart+nameLength));
  if(name.endsWith(".npy")){
   let raw=data.slice(dataStart,dataEnd);
   if(method===8)raw=inflateRaw(raw);else if(method!==0){offset=dataEnd;continue}
   const parsed=parseNPY(raw);if(parsed)out[name.slice(0,-4)]=parsed;
  }
  offset=dataEnd;
 }
 return out;
}
function g2pLanguage(language:string){return language==="en"?"en-us":language}
async function loadTiny(language:string):Promise<TinyEngine>{
 const prior=tinyEngines.get(language);if(prior)return prior;
 const promise=(async()=>{
  const ort=await getRuntime();
  const isEnglish=language==="en",base=isEnglish?NANO_BASE:PICO_BASE;
  const g2pLang=g2pLanguage(language);
  const modelName=isEnglish?"kitten_tts_2_nano_en_int4.onnx":"kitten_tts_2_pico_"+language+"_int4.onnx";
  const [{init,loadLanguage,phonemizeSync},model,voiceData,vocabData,wasm,pack]=await Promise.all([
   importExternal(UCCHARAN_URL),
   fetchCached(base+modelName),
   fetchCached(base+"voices_"+language+".npz"),
   fetchCached(base+"vocab.json"),
   fetchCached(UCCHARAN_BASE+"dist/uccharan_wasm_bg.wasm"),
   fetchCached(UCCHARAN_BASE+"data/"+g2pLang+".ucd")
  ]);
  await init({wasm});
  await loadLanguage(g2pLang,pack);
  const voices=await parseNPZ(voiceData);
  const session=await ort.InferenceSession.create(model,{executionProviders:["wasm"],graphOptimizationLevel:"all",intraOpNumThreads:1});
  return{session,ort,phonemize:phonemizeSync,vocab:JSON.parse(new TextDecoder().decode(vocabData)),voices};
 })().catch(error=>{tinyEngines.delete(language);throw error});
 tinyEngines.set(language,promise);return promise;
}
function encodeTiny(phonemes:string,vocab:Record<string,number>){
 const ids:number[]=[];for(const ch of phonemes){if(Object.prototype.hasOwnProperty.call(vocab,ch))ids.push(vocab[ch]);else if((ch==="("||ch===")")&&vocab[","]!==undefined)ids.push(vocab[","])}
 return[0,...ids,10,0];
}
function trimTiny(samples:Float32Array,durations:number[]){
 let output=samples;
 if(durations.length){
  const total=durations.reduce((sum,value)=>sum+value,0),spf=Math.max(1,Math.round(output.length/Math.max(total,1)));
  const lead=Math.max(0,(durations[0]-1)*spf),trail=Math.max(0,(durations[durations.length-1]-1)*spf);
  if(lead+trail+spf<output.length)output=output.slice(lead,trail?output.length-trail:undefined);
 }
 const copy=new Float32Array(output),fade=Math.min(120,Math.floor(copy.length/8));
 for(let i=0;i<fade;i++){const gain=i/Math.max(1,fade-1);copy[i]*=gain;copy[copy.length-1-i]*=gain}
 return copy;
}
function wavBlob(samples:Float32Array,rate=24000){
 const buffer=new ArrayBuffer(44+samples.length*2),view=new DataView(buffer);
 const write=(offset:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i))};
 write(0,"RIFF");view.setUint32(4,36+samples.length*2,true);write(8,"WAVE");write(12,"fmt ");view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,"data");view.setUint32(40,samples.length*2,true);
 for(let i=0;i<samples.length;i++){const value=Math.max(-1,Math.min(1,samples[i]));view.setInt16(44+i*2,value<0?value*32768:value*32767,true)}
 return new Blob([buffer],{type:"audio/wav"});
}
async function tinyBlob(text:string,language:string,speed:LearningSpeechSpeed){
 const engine=await loadTiny(language);
 const phonemes=String(await engine.phonemize(text,{lang:g2pLanguage(language),profile:"kitten"}));
 const tokens=encodeTiny(phonemes,engine.vocab);if(tokens.length<4||tokens.length>353)throw new Error("TINY_INPUT_UNSUPPORTED");
 const voices=engine.voices;const voice=voices[language==="en"?"eleanor":Object.keys(voices)[0]]||voices[Object.keys(voices)[0]];if(!voice)throw new Error("TINY_VOICE_UNAVAILABLE");
 const row=Math.min(tokens.length-1,voice.rows-1),style=voice.data.slice(row*voice.cols,(row+1)*voice.cols);
 const feeds={
  input_ids:new engine.ort.Tensor("int64",BigInt64Array.from(tokens.map(value=>BigInt(value))),[1,tokens.length]),
  style:new engine.ort.Tensor("float32",style,[1,style.length]),
  speed:new engine.ort.Tensor("float32",Float32Array.of(speed==="slow"?0.85:1),[1])
 };
 const values=Object.values(await engine.session.run(feeds)) as any[];
 const waveform=values.find(value=>value?.data instanceof Float32Array),duration=values.find(value=>value?.data instanceof BigInt64Array||value?.data instanceof Int32Array||value?.data instanceof Uint32Array);
 if(!waveform)throw new Error("TINY_EMPTY_AUDIO");
 const durations=duration?Array.from(duration.data as ArrayLike<number|bigint>,value=>typeof value==="bigint"?Number(value):Number(value)):[];
 return wavBlob(trimTiny(new Float32Array(waveform.data),durations));
}

let queue=Promise.resolve();
scope.onmessage=event=>{
 const request=event.data;
 queue=queue.catch(()=>{}).then(async()=>{
  try{
   if(request.type==="prepare"){
    await loadTiny(request.language);
    scope.postMessage({id:request.id,ok:true});
    return;
   }
   if(request.type==="generate"&&typeof request.text==="string"){
    const audio=await tinyBlob(request.text,request.language,request.speed||"normal");
    const buffer=await audio.arrayBuffer();
    scope.postMessage({id:request.id,ok:true,buffer},[buffer]);
    return;
   }
   throw Error("TINY_REQUEST_INVALID");
  }catch(error){
   scope.postMessage({id:request.id,ok:false,error:error instanceof Error?error.message:String(error)});
  }
 });
};
