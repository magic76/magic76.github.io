import {Arrow} from "../components/Arrow";
import {useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {searchGroundedText} from "../live/searchGroundedText";
import {GroundingSources} from "../live/GroundingSources";
import type {GroundingSource} from "../live/grounding";
import "./truth-news.css";
type Question={options:string[];correct:number;explanation:string;sources:GroundingSource[];searchSuggestions?:string};
function parseQuestion(text:string,sources:GroundingSource[],searchSuggestions?:string):Question{
 if(!sources.length)throw Error("No verifiable sources");
 const stripped=text.replace(/^\x60\x60\x60(?:json)?\s*/i,"").replace(/\s*\x60\x60\x60$/,"").trim();
 const data=JSON.parse(stripped) as Record<string,unknown>;
 const options=data.options,correct=data.correct,explanation=data.explanation;
 if(!Array.isArray(options)||options.length!==3||!options.every(v=>typeof v==="string"&&v.length>10&&v.length<220)||
    typeof correct!=="number"||!Number.isInteger(correct)||correct<0||correct>2||
    typeof explanation!=="string"||explanation.length<10)throw Error("Invalid quiz");
 return {options:options as string[],correct,explanation:explanation.slice(0,600),sources,searchSuggestions};
}
export function TruthNewsPage(){
 const {i18n}=useTranslation(),zh=i18n.resolvedLanguage?.startsWith("zh");
 const [question,setQuestion]=useState<Question|null>(null),[choice,setChoice]=useState<number|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function next(){
  if(busy)return;setBusy(true);setError("");setChoice(null);setQuestion(null);
  try{
   const answer=await searchGroundedText(
    "Search for ONE recent unusual but real science, nature, technology, or culture news story from a reputable dated source. Create exactly THREE playful, plausible headlines: exactly ONE is true and directly supported by the search result; the other TWO are invented distractors. Randomize the real headline's index. Return ONLY a valid JSON object with these fields: options (array of 3 headlines), correct (integer 0,1,2), explanation (a concise factual explanation stating source and date). Write in "+(zh?"Traditional Chinese":"English")+". Never present invented events as factual.",
    "You are a careful news fact-checker creating an educational quiz. Verify a real news report through Google Search. Two fake headlines must not accuse a real person or business of wrongdoing. No invented citations.");
   setQuestion(parseQuestion(answer.text,answer.sources,answer.searchSuggestions));
  }catch{setError(zh?"目前無法取得可查證的新聞題目，請稍後重試。":"Could not retrieve a verifiable news question. Please retry.");}
  finally{setBusy(false)}
 }
 return <main className="crew-news-quiz">
  <Link to="/games"><Arrow direction="left"/> {zh?"返回遊戲":"Back to games"}</Link>
  <span className="kicker">CREW PLAY · REAL OR FICTION?</span>
  <h1>{zh?"新聞真假猜猜看":"Real or made up?"}</h1>
  <p>{zh?"三則新聞只有一則是真的。猜完再查看原始新聞來源。":"Only one of three headlines is real. Guess, then check the sources."}</p>
  {!question&&<button className="crew-quiz-next" disabled={busy} onClick={()=>void next()}>{busy?(zh?"正在搜尋新聞…":"Finding a verified headline…"):(zh?"開始新的一題":"New question")}</button>}
  {question&&<><div className="crew-quiz-options">{question.options.map((value,i)=><button key={i} type="button" disabled={choice!==null} className={choice!==null&&i===question.correct?"is-right":""} onClick={()=>setChoice(i)}>{i+1}. {value}</button>)}</div>
   {choice!==null&&<section className="crew-quiz-explanation" aria-live="polite"><h2>{choice===question.correct?(zh?"答對了！":"Correct!"):(zh?"這次猜錯了":"Not quite")}</h2>
    <p>{question.explanation}</p><GroundingSources sources={question.sources} searchSuggestions={question.searchSuggestions} english={!zh}/>
    <p>{zh?"其他兩個選項是本遊戲虛構的新聞，不是真實事件。":"The other two headlines are fictional."}</p>
    <button className="crew-quiz-next" onClick={()=>void next()}>{zh?"下一題":"Next question"}</button></section>}</>}
  {error&&<p role="alert">{error}</p>}
 </main>;
}
