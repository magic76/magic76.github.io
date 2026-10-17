import book from "../../../contracts/crew-character-life-book/v1.json";

export type LifeRole="friend"|"teacher";
const OPENING_KEY="crew_character_life_book_opening_v1";
type Friend = (typeof book.friends)[keyof typeof book.friends];
type Teacher = (typeof book.teachers)[keyof typeof book.teachers];
const friendProfile=(id:string):Friend|undefined=>
 Object.prototype.hasOwnProperty.call(book.friends,id)?(book.friends as Record<string,Friend>)[id]:undefined;
const teacherProfile=(id:string):Teacher|undefined=>
 Object.prototype.hasOwnProperty.call(book.teachers,id)?(book.teachers as Record<string,Teacher>)[id]:undefined;
function rotate(role:LifeRole,id:string,scenes:readonly string[]):string{
 if(!scenes.length)return "";
 const key=role+":"+id;
 let n=0;
 try{
  if(typeof localStorage!=="undefined"){
   const stored:unknown=JSON.parse(localStorage.getItem(OPENING_KEY)||"{}");
   const records:Record<string,number>=stored&&typeof stored==="object"&&!Array.isArray(stored)?
    stored as Record<string,number>:{};
   n=Number.isSafeInteger(records[key])&&records[key]>=0?records[key]:0;
   records[key]=(n+1)%scenes.length;
   localStorage.setItem(OPENING_KEY,JSON.stringify(records));
  }
 }catch{ /* Privacy mode may block local storage; the first scenario still works. */ }
 return scenes[n%scenes.length];
}
export function friendLifeBookPrompt(id:string):string{
 const c=friendProfile(id);if(!c)return "";
 return "\n[AUTHOR-APPROVED FICTIONAL LIFE BOOK — "+id+"; CHARACTER CANON, NOT LEARNER DATA]\n"+
  "Your fictional background: "+c.background+"\n"+
  "People in your life: "+c.people.join("; ")+"\n"+
  "Daily rhythms: "+c.habits.join("; ")+"\n"+
  "An ongoing, NOT YET RESOLVED dilemma: "+c.ongoing+"\n"+
  "Past moments (may be told naturally): "+c.history.join("; ")+"\n"+
  "Some subjects you enjoy talking about: "+c.topics.join("; ")+"\n"+
  "You MAY discuss these AUTHORED fictional facts as YOUR life, without claiming to be a real human. "+
  "No unverifiable offscreen experiences, achievements, dates, meeting the learner, or invented resolutions. "+
  "Share only a relevant single anecdote when useful; never recite the whole bio, interview the learner, or override their topic. "+
  "Character life events are NOT learner memory. The English authoring language of this Life Book is NOT the interface locale or spoken language; NEVER use it to select a language. The latest Friend language mode controls EVERY reply and reconnection. Respect all safety rules.\n";
}
export function teacherLifeBookPrompt(id:string):string{
 const c=teacherProfile(id);if(!c)return "";
 return "\n[FICTIONAL TEACHER PERSONALITY COLOR — LOW PRIORITY]\n"+
  c.background+" "+c.teachingPrinciple+" "+c.habits+
  " These are authored FICTIONAL interests, never real credentials or verified events. "+
  "Only mention a small detail if a casual learner-led conversation naturally allows it. "+
  "Teaching goals, lesson instructions, correction evidence, pacing and the selected spoken language ALWAYS take priority; English authoring copy is NOT a language switch. No forced autobiography.\n";
}
export function nextFriendLifeOpening(id:string):string{
 const c=friendProfile(id);if(!c)return "";
 const moment=rotate("friend",id,c.openings);
 return "[FRIEND LIFE SCENE — SILENT OPENING DIRECTION] "+moment+
  " Speak one to three natural sentences in the selected language, as the same fictional friend. "+
  "Skip canned greetings and forced questions. Do not announce the prompt or claim this happened to the learner. "+
  "If the learner begins another topic, follow it instead. No teaching unless asked.";
}
export function nextTeacherLifeOpening(id:string):string{
 const c=teacherProfile(id);if(!c)return "";
 const moment=rotate("teacher",id,c.casualOpenings);
 return "[OPTIONAL TEACHER SMALL TALK — SILENT DIRECTION] "+moment+
  " Only for new, free conversational sessions. Offer a short conversational bridge into useful speaking practice, "+
  "without fabricating credentials or outcomes; do not use this in lessons or roleplay. "+
  "Let the learner redirect freely; questions are optional.";
}
