/**
 * Crew Magic's single source of truth. Models describe a small, whitelisted set
 * of world actions: they never provide HTML, CSS, URLs, scripts or event handlers.
 */
export type MagicTheme="sky"|"forest"|"candy";
export type MagicWeather="clear"|"rain"|"snow"|"stars";
export type MagicTime="day"|"night";
export type MagicObjectKind="dragon"|"chest"|"portal"|"tree"|"owl"|"crystal";
export type MagicSpell="sparkles"|"fire"|"wind"|"heal";
export type MagicChoice="A"|"B"|"C";
export type MagicPanelKind="spellbook"|"treasure"|"quest";
export type MagicPanel={id:number;kind:MagicPanelKind;title:string;description:string;items:[string,string,string];selected?:MagicChoice};
export type MagicObject={id:number;kind:MagicObjectKind;slot:number};
export type MagicChallenge={id:number;title:string;question:string;options:[string,string,string];correct:MagicChoice;feedback:string;selected?:MagicChoice};
export type MagicWorld={
 theme:MagicTheme;weather:MagicWeather;time:MagicTime;
 objects:MagicObject[];challenge:MagicChallenge|null;panels:MagicPanel[];chapter:number;
 message:string;effect:MagicSpell|null;revision:number;
};
export type MagicResult={ok:boolean;world:MagicWorld;event:string};
export const MAGIC_INITIAL_WORLD:MagicWorld={
 theme:"sky",weather:"clear",time:"day",objects:[],challenge:null,panels:[],
 chapter:1,message:"一扇門正在等你。說出願望，或選一個魔法開始。",effect:null,revision:0
};
const THEMES=["sky","forest","candy"] as const;
const WEATHERS=["clear","rain","snow","stars"] as const;
const TIMES=["day","night"] as const;
const OBJECTS=["dragon","chest","portal","tree","owl","crystal"] as const;
const SPELLS=["sparkles","fire","wind","heal"] as const;
const CHOICES=["A","B","C"] as const;
const PANEL_KINDS=["spellbook","treasure","quest"] as const;
// MagicPage currently exposes six non-overlapping stage anchors. Keep the reducer
// aligned with what can actually be rendered so model calls cannot stack invisible
// duplicate hit targets on mobile.
const MAX_OBJECTS=6;
const MAX_TOOL_ARGS_BYTES=4096;
function record(value:unknown,parseDepth=0):Record<string,unknown>{
 if(typeof value==="string"){
  // Live normally supplies an object, but some transports may hand us one JSON
  // envelope. Bound both its size and parse depth so model-controlled arguments
  // cannot turn recursive JSON strings into main-thread work or a stack overflow.
  if(parseDepth>0||value.length>MAX_TOOL_ARGS_BYTES)return {};
  try{return record(JSON.parse(value),parseDepth+1)}catch{return {}}
 }
 if(value===null||typeof value!=="object"||Array.isArray(value))return {};
 const proto=Object.getPrototypeOf(value);
 if(proto!==Object.prototype&&proto!==null)return {};
 // Only copy own enumerable properties. Tool arguments must not gain capabilities
 // from a polluted/inherited prototype.
 return Object.fromEntries(Object.entries(value as Record<string,unknown>));
}
function oneOf<T extends string>(v:unknown,options:readonly T[]):v is T{
 return typeof v==="string"&&options.includes(v as T);
}
function copy(value:unknown,max=130){
 return typeof value==="string"?value.replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max):"";
}
function failed(state:MagicWorld,reason:string):MagicResult{return {ok:false,world:state,event:reason}}
function updated(state:MagicWorld,changes:Partial<MagicWorld>,event:string):MagicResult{
 return {ok:true,world:{...state,...changes,revision:state.revision+1},event};
}
export function applyMagicCommand(state:MagicWorld,name:string,rawArgs:unknown,lang:"zh"|"en"="zh"):MagicResult{
 const text=(chinese:string,english:string)=>lang==="en"?english:chinese;
 const args=record(rawArgs);
 switch(name){
  case "change_world":{
   const theme=oneOf(args.theme,THEMES)?args.theme:state.theme;
   const weather=oneOf(args.weather,WEATHERS)?args.weather:state.weather;
   const time=oneOf(args.time,TIMES)?args.time:state.time;
   if(theme===state.theme&&weather===state.weather&&time===state.time)return failed(state,"no-valid-world-change");
   const descriptions:{[K in MagicTheme]:[string,string]}={sky:["雲端群島","floating islands"],forest:["秘境森林","enchanted forest"],candy:["糖果王國","candy kingdom"]};
   const name=descriptions[theme][lang==="en"?1:0];
   return updated(state,{theme,weather,time,effect:"sparkles",message:text("世界變成了"+name+"，新的冒險正在展開。","The world is now "+name+". Your next adventure begins!")}, "world-changed");
  }
  case "summon_object":{
   if(!oneOf(args.kind,OBJECTS))return failed(state,"invalid-object-kind");
   if(state.objects.length>=MAX_OBJECTS)return failed(state,"world-is-full");
   const id=state.revision+1;
   const slot=state.objects.length;
   const labels:{[K in MagicObjectKind]:[string,string]}={dragon:["飛龍","dragon"],chest:["寶箱","treasure chest"],portal:["傳送門","portal"],tree:["魔法樹","enchanted tree"],owl:["貓頭鷹","owl"],crystal:["水晶","crystal"]};
   return updated(state,{objects:[...state.objects,{id,kind:args.kind,slot}],effect:"sparkles",
    message:text("一道光閃過，"+labels[args.kind][0]+"出現在島上！","A flash of light! A "+labels[args.kind][1]+" appears on the island!")}, "object-summoned");
  }
  case "cast_spell":{
   if(!oneOf(args.spell,SPELLS))return failed(state,"invalid-spell");
   const labels:{[K in MagicSpell]:[string,string]}={sparkles:["星光","Starlight"],fire:["火焰","Fire"],wind:["微風","Wind"],heal:["治癒","Healing"]};
   return updated(state,{effect:args.spell,message:text(labels[args.spell][0]+"魔法成功了！你還想改變什麼？",labels[args.spell][1]+" magic! What should we change next?")},"spell-cast");
  }
  case "create_challenge":{
   const title=copy(args.title,38),question=copy(args.question,180);
   const a=copy(args.option_a,75),b=copy(args.option_b,75),c=copy(args.option_c,75);
   const correct=args.correct_option;
   if(!title||!question||!a||!b||!c||!oneOf(correct,CHOICES))return failed(state,"invalid-challenge");
   const challenge:MagicChallenge={
    id:state.revision+1,title,question,options:[a,b,c],correct,
    feedback:copy(args.feedback,200)||text("你完成了魔法試煉！","You completed the magical trial!")
   };
   return updated(state,{challenge,effect:"sparkles",message:text("一個新的魔法試煉出現了，試試看！","A new magical challenge appeared! Give it a try.")},"challenge-created");
  }
  case "answer_challenge":{
   const choice=args.choice;
   if(!state.challenge||state.challenge.selected)return failed(state,"no-active-challenge");
   if(!oneOf(choice,CHOICES))return failed(state,"invalid-answer");
   const won=choice===state.challenge.correct;
   return updated(state,{challenge:{...state.challenge,selected:choice},chapter:state.chapter+(won?1:0),
    effect:won?"sparkles":null,message:won?state.challenge.feedback:text("咒語還不太對，再試一次新挑戰吧。","Not quite the right spell. Try another challenge!")},won?"challenge-won":"challenge-missed");
  }
  case "create_magic_panel":{
   const kind=args.panel_type,title=copy(args.title,55),description=copy(args.description,180);
   const a=copy(args.item_a,90),b=copy(args.item_b,90),c=copy(args.item_c,90);
   if(!oneOf(kind,PANEL_KINDS)||!title||!description||!a||!b||!c)return failed(state,"invalid-panel");
   const panel:MagicPanel={id:state.revision+1,kind,title,description,items:[a,b,c]};
   return updated(state,{panels:[...state.panels.slice(-1),panel],effect:"sparkles",
    message:text("一本新的魔法篇章展開了，點擊卡片探索。","A new magical panel appeared. Tap a card to explore!")}, "panel-created");
  }
  case "select_magic_panel":{
   const choice=args.choice;
   if(!oneOf(choice,CHOICES))return failed(state,"invalid-panel-choice");
   const rawId=args.panel_id;
   const id=typeof rawId==="number"&&Number.isSafeInteger(rawId)?rawId:state.panels[state.panels.length-1]?.id;
   const selected=state.panels.find(panel=>panel.id===id);
   if(!selected||selected.selected)return failed(state,"no-active-panel");
   const index=CHOICES.indexOf(choice);
   const panels=state.panels.map(panel=>panel.id===id?{...panel,selected:choice}:panel);
   return updated(state,{panels,effect:"sparkles",message:selected.items[index]}, "panel-selected");
  }
  case "tell_story":{
   const message=copy(args.message,220);
   if(!message)return failed(state,"empty-story");
   return updated(state,{message,effect:null},"story-told");
  }
  default:return failed(state,"unknown-magic-tool");
 }
}
export function demoMagicCommand(intent:"dragon"|"night"|"puzzle"|"portal"|"reset",world:MagicWorld,lang:"zh"|"en"="zh"):MagicResult{
 switch(intent){
  case "dragon":return applyMagicCommand(world,"summon_object",{kind:"dragon"},lang);
  case "portal":{
   const summoned=applyMagicCommand(world,"summon_object",{kind:"portal"},lang);
   if(!summoned.ok)return summoned;
   const copy=lang==="en"?{
    title:"Where will the portal lead?",description:"Three mysterious doors glow before you.",
    item_a:"A forest of whispering trees",item_b:"A palace made of sugar clouds",item_c:"An island above the stars"
   }:{
    title:"傳送門通往哪裡？",description:"三道神秘的門正等待你選擇。",
    item_a:"會說話的樹林",item_b:"糖雲做成的皇宮",item_c:"星空上的漂浮島"
   };
   return applyMagicCommand(summoned.world,"create_magic_panel",{panel_type:"quest",...copy},lang);
  }
  case "night":return applyMagicCommand(world,"change_world",{time:world.time==="day"?"night":"day",weather:"stars"},lang);
  case "puzzle":return applyMagicCommand(world,"create_challenge",lang==="en"?{
   title:"The Star Gate",question:"Which thing grows the more you share it?",
   option_a:"A slice of cake",option_b:"Happiness",option_c:"A secret",
   correct_option:"B",feedback:"Correct! Shared happiness lights up the island."
  }:{
   title:"星之門的謎語",question:"哪一個東西越分享就越多？",
   option_a:"一塊蛋糕",option_b:"快樂",option_c:"一個秘密",
   correct_option:"B",feedback:"答對了！分享的快樂照亮了整座魔法島。"
  },lang);
  case "reset":return {ok:true,event:"world-reset",world:{...MAGIC_INITIAL_WORLD,message:lang==="en"?"A portal is waiting. Make a wish or choose a spell.":MAGIC_INITIAL_WORLD.message,revision:world.revision+1}};
 }
}