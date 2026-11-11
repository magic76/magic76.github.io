import type {LifeRun,LifeDecision} from "./lifeSimulation";
import type {TimelineCharacterId} from "./timelineCharacters";

export type LifeEndingCard={id:"work"|"bonds"|"turning-point"|"legacy";heading:string;text:string;sourceAge?:number};
type Copy=[string,string];
const message=(en:boolean,pair:Copy)=>pair[en?1:0];
const pivotal=(run:LifeRun,age:number):LifeDecision|undefined=>run.history.find(d=>d.age===age);
const bold=(d?:LifeDecision)=>d?.choice===0||(d?.choice===2&&d.after.courage>=60);
const workCopy:Record<TimelineCharacterId,{bold:Copy;steady:Copy}>={
 mira:{
  bold:["她持續以鏡頭記錄城市變遷。作品未必讓她成為名人，卻幫一些被忽略的地方留下痕跡。","She keeps documenting changing neighbourhoods. The work may not make her famous, but it preserves overlooked places."],
  steady:["她把攝影、星空與在地生活連在一起。比起追逐名聲，她更在乎影像是否能讓人看見新的世界。","She connects photography, the night sky and her community, caring more about what people discover than about fame."]
 },
 ethan:{
  bold:["他曾冒險追求自己的音樂，也逐漸學會讓創作與生活找到平衡。聲音成了他理解世界的方式。","He takes chances on his own music and slowly learns to balance art and everyday life. Sound becomes his way of understanding people."],
  steady:["他從穩定的錄音工作出發，把技巧帶到社區與年輕創作者身邊，為更多聲音找到出口。","Steady recording work grows into a way of supporting young creators and giving local voices room to be heard."]
 },
 hana:{
  bold:["她靠著好奇心走過陌生城市，也學會旅行不只是收集風景，而是理解不同的人。","Curiosity takes her through unfamiliar cities. Over time she learns that travel is about people more than destinations."],
  steady:["她從熟悉的小巷出發，記錄街坊與旅人交會的故事，把地方記憶傳給下一代。","Starting with familiar lanes, she records stories shared by neighbours and visitors, passing local memory forward."]
 }
};
const legacies:Record<TimelineCharacterId,{bold:Copy;steady:Copy}>={
 mira:{
  bold:["她留下的不是一張得獎照片，而是有人因此記得一個快被遺忘的地方。","Her legacy is not a prize-winning photo but a place someone remembers because of her images."],
  steady:["一張舊星圖和一批年輕人的新照片，讓曾經的好奇心有了下一個主人。","An old star map and a new generation's photographs keep curiosity alive."]
 },
 ethan:{
  bold:["那些錄音有的公開、有的只留在家裡；他學會聲音的價值也包含對隱私的尊重。","Some recordings are shared, others stay private. He learns that respecting privacy is also part of preserving voices."],
  steady:["有人因為他學會錄音，第一次把家人的故事好好保存了下來。","Someone learns to record from him and preserves a family story for the first time."]
 },
 hana:{
  bold:["她留下的地圖不只標記地點，還記錄沿途遇見的人與彼此不同的記憶。","Her maps hold more than places: they capture the people she met and the memories they shared."],
  steady:["小小的街區故事被留下來，讓新來的人也能理解這裡曾經的日常。","Small neighbourhood stories remain, giving newcomers a way to understand the lives once lived there."]
 }
};
export function lifeCausalEcho(run:LifeRun,age:number,english:boolean):string|null{
 if(run.ruleset!==2||![25,40,70].includes(age))return null;
 const source=age===25?16:age===40?25:40;
 const decision=pivotal(run,source);
 if(!decision)return null;
 return english
  ?`Because at ${source}, you chose "${decision.labelEn}", this chapter opens differently.`
  :`因為你在 ${source} 歲選擇「${decision.labelZh}」，這個人生階段因此走向不同的事件。`;
}
export function lifeEndingCards(run:LifeRun,english:boolean):LifeEndingCard[]{
 const d16=pivotal(run,16),d25=pivotal(run,25),d40=pivotal(run,40),d70=pivotal(run,70);
 const startBold=bold(d16),middleBold=bold(d25),lateBold=bold(d40);
 const work=message(english,workCopy[run.character][startBold?"bold":"steady"]);
 const trust=run.traits.trust,empathy=run.traits.empathy;
 const bonds=trust>=70&&empathy>=70
  ?message(english,["願意信任、也願意傾聽，讓他與重要的人建立了深厚的連結。","Trust and empathy help build deep connections with people who matter."])
  :trust<55
  ?message(english,["他在重要的關係中學到：保護自己很重要，重新建立信任也需要時間。","Important relationships teach that boundaries matter and trust takes time to rebuild."])
  :message(english,["有些關係變得親近，有些漸漸疏遠；他學會了在選擇中照顧彼此。","Some relationships deepen while others fade. Learning to care for people remains part of the journey."]);
 const turning=d25
  ?middleBold
   ?message(english,[`25 歲時選擇「${d25.labelZh}」，帶來了新的機會，也伴隨不確定與代價。`,`Choosing "${d25.labelEn}" at 25 opened new doors, alongside real risks and costs.`])
   :message(english,[`25 歲時選擇「${d25.labelZh}」，讓生活更有節奏，也保留了另一條未走過的路。`,`Choosing "${d25.labelEn}" at 25 made room for stability, while leaving another road unexplored.`])
  :message(english,["每段人生都有重要的岔路，並非一次選擇就能決定全部。","No single choice defines an entire life."]);
 const legacy=message(english,legacies[run.character][lateBold?"bold":"steady"]);
 const late= d70?(english?d70.labelEn:d70.labelZh):"";
 return [
  {id:"work",heading:message(english,["走過的路","Work and purpose"]),text:work,sourceAge:16},
  {id:"bonds",heading:message(english,["留下的關係","Relationships"]),text:bonds,sourceAge:40},
  {id:"turning-point",heading:message(english,["值得回想的岔路","A turning point"]),text:turning,sourceAge:25},
  {id:"legacy",heading:message(english,["七十歲留下的東西","What remains"]),text:legacy+(late?(english?" Final choice: ":" 最後的決定：")+late:""),sourceAge:70}
 ];
}
