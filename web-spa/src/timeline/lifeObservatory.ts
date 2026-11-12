import type {TimelineCharacterId} from "./timelineCharacters";

/**
 * An isolated, deterministic world: no background AI, no network, no mutation of canonical Timeline memories.
 * Each scene has authored outcomes. The user may intervene twice per chapter; the rest is agency.
 */
export type ObserverId=TimelineCharacterId;
export type ObserverPair="mira-ethan"|"mira-hana"|"ethan-hana";
export type ObserverAge=16|25|40;
export type ObserverPhase="watch"|"recap"|"end";
export type ObserverLanguage="zh"|"en";
export type ObserverText={zh:string;en:string};
export type ObserverChoice=0|1;
export type ObserverActor={hope:number;stress:number};
export type ObserverDecision={
 id:ObserverId;sceneId:string;source:"player"|"self";choice:ObserverChoice;
 title:ObserverText;decision:ObserverText;outcome:ObserverText;
 hopeDelta:number;stressDelta:number;
};
export type ObserverRipple={id:string;title:ObserverText;body:ObserverText;fromAge?:ObserverAge};
export type ObserverChapter={
 age:ObserverAge;decisions:ObserverDecision[];ripple:ObserverRipple;
 before:Record<ObserverPair,number>;after:Record<ObserverPair,number>;
};
export type ObserverRun={
 version:3;seed:number;step:number;phase:ObserverPhase;
 actors:Record<ObserverId,ObserverActor>;bonds:Record<ObserverPair,number>;
 interventions:Partial<Record<ObserverId,ObserverChoice>>;
 flags:string[];history:ObserverChapter[];createdAt:number;
};
export type ObserverScene={
 id:string;actor:ObserverId;title:ObserverText;intro:ObserverText;
 choices:[{label:ObserverText;outcome:ObserverText;flag:string;hope:number;stress:number},
 {label:ObserverText;outcome:ObserverText;flag:string;hope:number;stress:number}];
};
export const OBSERVER_AGES=[16,25,40] as const;
export const OBSERVER_ACTORS=["mira","ethan","hana"] as const;
export const OBSERVER_PAIRS=["mira-ethan","mira-hana","ethan-hana"] as const;
export const OBSERVER_BUDGET=2;
export const observerText=(zh:string,en:string):ObserverText=>({zh,en});
const tr=observerText;
const option=(label:ObserverText,outcome:ObserverText,flag:string,hope:number,stress:number)=>({label,outcome,flag,hope,stress});
const scene=(id:string,actor:ObserverId,title:ObserverText,intro:ObserverText,
 a:ReturnType<typeof option>,b:ReturnType<typeof option>):ObserverScene=>({id,actor,title,intro,choices:[a,b]});
