import {LearningFeedbackCard} from "../live/LearningFeedbackCard";
import {useTranslation} from "react-i18next";
import {TeacherAvatar} from "./TeacherAvatar";
import {GeminiSetupNotice} from "../components/GeminiSetupNotice";
import {geminiKey} from "../lib/runtime";
import type {useLiveSession} from "../live/useLiveSession";
import type {getTeacherProfile} from "./teacherProfiles";
import {useTeacherStore} from "../store/teacherStore";
import {PinyinHint} from "./PinyinHint";

type Props={live:ReturnType<typeof useLiveSession>;profile:ReturnType<typeof getTeacherProfile>;targetLanguage:string;english:boolean;hint:string;preparing:boolean;onAsk:(text:string)=>void};
export function BoardTutorPanel({live,profile,targetLanguage,english,hint,onAsk,preparing}:Props){
 const {t}=useTranslation("teacher");
 const pinyinMode=useTeacherStore(s=>s.pronunciationAidMode);
 const teachingMode=useTeacherStore(s=>s.teachingMode);
 return <section className={"teaching-board-tutor"+(preparing?" is-preparing":"")} aria-label={t("board.teacher")}>
  <div className="teaching-board-teacher"><TeacherAvatar profile={profile}/><div><b>{profile.name}</b><small>{targetLanguage} · {t("board.teacher")}</small></div></div>
  {!preparing&&live.state==="error"&&<p className="teaching-board-state" role="status">{live.status}</p>}
  {!geminiKey()&&<GeminiSetupNotice returnTo="/teacher/board"/>}
  {(live.input||live.output)&&<details className="teaching-board-transcript"><summary>{t("board.recentSpeech")}</summary><div aria-live="off">
   {live.input&&<p><b>{t("board.you")}：</b>{live.input}</p>}
   {live.output&&<p><b>{profile.name}：</b>{live.output}<PinyinHint text={live.output} targetLanguage={targetLanguage} mode={pinyinMode} teachingMode={teachingMode} english={english}/></p>}
  </div></details>}
  {live.learningFeedback[live.turns.length-1]&&<LearningFeedbackCard key={live.turns.length} feedback={live.learningFeedback[live.turns.length-1]} language={targetLanguage}/>}
  {!preparing&&<details className="teaching-board-tutor-help"><summary>{english?"Ask the teacher":"向老師提問"}</summary><div className="teaching-board-suggestions">
   <span>{t("board.try")}</span>
   <button type="button" onClick={()=>onAsk(t("board.examplePrompt"))}>{t("board.examplePrompt")}</button>
   <button type="button" onClick={()=>onAsk(t("board.simplifyPrompt"))}>{t("board.simplifyPrompt")}</button>
   <button type="button" onClick={()=>onAsk(t("board.quizPrompt"))}>{t("board.quizPrompt")}</button>
   <button type="button" onClick={()=>onAsk(t("board.moreExamples"))}>{t("board.moreExamples")}</button>
   <button type="button" onClick={()=>onAsk(t("board.nativeExplanation")+"\n[BOARD ONLY: change written explanation language, keep configured spoken language]")}>{t("board.nativeExplanation")}</button>
  </div></details>}
  {hint&&<p className="teaching-board-hint" role="alert">{hint}</p>}
 </section>;
}
