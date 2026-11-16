import {useEffect,useMemo,useState} from "react";
import {useTranslation} from "react-i18next";
import {ensureCore,geminiKey} from "../lib/runtime";
import {nativeLanguageName,type NativeLanguage} from "../teacher/teacherLocale";
type Turn={input?:string;output?:string};
type Props={name:string;turns:ReadonlyArray<Turn>;input:string;output:string;learningLanguage:string;nativeLanguage:NativeLanguage;speaking:boolean};
type Caption={source:string;language:NativeLanguage;text:string};
type Translator={translate(text:string):Promise<string>;destroy?():void};
type Factory={create(v:{sourceLanguage:string;targetLanguage:string}):Promise<Translator>};
const PREF="crew_friend_call_translation_v1";
const LANG:Record<string,string>={"英文":"en","日文":"ja","韓文":"ko","中文":"zh","華語":"zh","繁體中文":"zh","簡體中文":"zh","西班牙文":"es","法文":"fr","德文":"de","義大利文":"it","越南文":"vi","泰文":"th","印尼文":"id","葡萄牙文":"pt"};
function initial(){try{return localStorage.getItem(PREF)!=="off"}catch{return true}}
async function translate(text:string,source:string,target:NativeLanguage):Promise<string>{
 if(!geminiKey()){
  const factory=(globalThis as unknown as {Translator?:Factory}).Translator;
  if(!factory)throw new Error("key");
  let item:Translator|undefined;
  try{item=await factory.create({sourceLanguage:source,targetLanguage:target});return String(await item.translate(text)).trim()}
  finally{item?.destroy?.()}
 }
 await ensureCore();
 if(!window.CrewAI?.call)throw new Error("service");
 const value=await window.CrewAI.call("Translate this actual spoken transcript into "+nativeLanguageName(target)+". Return only the accurate translation:\n\n"+text,
 {preferLive:false,temperature:0,maxOutputTokens:240,system:"Translate only what was said. Do not invent dialogue."});
 return typeof value==="string"?value.trim():"";
}
export function FriendCallCaptions({name,turns,input,output,learningLanguage,nativeLanguage,speaking}:Props){
 const {t}=useTranslation("voice");
 const [enabled,setEnabled]=useState(initial);
 const [translated,setTranslated]=useState<Caption|null>(null);
 const [working,setWorking]=useState(false),[error,setError]=useState<""|"key"|"failed">("");
 const latestInput=useMemo(()=>[...turns].reverse().find(v=>v.input?.trim())?.input?.trim()||"",[turns]);
 const latestReply=useMemo(()=>[...turns].reverse().find(v=>v.output?.trim())?.output?.trim()||"",[turns]);
 const source=LANG[learningLanguage]||"en";
 const needTranslation=source.split("-")[0]!==nativeLanguage.split("-")[0];
 const currentReply=output.trim();
 useEffect(()=>{
  let canceled=false;setWorking(false);setError("");
  if(!enabled||!latestReply||!needTranslation){setTranslated(null);return}
  setTranslated(v=>v?.source===latestReply&&v.language===nativeLanguage?v:null);
  const timer=window.setTimeout(()=>{
   if(canceled)return;
   setWorking(true);
   void translate(latestReply,source,nativeLanguage).then(value=>{
    if(!canceled){if(!value)throw Error("empty");setTranslated({source:latestReply,language:nativeLanguage,text:value})}
   }).catch(e=>{if(!canceled){setError(e?.message==="key"?"key":"failed");setTranslated(null)}})
    .finally(()=>{if(!canceled)setWorking(false)});
  },250);
  return()=>{canceled=true;window.clearTimeout(timer)};
 },[enabled,latestReply,needTranslation,nativeLanguage,source]);
 const toggle=()=>setEnabled(v=>{try{localStorage.setItem(PREF,v?"off":"on")}catch{}return !v});
 return <div className="friend-phone-captions" aria-label={t("callCaptions.aria")}>
  <div className="friend-caption-heading"><span>{t("workspace.transcript")}</span>
   {needTranslation?<button type="button" className="friend-caption-toggle" aria-pressed={enabled} onClick={toggle}>{t(enabled?"callCaptions.hideTranslation":"callCaptions.showTranslation")}</button>:null}
  </div>
  <section className="friend-caption-ai" aria-label={name}>
   <small>{name}{speaking?" · "+t("compact.speaking"):""}</small>
   <p lang={source}>{currentReply||latestReply||t("callCaptions.waitingForFriend")}</p>
   {enabled&&needTranslation&&latestReply&&(!currentReply||currentReply===latestReply)?<div className="friend-caption-translation" lang={nativeLanguage}>
    {translated?.source===latestReply&&translated.language===nativeLanguage?translated.text:working?t("callCaptions.translating"):error==="key"?t("callCaptions.needsKey"):error==="failed"?t("callCaptions.translateFailed"):null}
   </div>:null}
  </section>
  <section className="friend-caption-user" aria-label={t("friendLive.youSaid")}>
   <small>{t("friendLive.youSaid")}{input.trim()&&input.trim()!==latestInput?" · "+t("callCaptions.recognizing"):latestInput?" · "+t("callCaptions.recognized"):""}</small>
   <p lang={source}>{input.trim()||latestInput||t("callCaptions.waitingForYou")}</p>
  </section>
 </div>;
}
