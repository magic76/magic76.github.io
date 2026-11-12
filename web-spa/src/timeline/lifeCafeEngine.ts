/**
 * Crew Cafe: a self-contained, deterministic fictional social sandbox.
 *
 * Players add circumstances; people react according to their existing
 * relationships and private concerns, not player-directed dialogue choices.
 * No AI calls, timers, passive server simulation, or access to canonical Timeline.
 */
export type CafeActor="mira"|"ethan"|"hana";
export type CafeProp="letter"|"ticket"|"rain"|"camera"|"coffee";
export type CafeSecret="hana-moving"|"ethan-song"|"mira-photo";
export type CafePair="mira-ethan"|"mira-hana"|"ethan-hana";
export type CafePhase="ready"|"reaction"|"finished";
export type CafeText={zh:string;en:string};
export type CafeBeat={who:CafeActor|null;line:CafeText};
export type CafeNews={title:CafeText;detail:CafeText};
export type CafeMove={
 item:CafeProp;target:CafeActor;guess:CafeActor|null;first:CafeActor;
 beats:CafeBeat[];news:CafeNews;changes:Partial<Record<CafePair,number>>;
 reveals:CafeSecret[];correct:boolean|null;
};
export type CafeWorld={
 version:1;seed:number;phase:CafePhase;lastSeenAt:number;
 used:CafeProp[];relations:Record<CafePair,number>;
 revealed:CafeSecret[];flags:string[];moves:CafeMove[];
 correctGuesses:number;attemptedGuesses:number;
 awayReports:CafeNews[];
};
export const CAFE_ACTORS=["mira","ethan","hana"] as const;
export const CAFE_PROPS=["letter","ticket","rain","camera","coffee"] as const;
export const CAFE_PAIRS=["mira-ethan","mira-hana","ethan-hana"] as const;
export const CAFE_SECRETS=["hana-moving","ethan-song","mira-photo"] as const;
export const CAFE_MAX_MOVES=5;
export const cafeNames:Record<CafeActor,string>={mira:"Mira",ethan:"Ethan",hana:"Hana"};
export const cafePropCopy:Record<CafeProp,{icon:string;title:CafeText;hint:CafeText}>={
 letter:{icon:"✉️",title:{zh:"匿名信",en:"Anonymous letter"},hint:{zh:"沒寫收件人",en:"No recipient"}},
 ticket:{icon:"🎟️",title:{zh:"演唱會票",en:"Concert ticket"},hint:{zh:"只有一張",en:"Just one"}},
 rain:{icon:"🌧️",title:{zh:"突然下雨",en:"Sudden rain"},hint:{zh:"沒人帶傘",en:"No umbrellas"}},
 camera:{icon:"📷",title:{zh:"拍立得",en:"Instant camera"},hint:{zh:"照片不會說謊？",en:"Pictures never lie?"}},
 coffee:{icon:"☕",title:{zh:"多一杯咖啡",en:"Extra coffee"},hint:{zh:"給誰才對？",en:"For whom?"}}
};
export const cafeSecretCopy:Record<CafeSecret,{title:CafeText;detail:CafeText}>={
 "hana-moving":{title:{zh:"Hana 打算搬家",en:"Hana plans to leave"},detail:{zh:"她還沒準備好告訴兩個朋友。那封信是她寫的。",en:"She hasn't been ready to tell her friends. She wrote the unsigned letter."}},
 "ethan-song":{title:{zh:"Ethan 偷偷寫了首歌",en:"Ethan wrote a secret song"},detail:{zh:"歌名是《留在這裡》，但他沒說是寫給誰。",en:"The title is 'Stay Here', but he hasn't said who inspired it."}},
 "mira-photo":{title:{zh:"Mira 藏了一張照片",en:"Mira has hidden a photograph"},detail:{zh:"照片裡三個人很開心；她擔心別人不喜歡被拍。",en:"It captures a happy moment, but she worries her friends might dislike being photographed."}}
};
const t=(zh:string,en:string):CafeText=>({zh,en});
const beat=(who:CafeActor|null,zh:string,en:string):CafeBeat=>({who,line:t(zh,en)});
const news=(titleZh:string,titleEn:string,detailZh:string,detailEn:string):CafeNews=>({title:t(titleZh,titleEn),detail:t(detailZh,detailEn)});
const clamp=(n:number)=>Math.max(0,Math.min(100,Math.round(n)));
const hash=(s:string)=>{let x=2166136261;for(let i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619)}return x>>>0};
const distinct=(a:CafeActor,b:CafeActor)=>CAFE_ACTORS.find(id=>id!==a&&id!==b)!;
export function newCafeWorld(seed:number,now=Date.now()):CafeWorld{
 if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff||!Number.isFinite(now)||now<0)throw Error("Invalid world seed/time");
 return {version:1,seed,lastSeenAt:now,phase:"ready",used:[],
 relations:{"mira-ethan":66,"mira-hana":70,"ethan-hana":64},
 revealed:[],flags:[],moves:[],correctGuesses:0,attemptedGuesses:0,awayReports:[]};
}
export function cafeBond(a:CafeActor,b:CafeActor):CafePair{
 if(a===b)throw Error("Same actor has no relationship");
 return CAFE_PAIRS.find(pair=>pair.includes(a)&&pair.includes(b))!;
}
const yes=(w:CafeWorld,flag:string)=>w.flags.includes(flag);
const score=(w:CafeWorld,id:CafeActor,item:CafeProp,target:CafeActor)=>{
 const affinity:Record<CafeProp,Record<CafeActor,number>>={
  letter:{mira:14,ethan:8,hana:23},ticket:{mira:5,ethan:24,hana:8},
  rain:{mira:8,ethan:14,hana:17},camera:{mira:25,ethan:2,hana:10},
  coffee:{mira:9,ethan:13,hana:12}
 };
 const closeness=id===target?8:Math.round(w.relations[cafeBond(id,target)]/9);
 return affinity[item][id]+closeness+(hash(w.seed+":"+item+":"+target+":"+id+":"+w.used.join(","))%17);
};
export function cafeFirstResponder(w:CafeWorld,item:CafeProp,target:CafeActor):CafeActor{
 return [...CAFE_ACTORS].sort((a,b)=>score(w,b,item,target)-score(w,a,item,target))[0];
}
type Reaction={beats:CafeBeat[];news:CafeNews;changes:Partial<Record<CafePair,number>>;reveals:CafeSecret[];flags:string[]};
function react(w:CafeWorld,item:CafeProp,target:CafeActor,first:CafeActor):Reaction{
 const speaker=cafeNames[first];
 const echoes=yes(w,"heard-moving")||yes(w,"letter-misread");
 if(item==="letter"){
  if(target==="hana"){
   return {beats:[
    beat("hana","Hana 一眼認出自己的筆跡，立刻把信壓在杯子下面。","Hana recognises her handwriting and slips the letter beneath a mug."),
    beat(first,"「所以……你真的準備離開？」","\"So… are you really leaving?\""),
    beat("ethan", "Ethan 原本想問的人不是她。突然間，大家都安靜下來。","Ethan had a different question in mind. The table falls quiet.")],
    news:news("秘密就在桌上","A secret on the table","Hana 承認準備搬家，但還不知道怎麼告訴朋友。現在他們都知道了。","Hana admits she may be moving. Her friends know now, even if they don't know what to say."),
    changes:{"ethan-hana":11,"mira-hana":8},reveals:["hana-moving"],flags:["heard-moving","letter-opened"]};
  }
  if(target==="mira"){
   return {beats:[
    beat("mira","Mira 撿到匿名信，上面只寫著「我可能要走了」。","Mira finds a letter that only says 'I might be leaving.'"),
    beat(first,"「這是誰的？字看起來好像……」","\"Whose is this? That handwriting looks almost…\""),
    beat("ethan","Ethan 看了 Mira 一眼，以為她要離開。","Ethan looks at Mira and assumes she is the one leaving.")],
    news:news("誤會開始發酵","A misunderstanding begins","Ethan 把信誤認為 Mira 寫的。真正寫信的人卻沒有開口。","Ethan wrongly thinks Mira wrote the letter. The real author says nothing."),
    changes:{"mira-ethan":-13,"ethan-hana":-5},reveals:[],flags:["letter-misread"]};
  }
  return {beats:[
   beat("ethan","Ethan 展開信，讀到「我可能要走了」。","Ethan opens the letter: 'I might be leaving.'"),
   beat(first,"「也許有人只是怕把話說出口。」","\"Maybe someone is afraid to say it out loud.\""),
   beat("hana","Hana 把杯子握得更緊，卻沒有否認。","Hana grips her cup harder. She doesn't deny it.")],
   news:news("有人不敢回答","Someone cannot answer","Ethan 感覺信和 Hana 有關，但她還沒準備好說明。","Ethan suspects the letter concerns Hana, but she isn't ready to explain."),
   changes:{"ethan-hana":-4},reveals:[],flags:["ethan-suspects","letter-opened"]};
 }
 if(item==="ticket"){
  const misunderstanding=yes(w,"letter-misread");
  if(target==="ethan"){
   return {beats:[
    beat("ethan","Ethan 看著演唱會門票，低聲哼起一小段從未公開的旋律。","Ethan studies the ticket, humming a melody no one has heard."),
    beat(first,"「那是你自己寫的歌？」","\"Wait, did you write that song?\""),
    beat("mira",misunderstanding?"「你不是以為我要搬家嗎？」Mira 有點生氣。":"「你一直在偷偷寫歌？」Mira 笑了。",misunderstanding?"\"I thought you believed I was leaving,\" Mira says.":"\"You've been writing music in secret?\" Mira smiles.")],
   news:news("原來有人偷偷寫歌","A song kept secret","Ethan 的歌叫《留在這裡》。他還是不肯說是寫給誰的。","Ethan's song is called 'Stay Here'. He still won't say whom it's for."),
   changes:{"mira-ethan":misunderstanding?-2:12},reveals:["ethan-song"],flags:["song-heard","ticket-found"]};
  }
  if(target==="mira"){
   return {beats:[
    beat("mira","Mira 拿著唯一一張票，卻沒說自己想約誰。","Mira holds the single ticket without saying whom she wants to invite."),
    beat(first,"「只有一張？那你準備一個人去嗎？」","\"Only one ticket? Are you going alone?\""),
    beat("hana",echoes?"「我可能真的會錯過那天。」":"「也許可以一起想辦法。」",echoes?"\"I might actually miss that day.\"":"\"Maybe we can work something out.\"")],
    news:news("一張票，兩個期待","One ticket, two hopes","Mira 將門票放回桌上，打算等一個更合適的時機。","Mira sets the ticket down, waiting for the right moment."),
    changes:{"mira-hana":5,"mira-ethan":-5},reveals:[],flags:["ticket-waiting"]};
  }
  return {beats:[
   beat("hana","Hana 收到門票，卻盯著上面的日期出神。","Hana gets the ticket but freezes at the date."),
   beat(first,"「你怎麼了？不喜歡這場演出嗎？」","\"What's wrong? Don't you like this band?\""),
   beat("hana","「不是。我只是……那一天可能不在這裡。」","\"It's not that. I just… might not be here then.\"")],
   news:news("她差點說出秘密","Almost a confession","演唱會日期和 Hana 的搬家計畫撞在一起。朋友開始懷疑有事。","The concert falls on Hana's planned moving day. Her friends start to suspect something."),
   changes:{"ethan-hana":-3,"mira-hana":-2},reveals:[],flags:["date-clash","ticket-found"]};
 }
 if(item==="rain"){
  const misread=yes(w,"letter-misread");
  const conflict=misread||w.relations["mira-ethan"]<55;
  return {beats:[
   beat(null,"窗外忽然下起大雨。三個人擠到同一張小桌旁。","Rain hits the windows. All three squeeze around the same small table."),
   beat(first,conflict?"「我們是不是有什麼事一直沒說清楚？」":"「原來下雨的時候，大家都不急著走。」",conflict?"\"Are we avoiding something we should talk about?\"":"\"Funny how rain makes everyone stay a little longer.\""),
   beat("hana",conflict?"Hana 看了看信的方向，終於說：「那封信不是 Mira 寫的。」":"Hana 不再看手機，開始聊起最近發生的事。",conflict?"Hana glances at the letter. \"Mira didn't write it,\" she says.":"Hana puts away her phone and starts talking about her day.")],
   news:conflict?news("一場雨說破了誤會","Rain breaks the silence","被困在一起反而讓 Hana 承認了那封信。Ethan 終於知道自己怪錯人。","Being stuck together lets Hana admit she wrote the letter. Ethan realises he blamed the wrong person."):
    news("雨讓時間慢了下來","Rain slows the room","他們意外聊了一整個下午，比任何精心安排都自然。","They talk away the afternoon—something none of them had planned."),
   changes:conflict?{"mira-ethan":19,"ethan-hana":7}:{"mira-hana":5,"mira-ethan":5,"ethan-hana":6},
   reveals:conflict?["hana-moving"]:[],flags:conflict?["rain-cleared","heard-moving"]:["rain-together"]};
 }
 if(item==="camera"){
  const misread=yes(w,"letter-misread");
  const targetPhoto=target==="mira";
  return {beats:[
   beat("mira","拍立得吐出一張照片。Mira 的臉色突然變了。","An instant photograph slides out. Mira's expression changes."),
   beat(first,"「等等，這不是之前那一天的照片嗎？」","\"Wait… wasn't that taken on that day?\""),
   beat("ethan",misread?"「等等，字不是 Mira 的？」":"「原來你一直把那張照片留著。」",misread?"\"Hold on. That handwriting isn't Mira's?\"":"\"You kept that picture all this time?\"")],
   news:misread?news("照片裡藏著另一個答案","The picture changes the story","照片的日期和筆跡讓 Ethan 發現，自己誤會了 Mira。真正的秘密還等著 Hana 開口。","The date and handwriting show Ethan he misread Mira. Hana still holds the rest of the truth."):
    news("藏起來的照片被看見","The hidden photo surfaces","Mira 承認自己留著三人的照片，因為怕朋友不喜歡被拍。","Mira admits keeping their photograph because she worried her friends would mind."),
   changes:misread?{"mira-ethan":17,"mira-hana":-2}:{"mira-ethan":targetPhoto?12:6,"mira-hana":8},
   reveals:["mira-photo"],flags:misread?["photo-cleared","photo-found"]:["photo-found"]};
 }
 // Coffee always causes a small, reciprocal gesture; its outcome depends on accumulated friction.
 const friction=w.relations["ethan-hana"]<60||w.relations["mira-ethan"]<55;
 const other=distinct(target,first);
 return {beats:[
  beat(target,"桌上多出了一杯熱咖啡，杯套上沒有名字。","An extra warm coffee appears on the table, without a name on the sleeve."),
  beat(first,friction?"「誰買的？該不會是想道歉吧？」":"「多出來的這杯，是要請誰的？」",friction?"\"Who bought that? Is someone trying to apologise?\"":"\"Who is that extra cup for?\""),
  beat(other,friction?"沒有人立刻回答，卻有人悄悄把咖啡推了過去。":"三個人笑著把杯子推來推去，最後留給最累的那個人。",friction?"No one answers, but someone quietly slides the cup across the table.":"They pass the cup around, then leave it with the person who looks most tired.")],
  news:friction?news("沒有說出口的道歉","An apology without words","一杯咖啡沒有解決誤會，但有人先放下了防備。","Coffee cannot fix everything, but someone takes the first small step."):
   news("誰都沒預料到的小善意","An unexpected kindness","沒有什麼大事件，只有一個人發現另一個人今天需要一點溫暖。","Nothing dramatic happens; someone simply notices another person needs a little warmth."),
  changes:{"mira-hana":3,"ethan-hana":friction?9:4,"mira-ethan":2},
  reveals:[],flags:["coffee-shared"]};
}
export function useCafeProp(world:CafeWorld,item:CafeProp,target:CafeActor,guess:CafeActor|null,now=Date.now()):CafeWorld{
 if(world.phase!=="ready"||!CAFE_PROPS.includes(item)||!CAFE_ACTORS.includes(target)||guess!==null&&!CAFE_ACTORS.includes(guess))throw Error("Invalid experiment input");
 if(world.used.includes(item)||world.used.length>=CAFE_MAX_MOVES)throw Error("Item already used");
 if(!Number.isFinite(now)||now<world.lastSeenAt)throw Error("Invalid experiment timestamp");
 const first=cafeFirstResponder(world,item,target);
 const outcome=react(world,item,target,first);
 const relations={...world.relations};
 for(const pair of CAFE_PAIRS)relations[pair]=clamp(relations[pair]+(outcome.changes[pair]||0));
 const move:CafeMove={item,target,guess,first,beats:outcome.beats,news:outcome.news,
  changes:outcome.changes,reveals:outcome.reveals,correct:guess===null?null:guess===first};
 const used=[...world.used,item];
 return {...world,phase:used.length===CAFE_MAX_MOVES?"reaction":"reaction",lastSeenAt:now,
  used,relations,revealed:[...new Set([...world.revealed,...outcome.reveals])],
  flags:[...new Set([...world.flags,...outcome.flags])],moves:[...world.moves,move],
  correctGuesses:world.correctGuesses+(guess!==null&&guess===first?1:0),
  attemptedGuesses:world.attemptedGuesses+(guess!==null?1:0),awayReports:[]};
}
export function continueCafeWorld(world:CafeWorld,now=Date.now()):CafeWorld{
 if(world.phase!=="reaction"||!Number.isFinite(now)||now<world.lastSeenAt)throw Error("Nothing to advance");
 return {...world,phase:world.used.length===CAFE_MAX_MOVES?"finished":"ready",lastSeenAt:now,awayReports:[]};
}
const awayTemplates=[
 news("Mira 把照片重新放進抽屜","Mira puts the photo away","她還是擔心被朋友誤會，但沒有把照片丟掉。","She's worried the photo may be misunderstood, but she doesn't throw it away."),
 news("Ethan 又練了一小段旋律","Ethan practises another melody","沒有人知道那首歌的結尾，他還在慢慢寫。","No one has heard the ending of the song he's still writing."),
 news("Hana 在窗邊發呆","Hana watches the street","她想著搬家的事，手機上有一段打了又刪的訊息。","She's thinking of moving, and a message stays half-written on her phone."),
 news("他們又聊了幾句","A few more words","原本有點尷尬的對話，慢慢恢復了平常的節奏。","The awkward conversation settles back into its familiar rhythm.")
];
const AWAY_STEP_MS=20*60*1000;
export function catchUpCafeWorld(world:CafeWorld,now=Date.now()):CafeWorld{
 if(!Number.isFinite(now)||now<=world.lastSeenAt||world.phase==="finished")return world;
 const elapsed=now-world.lastSeenAt;
 if(elapsed<AWAY_STEP_MS)return world;
 const count=Math.min(3,Math.floor(elapsed/AWAY_STEP_MS));
 const awayReports=Array.from({length:count},(_,i)=>awayTemplates[hash(world.seed+":"+world.moves.length+":"+i)%awayTemplates.length]);
 const relations={...world.relations};
 for(let i=0;i<count;i++){
  const pair=CAFE_PAIRS[hash(world.seed+":"+i+":"+world.moves.length)%CAFE_PAIRS.length];
  relations[pair]=clamp(relations[pair]+(i%2?1:-1));
 }
 return {...world,awayReports,relations,lastSeenAt:now};
}
export function cafeWorldValid(value:unknown):value is CafeWorld{
 if(!value||typeof value!=="object")return false;
 const w=value as Partial<CafeWorld>;
 if(w.version!==1||!Number.isSafeInteger(w.seed)||Number(w.seed)<0||Number(w.seed)>0xffffffff)return false;
 if(!Number.isFinite(w.lastSeenAt)||Number(w.lastSeenAt)<0||!["ready","reaction","finished"].includes(w.phase||""))return false;
 if(!Array.isArray(w.used)||w.used.length>5||new Set(w.used).size!==w.used.length||w.used.some(p=>!CAFE_PROPS.includes(p)))return false;
 if(!w.relations||CAFE_PAIRS.some(pair=>!Number.isInteger(w.relations?.[pair])||Number(w.relations?.[pair])<0||Number(w.relations?.[pair])>100))return false;
 if(!Array.isArray(w.revealed)||w.revealed.some(s=>!CAFE_SECRETS.includes(s))||new Set(w.revealed).size!==w.revealed.length)return false;
 if(!Array.isArray(w.flags)||w.flags.length>20||w.flags.some(s=>typeof s!=="string"||!/^[a-z-]{1,36}$/.test(s)))return false;
 if(!Array.isArray(w.moves)||w.moves.length!==w.used.length)return false;
 if(w.phase==="finished"&&w.used.length!==5||w.phase==="ready"&&w.used.length===5)return false;
 if(!Number.isInteger(w.correctGuesses)||!Number.isInteger(w.attemptedGuesses)||Number(w.correctGuesses)<0||Number(w.attemptedGuesses)<0||Number(w.correctGuesses)>Number(w.attemptedGuesses)||Number(w.attemptedGuesses)>5)return false;
 if(!Array.isArray(w.awayReports)||w.awayReports.length>3)return false;
 return w.moves.every((move,i)=>{
  if(!move||move.item!==w.used?.[i]||!CAFE_ACTORS.includes(move.target)||!CAFE_ACTORS.includes(move.first))return false;
  if(move.guess!==null&&!CAFE_ACTORS.includes(move.guess)||move.correct!==null&&typeof move.correct!=="boolean")return false;
  if(!Array.isArray(move.beats)||move.beats.length<2||move.beats.length>4)return false;
  return move.beats.every(b=>b&& (b.who===null||CAFE_ACTORS.includes(b.who))&&typeof b.line?.zh==="string"&&typeof b.line?.en==="string")&&
   typeof move.news?.title?.zh==="string"&&typeof move.news?.detail?.en==="string";
 });
}
