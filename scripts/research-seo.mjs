import {readFileSync,existsSync} from "node:fs";
import {join} from "node:path";

const dateRe=/^\d{4}-\d{2}-\d{2}$/;
const idRe=/^[a-zA-Z0-9_-]{3,100}$/;
export const articlePath=(day,item)=>"/research/"+day+"/"+item.id+"/";
export const articleCanonical=(day,item)=>"https://www.3sssi.com"+articlePath(day,item);
export const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const safeJson=value=>JSON.stringify(value).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026").replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029");

/** Only editorial pages with enough original analysis enter search indexing. */
export function indexableArticle(item){
 return typeof item.body==="string"&&item.body.trim().length>=270
  &&typeof item.relevance==="string"&&item.relevance.trim().length>=75
  &&Array.isArray(item.sources)&&item.sources.some(s=>/^https:\/\//.test(s?.url||""));
}

export function readPublishedResearch(root){
 const folder=join(root,"crew-app","briefings");
 const index=JSON.parse(readFileSync(join(folder,"index.json"),"utf8"));
 if(!Array.isArray(index.days))throw Error("Research feed index.days is missing");
 const days=new Map();
 for(const date of [...new Set(index.days)]){
  if(typeof date!=="string"||!dateRe.test(date))throw Error("Unsafe research date: "+date);
  const filename=join(folder,date+".json");
  if(!existsSync(filename))throw Error("Missing public research edition: "+date);
  const day=JSON.parse(readFileSync(filename,"utf8"));
  if(day.date!==date||day.edition!=="public"||!Array.isArray(day.items))throw Error("Invalid research edition: "+date);
  const ids=new Set();
  for(const item of day.items){
   if(!idRe.test(item.id||"")||ids.has(item.id))throw Error("Unsafe or duplicate research id: "+date+" "+item.id);
   if(typeof item.title!=="string"||typeof item.summary!=="string"||!Array.isArray(item.sources)||!Array.isArray(item.actions))throw Error("Invalid public article: "+date+" "+item.id);
   ids.add(item.id);
  }
  days.set(date,day);
 }
 return {index,days};
}

export function articleHead(article,day){
 const canonical=articleCanonical(day.date,article);
 const title=article.title+"｜Crew Research";
 const description=article.summary.slice(0,180);
 const robots=indexableArticle(article)?"index,follow":"noindex,follow";
 const publication=day.generatedAt;
 const sources=article.sources.filter(s=>/^https:\/\//.test(s.url||"")).map(s=>s.url);
 const ld={
  "@context":"https://schema.org","@type":"BlogPosting",
  headline:article.title,description:article.summary,
  mainEntityOfPage:{"@type":"WebPage","@id":canonical},url:canonical,
  datePublished:publication,dateModified:publication,inLanguage:"zh-Hant",
  author:{"@type":"Organization",name:"Crew Research",url:"https://www.3sssi.com/research/"},
  publisher:{"@type":"Organization",name:"Crew",url:"https://www.3sssi.com/"},
  ...(sources.length?{citation:sources}:{}),
  ...(article.topic?{about:article.topic}:{})
 };
 return {canonical,title,description,robots,ld};
}
