import {useTranslation} from "react-i18next";
import type {BoardCard} from "./boardProtocol";

/** One-shot visual teaching requests; no extra inference service or synthetic lesson facts. */
export type BoardPresentation="compare"|"timeline"|"dialogue"|"flashcard"|"quiz";
export const BOARD_PRESENTATIONS:BoardPresentation[]=["compare","timeline","dialogue","flashcard","quiz"];
export const PRESENTATION_CUES:Record<BoardPresentation,string>={
 compare:"請用比較卡整理剛才兩種觀念的差別",timeline:"請用時間軸整理剛才的先後順序",
 dialogue:"請用情境對話卡整理剛才的角色台詞",flashcard:"請做翻面卡讓我複習",quiz:"請考我一題小測驗"
};
export function boardPresentationRequest(type:BoardPresentation,cards:BoardCard[]):string{
 const shared="Keep using the same voice Live session. Use update_teaching_board to create or revise a real teaching card based ONLY on the lesson content we actually covered, then point to it with control_teaching_stage. Do not manufacture a translation, timeline, or correct quiz answers. Explain briefly and continue the lesson naturally.";
 const clues=cards.filter(c=>!c.id.startsWith("demo-")).slice(-6).map(c=>c.title).join("; ").slice(0,360);
 const focused=clues?"Existing lesson card topics: "+clues+". ":"";
 const task:Record<BoardPresentation,string>={
  compare:"Show the important differences using a comparison card (pairs: source, target). Where meaningful, add one example card.",
  timeline:"Turn the genuine time relationships or sequence into a timeline card (points: label, note). If there is no time dimension, use a steps card instead.",
  dialogue:"Create a short contextual dialogue card (pairs: speaker, utterance) and invite me to play one role. Use only grounded teaching facts.",
  flashcard:"Turn actual expressions and meanings from this lesson into vocabulary or flashcards (pairs: front, back) for recall practice.",
  quiz:"Make a short multiple-choice quiz from verified teaching facts. Ask one question and wait for my answer; do not reveal the correct choice first."
 };
 return "[LEARNER CHOSE VISUAL FORMAT] "+task[type]+" "+focused+shared;
}
type Props={onChoose:(kind:BoardPresentation)=>void;disabled?:boolean};
export function BoardPresentationBar({onChoose,disabled=false}:Props){
 const {t}=useTranslation("teacher");
 return <div className="teaching-board-presentation" aria-label={t("board.presentation.title")}>
  <span className="teaching-board-presentation-label">{t("board.presentation.title")}</span>
  <div className="teaching-board-presentation-actions">
   {BOARD_PRESENTATIONS.map(kind=><button type="button" key={kind} onClick={()=>onChoose(kind)}
    disabled={disabled} title={t("board.presentation."+kind)}>{t("board.presentation."+kind)}</button>)}
  </div>
 </div>;
}
