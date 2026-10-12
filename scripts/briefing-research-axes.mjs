/**
 * Editorial focus: select research that can change a real product or agent workflow.
 * Pure functions so the daily CI and regression tests use exactly the same rules.
 */
export const RESEARCH_AXES=[
 {id:"agent-reliability",topic:"Agent Reliability",query:"AI agent reliability benchmark",projects:["Crew Pocket","Crew Deck"],weight:98,match:/\b(agent|agents|coding assistant|llm)\b/i,signal:/reliab|eval|benchmark|failur|verif|test|recover|retry|correctness|autonomous|agentic|安全|可靠|驗證/i},
 {id:"context-memory",topic:"Context & Memory",query:"agent memory context retrieval",projects:["Crew Pocket","Crew Deck"],weight:98,match:/\b(memory|context|retriev|rag|compaction|compress|long.term|long.horizon|memor)\w*/i,signal:/\b(llm|agent|rag|retriev\w*|language model|context engineering|compaction|compression|long.term memory)\b/i},
 {id:"multi-agent",topic:"Multi-Agent Systems",query:"multi agent collaboration",projects:["Crew Deck","Crew Pocket"],weight:96,match:/multi.agent|multiagent|agent collaborat|agent coordination|agent orchestrat/i,signal:/communicat|coordinat|collaborat|orchestrat|multi.agent|delegat|task/i},
 {id:"realtime-voice",topic:"Realtime Multimodal",query:"real time speech AI agents",projects:["Crew Teacher","Crew Story"],weight:90,match:/\b(speech|voice|audio|multimodal|streaming|realtime|real.time|vision)\b/i,signal:/realtime|real.time|latency|dialog|turn.taking|conversational|speech.to.speech|speech recogn|text.to.speech|speech synth|streaming|voice agent|multimodal (ai|model|agent)|vision.language|voice interaction/i},
 {id:"adaptive-learning",topic:"AI Learning",query:"AI language learning tutor",projects:["Crew Teacher"],weight:88,match:/\b(language learning|language tutor|adaptive learning|intelligent tutor|personalized learning|education|pedagog)\w*/i,signal:/adaptive|personaliz|feedback|tutor|pronunciation|language learn|vocabulary|spaced repetition|learner model/i},
 {id:"model-efficiency",topic:"Model Efficiency",query:"language model routing inference",projects:["Crew Pocket","Crew Deck"],weight:91,match:/\b(model rout|small language model|efficient inference|token optim|model distill|inference cost|inference latency|mixture.of.experts|cost.efficien)\w*/i,signal:/model|inference|routing|token|cost|distill|latency|budget|efficient/i},
 {id:"product-economics",topic:"AI Product Economics",query:"LLM inference API pricing",projects:["Crew Teacher","Crew Web"],weight:78,match:/\b(byok|bring your own key|llm pricing|api cost|usage based|ai product monetiz|generative ai privacy|inference billing)\w*/i,signal:/pricing|privacy|cost|monetiz|billing|usage|key|product/i},
 {id:"product-experience",topic:"AI Product Experience",query:"human agent interaction",projects:["Crew Web","Crew Lab SI"],weight:76,match:/\b(ai user experience|agent interface|human.agent interaction|human ai interaction|ai product design|human in the loop)\b/i,signal:/interface|interaction|ux|design|review|workflows|human/i}
];
const boilerplate=/^(ask hn:|show hn:|who is hiring|monthly roundup|weekly roundup|hiring:|launch hn:)/i;
export function matchingAxes(text){
 const value=String(text||"");
 return RESEARCH_AXES.filter(axis=>axis.match.test(value)&&axis.signal.test(value));
}
export function classify(text){return [...new Set(matchingAxes(text).flatMap(x=>x.projects))];}
export function researchScore(candidate){
 const title=String(candidate.title||"");const synopsis=String(candidate.abstract||"");
 if(!title||boilerplate.test(title))return 0;
 // Relevance is based on the actual headline/abstract, not on the search query which found it.
 const titleMatches=matchingAxes(title);
 const matches=matchingAxes(title+" "+synopsis);
 if(!titleMatches.length||!matches.length)return 0;
 const strongest=Math.max(...titleMatches.map(x=>x.weight));
 const published=Date.parse(candidate.publishedAt||"");
 const age=Number.isFinite(published)?Math.max(0,(Date.now()-published)/86400000):60;
 const recency=age<=3?6:age<=7?4:age<=14?2:0;
 const evidence=candidate.kind==="研究論文索引"?7:candidate.kind==="官方研究"?8:candidate.kind==="社群觀察"?-5:0;
 const attention=Math.min(4,Math.round(Math.log2(1+Math.max(0,Number(candidate.points||0)))));
 const broadTopicPenalty=titleMatches.length>3?3:0;
 return Math.max(1,Math.min(100,strongest-14+recency+evidence+attention-broadTopicPenalty));
}
export function selectResearch(candidates,history=[],limit=8){
 const recent=new Set(history.flatMap(day=>(day.items||[]).flatMap(item=>[item.sources?.[0]?.url,item.title].filter(Boolean))));
 const seen=new Set(),picked=[],counts=new Map();
 const ranked=candidates.map(c=>({...c,score:researchScore(c)})).filter(c=>c.score>=68).sort((a,b)=>b.score-a.score||String(b.publishedAt).localeCompare(String(a.publishedAt)));
 for(const pass of [2,3]){
  for(const candidate of ranked){
   const key=candidate.url||candidate.title;
   if(seen.has(key)||recent.has(key))continue;
   const primary=matchingAxes(candidate.title)[0]?.id||"other";
   if((counts.get(primary)||0)>=pass)continue;
   seen.add(key);counts.set(primary,(counts.get(primary)||0)+1);picked.push(candidate);
   if(picked.length>=limit)return picked;
  }
 }
 return picked;
}
