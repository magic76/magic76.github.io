import type {IconName} from "../components/Icon";

export type DailyTopicCategory="shorts"|"question"|"roleplay"|"mood"|"play"|"fortune";
export type DailyTopic={id:string;category:DailyTopicCategory;icon:IconName;tintA:string;tintB:string;ink:string};

// Six categories, two topics each. The URL contains only one of these IDs.
export const DAILY_TOPICS:readonly DailyTopic[]=[
 {id:"photo-story",category:"shorts",icon:"image",tintA:"#fde3ec",tintB:"#fbd0da",ink:"#81344c"},
 {id:"photo-moment",category:"shorts",icon:"image",tintA:"#fbe3dd",tintB:"#fbd1c5",ink:"#813e36"},
 {id:"question-smalljoy",category:"question",icon:"chat",tintA:"#ddf3ed",tintB:"#c1eadc",ink:"#205c4c"},
 {id:"question-weekend",category:"question",icon:"chat",tintA:"#e0eafb",tintB:"#cbdcf8",ink:"#2d4e85"},
 {id:"role-cafe",category:"roleplay",icon:"scene",tintA:"#ffeed9",tintB:"#ffe1b8",ink:"#765020"},
 {id:"role-travel",category:"roleplay",icon:"scene",tintA:"#dff3f5",tintB:"#c7eaf0",ink:"#23566a"},
 {id:"mood-heavy",category:"mood",icon:"sparkles",tintA:"#e9e3fc",tintB:"#d8cdf7",ink:"#503f84"},
 {id:"mood-grateful",category:"mood",icon:"chat",tintA:"#fde4ed",tintB:"#fbcfdf",ink:"#873a60"},
 {id:"play-rematch",category:"play",icon:"play",tintA:"#e0f2d8",tintB:"#cce9bb",ink:"#3c6630"},
 {id:"play-wildcard",category:"play",icon:"play",tintA:"#f5e3d9",tintB:"#ebcbbd",ink:"#77472c"},
 {id:"fortune-lucky",category:"fortune",icon:"fortune",tintA:"#eee5fd",tintB:"#e0d4f9",ink:"#5d4086"},
 {id:"fortune-change",category:"fortune",icon:"fortune",tintA:"#d8f1f3",tintB:"#c3e8ee",ink:"#28596c"}
];
const TOPICS_BY_ID=new Map(DAILY_TOPICS.map(topic=>[topic.id,topic]));
const CATEGORY_ORDER:readonly DailyTopicCategory[]=["shorts","question","roleplay","mood","play","fortune"];

export function getDailyTopic(id:string|null):DailyTopic|undefined{
 return id?TOPICS_BY_ID.get(id):undefined;
}

// Device-local calendar date. UTC is used only to turn local Y/M/D into a stable day number.
export function pickDailyTopics(date:Date):DailyTopic[]{
 const day=Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000);
 return [0,1,2].map(slot=>{
  const category=CATEGORY_ORDER[(day+slot*2)%CATEGORY_ORDER.length];
  const candidates=DAILY_TOPICS.filter(topic=>topic.category===category);
  return candidates[(Math.floor(day/2)+slot)%candidates.length];
 });
}
