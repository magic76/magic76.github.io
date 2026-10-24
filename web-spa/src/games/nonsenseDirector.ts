/** Restricted game-director payloads. All values are plain text rendered by React, never model HTML. */
export type DirectorKind="character"|"evidence"|"choices"|"effect";
export type DirectorEvent={
 kind:DirectorKind;title:string;body:string;detail:string;character:string;
 mood:"surprised"|"angry"|"excited"|"serious";effect:"alert"|"confetti"|"static"|"spotlight";
 choices:string[];
};
const kinds:DirectorKind[]=["character","evidence","choices","effect"];
const moods:DirectorEvent["mood"][]=["surprised","angry","excited","serious"];
const effects:DirectorEvent["effect"][]=["alert","confetti","static","spotlight"];
const clean=(value:unknown,length:number)=>typeof value==="string"?value.replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,length):"";
const plain=(raw:unknown):Record<string,unknown>=>{
 const data=typeof raw==="string"?JSON.parse(raw):raw;
 if(!data||typeof data!=="object"||Array.isArray(data))throw Error("Invalid director payload");
 return data as Record<string,unknown>;
};
export function parseDirectorEvent(kind:DirectorKind,raw:unknown):DirectorEvent{
 if(!kinds.includes(kind))throw Error("Unknown director event");
 const data=plain(raw);
 const choices=Array.isArray(data.choices)?data.choices.slice(0,3).map(v=>clean(v,58)).filter(Boolean):[];
 const event:DirectorEvent={
  kind,title:clean(data.title,90),body:clean(data.body,260),detail:clean(data.detail,130),
  character:clean(data.character,48),
  mood:moods.includes(data.mood as DirectorEvent["mood"])?data.mood as DirectorEvent["mood"]:"surprised",
  effect:effects.includes(data.effect as DirectorEvent["effect"])?data.effect as DirectorEvent["effect"]:"alert",
  choices
 };
 if(kind==="choices"&&choices.length<2)throw Error("Director must provide 2-3 real choices");
 if(kind!=="choices"&&!event.title)throw Error("Director event missing title");
 if(kind==="character"&&!event.body)throw Error("Character requires a statement");
 if(kind==="evidence"&&!event.body)throw Error("Evidence requires body");
 return event;
}
export function directorToolKind(name:string):DirectorKind|null{
 return ({spawn_character:"character",show_evidence:"evidence",offer_choices:"choices",trigger_effect:"effect"} as Record<string,DirectorKind>)[name]||null;
}
/** Configurable reply gate independent of asynchronous scene/tool arrival order. */
export class NewsRoundTracker{
 readonly totalRounds:number;
 constructor(totalRounds:number=5){this.totalRounds=totalRounds;}
 count=0;
 private recentTurnIds=new Set<string>();
 private lastValue="";
 private lastAcceptedAt=0;
 private pendingChoice="";
 private finale=false;
 private finishing=false;
 acceptVoice(text:string,id?:string){
  const value=text.trim();
  if(!value||this.count>=this.totalRounds||this.finale)return false;
  if(this.pendingChoice){
   if(value.toLocaleLowerCase()===this.pendingChoice.toLocaleLowerCase()){this.pendingChoice="";return false;}
   // A voice transcript during a text-choice reply is mic bleed, not another reply.
   return false;
  }
  if(id&&this.recentTurnIds.has(id))return false;
  if(value===this.lastValue&&Date.now()-this.lastAcceptedAt<4000)return false;
  if(id)this.recentTurnIds.add(id);
  this.lastValue=value;this.lastAcceptedAt=Date.now();this.count++;return true;
 }
 acceptChoice(value:string){
  value=value.trim();
  if(!value||this.count>=this.totalRounds||this.pendingChoice||this.finale)return false;
  this.count++;this.lastValue=value;this.lastAcceptedAt=Date.now();this.pendingChoice=value;return true;
 }
 endChoice(){this.pendingChoice="";}
 get choicePending(){return Boolean(this.pendingChoice);}
 get canPick(){return this.count<this.totalRounds&&!this.choicePending&&!this.finale&&!this.finishing;}
 get canShowFinale(){return this.count>=this.totalRounds-1;}
 acceptFinale(){if(!this.canShowFinale)return false;this.finale=true;return true;}
 get hasFinale(){return this.finale;}
 beginFinishing(){if(this.finishing)return false;this.finishing=true;return true;}
}
