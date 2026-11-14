/** Fixed content and legacy homepage topics; never trust arbitrary text from the URL. */
const LEGACY_TOPIC_IDS=new Set([
 "photo-story","photo-moment","question-smalljoy","question-weekend",
 "role-cafe","role-travel","mood-heavy","mood-grateful",
 "play-rematch","play-wildcard","fortune-lucky","fortune-change",
 "game-play","game-connect4","game-reversi","game-gomoku","game-1a2b","game-number-bomb","game-memory","game-taboo",
 "guide-ai-english-speaking","guide-ai-conversation-partner","guide-travel-english-dialogues",
 "guide-english-pronunciation","guide-gemini-key-for-ai-practice","research-article"
]);
export function getDailyTopic(id:string|null):{id:string}|undefined{
 return id&&LEGACY_TOPIC_IDS.has(id)?{id}:undefined;
}
