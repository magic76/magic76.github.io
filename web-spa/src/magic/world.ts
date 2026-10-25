/**
 * Crew Magic's single source of truth. Models describe a small, whitelisted set
 * of world actions: they never provide HTML, CSS, URLs, scripts or event handlers.
 */
export type MagicTheme="sky"|"forest"|"candy";
export type MagicWeather="clear"|"rain"|"snow"|"stars";
export type MagicTime="day"|"night";
export type MagicObjectKind="dragon"|"chest"|"portal"|"tree"|"owl"|"crystal";
export type MagicSpell="sparkles"|"fire"|"wind"|"heal";
export type MagicCastle="stone"|"ice";
export type MagicCue="dragon_arrival"|"castle_transformation"|null;
export type MagicEvent="meteor"|"rainbow"|"festival"|"aurora";
export type MagicChoice="A"|"B"|"C";
export type MagicPanelKind="spellbook"|"treasure"|"quest";
export type MagicPanel={id:number;kind:MagicPanelKind;title:string;description:string;items:[string,string,string];selected?:MagicChoice;portalTravel?:boolean};
export type MagicObject={id:number;kind:MagicObjectKind;slot:number};
export type MagicChallenge={id:number;title:string;question:string;options:[string,string,string];correct:MagicChoice;feedback:string;selected?:MagicChoice};
export type MagicWorld={
 theme:MagicTheme;weather:MagicWeather;time:MagicTime;
 castle:MagicCastle;cue:MagicCue;
 objects:MagicObject[];challenge:MagicChallenge|null;panels:MagicPanel[];chapter:number;
 message:string;effect:MagicSpell|null;event:MagicEvent|null;revision:number;
};
export type MagicSpotlight={kind:"challenge"|"panel";id:number};
/** Newest generated challenge or panel wins; resolution does not hide results. */
export function latestMagicSpotlight(challenge:MagicChallenge|null,panels:MagicPanel[]):MagicSpotlight|null{
 const panel=panels[panels.length-1];
 if(challenge&&(!panel||challenge.id>panel.id))return {kind:"challenge",id:challenge.id};
 if(panel)return {kind:"panel",id:panel.id};
 return null;
}
export type MagicResult={ok:boolean;world:MagicWorld;event:string};
export type MagicLiveCall={id?:string;name:string;args?:unknown};
export type MagicLiveCallResult={result:MagicResult;duplicate:boolean};
const MAX_LIVE_TOOL_RESULTS=64;
/**
 * Gemini may retry a function call after transport recovery. Function-call ids are
 * transport idempotency keys: replay the original response without mutating the
 * current world a second time. The cache is session-scoped and bounded.
 */
