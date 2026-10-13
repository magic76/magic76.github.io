import {useEffect,useMemo,useRef,useState} from "react";
import {Link,useSearchParams} from "react-router-dom";
import {useTeacherStore} from "../store/teacherStore";
import {geminiKey} from "../lib/runtime";
import {LIVE_VOICES} from "../live/voiceIdentity";
import {
 CASTING_LINES,castingKey,collisions,unusedCastingVoices,voiceAssignments,
 generateCastingSample,listCastingKeys,readCastingSample,writeCastingSample,
 clearCastingSamples,type CastingLanguage
} from "./voiceCasting";

const panel={border:"1px solid #d9e2ec",borderRadius:16,padding:18,background:"#fff"} as const;
const button={padding:"9px 12px",border:"1px solid #cbd5e1",borderRadius:10,background:"#fff",color:"#172337",cursor:"pointer"} as const;
const field={display:"grid",gap:6,fontSize:13,fontWeight:600} as const;
const select={...button,width:"100%"} as const;
type Vote="A"|"B"|"tie";
type SavedVote={a:string;b:string;choice:string;at:string};
type BatchState={index:number;total:number;voice:string;errors:number};
const PAIRS=Array.from({length:LIVE_VOICES.length/2},(_,i)=>[LIVE_VOICES[i*2],LIVE_VOICES[i*2+1]] as [string,string]);
const uniqueAssignments=voiceAssignments(),duplicates=collisions(),unused=unusedCastingVoices();
function votesKey(model:string,lang:string){return "crew_voice_casting_votes_v1|"+model+"|"+lang}
function loadVotes(model:string,lang:string):SavedVote[]{
 try{const data=JSON.parse(localStorage.getItem(votesKey(model,lang))||"[]");return Array.isArray(data)?data:[]}
 catch{return[]}
}
export function VoiceCastingStudio(){
 const [params]=useSearchParams(),enabled=params.get("lab")==="1";
 const model=useTeacherStore(s=>s.liveModel);
 const [language,setLanguage]=useState<CastingLanguage>("en");
 const [known,setKnown]=useState<Set<string>>(new Set());
 const [busy,setBusy]=useState(false),[status,setStatus]=useState("");
 const [batch,setBatch]=useState<BatchState|null>(null);
 const [pairIndex,setPairIndex]=useState(0),[reveal,setReveal]=useState(false);
 const [votes,setVotes]=useState<SavedVote[]>(()=>loadVotes(model,"en"));
 const abortRef=useRef<AbortController|null>(null),busyRef=useRef(false);
 const playingRef=useRef<{audio:HTMLAudioElement;url:string}|null>(null);
 const stillMounted=useRef(true);
 const current=PAIRS[pairIndex];
 const flipped=pairIndex%2===1; // Counterbalance labels without revealing them before the vote.
 const a=flipped?current[1]:current[0],b=flipped?current[0]:current[1];
 const keyFor=(voice:string)=>castingKey(model,language,voice);
 const cached=LIVE_VOICES.filter(v=>known.has(keyFor(v)));
 const assigned=new Map(uniqueAssignments.map(v=>[v.voice,v.actors]));
 const sortedVoices=useMemo(()=>[
  ...LIVE_VOICES.filter(v=>duplicates.some(group=>group.voice===v)),
  ...unused,
  ...LIVE_VOICES.filter(v=>!duplicates.some(group=>group.voice===v)&&!unused.includes(v))
 ],[]);
 const done= votes.some(v=>v.a===current[0]&&v.b===current[1]);
 useEffect(()=>{
  stillMounted.current=true;
  return()=>{stillMounted.current=false;abortRef.current?.abort();if(playingRef.current){playingRef.current.audio.pause();URL.revokeObjectURL(playingRef.current.url)}};
 },[]);
 useEffect(()=>{
  let valid=true;
  void listCastingKeys().then(keys=>{if(valid)setKnown(new Set(keys))})
   .catch(err=>{if(valid)setStatus("本地快取不可用："+(err instanceof Error?err.message:String(err)))});
  setVotes(loadVotes(model,language));setReveal(false);
  return()=>{valid=false};
 },[model,language]);
 function stopAudio(){
  const current=playingRef.current;if(!current)return;
  current.audio.pause();current.audio.removeAttribute("src");current.audio.load();
  URL.revokeObjectURL(current.url);playingRef.current=null;
 }
 async function playback(voice:string){
  try{
   const blob=await readCastingSample(keyFor(voice));
   if(!blob){setStatus(voice+" 尚未產生樣本，先點擊產生");return}
   stopAudio();
   const url=URL.createObjectURL(blob),audio=new Audio(url);
   playingRef.current={audio,url};audio.onended=()=>{if(playingRef.current?.audio===audio)stopAudio()};
   await audio.play();
   setStatus("正在播放匿名聲線樣本（"+CASTING_LINES[language].label+"）");
  }catch(e){setStatus("播放失敗："+(e instanceof Error?e.message:String(e))+"。請再按播放一次。")}
 }
 async function runBatch(voices:readonly string[],playAfter?:string){
  if(busyRef.current)return;
  const apiKey=geminiKey();
  if(!apiKey){setStatus("請先到設定建立 Gemini API Key");return}
  busyRef.current=true;setBusy(true);setStatus("");stopAudio();
  const controller=new AbortController();abortRef.current=controller;
  let complete=0,errors=0,cancelled=false;
  try{
   const candidate=[...new Set(voices)].filter(v=>LIVE_VOICES.some(voice=>voice===v));
   for(const voice of candidate){
    if(controller.signal.aborted){cancelled=true;break}
    setBatch({index:complete+errors+1,total:candidate.length,voice,errors});
    try{
     const key=castingKey(model,language,voice);
     const existing=await readCastingSample(key);
     if(!existing){
      const blob=await generateCastingSample({key:apiKey,model,voice,language,signal:controller.signal});
      if(controller.signal.aborted){cancelled=true;break}
      await writeCastingSample(key,blob);
      if(stillMounted.current)setKnown(prev=>new Set([...prev,key]));
     }
     complete++;
    }catch(e){
     if(controller.signal.aborted){cancelled=true;break}
     errors++;setStatus(voice+" 失敗："+(e instanceof Error?e.message:String(e)));
    }
    if(candidate.length>1&&!controller.signal.aborted)await new Promise(resolve=>window.setTimeout(resolve,700));
   }
   if(stillMounted.current){
    setStatus((cancelled?"已停止。":"完成。")+"已準備 "+complete+" 段；失敗 "+errors+" 段。"+
     (errors?"可重新批次執行，已快取的樣本會自動跳過。":""));
    if(!cancelled&&playAfter&&complete===1){
     // Some browsers block autoplay following a network request; a second click is always available.
     void playback(playAfter);
    }
   }
  }finally{busyRef.current=false;abortRef.current=null;if(stillMounted.current){setBusy(false);setBatch(null)}}
 }
 function recordVote(choice:Vote){
  const value=choice==="tie"?"tie":choice==="A"?a:b;
  const updated=[...votes.filter(v=>!(v.a===current[0]&&v.b===current[1])),{
   a:current[0],b:current[1],choice:value,at:new Date().toISOString()
  }];
  localStorage.setItem(votesKey(model,language),JSON.stringify(updated));
  setVotes(updated);setReveal(true);stopAudio();
  setStatus("已儲存這組比較結果在本機；不會變更正式角色聲線。");
 }
 const allReady=known.has(keyFor(a))&&known.has(keyFor(b));
 const votesDone=PAIRS.filter(p=>votes.some(v=>v.a===p[0]&&v.b===p[1])).length;
 const quickChoices=uniqueAssignments.filter(v=>v.actors.length>1).map(v=>v.voice);
 if(!enabled)return <main style={{maxWidth:640,margin:"60px auto",padding:20}}>
  <h1>Voice Casting Studio</h1><p>這是內部驗證工具，請使用測試連結開啟。</p><Link to="/teacher/voice-lab?lab=1">返回 Voice Lab</Link>
 </main>;
 return <main style={{maxWidth:1050,margin:"30px auto",padding:20,color:"#172337",display:"grid",gap:18}}>
  <header><Link to="/teacher/voice-lab?lab=1">← Voice Lab</Link><h1 style={{margin:"15px 0 5px"}}>Voice Casting Studio <small style={{fontWeight:400,fontSize:14}}>Web · Beta</small></h1>
   <p>為 16 位老師與 16 位朋友做快速聲音選角。每段約 5 秒；不需要開啟麥克風，也不改變正式角色。</p>
   <p><strong>目前使用：{model}</strong> · <Link to="/settings#live-model-settings">切換模型</Link></p>
  </header>
  <section style={panel}>
   <h2 style={{marginTop:0}}>1. 現況：32 位角色，{uniqueAssignments.length} 種聲線</h2>
   <p><strong>{duplicates.length} 組聲線重複</strong>，還有 <strong>{unused.length} 種未使用</strong>。重複是相同 voice ID，不等於聲學相似度評估。</p>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:14}}>
    <div><strong>重複使用</strong>{duplicates.map(group=><div key={group.voice} style={{padding:"7px 0",borderBottom:"1px solid #e2e8f0"}}>
     <span style={{fontWeight:600}}>{group.voice}</span><span style={{display:"block",fontSize:13}}>{group.actors.map(actor=>actor.name+"（"+(actor.kind==="teacher"?"老師":"朋友")+"）").join(" · ")}</span>
    </div>)}</div>
    <div><strong>未使用的 8 種聲線</strong><p style={{lineHeight:1.9}}>{unused.join(" · ")}</p>
     <button style={button} disabled={busy||!geminiKey()} onClick={()=>void runBatch(unused)}>▶ 批次準備這 {unused.length} 種</button>
     <p style={{fontSize:13}}>先試聽未使用聲線，最容易找出能替代重複聲線的新選擇。</p>
    </div>
   </div>
  </section>
  <section style={panel}>
   <h2 style={{marginTop:0}}>2. 批次試聽與本地快取</h2>
   <div style={{display:"flex",gap:12,alignItems:"end",flexWrap:"wrap"}}>
    <label style={{...field,minWidth:180}}>測試語言<select style={select} disabled={busy} value={language} onChange={e=>setLanguage(e.target.value as CastingLanguage)}>
     {(Object.entries(CASTING_LINES) as [CastingLanguage,{label:string;text:string}][]).map(([value,item])=><option value={value} key={value}>{item.label}</option>)}
    </select></label>
    <button style={button} disabled={busy||!geminiKey()} onClick={()=>void runBatch(quickChoices)}>準備 {quickChoices.length} 種共用聲線</button>
    <button style={button} disabled={busy||!geminiKey()} onClick={()=>void runBatch(LIVE_VOICES)}>準備全部 30 種</button>
    {busy?<button style={button} onClick={()=>abortRef.current?.abort()}>■ 停止批次生成</button>:null}
    <button style={button} disabled={busy||cached.length===0} onClick={()=>{
     if(!window.confirm("清除這個工作台的所有本地語音快取？不影響角色設定或評分。"))return;
     stopAudio();void clearCastingSamples().then(()=>{setKnown(new Set());setStatus("語音快取已清除")}).catch(e=>setStatus(String(e)));
    }}>清除樣本快取</button>
   </div>
   <p style={{background:"#f1f5f9",padding:12,borderRadius:10,fontSize:14,marginBottom:12}}>{CASTING_LINES[language].text}</p>
   <p style={{fontSize:13}}>本模型＋語言已快取 <strong>{cached.length}/30</strong> 段。每種聲線只向 Gemini Live 請求一次，之後可以直接重播。批次逐段生成，會消耗你的 Gemini API 配額；失敗可重試。</p>
   {batch&&<div role="status" style={{marginBottom:12}}>正在處理 {batch.index}/{batch.total}：{batch.voice}（失敗 {batch.errors}）</div>}
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))",gap:9}}>
    {sortedVoices.map(voice=><div key={voice} style={{border:"1px solid #e2e8f0",borderRadius:12,padding:10}}>
     <div style={{fontWeight:600}}>{voice}</div>
     <div style={{fontSize:12,margin:"3px 0 8px",minHeight:28}}>{unused.includes(voice)?"未使用":assigned.get(voice)?.map(x=>x.name).join(" / ")}</div>
     <button style={{...button,width:"100%"}} disabled={busy||!geminiKey()} onClick={()=>known.has(keyFor(voice))?void playback(voice):void runBatch([voice],voice)}>
      {known.has(keyFor(voice))?"▶ 播放已快取":"＋ 產生樣本"}
     </button>
    </div>)}
   </div>
  </section>
  <section style={panel}>
   <h2 style={{marginTop:0}}>3. 快速 A/B 盲聽 <small style={{fontSize:13,fontWeight:400}}>第 {pairIndex+1}/{PAIRS.length} 組 · 已評分 {votesDone}/{PAIRS.length}</small></h2>
   <p>兩種聲線朗讀相同語言與台詞。聲線名稱在投票前隱藏；選擇你認為更有辨識度的聲音，或認為兩者差不多。</p>
   <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12}}>
    {([[a,"A"],[b,"B"]] as const).map(([voice,label])=><div key={label} style={{border:"1px solid #cbd5e1",borderRadius:12,padding:13}}>
     <h3 style={{margin:"0 0 8px"}}>聲音 {label}</h3>
     <button style={{...button,width:"100%"}} disabled={busy||!geminiKey()} onClick={()=>known.has(keyFor(voice))?void playback(voice):void runBatch([voice],voice)}>
      {known.has(keyFor(voice))?"▶ 播放":"＋ 產生樣本"}
     </button>
     {reveal&&<p style={{fontSize:13}}>{voice}</p>}
    </div>)}
   </div>
   <div style={{display:"flex",gap:9,flexWrap:"wrap",marginTop:14}}>
    <button style={button} disabled={!allReady||busy} onClick={()=>recordVote("A")}>A 更有辨識度</button>
    <button style={button} disabled={!allReady||busy} onClick={()=>recordVote("B")}>B 更有辨識度</button>
    <button style={button} disabled={!allReady||busy} onClick={()=>recordVote("tie")}>聽起來差不多</button>
    <button style={button} disabled={busy} onClick={()=>{stopAudio();setPairIndex(x=>(x+1)%PAIRS.length);setReveal(false)}}>下一組 →</button>
    <button style={button} disabled={busy} onClick={()=>setReveal(v=>!v)}>{reveal?"隱藏聲線名稱":"揭曉聲線名稱"}</button>
   </div>
   {done&&<p style={{fontSize:13}}>這組已經評分，可以重新投票或繼續下一組。</p>}
   <p style={{fontSize:13}}>投票只保存在此瀏覽器。這是主觀辨識度評分，並非自動聲紋分析；暫不更動 32 位角色。</p>
  </section>
  <p role="status" aria-live="polite">{status}</p>
  <footer style={{fontSize:12}}>此工具使用你的 Gemini Key 直接呼叫 Live API；樣本以 WAV 格式存在本機 IndexedDB，不上傳錄音至 Crew 伺服器。語音與模型使用成本仍由 Gemini API 計算。</footer>
 </main>;
}
