import {useEffect,useRef,useState} from "react";
import {useTranslation} from "react-i18next";

const SENTENCES=[
 "Could you tell me where the nearest station is?",
 "I would like to check in, please.",
 "Could we move the meeting to tomorrow?",
 "Let me make sure I understood you correctly.",
 "That sounds great. What time should we meet?"
];

/** Browser-based shadowing: listening and self-review, never an automatic pronunciation grade. */
export function ShadowingPractice(){
 const {i18n}=useTranslation();
 const en=i18n.resolvedLanguage?.startsWith("en")??false;
 const [index,setIndex]=useState(0);
 const [show,setShow]=useState(false);
 const [recording,setRecording]=useState(false);
 const [audio,setAudio]=useState<string|null>(null);
 const [error,setError]=useState("");
 const recorder=useRef<MediaRecorder|null>(null);
 const stream=useRef<MediaStream|null>(null);
 const audioUrl=useRef<string|null>(null);
 const chunks=useRef<Blob[]>([]);
 const alive=useRef(true);
 const generation=useRef(0);
 const release=()=>{
  if(recorder.current?.state==="recording")recorder.current.stop();
  stream.current?.getTracks().forEach(track=>track.stop());
  stream.current=null;
 };
 const clearAudio=()=>{
  if(audioUrl.current)URL.revokeObjectURL(audioUrl.current);
  audioUrl.current=null;setAudio(null);
 };
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;release();window.speechSynthesis?.cancel();if(audioUrl.current)URL.revokeObjectURL(audioUrl.current)}},[]);
 const next=(direction:number)=>{
  generation.current+=1;
  release();setRecording(false);clearAudio();setError("");
  window.speechSynthesis?.cancel();setIndex(i=>Math.max(0,Math.min(SENTENCES.length-1,i+direction)));
 };
 const speak=()=>{
  if(!("speechSynthesis" in window)){setError("此瀏覽器無法播放示範語音。");return}
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(SENTENCES[index]);
  utterance.lang="en-US";utterance.rate=0.85;
  window.speechSynthesis.speak(utterance);
 };
 const start=async()=>{
  const session=generation.current;
  setError("");clearAudio();window.speechSynthesis?.cancel();
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){setError("此瀏覽器不支援錄音，可改用老師的發音練習。");return}
  try{
   const media=await navigator.mediaDevices.getUserMedia({audio:true});
   if(!alive.current||session!==generation.current){media.getTracks().forEach(track=>track.stop());return}
   stream.current=media;chunks.current=[];
   const r=new MediaRecorder(media);recorder.current=r;
   r.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data)};
   r.onstop=()=>{
    media.getTracks().forEach(track=>track.stop());
    if(stream.current===media)stream.current=null;
    if(!alive.current||session!==generation.current)return;
    if(chunks.current.length){const url=URL.createObjectURL(new Blob(chunks.current,{type:r.mimeType||"audio/webm"}));audioUrl.current=url;setAudio(url)}
    setRecording(false);
   };
   r.start();setRecording(true);
  }catch{release();setRecording(false);setError("無法使用麥克風，請檢查權限，或先聽示範練習。")}
 };
 const stop=()=>{if(recorder.current?.state==="recording")recorder.current.stop()};
 return <section className="section panel" aria-label={en?"Shadowing practice":"跟讀練習" style={{display:"grid",gap:12}}>
  <div className="section-head"><h2>{en?"Shadowing practice":"跟讀練習 Shadowing"}</h2><button type="button" className="btn secondary small" aria-expanded={show} onClick={()=>{if(show){generation.current+=1;release();setRecording(false);window.speechSynthesis?.cancel()}setShow(!show)}}>{show?(en?"Collapse":"收起"):(en?"Start practice":"開始跟讀")}</button></div>
  {show&&<><small>{index+1} / {SENTENCES.length}</small>
  <p>{en?"Listen, imitate, and compare your recording. Audio stays in this page and is never uploaded.":"先聽一句，再模仿節奏。錄下自己的聲音，與示範比較；錄音只留在目前頁面，不會上傳。"}</p>
  <div className="reading-text" style={{fontSize:"1.15rem",lineHeight:1.6}}>{SENTENCES[index]}</div>
  <div className="actions" style={{display:"flex",flexWrap:"wrap",gap:8}}>
   <button type="button" className="btn secondary" onClick={speak}>▶ 聽示範</button>
   <button type="button" className="btn" onClick={recording?stop:start}>{recording?"■ 結束錄音":"● 開始跟讀"}</button>
  </div>
  {audio&&<div><strong>聽聽自己的跟讀</strong><audio controls src={audio} style={{display:"block",width:"100%",maxWidth:400}}/></div>}
  {error&&<p role="alert">{error}</p>}
  <div className="actions" style={{display:"flex",gap:8,flexWrap:"wrap"}}>
   <button className="btn secondary small" type="button" disabled={index===0} onClick={()=>next(-1)}>上一句</button>
   <button className="btn secondary small" type="button" disabled={index===SENTENCES.length-1} onClick={()=>next(1)}>下一句 →</button>
  </div>
  <small>{en?"No automatic pronunciation score is calculated. Use teacher feedback for assessment.":"此模式不會自動判斷發音分數；需要老師回饋時，請使用下方發音訓練。"}</small></>}
 </section>;
}
