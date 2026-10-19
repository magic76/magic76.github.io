import {useState} from "react";
import {Link,useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {TimelinePortrait} from "./TimelinePortrait";
import type {Age} from "./timeline";
import "./timeline.css";
import "./timelineExperience.css";

const COMPARE_AGES=[16,25,35,70] as const satisfies readonly Age[];
type CompareAge=typeof COMPARE_AGES[number];
type Localized={zh:string;en:string};
type Prompt={id:string;question:Localized;answers:Record<CompareAge,Localized>};

/** Editorially reviewed, age-scoped interpretations of the existing Mira life book.
 * These are illustrative replies, NOT recordings or quotes from a past Live session.
 * Keep them aligned with contracts/crew-timeline/v1.json when canon is revised.
 */
export const COMPARE_PROMPTS:Prompt[]=[
 {id:"success",question:{zh:"現在的你，怎樣才算成功？",en:"What would success mean to you right now?"},
  answers:{
   16:{zh:"如果我敢搭火車去參觀藝術學校，還能好好跟媽媽說我的想法，就算很勇敢了。",en:"If I can visit that art school and tell Mum what I want, I'll count that as brave."},
   25:{zh:"我想靠攝影養活自己，但也想留些時間拍真正關心的人和故事。",en:"I want to pay my rent with photography without giving up stories about real people."},
   35:{zh:"帶領團隊把作品做好，同時別再錯過和家人吃飯，對我來說才算成功。",en:"Making good work with my team matters, but so does showing up for family dinner."},
   70:{zh:"看到曾經教過的人繼續教別人，也還能拿著相機好奇地走出去，就很滿足。",en:"Seeing people I taught pass it on, while still feeling curious enough to take pictures, feels like enough."}
  }},
 {id:"fear",question:{zh:"最近最讓你猶豫的是什麼？",en:"What is the hardest choice in your life right now?"},
  answers:{
   16:{zh:"藝術學校參觀日和天文比賽撞期。我想去看看外面的世界，卻不知道怎麼開口。",en:"The art-school visit clashes with the astronomy contest. I want to go, but I don't know how to bring it up."},
   25:{zh:"一邊是穩定的商品攝影工作，另一邊是收入不多、卻讓我很想拍的紀實計畫。",en:"There is steady product photography, and there is a documentary project I love that barely pays."},
   35:{zh:"有個重要展覽邀請，但那天我已經答應和家人相聚。我不想又讓工作先贏。",en:"An important exhibition may collide with a promise to my family. I don't want work to win every time."},
   70:{zh:"整理老照片時，我不確定哪些適合捐給檔案館，哪些回憶應該只留給家人。",en:"I'm sorting old photographs and wondering which belong in an archive and which should stay private."}
  }},
 {id:"camera",question:{zh:"攝影對你來說代表什麼？",en:"What does photography mean to you?"},
  answers:{
   16:{zh:"外公送的舊相機，讓我開始留意平常不會停下來看的東西。",en:"Grandpa's old camera makes me notice things I would otherwise walk past."},
   25:{zh:"它是我的工作，也是我還不想放棄、想記錄真實人生的理由。",en:"It's my job, and still my reason for wanting to document real lives."},
   35:{zh:"比起拍出完美作品，我現在更在意照片裡那些真實的人。",en:"I care more about the people in my pictures than making every frame perfect."},
   70:{zh:"照片幫我留下許多片刻，也提醒我：有些回憶只屬於拍照的人。",en:"Photos help me hold on to moments. They also remind me that some memories should stay private."}
  }}
];

export function TimelineComparePage(){
 const {i18n}=useTranslation(),en=i18n.language.startsWith("en");
 const [params,setParams]=useSearchParams();
 const id=params.get("q")||"success";
 const prompt=COMPARE_PROMPTS.find(p=>p.id===id)||COMPARE_PROMPTS[0];
 const [selected,setSelected]=useState<CompareAge[]>([16,25,70]);
 const [message,setMessage]=useState("");
 const toggle=(age:CompareAge)=>setSelected(prev=>prev.includes(age)
  ?prev.length<=2?prev:prev.filter(x=>x!==age)
  :COMPARE_AGES.filter(x=>prev.includes(x)||x===age));
 const copy=async()=>{
  const question=en?prompt.question.en:prompt.question.zh;
  const lines=selected.map(age=>age+(en?" years":" 歲")+" — "+(en?prompt.answers[age].en:prompt.answers[age].zh));
  const url=new URL(window.location.href);
  url.searchParams.set("q",prompt.id);
  try{
   if(!navigator.clipboard?.writeText)throw Error("Clipboard unavailable");
   await navigator.clipboard.writeText([question,...lines,url.toString()].join("\n"));
   setMessage(en?"Comparison copied.":"對照內容已複製。");
  }catch{setMessage(en?"Copy is unavailable in this browser.":"瀏覽器無法複製，請使用分享網址。");}
 };
 return <main className="shell timeline-compare">
  <header className="timeline-compare-header">
   <Link to="/timeline" className="timeline-compare-back">← {en?"Back to Timeline":"返回人生時間軸"}</Link>
   <span className="kicker">CREW TIMELINE · LIFE COMPARE</span>
   <h1>{en?"One person, different answers":"同一個人，不同年紀的答案"}</h1>
   <p>{en?"Ask Mira the same question across the years. Answers are editorial interpretations of her established fictional life, not old chat transcripts.":"問 Mira 同一個問題，看看她在不同人生階段怎麼想。以下是依正式虛構人生設定編寫的情境回答，並非過往聊天紀錄。"}</p>
  </header>
  <section className="timeline-compare-controls" aria-label={en?"Comparison options":"人生對照選項"}>
   <h2>{en?"Choose a question":"選擇一個問題"}</h2>
   <div className="timeline-compare-questions">
    {COMPARE_PROMPTS.map(q=><button type="button" key={q.id} aria-pressed={q.id===prompt.id}
      className={q.id===prompt.id?"selected":""}
      onClick={()=>{setParams({q:q.id});setMessage("");}}>
       {en?q.question.en:q.question.zh}
     </button>)}
   </div>
   <div className="timeline-compare-selection">
    <strong>{en?"Compare ages (at least two)":"比較年齡（至少兩個）"}</strong>
    <div className="timeline-compare-ages">
     {COMPARE_AGES.map(age=><button type="button" key={age} aria-pressed={selected.includes(age)}
      className={selected.includes(age)?"selected":""} onClick={()=>{toggle(age);setMessage("");}}>{age} {en?"years":"歲"}</button>)}
    </div>
   </div>
  </section>
  <section className="timeline-compare-results" aria-live="polite" aria-label={en?"Age-by-age responses":"各年齡的回答"}>
   {COMPARE_AGES.filter(age=>selected.includes(age)).map(age=><article className="timeline-compare-answer" key={age}>
    <div className="timeline-compare-photo"><TimelinePortrait age={age} alt={"Mira at age "+age}/></div>
    <div className="timeline-compare-content">
     <span className="kicker">MIRA · {age} {en?"YEARS OLD":"歲"}</span>
     <blockquote>“{en?prompt.answers[age].en:prompt.answers[age].zh}”</blockquote>
     <Link to={"/timeline/live?age="+age}>{en?"Talk to Mira at this age":"跟這個年紀的 Mira 聊聊"} →</Link>
    </div>
   </article>)}
  </section>
  <div className="timeline-compare-footer">
   <button type="button" onClick={()=>void copy()}>{en?"Copy comparison":"複製對照內容"} ↗</button>
   <Link to="/timeline">{en?"Explore Mira's full story":"繼續探索 Mira 的人生"} →</Link>
   {message&&<p role="status">{message}</p>}
  </div>
 </main>;
}
