import {useEffect,useState} from "react";
import {
 buildUsageExport,usageExportFilename,usageExportCsv,usageExportSummary,
 type UsageBar,type UsageCategory,type UsageReport
} from "./usageExport";

type Props={
 data:UsageReport|null;days:7|30;category:UsageCategory;bars:UsageBar[];
 categoryEventTotal:number;disabled:boolean;
};

function download(content:string,filename:string,mime:string){
 const url=URL.createObjectURL(new Blob([content],{type:mime}));
 const link=document.createElement("a");
 link.href=url;link.download=filename;link.style.display="none";
 document.body.appendChild(link);
 try{link.click()}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
}

function legacyCopy(text:string){
 const field=document.createElement("textarea");
 const focused=document.activeElement instanceof HTMLElement?document.activeElement:null;
 field.value=text;field.setAttribute("readonly","");
 field.style.cssText="position:fixed;left:-9999px;top:0;opacity:0";
 document.body.appendChild(field);
 try{
  field.focus();field.select();
  return document.execCommand("copy");
 }finally{field.remove();focused?.focus()}
}
async function copyText(text:string){
 if(navigator.clipboard?.writeText){
  try{await navigator.clipboard.writeText(text);return true}catch{/* Not granted: use legacy selection. */}
 }
 try{return legacyCopy(text)}catch{return false}
}

export function UsageExportControls({data,days,category,bars,categoryEventTotal,disabled}:Props){
 const[feedback,setFeedback]=useState("");
 useEffect(()=>setFeedback(""),[data,days,category.id]);
 const unavailable=disabled||!data||data.days!==days;
 const snapshot=(now:Date)=>data?buildUsageExport(data,days,category,bars,categoryEventTotal,now):null;
 const exportFile=(format:"json"|"csv")=>{
  if(unavailable)return;
  const now=new Date(),payload=snapshot(now);if(!payload)return;
  try{
   download(format==="json"?JSON.stringify(payload,null,2):usageExportCsv(payload),
    usageExportFilename(format,now),format==="json"?"application/json;charset=utf-8":"text/csv;charset=utf-8");
   setFeedback("");
  }catch{setFeedback("匯出失敗，請再試一次")}
 };
 const copy=async()=>{
  if(unavailable)return;
  const payload=snapshot(new Date());if(!payload)return;
  const ok=await copyText(usageExportSummary(payload));
  setFeedback(ok?"已複製":"複製失敗，請再試一次");
 };
 return <div className="usage-export-controls" role="group" aria-label="匯出使用統計">
  <button className="usage-export" type="button" disabled={unavailable} onClick={()=>exportFile("json")}>匯出 JSON</button>
  <button className="usage-export" type="button" disabled={unavailable} onClick={()=>exportFile("csv")}>匯出 CSV</button>
  <button className="usage-export" type="button" disabled={unavailable} onClick={()=>void copy()}>複製</button>
  {feedback&&<span className="usage-export-feedback" role="status" aria-live="polite">{feedback}</span>}
 </div>;
}
