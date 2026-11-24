/* Koolo experimental, browser-only synthesis adapters. No synthesis HTTP requests.
 * Interfaces: Ampixa/sanoTTS (GPL-3.0 runtime, upstream-hosted), ctrltokyo/eeh-1 (Apache-2.0),
 * See model cards in index.html.
 */
"use strict";
const SANO="https://ampixa.github.io/sanoTTS/";
const EEH="https://huggingface.co/ctrltokyo/eeh-1/resolve/a42c72e45bc814946e645a69acb15a184325a9a2/demo/";
const SANO_VOICES=["https://huggingface.co/ampixa/sanoTTS/resolve/main/web/voices/","https://raw.githubusercontent.com/Ampixa/sanoTTS/master/web/voices/",SANO+"voices/"];
let adapter;
const status=(text,progress)=>postMessage({type:"status",text,progress});
async function bytes(url, label){
 let store,hit;
 try{store=await caches.open("koolo-light-tts-research-v1");hit=await store.match(url);}catch{}
 if(hit){status(label+"（快取）");return new Uint8Array(await hit.arrayBuffer());}
 status(label);
 const res=await fetch(url);if(!res.ok)throw Error(label+" HTTP "+res.status);
 const data=new Uint8Array(await res.arrayBuffer());
 try{await store?.put(url,new Response(data));}catch{}
 return data;
}
const decodeJson=data=>JSON.parse(new TextDecoder().decode(data));
async function mirrorBytes(urls,label){
 let last;
 for(const url of urls){try{return await bytes(url,label);}catch(e){last=e;}}
 throw last;
}
const sanoBytes=(key,name,label)=>mirrorBytes(SANO_VOICES.map(root=>root+key+"/"+name),label);
async function gunzip(data){
 if(data[0]!==31||data[1]!==139)return data;
 const stream=new Blob([data]).stream().pipeThrough(new DecompressionStream("gzip"));
 return new Uint8Array(await new Response(stream).arrayBuffer());
}
function joined(parts){
 const pcm=new Float32Array(parts.reduce((sum,x)=>sum+x.length,0));
 let off=0,peak=0;
 for(const a of parts){pcm.set(a,off);off+=a.length;}
 for(const x of pcm){if(!Number.isFinite(x))throw Error("模型回傳非有限音訊");peak=Math.max(peak,Math.abs(x));}
 if(!pcm.length||peak===0)throw Error("模型未產生有效音訊");
 if(peak>.99)for(let i=0;i<pcm.length;i++)pcm[i]*=.99/peak;
 return pcm;
}
function chunks(text, max){
 const list=[];
 for(const sentence of text.trim().match(/[^。！？.!?；;\n]+[。！？.!?；;]*|[。！？.!?；;]+/gu)||[]){
  let remaining=sentence.trim();
  while(remaining.length>max){
   const head=remaining.slice(0,max+1), split=Math.max(head.lastIndexOf(" "),head.lastIndexOf("，"),head.lastIndexOf("、"),head.lastIndexOf(","));
   const end=split>max/2?split+1:max;
   list.push(remaining.slice(0,end));remaining=remaining.slice(end).trim();
  }
  if(remaining)list.push(remaining);
 }
 return list;
}
// Independent wrapper around the published eeh WASM API. Explicit compressed asset
// paths are from the author's demo/model tree; initialization never requests text remotely.
// HF serves downloadable JS with a MIME type that may not be executable by
// dynamic import. Fetch the pinned, standalone generated glue as bytes and
// explicitly mark it JavaScript. Pass WASM bytes to init; no relative imports.
async function loadEehModule(){
 const path="pkg/eeh_wasm.js";
 const raw=EEH.replace("/resolve/","/raw/")+path;
 let source;
 try{
  source=await mirrorBytes([EEH+path+"?download=true",raw,EEH+path],"下載日文 JavaScript 模組");
 }catch(e){throw Error("日文 JS 下載失敗（網路或跨域限制）："+e.message);}
 const code=new TextDecoder().decode(source);
 if(!code.includes("export class Synthesizer")||!code.includes("module_or_path"))throw Error("日文 JS 下載內容不是預期的 WASM 模組");
 const url=URL.createObjectURL(new Blob([source],{type:"text/javascript"}));
 try{return await import(url);}
 catch(e){throw Error("日文 JS 初始化失敗："+e.message);}
 finally{URL.revokeObjectURL(url);}
}
async function loadEeh(){
 const module=await loadEehModule();
 const [weight,dict,wasm]=await Promise.all([
  bytes(EEH+"model/eeh.safetensors.gz","下載日文模型").then(gunzip),
  bytes(EEH+"model/eeh-dict.bin.gz","下載日文詞典").then(gunzip),
  bytes(EEH+"pkg/eeh_wasm_bg.wasm","下載日文執行環境")
 ]);
 status("初始化日文模型");
 try{await module.default({module_or_path:wasm});}catch(e){throw Error("日文 WASM 初始化失敗："+e.message);}
 const synth=new module.Synthesizer(weight,dict);
 return {speak(text,voice,speed){
  const name=voice==="male"?"M1":"F1";
  if(!synth.voices().includes(name))throw Error("找不到音色 "+name);
  const audio=synth.speak(text,name,{speed});
  return {audio:joined([audio]),sampleRate:synth.sampleRate(),voice:name};
 }};
}
// sanoTTS publishes half-precision voice blobs with a fixed metadata prefix.
// Decode the f16 payload into the runtime's required f32 layout.
function half(bits){
 const sign=bits&32768?-1:1,exp=(bits>>10)&31,frac=bits&1023;
 return exp===0?sign*frac*2**-24:exp===31?(frac?NaN:sign*Infinity):sign*(1+frac/1024)*2**(exp-15);
}
function unpackWeights(data,shape){
 const header=shape.meta_bytes,count=shape.weight_floats;
 if(!Number.isInteger(header)||header<0||!Number.isInteger(count)||count<=0||data.byteLength!==header+count*2)throw Error("音色檔格式不符");
 const out=new Uint8Array(header+count*4);out.set(data.subarray(0,header));
 const input=new DataView(data.buffer,data.byteOffset+header,count*2),view=new DataView(out.buffer,header);
 for(let i=0;i<count;i++)view.setFloat32(i*4,half(input.getUint16(i*2,true)),true);
 return out;
}
async function loadSano(lang){
 const key=lang==="zh"?"chinese-xiaoya":"spanish";
 status("準備 sanoTTS 執行環境");
 importScripts(SANO+"snt_voice.js");
 const runtime=await SaanoVoice({locateFile:name=>SANO+name});
 const meta=decodeJson(await sanoBytes(key,"meta.json","下載音色設定"));
 const [f,d]=await Promise.all([sanoBytes(key,meta.front,"下載聲學模型"),sanoBytes(key,meta.dec,"下載解碼模型")]);
 if(f.length!==meta.front_bytes||d.length!==meta.dec_bytes)throw Error("音色檔長度不符");
 const front=meta.weights==="f16"?unpackWeights(f,meta.front_dims):f;
 const dec=meta.weights==="f16"?unpackWeights(d,meta.dec_dims):d;
 let idsFor;
 if(lang==="zh"){
  if(meta.phoneme_type!=="pinyin")throw Error("中文模型發音介面不符");
  const mod=await import(SANO+"g2p-lazy/zh/zh_g2p.mjs?v=20260910");
  const zh=await mod.loadZhG2P(SANO+"g2p-lazy/zh/",async url=>new Response(await bytes(url,"下載拼音字典")));
  idsFor=text=>Int32Array.from(zh.textToIds(text,meta.phoneme_id_map).ids);
 }else{
  importScripts(SANO+"snt_g2p.js");
  const g=await SaanoG2P({locateFile:name=>SANO+name});
  if(g._snt_g2p_init()!==0)throw Error("西文發音環境初始化失敗");
  const set=g.cwrap("snt_g2p_set_voice","number",["string","number"]);
  if(set(meta.espeak_voice,meta.g2p_voice_slot)!==0)throw Error("西文音素設定失敗");
  idsFor=text=>{
   const len=g.lengthBytesUTF8(text)+1,input=g._malloc(len),output=g._malloc(4096);
   try{g.stringToUTF8(text,input,len);const n=g._snt_g2p_text_to_ids(input,output,1024);
    if(n<=0||n>1024)throw Error("無法轉換音素");
    return g.HEAP32.slice(output/4,output/4+n);
   }finally{g._free(input);g._free(output);}
  };
 }
 const copy=arr=>{const p=runtime._malloc(arr.byteLength);if(!p)throw Error("記憶體不足");runtime.HEAPU8.set(arr,p);return p;};
 // Keep weights allocated across repeat tests; the voice worker is terminated on page exit or failure.
 const frontP=copy(front),decP=copy(dec),capacity=22050*20;
 return {speak(text,_voice,speed){
  const parts=[];
  for(const sentence of chunks(text,lang==="zh"?45:120)){
   const ids=idsFor(sentence);
   if(ids.length<2||ids.length>meta.front_dims.d_max_tokens)throw Error("文字無有效音素或句子過長");
   const input=copy(new Uint8Array(ids.buffer,ids.byteOffset,ids.byteLength)),output=runtime._malloc(capacity*4);
   try{
    if(!output)throw Error("記憶體不足");
    const n=runtime._snt_voice_synthesize(frontP,decP,input,ids.length,meta.length_scale/speed,output,capacity);
    if(n<=0||n>capacity)throw Error("sanoTTS 生成失敗："+n);
    parts.push(runtime.HEAPF32.slice(output/4,output/4+n));
   }finally{runtime._free(input);if(output)runtime._free(output);}
  }
  return {audio:joined(parts),sampleRate:meta.sample_rate,voice:lang==="zh"?"Xiaoya":"Spanish（固定音色）"};
 }};
}
self.onmessage=async({data})=>{
 try{
  if(data.type==="load"){
   adapter=data.engine==="eeh"?await loadEeh():data.engine==="sano"?await loadSano(data.lang):null;
   if(!adapter)throw Error("不支援的模型");
   postMessage({type:"ready",id:data.id});
  }else if(data.type==="speak"){
   if(!adapter)throw Error("模型尚未初始化");
   const started=performance.now(),r=await adapter.speak(data.text,data.voice,data.speed);
   postMessage({type:"done",id:data.id,audio:r.audio,sampleRate:r.sampleRate,voice:r.voice,genMs:performance.now()-started},[r.audio.buffer]);
  }
 }catch(e){postMessage({type:"error",id:data.id,message:String(e?.message||e)});}
};
