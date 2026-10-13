import {articlePath} from "./research-seo.mjs";
const STOPWORDS=new Set(["crew","agent","agents","language","learning","research","study","based","using","from","with","model","models","system","systems","2026","approach","contextual","analysis","2025","context","data","large"]);
const tokens=value=>new Set((String(value||"").toLowerCase().match(/[a-z]{4,}/g)||[]).filter(x=>!STOPWORDS.has(x)));
const intersects=(a,b)=>[...a].filter(x=>b.has(x));
const asProjects=item=>new Set(Array.isArray(item.projects)?item.projects.filter(x=>typeof x==="string"):[]);
const topicTokens=item=>tokens(item.topic||"");
const titleTokens=item=>tokens(item.title||"");

export function recommendPublishedResearch(days){
 const all=[];
 for(const [date,day] of days)for(const item of day.items)all.push({date,item,path:articlePath(date,item)});
 const output={};
 for(const current of all){
  const projects=asProjects(current.item),topic=topicTokens(current.item),title=titleTokens(current.item);
  const candidates=[];
  for(const other of all){
   if(current.path===other.path)continue;
   const overlap=intersects(projects,asProjects(other.item));
   const topicMatch=current.item.topic===other.item.topic;
   const topicRelated=intersects(topic,topicTokens(other.item)).length;
   const keywordRelated=intersects(title,titleTokens(other.item)).length;
   if(!topicMatch&&!topicRelated&&!(overlap.length&&keywordRelated))continue;
   const score=(topicMatch?10:0)+topicRelated*5+Math.min(keywordRelated,3)*2+Math.min(overlap.length,2)*2;
   candidates.push({
    date:other.date,id:other.item.id,title:other.item.title,topic:other.item.topic,
    path:other.path,
    reason:topicMatch?"相同研究主題":overlap.length?"共同關注 "+overlap[0]:"主題延伸",
    score
   });
  }
  candidates.sort((a,b)=>b.score-a.score||b.date.localeCompare(a.date)||a.path.localeCompare(b.path));
  output[current.path]=candidates.slice(0,3).map(({score,...entry})=>entry);
 }
 return output;
}
