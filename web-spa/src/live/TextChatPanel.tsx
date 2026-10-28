import {searchGroundedText} from "./searchGroundedText";
import {GroundingSources} from "./GroundingSources";
import type {GroundingSource} from "./grounding";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {ensureCore,geminiKey} from "../lib/runtime";
import {PinyinHint} from "../teacher/PinyinHint";
import type {PinyinAidMode} from "../teacher/pinyinAid";
import type {TeachingMode} from "../store/teacherStore";
import "./TextChatPanel.css";

type Message={role:"user"|"assistant";text:string;sources?:GroundingSource[];searchSuggestions?:string};
type Props={system:string;speaker:string;english?:boolean;searchEnabled?:boolean;hint?:string;targetLanguage?:string;pinyinMode?:PinyinAidMode;teachingMode?:TeachingMode};

/** Text-only fallback, no mic and no persistent transcript. */
export function TextChatPanel({system,speaker,english=false,searchEnabled=false,hint,targetLanguage="",pinyinMode="auto",teachingMode="bilingual"}:Props){
 const [messages,setMessages]=useState<Message[]>([]);
 const [draft,setDraft]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const mounted=useRef(true);
 const bottom=useRef<HTMLDivElement>(null);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
 useEffect(()=>{bottom.current?.scrollIntoView({block:"end",behavior:"auto"})},[messages.length]);
 async function send(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const value=draft.trim().slice(0,1200);
  if(!value||busy)return;
  if(!geminiKey()){setError(english?"Set a Gemini API key in Settings.":"請先到設定新增 Gemini API Key。");return}
  const next:Message[]=[...messages,{role:"user",text:value}];
  setMessages(next);setDraft("");setBusy(true);setError("");
  try{
   if(!searchEnabled){await ensureCore();if(!window.CrewAI?.call)throw new Error("Text runtime unavailable");}
   const history=next.slice(-12).map(m=>(m.role==="user"?"使用者":"AI")+": "+m.text).join("\n");
   const prompt="請根據以下文字聊天紀錄，只回覆最後一則使用者訊息，不要重複過往回答。\n"+history;
   const grounded=searchEnabled?await searchGroundedText(prompt,system+"\nSearch only for relevant current or external facts. Preserve the original character and language."):null;
   const reply=String(grounded?.text??await window.CrewAI!.call(prompt,{
    system:system+"\n[TEXT CHAT] Written text conversation only. Reply naturally, as the configured character. Do not claim to hear or speak.",
    preferLive:false,temperature:0.75,maxOutputTokens:700
   })).trim();
   if(!reply)throw new Error("Empty reply");
   if(mounted.current)setMessages(m=>[...m,{role:"assistant",text:reply,sources:grounded?.sources,searchSuggestions:grounded?.searchSuggestions}]);
  }catch(_){
   if(mounted.current)setError(english?"Could not get a reply. Check your API key and connection.":"暫時無法取得回覆，請檢查 Gemini Key 或網路後再試。");
  }finally{if(mounted.current)setBusy(false)}
 }
 return <section className="crew-text-chat" aria-label={english?"Text chat":"文字聊天"}>
  <div className="crew-text-chat-history" role="log" aria-label={english?"Conversation":"對話內容"} aria-live="polite" aria-relevant="additions">
   {!messages.length&&<p className="crew-text-chat-empty">{english?"Type a message to start chatting.":"輸入訊息，開始與 "+speaker+" 聊天。"}</p>}
   {messages.map((m,i)=><div key={i} className={"crew-text-chat-message "+m.role}><strong>{m.role==="user"?(english?"You":"你"):speaker}</strong><p>{m.text}</p>{m.sources&&<GroundingSources sources={m.sources} searchSuggestions={m.searchSuggestions} english={english}/>} {m.role==="assistant"&&<PinyinHint text={m.text} targetLanguage={targetLanguage} mode={pinyinMode} teachingMode={teachingMode} english={english}/>}</div>)}
   {busy&&<p className="crew-text-chat-pending" role="status">{speaker}{english?" is typing…":" 正在回覆…"}</p>}
   <div ref={bottom}/>
  </div>
  {error&&<p role="alert" className="crew-text-chat-error">{error}</p>}
  <form className="crew-text-chat-form" onSubmit={event=>void send(event)}>
   <input type="text" aria-label={english?"Message":"輸入訊息"} autoComplete="off" maxLength={1200} value={draft} onChange={e=>setDraft(e.target.value)} placeholder={english?"Write a message…":"輸入訊息…"} disabled={busy}/>
   <button className="btn primary" type="submit" disabled={busy||!draft.trim()}>{english?"Send":"送出"}</button>
  </form>
  <small className="crew-text-chat-notice">{hint||(english?"Messages remain on this page only; switching modes starts a new session.":"文字對話只在本頁顯示；切換模式將開始新對話。")}</small>
 </section>;
}
