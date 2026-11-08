import{useMemo,useState}from"react";import{useTranslation}from"react-i18next";
import type{FortuneMode,FortuneProfile}from"./types";
import{clearFortunePresets,loadFortunePresets,presetLabel,saveFortunePreset,type FortunePreset}from"./profileStore";
import{searchBirthPlaces,utcOffsetForBirth,resolveBirthOffset,type BirthPlaceResult}from"./birthPlaceSearch";

export function FortuneProfileTools({mode,profile,onChange}:{mode:FortuneMode;profile:FortuneProfile;onChange:(p:FortuneProfile)=>void}){
 const {t,i18n}=useTranslation("fortune");
 const[presets,setPresets]=useState<FortunePreset[]>(()=>loadFortunePresets()),[query,setQuery]=useState(profile.city||""),[places,setPlaces]=useState<BirthPlaceResult[]>([]),[searching,setSearching]=useState(false),[message,setMessage]=useState("");
 const compatible=useMemo(()=>presets.filter(x=>x.mode===mode),[presets,mode]);
 function save(){
  if(!profile.birthDate){setMessage(t("profile.birthdayRequired"));return}
  if(mode!=="tarot"&&!profile.birthTime){setMessage(t("profile.birthTimeRequired"));return}
  if(mode==="vedic"&&(!profile.latitude||!profile.longitude||!(profile.timeZoneId||profile.utcOffset))){setMessage(t("profile.vedicRequired"));return}
  setPresets(saveFortunePreset(mode,profile));setMessage(t("profile.saved"));
 }
 async function search(){
  if(query.trim().length<2)return;setSearching(true);setMessage("");
  try{const r=await searchBirthPlaces(query,i18n.resolvedLanguage||i18n.language);setPlaces(r);if(!r.length)setMessage(t("profile.noCity"))}
  catch(e){setMessage(e instanceof Error?e.message:String(e))}
  finally{setSearching(false)}
 }
 function choose(x:BirthPlaceResult){
  const offset=resolveBirthOffset({...profile,timeZoneId:x.timezone,utcOffset:""});
  onChange({...profile,city:x.displayName,latitude:String(x.latitude),longitude:String(x.longitude),timeZoneId:x.timezone,utcOffset:offset});
  setQuery(x.displayName);setPlaces([]);setMessage(x.timezone+(offset?" · UTC "+offset:""));
 }
 return <div className="fortune-profile-tools">
  <div className="fortune-preset-row">
   <button className="btn secondary small" onClick={save}>{t("profile.save")}</button>
   {compatible.length>0&&<select className="field compact-field" defaultValue="" onChange={e=>{const x=compatible[Number(e.target.value)];if(x){onChange({...x.profile});setQuery(x.profile.city||"")}}}><option value="" disabled>{t("profile.select")}</option>{compatible.map((x,i)=><option key={i} value={i}>{presetLabel(x)}</option>)}</select>}
   {presets.length>0&&<button className="text-button" onClick={()=>{clearFortunePresets();setPresets([]);setMessage(t("profile.cleared"))}}>{t("profile.clear")}</button>}
  </div>
  {mode==="vedic"&&<div className="fortune-place-search">
   <label className="label">{t("profile.city")}</label><div className="fortune-place-search-row"><input className="field" value={query} placeholder={t("profile.cityPlaceholder")} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();void search()}}}/><button className="btn secondary small" disabled={searching} onClick={()=>void search()}>{searching?t("profile.searching"):t("profile.search")}</button></div>
   {places.length>0&&<div className="fortune-place-results">{places.map((x,i)=><button key={i} onClick={()=>choose(x)}><strong>{x.displayName}</strong><small>{x.latitude.toFixed(4)}, {x.longitude.toFixed(4)} · {x.timezone}</small></button>)}</div>}
   {(profile.latitude&&profile.longitude)&&<div className="fortune-place-selected"><strong>{profile.city||t("profile.selectedCity")}</strong><small>{profile.latitude}, {profile.longitude} · {profile.timeZoneId||profile.utcOffset}{profile.timeZoneId?" · UTC "+(resolveBirthOffset(profile)||"—"):""}</small></div>}
  </div>}
  {message&&<p className="meta">{message}</p>}
 </div>
}