const clamp=(value:number)=>Math.max(0,Math.min(100,Math.round(value)));
const hash=(value:string)=>{let h=2166136261;for(const c of value){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const has=(run:ObserverRun,value:string)=>run.flags.includes(value);
export function createObserverRun(seed:number):ObserverRun{
 if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw new Error("Invalid observer seed");
 return {version:3,seed,step:0,phase:"watch",createdAt:Date.now(),
  actors:{mira:{hope:67,stress:36},ethan:{hope:62,stress:53},hana:{hope:73,stress:41}},
  bonds:{"mira-ethan":65,"mira-hana":70,"ethan-hana":68},
  interventions:{},flags:[],history:[]};
}
export function observerAge(run:ObserverRun):ObserverAge{return OBSERVER_AGES[Math.min(run.step,2)];}
function scenes16():ObserverScene[]{
 return [
  scene("16-photo","mira",tr("樓梯間的照片","The staircase photograph"),
   tr("Mira 看見 Ethan 獨自練琴，偷偷拍下一張照片。他似乎不想讓別人知道自己有多在乎音樂。","Mira photographs Ethan practising alone. He doesn't seem ready for others to know how much music matters."),
   option(tr("鼓勵她把照片交給 Ethan","Encourage Mira to share the photograph"),tr("Ethan 看見照片裡認真的自己，第一次覺得自己的努力值得被記錄。","Ethan sees himself working hard and realises that his effort deserves to be remembered."),"mira-gave-photo",7,-3),
   option(tr("提醒她先尊重他的隱私","Encourage her to protect his privacy"),tr("Mira 把照片收進相簿。她開始懂得有些重要時刻，不一定要讓大家看到。","Mira keeps the image private and learns that meaningful moments need not be shared."),"mira-kept-photo",4,-6)),
  scene("16-music","ethan",tr("一封沒有送出的報名信","The unsent audition form"),
   tr("Ethan 想報名音樂甄選，但擔心失敗，也擔心和 Hana 的告別撞期。","Ethan considers an audition, worried both about failing and about missing Hana's farewell."),
   option(tr("鼓勵他去參加甄選","Urge him to audition"),tr("他終於按下送出。機會是真的，代價也是真的：接下來他必須把時間交給練習。","He submits the application. The opportunity is real, but preparing for it will take time."),"ethan-audition",10,7),
   option(tr("請他先和朋友好好道別","Ask him to prioritise the farewell"),tr("他留在熟悉的街道練琴，選擇好好度過這個夏天。甄選可能要再等一次。","He practises at home and chooses to be present this summer. The audition may have to wait."),"ethan-stayed",3,-5)),
  scene("16-ticket","hana",tr("藏在口袋裡的車票","The ticket in her pocket"),
   tr("Hana 的家人即將搬走。她一直想找朋友說，卻怕開口後一切都變了。","Hana's family is moving. She wants to tell her friends but fears that saying it aloud will make everything change."),
   option(tr("鼓勵她說出搬家的事","Encourage her to tell her friends"),tr("Hana 終於說出來，三人約在車站見面。難過沒有變少，但他們得以認真道別。","Hana tells her friends. They make plans to meet at the station; sadness remains, but so does a chance to say goodbye."),"hana-told",7,3),
   option(tr("讓她照自己的節奏離開","Let her leave in her own way"),tr("Hana 沒有找到開口的時機。搬走那天，街道和平常一樣安靜。","Hana never finds the right moment. On moving day, the street looks like any other day."),"hana-silent",2,-2))
 ];
}
function scenes25(run:ObserverRun):ObserverScene[]{
 const photo=has(run,"mira-gave-photo"),audition=has(run,"ethan-audition"),told=has(run,"hana-told");
 return [
  scene("25-photo","mira",photo?tr("那張照片收到一封回信","A reply to an old photograph"):tr("抽屜裡的底片","The photograph in a drawer"),
   photo?tr("Mira 把當年的照片做成作品，意外收到一封來自老朋友的訊息。她要不要把它公開展出？","Mira has turned her old photograph into art, and receives a note from an old friend. Should she exhibit it?"):
   tr("Mira 找出九年前一直沒給任何人看的底片。它可能幫兩位朋友重新聯絡，但也涉及 Ethan 的隱私。","Mira discovers the nine-year-old photograph. It might reconnect old friends but also belongs to Ethan's private past."),
   option(tr("先取得同意，再辦一場小展覽","Seek consent and hold a small exhibition"),tr("一場小展覽讓一些失去聯絡的人又走進同一個房間。","A modest exhibition draws people who had lost touch into the same room."),"mira-exhibit",9,2),
   option(tr("留著照片，私下交給老朋友","Give the photo back privately"),tr("那張照片回到當事人手裡。或許不會有人知道，但兩人都懂它的重量。","The image returns to the person in it. No one else may see it, but its meaning remains."),"mira-private",4,-5)),
  scene("25-music","ethan",audition?tr("錄音室的邀約","The recording studio offer"):tr("社區電台的第一集","A first episode at the local radio station"),
   audition?tr("當年的甄選讓 Ethan 得到錄音機會。他必須決定要去遠方闖一闖，還是留在熟悉的城市。","The old audition opened a studio door. Ethan must choose between a new city and a familiar life."):
   tr("Ethan 沒去當年的甄選，卻在社區電台找到一群愛音樂的朋友。有人邀請他製作第一個節目。","Ethan never went to that audition, but community radio brings new musical friends and a chance to produce a show."),
   option(tr("鼓勵他接下新挑戰","Encourage him to take the opportunity"),tr("Ethan 接下工作。新環境很陌生，但他終於開始做自己想做的聲音。","Ethan accepts. The surroundings are unfamiliar, but he begins making the sounds he has dreamed about."),"ethan-new-work",11,9),
   option(tr("建議他先把根留在這裡","Encourage him to build locally"),tr("他在熟悉的地方慢慢建立自己的工作室，也有更多機會照顧老朋友。","He builds a studio locally, keeping space for old friends and a slower kind of success."),"ethan-local",5,-4)),
  scene("25-postcard","hana",told?tr("每年都寄來的明信片","Postcards that kept arriving"):tr("一封九年後才寄出的信","A letter nine years late"),
   told?tr("Hana 在不同城市旅行，仍和兩個朋友通信。她收到一個去更遠地方寫故事的邀約。","Hana travels through new cities but keeps in touch. A writing assignment takes her further away."):
   tr("搬走後沒有好好道別，Hana 一直想寄信給另外兩人。今天，她終於把信寫好了。","Hana never properly said goodbye. Nine years later, she finally writes to the two friends."),
   option(tr("支持她重新聯絡，也勇敢走出去","Reach out, then venture further"),tr("她發出訊息，然後搭上下一班車。回應還沒到來，但她不再把過去完全關起來。","She sends the message and catches the next train. No reply yet, but the past no longer feels sealed away."),"hana-reached",9,4),
   option(tr("讓她先在現在的城市安定下來","Let her build a life where she is"),tr("Hana 決定在新城市停留久一些，把沿途的人和故事好好記住。","Hana stays longer, building a home from the people and stories around her."),"hana-settled",4,-5))
 ];
}
function scenes40(run:ObserverRun):ObserverScene[]{
 const exhibit=has(run,"mira-exhibit"),work=has(run,"ethan-new-work"),reached=has(run,"hana-reached");
 return [
  scene("40-archive","mira",tr("那張照片的第二次生命","The photograph's second life"),
   exhibit?tr("當年的小展覽逐漸成了街區影像計畫。Mira 找到更多照片，也找到很多失散的故事。","The small exhibition became a neighbourhood archive. Mira now holds many forgotten stories."):
   tr("Mira 把當年的照片保留了很多年。現在有人想請她整理三人年輕時共同走過的街道。","Mira has kept the photo for years. Someone asks her to document the streets the three friends once shared."),
   option(tr("邀請另外兩人一起完成","Invite the others to help"),tr("三種不同的回憶拼在一起，讓過去不再只是 Mira 一個人的版本。","Three versions of the past come together, turning memory into something shared."),"mira-invited",9,-4),
   option(tr("先自己整理好這些回憶","Preserve the memories herself"),tr("她一個人整理舊照片，發現很多自己當年忽略的細節。","Working alone, she notices details she never understood when the photos were taken."),"mira-solo",5,-7)),
  scene("40-concert","ethan",tr("一場遲來的演出","The concert that took years"),
   work?tr("Ethan 這些年在不同城市錄音。如今有機會回故鄉演出，但他不確定還有誰願意來聽。","Ethan has worked in many cities. An offer brings him home for a concert, but he wonders who would still come."):
   tr("Ethan 的社區工作室終於有自己的小型演出。他想起十六歲那個一直不敢按下送出的表單。","Ethan's local studio is holding a concert. He remembers the audition form he never sent."),
   option(tr("鼓勵他邀請當年的朋友","Ask him to invite his old friends"),tr("邀請函送出去了。那場演出不再只是工作，也成了一次和過去和解的可能。","Invitations go out. The show becomes more than work: a chance to face the past."),"ethan-invited",8,5),
   option(tr("讓音樂自己說話，不強求重逢","Let the music speak without forcing a reunion"),tr("Ethan 專心把演出做好。台下有人想起舊時光，但不一定敢走上前。","Ethan focuses on the show. Someone in the audience remembers old times but may not approach."),"ethan-performed",5,-4)),
  scene("40-return","hana",tr("回到那條街","Returning to the old street"),
   reached?tr("Hana 多年來一直和朋友保持聯繫。這次回家，她想決定留下來，還是再次出發。","Hana has stayed connected across the years. Back home, she wonders whether to stay or travel again."):
   tr("Hana 很多年沒回到那條街。她聽說有人正在收集舊照片，心裡既期待又不安。","Hana hasn't visited the old street in years. Hearing about an archive brings hope and unease."),
   option(tr("鼓勵她走進熟悉的咖啡店","Encourage her to step inside the old café"),tr("Hana 推開門，店裡的味道和記憶重疊。是否有人還記得她，得等下一刻才知道。","Hana opens the café door. Its familiar scent returns. Whether anyone remembers her is still uncertain."),"hana-returned",9,3),
   option(tr("讓她在街口留下自己的故事","Let her leave a note for the others"),tr("她在老地方留下一張明信片。不見面也能說再見，或許也能說你好。","She leaves a postcard at the old corner. Even without meeting, a greeting is possible."),"hana-note",5,-5))
 ];
}
export function observerScenes(run:ObserverRun):ObserverScene[]{
 if(run.phase!=="watch")throw new Error("Scenes only available while watching");
 return run.step===0?scenes16():run.step===1?scenes25(run):scenes40(run);
}
export function observerInterventionCount(run:ObserverRun):number{return Object.keys(run.interventions).length;}
export function chooseObserverIntervention(run:ObserverRun,id:ObserverId,choice:ObserverChoice):ObserverRun{
 if(run.phase!=="watch"||!OBSERVER_ACTORS.includes(id)||![0,1].includes(choice))throw new Error("Invalid intervention");
 const available=observerScenes(run).some(item=>item.actor===id);
 if(!available)throw new Error("Actor not in scene");
 const actions={...run.interventions};
 if(actions[id]===choice){delete actions[id];return {...run,interventions:actions};}
 if(actions[id]===undefined&&Object.keys(actions).length>=OBSERVER_BUDGET)throw new Error("No interventions left");
 actions[id]=choice;
 return {...run,interventions:actions};
}
function moodChange(actors:ObserverRun["actors"],id:ObserverId,hope:number,stress:number){
 const current=actors[id];
 actors[id]={hope:clamp(current.hope+hope),stress:clamp(current.stress+stress)};
}
function pairChange(bonds:ObserverRun["bonds"],pair:ObserverPair,change:number){bonds[pair]=clamp(bonds[pair]+change);}
function agencyChoice(run:ObserverRun,scene:ObserverScene):ObserverChoice{
 const actor=run.actors[scene.actor];
 const inclination=clamp(45+(actor.hope-50)*.35-(actor.stress-50)*.20);
 return hash(run.seed+":"+run.step+":"+scene.actor+":"+run.flags.join(","))%100<inclination?0:1;
}
export function settleObserverChapter(run:ObserverRun):ObserverRun{
 if(run.phase!=="watch")throw new Error("Chapter already resolved");
 const events=observerScenes(run);
 const actors={mira:{...run.actors.mira},ethan:{...run.actors.ethan},hana:{...run.actors.hana}};
 const before={...run.bonds},bonds={...run.bonds};
 const flags=[...run.flags];
 const decisions=events.map(event=>{
  const intervened=run.interventions[event.actor];
  const choice=intervened===undefined?agencyChoice(run,event):intervened;
  const selected=event.choices[choice];
  flags.push(selected.flag);
  moodChange(actors,event.actor,selected.hope,selected.stress);
  return {id:event.actor,sceneId:event.id,source:intervened===undefined?"self":"player",
   choice,title:event.title,decision:selected.label,outcome:selected.outcome,
   hopeDelta:selected.hope,stressDelta:selected.stress} as ObserverDecision;
 });
 const picked=(id:ObserverId)=>decisions.find(d=>d.id===id)?.choice??1;
 let ripple:ObserverRipple;
 if(run.step===0){
  if(picked("ethan")===0&&picked("hana")===1){
   pairChange(bonds,"ethan-hana",-24);pairChange(bonds,"mira-hana",-9);
   ripple={id:"farewell-missed",title:tr("沒有人去的車站","The empty station"),
    body:tr("Ethan 正在甄選室練琴，Hana 已經搭上列車。兩人都沒有做錯什麼，卻因此錯過了最後一次見面。Mira 手中的照片成了唯一的夏天紀錄。",
     "Ethan is practising for his audition while Hana boards a train. Neither intended harm, but they miss their last goodbye. Mira's photograph becomes the only trace of that summer.")};
  }else if(picked("hana")===0){
   pairChange(bonds,"ethan-hana",12);pairChange(bonds,"mira-hana",10);
   ripple={id:"farewell-gathered",title:tr("三個人，在月台上","Three friends on the platform"),
    body:tr("Hana 終於說出了搬家的事。無論 Ethan 有沒有報名甄選，他們至少趕上了這次道別。多年後，一張月台照片仍會留下。",
    "Hana finally says she is moving. Whether or not Ethan auditions, they have a real goodbye. A photograph from the station will outlast the summer.")};
  }else{
   pairChange(bonds,"ethan-hana",-12);pairChange(bonds,"mira-hana",-7);
   ripple={id:"unspoken-goodbye",title:tr("沒有說出口的再見","The goodbye no one said"),
    body:tr("他們以為以後總有機會見面。搬家後訊息漸少，三個人的記憶開始長成不同版本。",
    "They assume there will always be another chance to meet. Messages thin out, and the three begin carrying different memories.")};
  }
  pairChange(bonds,"mira-ethan",picked("mira")===0?12:4);
 }else if(run.step===1){
  if(has(run,"hana-told")||picked("hana")===0){
   pairChange(bonds,"mira-hana",9);pairChange(bonds,"ethan-hana",10);
   ripple={id:"letters-connect",fromAge:16,title:tr("九年後，信還是寄到了","The letter finally arrives"),
    body:tr("十六歲的告別並沒有消失。Hana 在遠方寫的字、Mira 留下的照片，讓三人又有了一個可以開始對話的理由。",
    "The farewell at sixteen still matters. Hana's letters and Mira's photographs give the three friends a reason to speak again.")};
  }else{
   pairChange(bonds,"ethan-hana",-9);pairChange(bonds,"mira-hana",-7);
   ripple={id:"distance-kept",fromAge:16,title:tr("不聯絡，也是一種選擇","Silence becomes a habit"),
    body:tr("當年沒有道別，這些年也沒有人先開口。新的生活越來越完整，那段友情卻變得越來越難提起。",
    "No one said goodbye at sixteen, and no one starts the next conversation. Life moves forward while an old friendship becomes harder to mention.")};
  }
  if(picked("mira")===0&&picked("ethan")===0)pairChange(bonds,"mira-ethan",14);
  else pairChange(bonds,"mira-ethan",5);
 }else{
  if(picked("hana")===0&&picked("ethan")===0&&picked("mira")===0){
   pairChange(bonds,"mira-ethan",15);pairChange(bonds,"mira-hana",18);pairChange(bonds,"ethan-hana",20);
   ripple={id:"reunion-all",fromAge:16,title:tr("二十四年後，他們終於同框","Twenty-four years later, one frame"),
    body:tr("展覽、演出和一趟回鄉，竟在同一週交會。三人在老咖啡店重逢；當年的照片不再只是回憶，而成了新故事的起點。",
    "An exhibition, a concert and a return trip fall in the same week. The three meet at the old café. Their childhood photograph becomes the beginning of another story.")};
  }else if(picked("hana")===0||picked("mira")===0){
   pairChange(bonds,"mira-hana",11);pairChange(bonds,"ethan-hana",3);
   ripple={id:"reunion-two",fromAge:25,title:tr("有人回來，有人沒有","Some return, some don't"),
    body:tr("舊街區有了新的照片，也有熟悉的聲音。但這次只有兩個人坐下來聊天。另一位朋友的名字，仍然會被提起。",
    "The old street is full of photographs and familiar sounds, but only two friends stop to talk. The third is still part of the conversation.")};
  }else{
   pairChange(bonds,"mira-hana",-4);pairChange(bonds,"ethan-hana",-5);
   ripple={id:"almost-reunion",fromAge:16,title:tr("差一點就遇見了","A near miss"),
    body:tr("Hana 到過那條街，Ethan 也在附近演出，但時間錯開了。他們至今仍不知道自己曾如此靠近。",
    "Hana visits the street and Ethan performs nearby, but their paths miss by hours. Neither knows how close they came.")};
  }
 }
 const age=OBSERVER_AGES[run.step];
 const chapter:ObserverChapter={age,decisions,ripple,before,after:{...bonds}};
 return {...run,actors,bonds,flags,history:[...run.history,chapter],phase:"recap",interventions:{}};
}
export function advanceObserverRun(run:ObserverRun):ObserverRun{
 if(run.phase!=="recap")throw new Error("Finish the chapter before advancing");
 return run.step===2?{...run,phase:"end"}:{...run,step:run.step+1,phase:"watch"};
}
export function observerBondLabel(value:number,lang:ObserverLanguage):string{
 if(value>=78)return lang==="zh"?"很親近":"Close";
 if(value>=57)return lang==="zh"?"仍有連結":"Connected";
 if(value>=38)return lang==="zh"?"漸漸疏遠":"Distant";
 return lang==="zh"?"幾乎斷了聯絡":"Apart";
}
export function observerEnding(run:ObserverRun):ObserverText{
 const last=run.history.at(-1)?.ripple;
 if(!last)return tr("人生仍在繼續。","The story is still unfolding.");
 const all=run.bonds["mira-ethan"]+run.bonds["mira-hana"]+run.bonds["ethan-hana"];
 return all>=205?tr("他們經歷了不同選擇，最終還是找到再次坐在一起的理由。這不是完美結局，卻是一段願意重新開始的關係。",
 "Despite different paths, they find a reason to sit together once more. Not a perfect ending, but a willingness to begin again."):
  all>=150?tr("有的友誼留下來，有的慢慢變淡。但他們都曾真實地影響彼此，沒有人能獨自走完這段故事。",
  "Some friendships survive and others fade. Each person still shapes the others, even when their paths diverge."):
  tr("他們沒有回到從前，甚至不知道自己曾差點重逢。人生沒有要求每段關係都圓滿，但那些留下的痕跡依然真實。",
  "They do not return to how things were. Life owes no perfect reunion, but the traces they leave on one another remain real.");
}
export function observerValidRun(value:unknown):value is ObserverRun{
 if(!value||typeof value!=="object")return false;
 const v=value as Partial<ObserverRun>;
 if(v.version!==3||!Number.isSafeInteger(v.seed)||Number(v.seed)<0||Number(v.seed)>0xffffffff||!Number.isFinite(v.createdAt))return false;
 if(!Number.isInteger(v.step)||Number(v.step)<0||Number(v.step)>2||!["watch","recap","end"].includes(v.phase||""))return false;
 if(!v.actors||!OBSERVER_ACTORS.every(id=>Number.isFinite(v.actors?.[id]?.hope)&&Number(v.actors?.[id]?.hope)>=0&&Number(v.actors?.[id]?.hope)<=100&&Number.isFinite(v.actors?.[id]?.stress)&&Number(v.actors?.[id]?.stress)>=0&&Number(v.actors?.[id]?.stress)<=100))return false;
 if(!v.bonds||!OBSERVER_PAIRS.every(pair=>Number.isFinite(v.bonds?.[pair])&&Number(v.bonds?.[pair])>=0&&Number(v.bonds?.[pair])<=100))return false;
 if(!Array.isArray(v.flags)||v.flags.length>9||!v.flags.every(f=>typeof f==="string"&&/^[a-z-]{1,40}$/.test(f)))return false;
 if(!v.interventions||typeof v.interventions!=="object"||Object.keys(v.interventions).some(id=>!OBSERVER_ACTORS.includes(id as ObserverId))||Object.values(v.interventions).some(c=>c!==0&&c!==1)||Object.keys(v.interventions).length>OBSERVER_BUDGET)return false;
 if(!Array.isArray(v.history)||v.history.length!==Number(v.step)+(v.phase==="watch"?0:1)||v.history.length>3)return false;
 if(v.phase==="end"&&v.step!==2)return false;
 return v.history.every((chapter,i)=>chapter&&chapter.age===OBSERVER_AGES[i]&&Array.isArray(chapter.decisions)&&chapter.decisions.length===3&&chapter.decisions.every((d,j)=>d?.id===OBSERVER_ACTORS[j]&&["player","self"].includes(d.source)&&[0,1].includes(d.choice)&&typeof d.sceneId==="string"&&d.title&&d.outcome&&d.decision)&&
  chapter.ripple&&typeof chapter.ripple.id==="string"&&chapter.ripple.title&&chapter.ripple.body&&
  chapter.before&&chapter.after&&OBSERVER_PAIRS.every(pair=>Number.isFinite(chapter.before[pair])&&Number.isFinite(chapter.after[pair])));
}
