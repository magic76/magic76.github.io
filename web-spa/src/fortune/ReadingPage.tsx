import{useEffect,useState}from"react";import{useNavigate,useSearchParams}from"react-router-dom";import{ensureFortuneServices,geminiKey}from"../lib/runtime";import{BaZiTabs}from"./result/BaZiTabs";import{TarotTabs}from"./result/TarotTabs";import{VedicTabs}from"./result/VedicTabs";import{shareFortuneReading}from"./shareCard";import{FortuneProfileTools}from"./ProfileTools";import{FortuneYearHighlights}from"./YearHighlights";import type{FortuneMode,FortuneProfile,FortuneReading}from"./types";

const copy:Record<FortuneMode,[string,string]>={bazi:["八字","四柱、十神、大運、逐年流年與主題 evidence。"],tarot:["塔羅生命靈數","出生牌、生命道路、Pinnacles、年月時間軸。"],vedic:["印度星盤","Lahiri sidereal、Whole Sign、Nakshatra、Dasha 與 Gochar。"]};
const EMPTY:FortuneProfile={birthDate:"",birthTime:"",gender:"1",city:"",latitude:"",longitude:"",utcOffset:"+08:00",timeZoneId:"",aiStyle:"normal"};

export function FortuneReadingPage(){
 const[params,setParams]=useSearchParams(),nav=useNavigate(),initial=(params.get("mode") as FortuneMode)||"bazi";
 const[mode,setModeState]=useState<FortuneMode>(copy[initial]?initial:"bazi"),[p,setP]=useState<FortuneProfile>(EMPTY),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[reading,setReading]=useState<FortuneReading|null>(null),[showInput,setShowInput]=useState(true);
 useEffect(()=>{void ensureFortuneServices().then(()=>{const saved=window.CrewFortuneProfile.load();setP(x=>({...x,...saved}));const historyId=params.get("history");if(historyId){const old=window.CrewFortuneProfile.get(historyId) as FortuneReading|null;if(old){setModeState(old.mode);setP(old.profile);setReading(old);setShowInput(false)}}setReady(true)})},[]);
 const setMode=(m:FortuneMode)=>{setModeState(m);setParams({mode:m});setReading(null);setShowInput(true)};
 const field=(k:keyof FortuneProfile)=>(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>)=>setP({...p,[k]:e.target.value});
 function validate(){if(!p.birthDate)return"請選擇生日";if((mode==="bazi"||mode==="vedic")&&!p.birthTime)return"請填出生時間";if(mode==="vedic"&&(!p.latitude||!p.longitude||!p.utcOffset))return"印度星盤需要出生地經緯度與 UTC offset";return""}
 function calculate(){
  if(mode==="bazi")return window.CrewFortuneBaZi.calculate(p.birthDate,p.birthTime,Number(p.gender),new Date());
  if(mode==="tarot")return window.CrewFortuneTarot.calculate(p.birthDate,new Date());
  const base=window.CrewFortuneVedic.calculate(p,new Date());return window.CrewFortuneVedicEnrich.enrich(base,p,new Date());
 }
 async function interpret(item:FortuneReading){
  if(!geminiKey()||!window.CrewAI)return;
  const style=p.aiStyle==="strict"?"語氣嚴謹，清楚區分固定 facts 與主觀解讀。":p.aiStyle==="funny"?"可以輕鬆一點，但不要拿疾病、死亡、災難或重大損失開玩笑。":"白話、直接、有重點。";
  try{
   const text=await window.CrewAI.call("你是 Crew Fortune 的命理解讀者。模式："+copy[item.mode][0]+"。"+style+"只能根據後面的 deterministic facts 解讀，不可自行重算或補不存在資料。輸出：核心重點 / 工作與現實節奏 / 關係與內在 / 接下來值得觀察的 3 件事 / 一句提醒。娛樂與自我反思用途。\nfacts："+JSON.stringify(item.result).slice(0,24000),{preferLive:false,temperature:.4,maxOutputTokens:1500});
   const updated={...item,ai:text};setReading(updated);window.CrewFortuneProfile.addHistory(updated);localStorage.setItem("crew_fortune_live_context",JSON.stringify(updated));
  }catch{const updated={...item,ai:"AI 解讀暫時失敗，但固定計算結果仍有效。"};setReading(updated);window.CrewFortuneProfile.addHistory(updated)}
 }
 async function run(){
  if(!ready)return;const error=validate();if(error){alert(error);return}setBusy(true);window.CrewFortuneProfile.save(p);
  try{
   const result=calculate(),item:FortuneReading={id:"reading_"+Date.now(),mode,createdAt:new Date().toISOString(),profile:p,result,summary:copy[mode][0]+" · "+(result.fourPillars||result.birthCardDisplay||("Lagna "+result.lagnaSign))};
   setReading(item);setShowInput(false);window.CrewFortuneProfile.addHistory(item);localStorage.setItem("crew_fortune_live_context",JSON.stringify(item));void interpret(item);
  }finally{setBusy(false)}
 }
 function ask(){if(!reading)return;localStorage.setItem("crew_fortune_live_context",JSON.stringify(reading));nav("/fortune/live?from=reading")}
 const Result=reading?.mode==="bazi"?BaZiTabs:reading?.mode==="tarot"?TarotTabs:VedicTabs;
 return <><section className="hero"><span className="kicker">Crew Fortune</span><h1>{copy[mode][0]}</h1><p>{copy[mode][1]}</p></section>
 {showInput?<section className="fortune-input-page section"><div className="panel fortune-profile-form"><div className="section-head"><h2>你的資料</h2><small>只需設定一次</small></div><label className="label">模式</label><select className="field" value={mode} onChange={e=>setMode(e.target.value as FortuneMode)}><option value="bazi">八字</option><option value="tarot">塔羅生命靈數</option><option value="vedic">印度星盤</option></select><label className="label">生日</label><input className="field" type="date" value={p.birthDate} onChange={field("birthDate")}/>{mode!=="tarot"&&<><label className="label">出生時間</label><input className="field" type="time" value={p.birthTime} onChange={field("birthTime")}/></>}{mode==="bazi"&&<><label className="label">性別</label><select className="field" value={p.gender} onChange={field("gender")}><option value="1">男</option><option value="0">女</option></select></>}{mode==="vedic"&&<><FortuneProfileTools mode={mode} profile={p} onChange={setP}/><details className="fortune-advanced-place"><summary>進階出生地資料</summary><div className="two"><label><span className="label">Latitude</span><input className="field" value={p.latitude} onChange={field("latitude")}/></label><label><span className="label">Longitude</span><input className="field" value={p.longitude} onChange={field("longitude")}/></label></div><label className="label">時區</label><input className="field" value={p.timeZoneId} onChange={field("timeZoneId")} placeholder="Asia/Taipei"/><label className="label">出生當時 UTC offset</label><input className="field" value={p.utcOffset} onChange={field("utcOffset")}/></details></>}{mode!=="vedic"&&<FortuneProfileTools mode={mode} profile={p} onChange={setP}/>}<label className="label">AI 解讀風格</label><select className="field" value={p.aiStyle} onChange={field("aiStyle")}><option value="normal">白話</option><option value="strict">嚴謹</option><option value="funny">風趣</option></select><div className="actions"><button className="btn" disabled={busy||!ready} onClick={()=>void run()}>{busy?"計算中…":"開始解讀"}</button></div></div></section>:
 <section className="fortune-result-page section"><div className="fortune-result-header"><button className="btn secondary small" onClick={()=>setShowInput(true)}>← 修改資料</button><div><span className="kicker">{copy[reading!.mode][0]}</span><h2>{reading!.summary}</h2><small>{new Date(reading!.createdAt).toLocaleString()}</small></div><div className="actions"><button className="btn secondary small" onClick={()=>void shareFortuneReading(reading!)}>分享卡</button></div></div><FortuneYearHighlights mode={reading!.mode} result={reading!.result}/><Result result={reading!.result} ai={reading!.ai||""}/><details className="fortune-help-zone"><summary>看不懂這些資料？</summary><p>先以命盤、時間軸與主題 evidence 為主；需要白話追問時，再開啟老師對話。</p><button className="btn secondary small" onClick={ask}>問老師這份結果</button></details></section>}
 </>}