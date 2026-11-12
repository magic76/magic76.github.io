/** Only for cached `?topic=` links from the retired three-card homepage. */
const LEGACY_TOPIC_IDS=new Set([
 "photo-story","photo-moment","question-smalljoy","question-weekend",
 "role-cafe","role-travel","mood-heavy","mood-grateful",
 "play-rematch","play-wildcard","fortune-lucky","fortune-change"
]);
export function getDailyTopic(id:string|null):{id:string}|undefined{
 return id&&LEGACY_TOPIC_IDS.has(id)?{id}:undefined;
}
