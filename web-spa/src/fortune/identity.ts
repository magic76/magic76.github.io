import type {FortuneMode} from "./types";

/** Copy version is deliberately immutable: no LLM, no birth profile, no speculative chart facts. */
export const FORTUNE_IDENTITY_VERSION = "identity-v1";
type Pair = readonly [string,string];
type Archetype = readonly [string,string,string,string];
export type FortuneIdentity = {
 id:string;mode:FortuneMode;title:string;symbol:string;core:string;
 behavior?:string;tension?:string;evidence:string[];rule:string;version:string;
};
const zhLang=(locale:string)=>/^zh(?:-|$)/i.test(locale);
const phrase=(copy:Pair,zh:boolean)=>copy[zh?0:1];
const fact=(value:unknown):string=>typeof value==="string"?value.trim():"";
const count=(value:unknown):number|null=>typeof value==="number"&&Number.isInteger(value)&&value>=0&&value<=50?value:null;
const read=(obj:unknown,key:string):unknown=>obj&&typeof obj==="object"?(obj as Record<string,unknown>)[key]:undefined;
const BAZI:Record<string,Archetype>={
 "甲":["開拓先鋒","Principled Pioneer","遇到需要開路的事情，你可能會先決定方向，再想辦法把路走出來。","When a path needs clearing, you may choose a direction first and work out the route as you go."],
 "乙":["柔韌策士","Adaptive Strategist","遇到阻力時，你可能比較擅長調整做法，而不是硬碰硬。","When faced with resistance, you may adapt your approach rather than push straight through."],
 "丙":["耀眼領航者","Radiant Motivator","當一群人需要有人帶頭時，你可能願意先表態，讓事情開始動起來。","When a group needs momentum, you may be the one who speaks up and gets things moving."],
 "丁":["靈感點燈人","Focused Illuminator","你可能會留意別人忽略的小訊號，然後把注意力放在真正值得深究的地方。","You may notice overlooked details and concentrate your energy on what deserves a closer look."],
 "戊":["穩重守護者","Steady Anchor","面對複雜局面時，你可能先想怎麼穩住事情，而不是追求最快的變化。","In a messy situation, you may focus on keeping things steady before chasing quick changes."],
 "己":["溫柔培育者","Patient Cultivator","你可能更相信耐心累積的成果，也願意把混亂的事情慢慢整理好。","You may trust slow progress, taking time to organize what others find messy."],
 "庚":["果斷破局者","Decisive Reformer","當規則已經不合用時，你可能寧願清楚地做出取捨，也不想一直拖延。","When the old rules no longer work, you may prefer a clear decision to endless delay."],
 "辛":["精準鑑賞家","Discerning Refiner","你可能對品質與細節有自己的標準，寧願多花時間，也不喜歡草草交差。","You may have exacting standards and would rather refine a result than rush it out."],
 "壬":["自由探索家","Open-Horizon Explorer","你可能會先看事情的整體脈絡，再決定要往哪個方向深入。","You may survey the bigger picture before deciding which direction to explore in depth."],
 "癸":["深層觀察者","Quiet Observer","比起立刻表態，你可能習慣先觀察細節，等想清楚後再說出判斷。","Rather than respond immediately, you may observe details and speak once you've formed a view."]
};
const THEMES:Record<string,{label:Pair;behavior:Pair;tension:Pair}>={
 output:{label:["食傷","expression/output"],behavior:["對熟悉的問題，你可能更想提出自己的做法，而不只是照著流程完成。","With familiar problems, you may prefer proposing your own method over simply following a script."],tension:["點子一多，也可能因為想改得更好，反而延後把作品交出去。","More ideas can also make it harder to decide when a piece of work is finished."]},
 resource:{label:["印星","learning/support"],behavior:["碰到不熟悉的任務，你可能傾向先蒐集資料，理解原理，再放心行動。","With unfamiliar tasks, you may gather context and understand the principles before acting."],tension:["準備得太完整，有時也可能壓縮了實際試做與驗證的時間。","Thorough preparation can sometimes leave less time to test things in practice."]},
 officer:{label:["官殺","responsibility/structure"],behavior:["當責任與期限清楚時，你可能更容易進入狀態，想把事情確實完成。","Clear responsibilities and deadlines may help you focus on getting things done properly."],tension:["但把責任扛得太滿，也可能不容易在該休息時停下來。","Taking on too much responsibility can also make it difficult to step away."]}
};
const TAROT:readonly Archetype[]=[
 ["自由冒險家","Free-Spirit Adventurer","面對新的可能，你可能想先走出去看看，再決定這條路值不值得繼續。","You may prefer exploring a new possibility before deciding whether to commit."],
 ["創造實踐者","Resourceful Maker","手上有工具與資源時，你可能會想先做出一個可見的成果。","When you have the tools, you may want to turn an idea into something tangible."],
 ["直覺洞察者","Intuitive Observer","遇到複雜的問題，你可能需要安靜整理線索，不急著公布答案。","With complex questions, you may need quiet time to connect the clues before speaking."],
 ["豐盛培育者","Nurturing Creator","你可能願意花時間照顧一個想法，直到它慢慢長成可以分享的成果。","You may enjoy nurturing an idea until it becomes something worth sharing."],
 ["秩序建構者","Order Builder","碰到新計畫，你可能先問規則、分工和基礎是否足夠穩固。","With a new project, you may first ask whether its structure and responsibilities are sound."],
 ["智慧傳承者","Value Keeper","遇到重要選擇時，你可能想先確認它是否符合長期相信的原則。","An important choice may lead you to check it against your long-held principles."],
 ["關係選擇者","Thoughtful Connector","在需要共同決定的時刻，你可能特別在意彼此真正重視的是什麼。","In shared decisions, you may pay attention to what each person genuinely values."],
 ["意志推進者","Driven Pathfinder","方向明確時，你可能喜歡集中力量推進，不想被太多旁枝打斷。","Once a direction is clear, you may prefer focused momentum over constant detours."],
 ["溫柔勇者","Quietly Courageous","遇到衝突時，你可能更想穩住情緒，用耐心而不是聲量來處理。","In conflict, you may value emotional steadiness over raising your voice."],
 ["真理探索者","Patient Seeker","比起熱鬧的答案，你可能更願意花時間追究一件事真正的原因。","You may rather investigate a question deeply than settle for a quick answer."],
 ["轉機掌握者","Cycle Navigator","面對計畫外的變化，你可能比較願意重新評估時機與選項。","Unexpected changes may prompt you to reassess timing and options."],
 ["公平裁決者","Fair-Minded Judge","需要做決定時，你可能習慣把不同立場的理由放在一起比較。","When making decisions, you may weigh the reasoning behind each side."],
 ["逆向思考者","Perspective Shifter","事情卡住時，你可能願意先暫停，換一個角度重新理解問題。","When stuck, you may pause and look at a problem from another angle."],
 ["轉化重生者","Renewal Seeker","當舊方法已經走不通，你可能更願意承認階段結束，重新開始。","When an old approach no longer works, you may be ready to close that chapter."],
 ["平衡調和者","Patient Integrator","遇到兩種不同意見，你可能會試著找到可持續的中間節奏。","Faced with opposing views, you may search for a sustainable middle ground."],
 ["慾望探索者","Attachment Explorer","面對強烈想要的事物，你可能會反覆思考它帶來的動力和代價。","A strong desire may prompt you to examine both its motivation and its cost."],
 ["破框革新者","Structure Challenger","當既有方法經不起考驗，你可能認為重建比繼續補洞更值得。","When a structure fails its tests, you may prefer rebuilding over patching endlessly."],
 ["希望引路人","Hopeful Guide","困難過後，你可能特別重視重新整理方向，找回可相信的目標。","After a setback, you may look for a meaningful direction to rebuild toward."],
 ["潛意識旅人","Imaginative Explorer","面對還不明朗的情境，你可能需要一些空間整理感覺與疑問。","With uncertainty, you may need space to understand your impressions and questions."],
 ["光芒散播者","Open-Hearted Spark","有值得開心的成果時，你可能想把這份能量分享給身邊的人。","When something goes well, you may want others to share in the energy."],
 ["覺醒召喚者","Reflective Rebuilder","到了一個轉折點，你可能會重新檢視過去的選擇，決定哪些值得留下。","At a turning point, you may reconsider past decisions and what deserves to remain."],
 ["圓滿整合者","Big-Picture Finisher","比起單點成功，你可能更在意一段旅程是否真的有始有終。","You may value bringing a journey to completion rather than chasing isolated wins."]
];
const LIFE:Record<string,{behavior:Pair;tension:Pair}>={
 "1":{behavior:["進入新局面時，你可能想自己確認方向、先做第一步。","In new situations, you may prefer to set a direction and take the first step."],tension:["如果每件事都想親自推動，反而可能不容易分工。","Leading every step can make delegation harder."]},
 "2":{behavior:["與人合作時，你可能會先留意氣氛和雙方是否理解彼此。","In collaboration, you may notice the atmosphere and whether both sides feel heard."],tension:["太想照顧不同意見時，決定也可能拖得比較久。","Balancing too many opinions can slow a decision."]},
 "3":{behavior:["你可能更喜歡用說明、創作或分享來整理想法。","You may organize ideas best through expression or creation."],tension:["想法變多時，維持同一個方向可能需要額外用心。","Many ideas can make steady focus harder."]},
 "4":{behavior:["面對目標，你可能先想如何建立穩定、可重複的做法。","With a goal, you may first design a repeatable process."],tension:["計畫太完整時，臨時改變方向也可能變得不容易。","A solid plan can also make sudden changes uncomfortable."]},
 "5":{behavior:["遇到新選項，你可能更願意親自體驗，再判斷合不合適。","You may prefer testing new options yourself before judging them."],tension:["如果選擇一直增加，持續投入同一件事也可能變難。","Too many options can make long-term focus harder."]},
 "6":{behavior:["你可能很留意自己所做的事，會不會影響身邊重要的人。","You may consider how a choice affects the people close to you."],tension:["太習慣照顧別人，也可能忽略自己的界線。","Caring for others can sometimes obscure your own boundaries."]},
 "7":{behavior:["面對疑問，你可能願意花時間追查背後的原因。","With an open question, you may enjoy tracing its underlying causes."],tension:["有時候資訊蒐集得越多，反而越難快速定案。","More research can occasionally make quick decisions harder."]},
 "8":{behavior:["你可能習慣以現實成果檢視計畫，而不只看點子好不好聽。","You may judge a plan by practical results, not just appealing ideas."],tension:["太聚焦成果時，也可能把壓力留給自己。","Strong focus on outcomes can increase self-imposed pressure."]},
 "9":{behavior:["做決定時，你可能會想到這件事對更大的群體有什麼意義。","You may consider how a decision affects a wider group."],tension:["想兼顧很多人的需要，也可能讓取捨變得困難。","Considering everyone's needs can make trade-offs harder."]},
 "11":{behavior:["你可能很容易留意想法背後的情緒與直覺訊號。","You may notice emotional and intuitive signals behind ideas."],tension:["當訊號太多，反而需要刻意把想法落回具體步驟。","Too many impressions may call for practical grounding."]},
 "22":{behavior:["你可能會想把長期構想拆成真正可落地的步驟。","You may enjoy turning a long-term vision into practical steps."],tension:["企圖一次把架構做好，也可能提高開始的門檻。","Trying to perfect the structure can delay the start."]},
 "33":{behavior:["你可能想把自己的經驗整理成別人也能使用的支持。","You may want to turn experience into support that others can use."],tension:["一直承接他人的需求時，可能需要提醒自己設好界線。","Supporting others continually may require firmer boundaries."]}
};
const SIGNS:Record<string,Archetype>={
 Aries:["行動開路者","Bold Initiator","遇到新的局面，你可能想先採取行動，透過嘗試找出方向。","You may meet new situations by trying something rather than waiting for perfect clarity."],
 Taurus:["穩定建構者","Steady Builder","開始投入之前，你可能會先確認這件事能否長久維持。","Before committing, you may ask whether a plan can last."],
 Gemini:["訊息連結者","Curious Connector","你可能習慣從不同人的說法中找線索，迅速建立新的連結。","You may find connections by gathering different perspectives."],
 Cancer:["情感守護者","Caring Guardian","進入不熟悉的環境時，你可能先留意哪些人和事情值得信任。","In unfamiliar spaces, you may first look for people and routines you can trust."],
 Leo:["舞台領航者","Warm Leader","當一件事值得投入，你可能想用自己的方式讓它被大家看見。","When a cause matters, you may want to make it visible to others."],
 Virgo:["細節優化者","Thoughtful Refiner","面對流程或作品，你可能很快注意到還有哪些地方可以改善。","With a process or project, you may quickly spot what could work better."],
 Libra:["平衡協調者","Fair-Minded Diplomat","面對不同立場，你可能會先想如何讓雙方有機會好好表達。","Faced with disagreement, you may seek room for both sides to speak."],
 Scorpio:["深度探究者","Deep Investigator","對真正重要的問題，你可能不太滿足於只知道表面原因。","You may resist surface answers to questions that matter deeply."],
 Sagittarius:["遠方探索者","Horizon Seeker","遇到新知識或新地方，你可能會想知道它背後還有多少可能。","New ideas or places may make you curious about the larger possibilities."],
 Capricorn:["長線規劃者","Long-Range Planner","你可能更願意為長期成果分階段安排，而不是只追求眼前的熱鬧。","You may prefer measured progress toward durable goals over a quick burst of excitement."],
 Aquarius:["框架革新者","Original Reframer","當大家都沿用同一種方法，你可能會問還有沒有更不同的選擇。","When everyone follows the same approach, you may question the assumptions behind it."],
 Pisces:["直覺共感者","Sensitive Dreamer","你可能會留意一件事的情緒與氛圍，不只是它的表面資訊。","You may notice emotional atmosphere as much as factual detail."]
};
const MOON:Record<string,{behavior:Pair;tension:Pair}>={
 Aries:{behavior:["情緒被挑動時，你可能想趕快面對問題。","When stirred, you may want to address an issue immediately."],tension:["太快回應，也可能少了重新確認的時間。","A quick response can leave little time to reconsider."]},
 Taurus:{behavior:["壓力來時，你可能更需要熟悉的節奏與安全感。","Under stress, familiar routines may help you feel grounded."],tension:["習慣的節奏被打亂時，也可能較難立刻適應。","A disrupted routine may take time to adjust to."]},
 Gemini:{behavior:["有心事時，你可能想先說出來，邊交流邊整理。","When troubled, you may think more clearly through conversation."],tension:["資訊太多，也可能讓情緒難以安靜下來。","Too much information can make it harder to settle."]},
 Cancer:{behavior:["面對不安，你可能會先尋找熟悉的人或環境。","When uneasy, you may turn toward familiar people or places."],tension:["太在意身邊人的感受，也可能忘記照顧自己。","Attending to others' feelings can crowd out your own."]},
 Leo:{behavior:["感受到肯定時，你可能更容易把熱情表達出來。","Feeling appreciated may help you show your enthusiasm."],tension:["期待被理解時，也可能對冷淡的回應特別在意。","Cool responses may sting when you hope to be understood."]},
 Virgo:{behavior:["焦慮時，你可能會想先整理細節，讓事情更可控。","When anxious, you may organize details to regain a sense of control."],tension:["一直修正細節，也可能讓自己難以放鬆。","Constant refinement can make relaxation harder."]},
 Libra:{behavior:["心情受影響時，你可能想先釐清關係是不是失去平衡。","When unsettled, you may check whether a relationship feels out of balance."],tension:["太想維持和諧，也可能把自己的需求放到最後。","Maintaining harmony can put your needs last."]},
 Scorpio:{behavior:["情緒很強烈時，你可能需要私人的時間慢慢理解它。","Strong feelings may call for private time to process."],tension:["太習慣自己承擔，也可能不容易向別人求助。","Handling everything alone can make asking for help hard."]},
 Sagittarius:{behavior:["有壓力時，你可能會想透過新的視角或活動轉換心情。","Under pressure, you may seek a fresh perspective or activity."],tension:["急著往前看，也可能少了整理當下情緒的時間。","Moving forward quickly can bypass present feelings."]},
 Capricorn:{behavior:["感到不安時，你可能先安排接下來能做的實際步驟。","When uneasy, you may focus on practical next steps."],tension:["把情緒變成待辦事項，也可能忘了自己需要休息。","Turning feelings into tasks can overlook the need for rest."]},
 Aquarius:{behavior:["壓力來時，你可能想先拉開距離，換個角度看問題。","Under stress, distance may help you see a different angle."],tension:["太快進入分析模式，也可能讓身邊的人覺得有距離。","Switching straight to analysis can feel distant to others."]},
 Pisces:{behavior:["碰到強烈的情緒，你可能需要創作或安靜獨處來整理。","Strong emotions may call for quiet or creative expression."],tension:["感受太多時，也可能需要更清楚的現實界線。","Intense feelings can call for clearer boundaries."]}
};
const signKey=(value:unknown):string=>{
 const v=fact(value).split(/\s+/)[0];
 return Object.prototype.hasOwnProperty.call(SIGNS,v)?v:"";
};
export function buildFortuneIdentity(mode:FortuneMode,result:unknown,locale="zh-TW"):FortuneIdentity|null{
 const zh=zhLang(locale);
 if(!result||typeof result!=="object")return null;
 if(mode==="bazi"){
  const master=fact(read(result,"dayMaster")),item=BAZI[master];if(!item)return null;
  const candidates=([["output",read(read(result,"careerProfile"),"outputCount")],["resource",read(read(result,"careerProfile"),"resourceCount")],["officer",read(read(result,"careerProfile"),"officerCount")]] as const)
   .map(([key,value])=>({key,n:count(value)}));
  const sorted=[...candidates].sort((a,b)=>(b.n??-1)-(a.n??-1));
  const decisive=candidates.every(x=>x.n!==null)&&sorted[0].n!==null&&sorted[0].n>=2&&sorted[0].n>Number(sorted[1].n);
  const theme=decisive?THEMES[sorted[0].key]:null;
  const strength=fact(read(result,"dayMasterStrength"));
  return {id:"bazi-"+master,mode,title:zh?item[0]:item[1],symbol:zh?master:master,core:zh?item[2]:item[3],
   ...(theme?{behavior:phrase(theme.behavior,zh),tension:phrase(theme.tension,zh)}:{}),
   evidence:[zh?"日主："+master:"Day master: "+master,...strength?[zh?"旺衰："+strength:"Strength: "+strength]:[],
    ...(theme?[zh?"工作相關十神："+phrase(theme.label,zh)+" "+sorted[0].n+"（其餘 "+sorted.slice(1).map(x=>x.n).join("、")+"）":"Work ten-god group: "+phrase(theme.label,zh)+" "+sorted[0].n+" (others "+sorted.slice(1).map(x=>x.n).join(", ")+")"]:[])],
   rule:theme?"bazi-master-"+master+"-"+sorted[0].key:"bazi-master-"+master,version:FORTUNE_IDENTITY_VERSION};
 }
 if(mode==="tarot"){
  const number=count(read(result,"personalityCardNumber"));
  const index=number===22?0:number;
  if(index===null||index<0||index>21)return null;
  const item=TAROT[index],life=count(read(result,"lifePathNumber"));
  const theme=life===null?null:LIFE[String(life)]||null;
  const original=fact(read(result,"personalityCardName"));
  return {id:"tarot-"+number,mode,title:zh?item[0]:item[1],symbol:original||String(number),
   core:zh?item[2]:item[3],...(theme?{behavior:phrase(theme.behavior,zh),tension:phrase(theme.tension,zh)}:{}),
   evidence:[(zh?"人格牌：":"Personality card: ")+number+(original?" "+original:""),...(theme?[(zh?"生命道路：":"Life path: ")+life]:[])],
   rule:"tarot-personality-"+number+(theme?"-life-"+life:""),version:FORTUNE_IDENTITY_VERSION};
 }
 if(mode==="vedic"){
  const asc=signKey(read(result,"lagnaSign"));if(!asc)return null;
  const item=SIGNS[asc],moon=signKey(read(result,"moonSign"));const theme=moon?MOON[moon]:null;
  const star=fact(read(result,"moonNakshatra"));
  return {id:"vedic-"+asc.toLowerCase(),mode,title:zh?item[0]:item[1],symbol:asc,
   core:zh?item[2]:item[3],...(theme?{behavior:phrase(theme.behavior,zh),tension:phrase(theme.tension,zh)}:{}),
   evidence:[(zh?"上升星座：":"Ascendant: ")+asc,...(moon?[(zh?"月亮星座：":"Moon: ")+moon]:[]),...(moon&&star?[(zh?"月亮星宿：":"Moon mansion: ")+star]:[])],
   rule:"vedic-asc-"+asc+(moon?"-moon-"+moon:""),version:FORTUNE_IDENTITY_VERSION};
 }
 return null;
}
