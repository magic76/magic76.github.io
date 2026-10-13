/**
 * A conservative *automatic* editorial eligibility check, not a fact checker.
 * It can flag scraped excerpts and generic recommendations, but cannot
 * establish that a scientific claim or citation is true. Human review still
 * owns the truth of research claims.
 */
export function assessResearchQuality(item){
 const reasons=[];
 const body=typeof item?.body==="string"?item.body.trim():"";
 const summary=typeof item?.summary==="string"?item.summary.trim():"";
 const relevance=typeof item?.relevance==="string"?item.relevance.trim():"";
 const actions=Array.isArray(item?.actions)?item.actions.filter(x=>typeof x==="string"&&x.trim().length>=18):[];
 const sources=Array.isArray(item?.sources)?item.sources.filter(x=>{
  if(typeof x?.title!=="string"||!x.title.trim())return false;
  try{return new URL(x.url).protocol==="https:"}catch{return false}
 }):[];
 if(sources.length===0)reasons.push("missing_https_source");
 if(body.length<270)reasons.push("insufficient_analysis");
 if(summary&&body.slice(0,120)===summary.slice(0,120))reasons.push("copied_excerpt");
 if(relevance.length<75||/這個議題涉及.+可先評估現有做法/.test(relevance))reasons.push("generic_application");
 if(!/(Crew 應用|Crew應用|研究判斷|實作方向)[：:]/.test(body))reasons.push("missing_crew_analysis");
 if(!/(研究限制|成本提醒|採用前|不代表|尚未驗證|無法推估)/.test(body))reasons.push("missing_limitations");
 if(actions.length<2)reasons.push("missing_test_plan");
 return {indexable:reasons.length===0,reasons};
}
