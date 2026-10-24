import type {BoardCard} from "./boardProtocol";
import type {FlashReview} from "./BoardFlashcards";

/** Explicit learner request; a tap only records a self-rating, not assessed proficiency. */
export function flashcardTeacherPrompt(card:BoardCard,reviews:FlashReview[],scope:"item"|"weak"):string{
 const entries=reviews.slice(0,5).map(r=>({term:r.source.slice(0,180),meaning:r.target.slice(0,180),selfRated:r.rating}));
 const task=scope==="item"
  ?"Focus on this expression with one short oral exercise."
  :"Use the weak expressions first. If none were marked weak, offer one short harder contextual challenge.";
 return "[LEARNER FLASHCARD PRACTICE REQUEST] "+task+
  " Lesson topic: "+JSON.stringify(card.title.slice(0,100))+
  ". Self-rated cards (not an objective score): "+JSON.stringify(entries)+
  ". Reuse only these existing, visible expressions and their supplied meanings. Ask the learner to say one original sentence or respond in a real-life scenario, then WAIT for their reply before correcting anything. "+
  "If a card was self-rated 'again', first give one concise usage clue without giving an answer to your question. "+
  "Do not claim that tapping a card proves pronunciation, meaning, or mastery. Continue naturally in the configured learning language; do not reset the session or reveal quiz answers.";
}