export function applyMagicLiveCall(state:MagicWorld,call:MagicLiveCall,seen:Map<string,MagicResult>,lang:"zh"|"en"="zh"):MagicLiveCallResult{
 const id=typeof call.id==="string"&&call.id.length>0&&call.id.length<=128?call.id:null;
 if(id){
  const cached=seen.get(id);
  if(cached)return {result:cached,duplicate:true};
 }
 const result=applyMagicCommand(state,call.name,call.args,lang);
 if(id){
  seen.set(id,result);
  if(seen.size>MAX_LIVE_TOOL_RESULTS){
   const oldest=seen.keys().next().value;
   if(typeof oldest==="string")seen.delete(oldest);
  }
 }
 return {result,duplicate:false};
}
export const MAGIC_INITIAL_WORLD:MagicWorld={
 theme:"sky",weather:"clear",time:"day",castle:"stone",cue:null,objects:[],challenge:null,panels:[],
 chapter:1,message:"一扇門正在等你。說出願望，或選一個魔法開始。",effect:null,event:null,revision:0
};
const THEMES=["sky","forest","candy"] as const;
const WEATHERS=["clear","rain","snow","stars"] as const;
const TIMES=["day","night"] as const;
const OBJECTS=["dragon","chest","portal","tree","owl","crystal"] as const;
const SPELLS=["sparkles","fire","wind","heal"] as const;
const EVENTS=["meteor","rainbow","festival","aurora"] as const;
const CASTLES=["stone","ice"] as const;
const CUES=["dragon_arrival","castle_transformation"] as const;
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
 // Dynamic model text is rendered as text, never markup. Also remove bidi
 // overrides/isolates so invisible direction controls cannot visually spoof
 // generated choices or story copy in mixed-language UI.
 return typeof value==="string"?value
  .replace(/[\u0000-\u001f\u007f]/g," ")
  .replace(/[\u202a-\u202e\u2066-\u2069]/gi,"")
  .trim().slice(0,max):"";
}
// A tab-local adventure survives refresh without storing microphone audio,
// transcripts, Gemini keys or arbitrary executable content.
const MAX_WORLD_SNAPSHOT_CHARS=16000;
const validId=(x:unknown)=>Number.isSafeInteger(x)&&typeof x==="number"&&x>=0&&x<=10000000;
function snapshotObject(value:unknown):Record<string,unknown>|null{
 if(value===null||typeof value!=="object"||Array.isArray(value))return null;
 const proto=Object.getPrototypeOf(value);
 return proto===Object.prototype||proto===null?value as Record<string,unknown>:null;
}
export function readMagicWorldSnapshot(raw:string|null):MagicWorld|null{
 if(!raw||raw.length>MAX_WORLD_SNAPSHOT_CHARS)return null;
 let candidate:unknown;
 try{candidate=JSON.parse(raw)}catch{return null}
 const data=snapshotObject(candidate);
 if(!data||!oneOf(data.theme,THEMES)||!oneOf(data.weather,WEATHERS)||!oneOf(data.time,TIMES)
  ||!(data.event===null||oneOf(data.event,EVENTS))
  ||!(data.effect===null||oneOf(data.effect,SPELLS))
  ||!(data.castle===undefined||oneOf(data.castle,CASTLES))
  ||!(data.cue===undefined||data.cue===null||oneOf(data.cue,CUES))
  ||!validId(data.revision)||!validId(data.chapter)||Number(data.chapter)<1
  ||!Array.isArray(data.objects)||data.objects.length>MAX_OBJECTS
  ||!Array.isArray(data.panels)||data.panels.length>2)return null;
 const objects:MagicObject[]=[];
 const slots=new Set<number>();
 for(const entry of data.objects){
  const obj=snapshotObject(entry);
  if(!obj||!validId(obj.id)||!oneOf(obj.kind,OBJECTS)||!validId(obj.slot)
   ||Number(obj.slot)>=MAX_OBJECTS||slots.has(obj.slot as number))return null;
  slots.add(obj.slot as number);
  objects.push({id:obj.id as number,kind:obj.kind as MagicObjectKind,slot:obj.slot as number});
 }
 const panels:MagicPanel[]=[];
 for(const entry of data.panels){
  const obj=snapshotObject(entry);
  if(!obj||!validId(obj.id)||!oneOf(obj.kind,PANEL_KINDS)
   ||!Array.isArray(obj.items)||obj.items.length!==3
   ||obj.items.some((x:unknown)=>typeof x!=="string"||!copy(x,90)))return null;
  if(obj.selected!==undefined&&!oneOf(obj.selected,CHOICES))return null;
  const title=copy(obj.title,55),description=copy(obj.description,180);
  if(!title||!description)return null;
  panels.push({id:obj.id as number,kind:obj.kind as MagicPanelKind,title,description,
   items:obj.items.map((item:unknown)=>copy(item,90)) as [string,string,string],
   ...(obj.selected?{selected:obj.selected as MagicChoice}:{}),
   ...(obj.portalTravel===true&&obj.kind==="quest"?{portalTravel:true}:{})});
 }
 let challenge:MagicChallenge|null=null;
 if(data.challenge!==null){
  const c=snapshotObject(data.challenge);
  if(!c||!validId(c.id)||!oneOf(c.correct,CHOICES)
   ||!Array.isArray(c.options)||c.options.length!==3
   ||c.options.some((x:unknown)=>!copy(x,75))
   ||(c.selected!==undefined&&!oneOf(c.selected,CHOICES)))return null;
  const title=copy(c.title,38),question=copy(c.question,180);
  if(!title||!question)return null;
  challenge={id:c.id as number,title,question,
   options:c.options.map((x:unknown)=>copy(x,75)) as [string,string,string],
   correct:c.correct as MagicChoice,feedback:copy(c.feedback,200),
   ...(c.selected?{selected:c.selected as MagicChoice}:{})};
 }
 return {
  theme:data.theme as MagicTheme,weather:data.weather as MagicWeather,time:data.time as MagicTime,
  event:data.event as MagicEvent|null,effect:data.effect as MagicSpell|null,
  castle:oneOf(data.castle,CASTLES)?data.castle:"stone",
  cue:oneOf(data.cue,CUES)?data.cue:null,
  objects,challenge,panels,chapter:data.chapter as number,revision:data.revision as number,
  message:copy(data.message,220)||MAGIC_INITIAL_WORLD.message
 };
}
function failed(state:MagicWorld,reason:string):MagicResult{return {ok:false,world:state,event:reason}}
function updated(state:MagicWorld,changes:Partial<MagicWorld>,event:string):MagicResult{
 return {ok:true,world:{...state,cue:null,...changes,revision:state.revision+1},event};
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
    cue:args.kind==="dragon"?"dragon_arrival":null,
    message:text("一道光閃過，"+labels[args.kind][0]+"出現在島上！","A flash of light! A "+labels[args.kind][1]+" appears on the island!")}, "object-summoned");
  }
  case "transform_castle":{
   // A persistent, reversible 3D scene mutation; no dynamic geometry or code
   // accepted from Live. Keep the castle appearance in validated world state.
   if(!oneOf(args.form,CASTLES))return failed(state,"invalid-castle-form");
   if(state.castle===args.form)return failed(state,"castle-already-transformed");
   const icy=args.form==="ice";
   return updated(state,{
    castle:args.form,weather:icy?"snow":"clear",time:icy?"night":"day",
    effect:"sparkles",cue:"castle_transformation",
    message:icy?text("龍息化作冰晶，整座城堡正在結冰！","The dragon's breath turns to frost as the whole castle freezes!"):
     text("冰晶散去，城堡重現暖色光芒。","The ice melts away and the castle glows warmly again.")
   },"castle-transformed");
  }
  case "cast_spell":{
   if(!oneOf(args.spell,SPELLS))return failed(state,"invalid-spell");
   const labels:{[K in MagicSpell]:[string,string]}={sparkles:["星光","Starlight"],fire:["火焰","Fire"],wind:["微風","Wind"],heal:["治癒","Healing"]};
   return updated(state,{effect:args.spell,message:text(labels[args.spell][0]+"魔法成功了！你還想改變什麼？",labels[args.spell][1]+" magic! What should we change next?")},"spell-cast");
  }
  case "trigger_world_event":{
   if(!oneOf(args.kind,EVENTS))return failed(state,"invalid-world-event");
   const names:{[K in MagicEvent]:[string,string]}={
    meteor:["流星雨降臨，天空閃耀著火光！","A meteor shower fills the sky with glowing sparks!"],
    rainbow:["一道巨大彩虹橫跨魔法島！","A giant rainbow appears above the island!"],
    festival:["魔法慶典開始，整座島嶼都在發光！","The magical festival begins, and the island lights up!"],
    aurora:["極光在夜空中舞動，魔法正甦醒。","The northern lights dance across the magical night sky."]
   };
   const night=args.kind==="aurora"||args.kind==="meteor";
   return updated(state,{event:args.kind,time:night?"night":"day",effect:"sparkles",message:names[args.kind][lang==="en"?1:0]},"world-event-started");
  }
  case "open_world_portal":{
   // This portal is a real, deterministic destination selector, not a decorative
   // generic quest. No arbitrary code or model-supplied scene properties.
   const english=lang==="en";
   const panel:MagicPanel={
    id:state.revision+1,kind:"quest",portalTravel:true,
    title:english?"Where will the portal lead?":"傳送門通往哪裡？",
    description:english?"Pick a destination to actually transform the island.":"選擇目的地，讓眼前的世界真的改變。",
    items:english?["Whispering forest","Sugar-cloud kingdom","Island under the stars"]:
      ["會說話的森林","糖雲王國","星空漂浮島"]
   };
   const objects=state.objects.length<MAX_OBJECTS?
    [...state.objects,{id:state.revision+1,kind:"portal" as const,slot:state.objects.length}]:state.objects;
   return updated(state,{
    objects,panels:[...state.panels.slice(-1),panel],effect:"sparkles",
    message:english?"A magical panel has opened the portal. Choose where to travel!":"傳送門展開了新的魔法篇章，選一個目的地！"
   },"portal-opened");
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
   if(selected.portalTravel){
    const destinations=[
     {theme:"forest" as const,time:"day" as const,weather:"clear" as const,event:null},
     {theme:"candy" as const,time:"day" as const,weather:"clear" as const,event:"festival" as const},
     {theme:"sky" as const,time:"night" as const,weather:"stars" as const,event:"aurora" as const}
    ] as const;
    const target=destinations[index];
    return updated(state,{...target,panels,chapter:state.chapter+1,effect:"sparkles",
     message:lang==="en"?"You step through the portal to "+selected.items[index]+"!":
      "穿越傳送門，你抵達了"+selected.items[index]+"！"},"portal-traveled");
   }
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
export function demoMagicCommand(intent:"dragon"|"icecastle"|"thawcastle"|"night"|"puzzle"|"portal"|"snow"|"forest"|"candy"|"sunny"|"rain"|"meteor"|"rainbow"|"aurora"|"reset",world:MagicWorld,lang:"zh"|"en"="zh"):MagicResult{
 switch(intent){
  case "dragon":return applyMagicCommand(world,"summon_object",{kind:"dragon"},lang);
  case "icecastle":return applyMagicCommand(world,"transform_castle",{form:"ice"},lang);
  case "thawcastle":return applyMagicCommand(world,"transform_castle",{form:"stone"},lang);
  case "portal":return applyMagicCommand(world,"open_world_portal",{},lang);
  // This action is labelled “starry night”, so it must be idempotent: tapping it
  // while already at night must never flip the scene back to daylight while
  // leaving star weather active. UI, state and rendered sky now share one truth.
  case "night":return applyMagicCommand(world,"change_world",{time:"night",weather:"stars"},lang);
  case "snow":return applyMagicCommand(world,"change_world",{weather:"snow",time:"night"},lang);
  case "rain":return applyMagicCommand(world,"change_world",{weather:"rain",time:"day"},lang);
  case "forest":return applyMagicCommand(world,"change_world",{theme:"forest",time:"day",weather:"clear"},lang);
  case "candy":return applyMagicCommand(world,"change_world",{theme:"candy",time:"day",weather:"clear"},lang);
  case "sunny":return applyMagicCommand(world,"change_world",{theme:"sky",time:"day",weather:"clear"},lang);
  case "meteor":return applyMagicCommand(world,"trigger_world_event",{kind:"meteor"},lang);
  case "rainbow":return applyMagicCommand(world,"trigger_world_event",{kind:"rainbow"},lang);
  case "aurora":return applyMagicCommand(world,"trigger_world_event",{kind:"aurora"},lang);
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