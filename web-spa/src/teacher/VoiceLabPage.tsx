import {Arrow} from "../components/Arrow";
import {useTeacherStore} from "../store/teacherStore";
import {useEffect,useMemo,useState} from "react";
import {Link,useSearchParams} from "react-router-dom";
import {useLiveSession} from "../live/useLiveSession";
import {LIVE_VOICES,LAB_ACCENTS,LAB_DELIVERIES,normalizeLiveVoice,voiceIdentityPrompt,
 type VoiceRole,type AccentChoice,type DeliveryChoice} from "../live/voiceIdentity";
import {CREW_FRIENDS} from "../friends/friendProfiles";
import {TEACHER_PROFILES} from "../teacher/teacherProfiles";
import {geminiKey} from "../lib/runtime";
import {auditVoiceAssignments} from "./voiceAssignmentAudit";

type Strength="subtle"|"natural"|"noticeable";
type Mode="sample"|"conversation";
type VoiceFilter="all"|"unused"|"shared";
const TEST_LINE="I bought a bottle of water before the meeting. Do you want to watch a movie tomorrow?";
type Ratings={naturalness:number;distinctiveness:number;accent:number};
const KEY="crew_voice_lab_ratings_v1";
const voiceAudit=auditVoiceAssignments(CREW_FRIENDS,TEACHER_PROFILES);
const selectStyle={padding:"10px 12px",width:"100%",border:"1px solid #cbd5e1",borderRadius:10,background:"#fff",color:"#172337"} as const;
const fieldStyle={display:"grid",gap:6,fontSize:13,fontWeight:600} as const;
const panelStyle={border:"1px solid #e2e8f0",borderRadius:16,padding:18,background:"#fff"} as const;
const rowStyle={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))",gap:14} as const;
function readRatings():Record<string,Ratings>{
 try {const raw=JSON.parse(localStorage.getItem(KEY)||"{}");return raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{}}
 catch{return{}}
}
export function VoiceLabPage(){
 const[params]=useSearchParams();
 const enabled=params.get("lab")==="1";
 const liveModel=useTeacherStore(s=>s.liveModel);
 const[role,setRole]=useState<VoiceRole>("friend"),[actorId,setActorId]=useState("zoe");
 const[voice,setVoice]=useState("Leda"),[accent,setAccent]=useState<AccentChoice>("tw");
 const[style,setStyle]=useState<DeliveryChoice>("witty"),[strength,setStrength]=useState<Strength>("subtle");
 const[mode,setMode]=useState<Mode>("sample");
 const[voiceFilter,setVoiceFilter]=useState<VoiceFilter>("all");
 const[allRatings,setAllRatings]=useState(readRatings);
 const[score,setScore]=useState<Ratings>({naturalness:3,distinctiveness:3,accent:3});
 const[message,setMessage]=useState("");
 const actors=role==="friend"?CREW_FRIENDS:TEACHER_PROFILES;
 const actor=actors.find(a=>a.id===actorId)||actors[0];
 const visibleVoices=voiceFilter==="unused"?voiceAudit.unused:
  voiceFilter==="shared"?voiceAudit.shared:LIVE_VOICES;
 const voiceUsers=voiceAudit.users.get(normalizeLiveVoice(voice))||[];
 function changeVoiceFilter(next:VoiceFilter){
  setVoiceFilter(next);
  const options:readonly string[]=next==="unused"?voiceAudit.unused:next==="shared"?voiceAudit.shared:LIVE_VOICES;
  if(options.length&&!options.includes(normalizeLiveVoice(voice)))setVoice(options[0]);
 }
 const system=useMemo(()=>(
  "You are "+actor.name+", a fictional Crew "+(role==="friend"?"Friend":"Teacher")+
  ". Persona: "+actor.personality+". Speak ONLY English in every spoken response. "+
  "The learner is auditioning a voice; do not mention the testing process, explain phonetics, or invent memories. "+
  voiceIdentityPrompt(role,actor.id,"英文",accent,style,strength)
 ),[role,actor,accent,style,strength]);
 const opening=mode==="sample"?
  "[VOICE LAB FIXED SAMPLE] Say exactly the following English sentence ONCE, with no additions, greeting, or translation: "+TEST_LINE:
  "[VOICE LAB CONVERSATION] Start a natural English conversation about a movie tomorrow. Say one brief sentence, invite a reply, and converse as this character.";
 const live=useLiveSession({pageKey:"voice-lab",title:"Voice Lab",system,openingPrompt:opening,
  language:"英文",voice:normalizeLiveVoice(voice),persistHistory:false,teacherReport:false,sessionKind:role,
  conversationFlow:undefined});
 const active=["requesting-mic","connecting","listening","speaking","ending","reporting"].includes(live.state);
 useEffect(()=>{if(mode==="conversation"&&active&&live.durationMs>=20000)void live.stop(true)},[mode,active,live.durationMs,live.stop]);
 const ratingKey=[role,actor.id,voice,accent,style,strength].join("|");
 useEffect(()=>{setScore(allRatings[ratingKey]||{naturalness:3,distinctiveness:3,accent:3})},[ratingKey,allRatings]);
 function changeActor(id:string,nextRole=role){
  const list=nextRole==="friend"?CREW_FRIENDS:TEACHER_PROFILES;
  const p=list.find(a=>a.id===id)||list[0];
  setActorId(p.id);setVoice(normalizeLiveVoice(nextRole==="friend"?(p as typeof CREW_FRIENDS[number]).voice:(p as typeof TEACHER_PROFILES[number]).recommendedVoice));
  setVoiceFilter("all"); // A role selection must show its assigned voice, even when a filter was active.
  setAccent(p.id==="zoe"?"tw":p.id==="yuna"?"kr":p.id==="hugo"?"au":p.id==="isla"?"uk":"auto");
  setStyle(p.id==="zoe"?"witty":p.id==="yuna"?"gentle":p.id==="bella"?"bright":"natural");
  setMessage("");
 }
 function save(){
  const next={...allRatings,[ratingKey]:score};
  localStorage.setItem(KEY,JSON.stringify(next));setAllRatings(next);
  setMessage("評分已儲存在這個瀏覽器；不會上傳。");
 }
 if(!enabled)return <main style={{maxWidth:650,margin:"60px auto",padding:20}}>
  <h1>Voice Lab</h1><p>這是未公開的內部聲音實驗功能。請從測試連結進入。</p>
  <Link to="/teacher/roles">返回 Crew Teacher</Link>
 </main>;
 return <main style={{maxWidth:960,margin:"32px auto",padding:20,color:"#172337",display:"grid",gap:18}}>
  <header><Link to="/teacher/roles"><Arrow direction="left" className="crew-arrow--plain"/> Crew Teacher</Link><h1 style={{margin:"14px 0 5px"}}>Voice Lab <small style={{fontSize:14,fontWeight:400}}>Experimental · Gemini Live</small></h1>
   <p>同模型比較 30 種聲線、角色個性和英文口音。口音是提示控制，不保證精確呈現。試聽使用你自己的 Gemini Key 與配額。</p></header>
  <p>目前 Live 模型：<strong>{liveModel}</strong> · <Link to="/settings#live-model-settings">到設定切換模型</Link>。模型設定會套用到下一次連線，測試不會暗中降級。</p>
  <section style={panelStyle}><h2 style={{fontSize:19,marginTop:0}}>1. 選擇角色與聲音</h2>
   <div style={rowStyle}>
    <label style={fieldStyle}>身分<select style={selectStyle} disabled={active} value={role} onChange={e=>{const next=e.target.value as VoiceRole;setRole(next);changeActor(next==="friend"?"zoe":"emma",next)}}><option value="friend">Crew 朋友</option><option value="teacher">Crew 老師</option></select></label>
    <label style={fieldStyle}>角色<select style={selectStyle} disabled={active} value={actor.id} onChange={e=>changeActor(e.target.value)}>{actors.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    <label style={fieldStyle}>聲線篩選<select style={selectStyle} disabled={active} value={voiceFilter} onChange={e=>changeVoiceFilter(e.target.value as VoiceFilter)}><option value="all">全部聲線（{LIVE_VOICES.length}）</option><option value="unused">尚未使用（{voiceAudit.unused.length}）</option><option value="shared">角色共用（{voiceAudit.shared.length}）</option></select></label>
    <label style={fieldStyle}>Live 聲線<select style={selectStyle} disabled={active} value={voice} onChange={e=>setVoice(e.target.value)}>{visibleVoices.map(v=><option key={v} value={v}>{v}</option>)}</select></label>
    <label style={fieldStyle}>英文口音<select style={selectStyle} disabled={active} value={accent} onChange={e=>setAccent(e.target.value as AccentChoice)}>{Object.entries(LAB_ACCENTS).map(([id,name])=><option key={id} value={id}>{id==="auto"?"不指定":name}</option>)}</select></label>
    <label style={fieldStyle}>表演風格<select style={selectStyle} disabled={active} value={style} onChange={e=>setStyle(e.target.value as DeliveryChoice)}>{Object.entries(LAB_DELIVERIES).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
    <label style={fieldStyle}>口音強度<select style={selectStyle} disabled={active} value={strength} onChange={e=>setStrength(e.target.value as Strength)}><option value="subtle">輕微</option><option value="natural">自然</option><option value="noticeable">明顯（不誇張）</option></select></label>
   </div>
   <div style={{marginTop:14,padding:12,borderRadius:12,background:"#f1f5f9",fontSize:13,lineHeight:1.6}}>
    <strong>目前配置：</strong>{voiceAudit.totalRoles} 位角色、{voiceAudit.assigned.length} 種已使用聲線、
    {voiceAudit.shared.length} 種共用聲線、{voiceAudit.unused.length} 種尚未使用。
    <p style={{margin:"6px 0 0"}} aria-live="polite"><strong>{voice}</strong>：
     {voiceUsers.length===0?"尚未分配給角色，可用來試聽候選聲線。":
      voiceUsers.length===1?"目前用於 "+voiceUsers[0].name+"（"+(voiceUsers[0].role==="friend"?"朋友":"老師")+"）。":
      "與 "+voiceUsers.map(u=>u.name+"（"+(u.role==="friend"?"朋友":"老師")+"）").join("、")+" 共用同一個 Gemini 聲線 ID。"}
    </p>
    <details style={{marginTop:8}}><summary style={{cursor:"pointer"}}>查看所有角色共用的聲線（{voiceAudit.shared.length}）</summary>
     <ul style={{margin:"8px 0 0",paddingLeft:20}}>{voiceAudit.shared.map(v=><li key={v}><strong>{v}</strong>：{(voiceAudit.users.get(v)||[]).map(u=>u.name+"（"+(u.role==="friend"?"朋友":"老師")+"）").join("、")}</li>)}</ul>
    </details>
    <small>此處只比對 Gemini 聲線 ID 是否相同，不代表實際聲音一定無法區分；試聽不會變更正式角色配置。</small>
   </div>
  </section>
  <section style={panelStyle}><h2 style={{fontSize:19,marginTop:0}}>2. Live 試聽</h2>
   <div style={{display:"flex",gap:18,flexWrap:"wrap"}}><label><input type="radio" disabled={active} checked={mode==="sample"} onChange={()=>setMode("sample")}/> 固定英文台詞</label><label><input type="radio" disabled={active} checked={mode==="conversation"} onChange={()=>setMode("conversation")}/> 20 秒自由對話</label></div>
   <blockquote style={{margin:"12px 0",padding:12,background:"#f1f5f9",borderLeft:"3px solid #64748b"}}>{TEST_LINE}</blockquote>
   <p>固定台詞使用相同文字，便於比較聲音；兩種模式都透過 Gemini Live，需要麥克風授權。自由對話在 20 秒後自動停止。模型輸出可能不完全遵守台詞與口音指令。</p>
   <div style={{display:"flex",gap:12,alignItems:"center"}}>
    <button type="button" disabled={active||!geminiKey()} style={{...selectStyle,width:"auto",cursor:"pointer"}} onClick={()=>{setMessage("");void live.start()}}>▶ 開始試聽</button>
    <button type="button" disabled={!active} style={{...selectStyle,width:"auto",cursor:"pointer"}} onClick={()=>void live.stop(true)}>■ 結束</button>
    <span role="status">{live.status} {mode==="conversation"&&active?Math.max(0,20-Math.floor(live.durationMs/1000))+"s":""}</span>
   </div>
   {!geminiKey()&&<p>請先至設定建立 Gemini Key。</p>}
   <p><strong>{actor.name}：</strong>{live.output||"尚無語音輸出"}　{live.input&&<span>你的輸入：{live.input}</span>}</p>
   <small>這是內部實驗，不會保存語音、逐字稿、學習報告或角色記憶。更換聲線前請先結束目前試聽。</small>
  </section>
  <section style={panelStyle}><h2 style={{fontSize:19,marginTop:0}}>3. 主觀評分（只存本機）</h2>
   <div style={rowStyle}>{([["naturalness","自然度"],["distinctiveness","角色辨識度"],["accent","口音一致性"]] as const).map(([key,label])=><label key={key} style={fieldStyle}>{label}：{score[key]}/5
    <input type="range" min={0} max={5} value={score[key]} onChange={e=>setScore(v=>({...v,[key]:Number(e.target.value)}))}/></label>)}</div>
   <button type="button" style={{...selectStyle,width:"auto",marginTop:14}} onClick={save}>儲存評分</button>
   <p role="status">{message}</p><small>請同一聲線測試三次再比較；「聽起來像台灣人」只是主觀評價，不代表模型具備可靠的區域口音保證。</small>
  </section>
 </main>;
}
