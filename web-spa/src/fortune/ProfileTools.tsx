import{useMemo,useState}from"react";
import type{FortuneMode,FortuneProfile}from"./types";
import{clearFortunePresets,loadFortunePresets,presetLabel,saveFortunePreset,type FortunePreset}from"./profileStore";
import{searchBirthPlaces,utcOffsetForBirth,type BirthPlaceResult}from"./birthPlaceSearch";

export function FortuneProfileTools({mode,profile,onChange}:{mode:FortuneMode;profile:FortuneProfile;onChange:(p:FortuneProfile)=>void}){
 const[presets,setPresets]=useState<FortunePreset[]>(()=>loadFortunePresets()),[query,setQuery]=useState(profile.city||""),[places,setPlaces]=useState<BirthPlaceResult[]>([]),[searching,setSearching]=useState(false),[message,setMessage]=useState("");
 const compatible=useMemo(()=>presets.filter(x=>x.mode===mode),[presets,mode]);
 function save(){
  if(!profile.birthDate){setMessage("先選生日再儲存");return}
  if(mode!=="tarot"&&!profile.birthTime){setMessage("這個模式需要出生時間");return}
  if(mode==="vedic"&&(!profile.latitude||!profile.longitude||!(profile.timeZoneId||profile.utcOffset))){setMessage("印度星盤需要完整出生地資料");return}
  setPresets(saveFortunePreset(mode,profile));setMessage("已儲存常用資料");
 }
 async function search(){
  if(query.trim().length<2)return;setSearching(true);setMessage("");
  try{const r=await searchBirthPlaces(query);setPlaces(r);if(!r.length)setMessage("找不到符合的城市")}
  catch(e){setMessage(e instanceof Error?e.message:String(e))}
  finally{setSearching(false)}
 }
 function choose(x:BirthPlaceResult){
  const offset=utcOffsetForBirth(profile.birthDate,profile.birthTime||"12:00",x.timezone);
  onChange({...profile,city:x.displayName,latitude:String(x.latitude),longitude:String(x.longitude),timeZoneId:x.timezone,utcOffset:offset||profile.utcOffset});
  setQuery(x.displayName);setPlaces([]);setMessage(x.timezone+(offset?" · UTC "+offset:""));
 }
 return <div className="fortune-profile-tools">
  <div className="fortune-preset-row">
   <button className="btn secondary small" onClick={save}>儲存常用資料</button>
   {compatible.length>0&&<select className="field compact-field" defaultValue="" onChange={e=>{const x=compatible[Number(e.target.value)];if(x){onChange({...x.profile});setQuery(x.profile.city||"")}}}><option value="" disabled>選擇常用資料</option>{compatible.map((x,i)=><option key={i} value={i}>{presetLabel(x)}</option>)}</select>}
   {presets.length>0&&<button className="text-button" onClick={()=>{clearFortunePresets();setPresets([]);setMessage("已清除常用資料")}}>清除 presets</button>}
  </div>
  {mode==="vedic"&&<div className="fortune-place-search">
   <label className="label">出生城市</label><div className="fortune-place-search-row"><input className="field" value={query} placeholder="例如：新北市、London" onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();void search()}}}/><button className="btn secondary small" disabled={searching} onClick={()=>void search()}>{searching?"搜尋中…":"搜尋"}</button></div>
   {places.length>0&&<div className="fortune-place-results">{places.map((x,i)=><button key={i} onClick={()=>choose(x)}><strong>{x.displayName}</strong><small>{x.latitude.toFixed(4)}, {x.longitude.toFixed(4)} · {x.timezone}</small></button>)}</div>}
   {(profile.latitude&&profile.longitude)&&<div className="fortune-place-selected"><strong>{profile.city||"已設定出生地"}</strong><small>{profile.latitude}, {profile.longitude} · {profile.timeZoneId||profile.utcOffset}</small></div>}
  </div>}
  {message&&<p className="meta">{message}</p>}
 </div>
}