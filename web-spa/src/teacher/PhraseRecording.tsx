import{useEffect,useRef,useState}from"react";
import{useTranslation}from"react-i18next";
import{Link}from"react-router-dom";
import{speakLearningText,stopLearningSpeech}from"./learningSpeech";

/** One phrase at a time; recordings never leave browser memory. */
export function PhraseRecording({text,language}:{text:string;language:string}){
 const{t}=useTranslation("teacher");
 const[status,setStatus]=useState<"idle"|"requesting"|"recording">("idle"),[audio,setAudio]=useState<string|null>(null),[error,setError]=useState(""),[playing,setPlaying]=useState(false);
 const generation=useRef(0),recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),url=useRef<string|null>(null),playback=useRef<HTMLAudioElement|null>(null),speaking=useRef(false);
 const release=()=>{
  const current=recorder.current;recorder.current=null;
  if(current?.state==="recording"){current.onstop=null;current.ondataavailable=null;current.stop()}
  stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;
 };
 const clearAudio=()=>{playback.current?.pause();if(url.current)URL.revokeObjectURL(url.current);url.current=null;setAudio(null)};
 useEffect(()=>()=>{generation.current+=1;if(speaking.current)stopLearningSpeech();release();playback.current?.pause();if(url.current)URL.revokeObjectURL(url.current)},[]);
 async function listen(slow=false){
  const session=generation.current;setError("");playback.current?.pause();speaking.current=true;setPlaying(true);
  try{await speakLearningText(text,language,{speed:slow?"slow":"normal"})}
  catch{if(session===generation.current)setError(t("phrasebook.failed"))}
  finally{if(session===generation.current){speaking.current=false;setPlaying(false)}}
 }
 async function record(){
  const session=++generation.current;setError("");clearAudio();stopLearningSpeech();speaking.current=false;setPlaying(false);setStatus("requesting");
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){setError(t("phrasebook.recordError"));setStatus("idle");return}
  try{
   const media=await navigator.mediaDevices.getUserMedia({audio:true});
   if(session!==generation.current){media.getTracks().forEach(track=>track.stop());return}
   stream.current=media;
   const r=new MediaRecorder(media),chunks:Blob[]=[];recorder.current=r;
   r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
   r.onstop=()=>{
    media.getTracks().forEach(track=>track.stop());if(stream.current===media)stream.current=null;
    if(session!==generation.current)return;
    recorder.current=null;setStatus("idle");
    if(chunks.length){const next=URL.createObjectURL(new Blob(chunks,{type:r.mimeType||"audio/webm"}));url.current=next;setAudio(next)}
    else setError(t("phrasebook.recordError"));
   };
   r.onerror=()=>{if(session===generation.current){generation.current+=1;release();setStatus("idle");setError(t("phrasebook.recordError"))}};
   r.start();setStatus("recording");
  }catch{if(session===generation.current){release();setStatus("idle");setError(t("phrasebook.recordError"))}}
 }
 const busy=status!=="idle";
 return <div className="crew-phrase-recording">
  <small>{t("phrasebook.recordIntro")}</small>
  <div className="crew-phrase-card-actions">
   <button type="button" className="btn secondary small" disabled={busy||playing} onClick={()=>void listen()}>🔊 {t("phrasebook.listen")}</button>
   <button type="button" className="btn secondary small" disabled={busy||playing} onClick={()=>void listen(true)}>🐢 {t("phrasebook.slow")}</button>
   <button type="button" className="btn primary small" disabled={status==="requesting"||playing} onClick={()=>{if(status==="recording")recorder.current?.stop();else void record()}}>{status==="recording"?"■ ":"🎙 "}{t(status==="recording"?"phrasebook.recordStop":"phrasebook.recordStart")}</button>
  </div>
  {audio&&<div><small>{t("phrasebook.recordPlayback")}</small><audio ref={playback} controls src={audio} aria-label={t("phrasebook.recordPlayback")} onPlay={()=>{if(speaking.current)stopLearningSpeech()}}/></div>}
  {error&&<small role="alert">{error}</small>}
  <small>{t("phrasebook.recordPrivacy")}</small>
  <Link className="inline-link" to="/teacher/pronunciation" state={{phrase:text,language}}>{t("phrasebook.recordTeacher")}</Link>
 </div>
}
