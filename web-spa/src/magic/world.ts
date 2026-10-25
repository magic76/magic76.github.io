/**
 * Crew Magic's single source of truth. Models describe a small, whitelisted set
 * of world actions: they never provide HTML, CSS, URLs, scripts or event handlers.
 */
export type MagicTheme="sky"|"forest"|"candy";
export type MagicWeather="clear"|"rain"|"snow"|"stars";
export type MagicTime="day"|"night";
export type MagicObjectKind="dragon"|"chest"|"portal"|"tree"|"owl"|"fox"|"crystal";
export type MagicSpell="sparkles"|"fire"|"wind"|"heal";
export type MagicCastle="stone"|"ice";
export type MagicCue="dragon_arrival"|"castle_transformation"|null;
export type MagicEvent="meteor"|"rainbow"|"festival"|"aurora";
export type MagicChoice="A"|"B"|"C";
export type MagicPanelKind="spellbook"|"treasure"|"quest";
export type MagicPanel={id:number;kind:MagicPanelKind;title:string;description:string;items:[string,string,string];selected?:MagicChoice;portalTravel?:boolean};
export type MagicObject={id:number;kind:MagicObjectKind;slot:number;x?:number;z?:number};
/** Model-configured, engine-rendered magic: strictly typed geometry, never code. */
export type MagicWonderShape="vortex"|"garden"|"orbit"|"comet"|"lanterns";
export type MagicWonderPalette="aurora"|"ember"|"rose"|"gold"|"ocean";
export type MagicWonderMotion="rise"|"spin"|"bloom";
export type MagicWonder={id:number;shape:MagicWonderShape;palette:MagicWonderPalette;
 motion:MagicWonderMotion;seed:number;x:number;z:number;size:number};

// AI writes a bounded scene graph; the Three.js renderer owns all executable logic.
export type MagicCreatorShape="box"|"sphere"|"cone"|"cylinder"|"torus"|"octahedron"|"capsule"|"leaf";
export type MagicCreatorMaterial="stone"|"wood"|"metal"|"glass"|"glow";
export type MagicCreatorColor="gold"|"rose"|"azure"|"mint"|"violet"|"coral"|"ivory"|"slate";
export type MagicCreatorMotion="still"|"hover"|"walk"|"spin"|"orbit";
export type MagicCreatorAssembly="gather"|"stack"|"spiral"|"bloom";
export type MagicCreatorMood="curious"|"gentle"|"mischievous"|"brave";
export type MagicCreatorJoint="fixed"|"hinge"|"flap"|"wheel"|"tail";
export type MagicCreatorProfile="smooth"|"armor"|"mechanical"|"organic";
export type MagicCreatorDetail="face"|"core"|"vent"|"thruster"|"rune";
export type MagicCreatorPart={shape:MagicCreatorShape;material:MagicCreatorMaterial;
 color:MagicCreatorColor;x:number;y:number;z:number;size:number;joint?:MagicCreatorJoint;
 width?:number;height?:number;depth?:number;yaw?:number;profile?:MagicCreatorProfile;connectTo?:number;detail?:MagicCreatorDetail};
export type MagicCreation={id:number;label:string;idea:string;parts:MagicCreatorPart[];
 assembly:MagicCreatorAssembly;motion:MagicCreatorMotion;mood:MagicCreatorMood;
 x:number;z:number;seed:number;revision:number;friendOf?:number};

export type MagicChallenge={id:number;title:string;question:string;options:[string,string,string];correct:MagicChoice;feedback:string;selected?:MagicChoice};
export type MagicWorld={
 theme:MagicTheme;weather:MagicWeather;time:MagicTime;
 castle:MagicCastle;cue:MagicCue;
 objects:MagicObject[];wonders:MagicWonder[];creations:MagicCreation[];challenge:MagicChallenge|null;panels:MagicPanel[];chapter:number;adventureStep:0|1|2|3;
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
 theme:"sky",weather:"clear",time:"day",castle:"stone",cue:null,objects:[],wonders:[],creations:[],challenge:null,panels:[],
 chapter:1,adventureStep:0,message:"一扇門正在等你。說出願望，或選一個魔法開始。",effect:null,event:null,revision:0
};
const THEMES=["sky","forest","candy"] as const;
const WEATHERS=["clear","rain","snow","stars"] as const;
const TIMES=["day","night"] as const;
const OBJECTS=["dragon","chest","portal","tree","owl","fox","crystal"] as const;
// Relative stage coordinates are finite and bounded; models never control raw Three.js positions.
function stageCoordinate(v:unknown):v is number{return typeof v==="number"&&Number.isFinite(v)&&v>=-1&&v<=1}
// Ten times the former walkable terrain area; distances grow by sqrt(10).
// AI coordinates remain normalized to [-1,1], so saved worlds remain valid.
export const MAGIC_MAP_AREA_SCALE=10;
export const MAGIC_MAP_LINEAR_SCALE=Math.sqrt(MAGIC_MAP_AREA_SCALE);
export function safeMagicAnchor(x:number,z:number):[number,number]{
 const length=Math.hypot(x,z);
 // Keep actors away from the castle and away from the cliff edge. A request
 // for the centre is projected to the accessible path next to the castle.
 const radius=Math.min(.94,Math.max(.59,length));
 return length<.00001?[2.18*MAGIC_MAP_LINEAR_SCALE,0]:
  [x/length*radius*3.7*MAGIC_MAP_LINEAR_SCALE,z/length*radius*3.25*MAGIC_MAP_LINEAR_SCALE];
}
const SPELLS=["sparkles","fire","wind","heal"] as const;
const EVENTS=["meteor","rainbow","festival","aurora"] as const;
const CASTLES=["stone","ice"] as const;
const WONDER_SHAPES=["vortex","garden","orbit","comet","lanterns"] as const;
const WONDER_PALETTES=["aurora","ember","rose","gold","ocean"] as const;
const WONDER_MOTIONS=["rise","spin","bloom"] as const;
const MAX_WONDERS=4;
const CREATOR_SHAPES=["box","sphere","cone","cylinder","torus","octahedron","capsule","leaf"] as const;
const CREATOR_MATERIALS=["stone","wood","metal","glass","glow"] as const;
const CREATOR_COLORS=["gold","rose","azure","mint","violet","coral","ivory","slate"] as const;
const CREATOR_MOTIONS=["still","hover","walk","spin","orbit"] as const;
const CREATOR_ASSEMBLIES=["gather","stack","spiral","bloom"] as const;
const CREATOR_MOODS=["curious","gentle","mischievous","brave"] as const;
const CREATOR_JOINTS=["fixed","hinge","flap","wheel","tail"] as const;
const CREATOR_PROFILES=["smooth","armor","mechanical","organic"] as const;
const CREATOR_DETAILS=["face","core","vent","thruster","rune"] as const;
const CREATOR_DETAIL_SHAPES:Record<MagicCreatorDetail,readonly MagicCreatorShape[]>={
 face:["box","sphere","capsule"],
 core:["box","sphere","cylinder","capsule"],
 vent:["box","cylinder","capsule","leaf"],
 thruster:["cone","cylinder","capsule"],
 rune:["box","sphere","cone","capsule","octahedron","leaf"]
};
const MAX_CREATIONS=3,MAX_CREATION_PARTS=12,MAX_CREATION_DETAILS=4;
function validCreatorSeed(v:unknown):v is number{
 return typeof v==="number"&&Number.isSafeInteger(v)&&v>=0&&v<=999999;
}
function creatorNumber(v:unknown,min:number,max:number):v is number{
 return typeof v==="number"&&Number.isFinite(v)&&v>=min&&v<=max;
}
function readCreatorParts(value:unknown,min=3):MagicCreatorPart[]|null{
 if(!Array.isArray(value)||value.length<min||value.length>MAX_CREATION_PARTS)return null;
 const parts:MagicCreatorPart[]=[];
 for(const valuePart of value){
  const item=snapshotObject(valuePart);
  if(!item||!oneOf(item.shape,CREATOR_SHAPES)||!oneOf(item.material,CREATOR_MATERIALS)
   ||!oneOf(item.color,CREATOR_COLORS)||!creatorNumber(item.x,-1.8,1.8)
   ||!creatorNumber(item.y,0,3.3)||!creatorNumber(item.z,-1.8,1.8)
   ||!creatorNumber(item.size,.15,1.65))return null;
  // Optional joints are a bounded scene instruction, never executable motion code.
  const joint=item.joint===undefined?undefined:oneOf(item.joint,CREATOR_JOINTS)?item.joint:null;
  if(joint===null)return null;
  if((item.width!==undefined&&!creatorNumber(item.width,.4,2.2))||
   (item.height!==undefined&&!creatorNumber(item.height,.4,2.2))||
   (item.depth!==undefined&&!creatorNumber(item.depth,.4,2.2))||
   (item.yaw!==undefined&&!creatorNumber(item.yaw,-180,180))||
   (item.profile!==undefined&&!oneOf(item.profile,CREATOR_PROFILES))||
   (item.detail!==undefined&&(!oneOf(item.detail,CREATOR_DETAILS)||
      !CREATOR_DETAIL_SHAPES[item.detail].includes(item.shape)))||
   (item.connectTo!==undefined&&(typeof item.connectTo!=="number"||
     !Number.isInteger(item.connectTo)||item.connectTo<0||item.connectTo>=parts.length)))
   return null;
  parts.push({shape:item.shape,material:item.material,color:item.color,
   x:item.x,y:item.y,z:item.z,size:item.size,
   ...(joint===undefined?{}:{joint}),
   ...(item.width===undefined?{}:{width:item.width as number}),
   ...(item.height===undefined?{}:{height:item.height as number}),
   ...(item.depth===undefined?{}:{depth:item.depth as number}),
   ...(item.yaw===undefined?{}:{yaw:item.yaw as number}),
   ...(item.profile===undefined?{}:{profile:item.profile as MagicCreatorProfile}),
   ...(item.detail===undefined?{}:{detail:item.detail as MagicCreatorDetail}),
   ...(item.connectTo===undefined?{}:{connectTo:item.connectTo as number})});

 }
 // Each semantic accent expands into several bounded engine-owned meshes;
 // cap close-up detail independently of the main 12-part geometry budget.
 if(parts.filter(part=>part.detail!==undefined).length>MAX_CREATION_DETAILS)return null;
 return parts;
}
// Ignore recoloring when comparing structures. Repeating the same composition
// with new colors alone is NOT considered a novel creation.
function creationStructure(parts:MagicCreatorPart[]){
 // Motion, palette and assembly are not new silhouettes. Authored joints change
 // the actual moving structure, so they are included in its fingerprint.
 return JSON.stringify(parts.map(p=>[p.shape,Math.round(p.x*4)/4,
  Math.round(p.y*4)/4,Math.round(p.z*4)/4,Math.round(p.size*4)/4,p.joint??"fixed",
  Math.round((p.width??1)*4)/4,Math.round((p.height??1)*4)/4,
  Math.round((p.depth??1)*4)/4,Math.round((p.yaw??0)/15),p.profile??"smooth",p.connectTo??-1,p.detail??""]));
}
export function magicCreatorContext(world:MagicWorld){
 const items=world.creations.map(c=>({id:c.id,name:c.label,idea:c.idea,mood:c.mood,
  assembly:c.assembly,motion:c.motion,friendOf:c.friendOf??null,
  geometry:c.parts.map(p=>[p.shape,p.x,p.y,p.z,p.size,p.joint??"fixed",p.width??1,p.height??1,p.depth??1,p.yaw??0,p.profile??"smooth",p.connectTo??-1,p.detail??""]),revision:c.revision}));
 return JSON.stringify({capacity:MAX_CREATIONS,remaining:MAX_CREATIONS-items.length,
  recentCreations:items}).slice(0,2400);
}

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
  ||!(data.adventureStep===undefined||[0,1,2,3].includes(data.adventureStep as number))
  ||!validId(data.revision)||!validId(data.chapter)||Number(data.chapter)<1
  ||!Array.isArray(data.objects)||data.objects.length>MAX_OBJECTS
  ||!(data.creations===undefined||Array.isArray(data.creations)&&data.creations.length<=MAX_CREATIONS)
  ||!(data.wonders===undefined||Array.isArray(data.wonders)&&data.wonders.length<=MAX_WONDERS)
  ||!Array.isArray(data.panels)||data.panels.length>2)return null;
 const objects:MagicObject[]=[];
 const slots=new Set<number>();
 for(const entry of data.objects){
  const obj=snapshotObject(entry);
  if(!obj||!validId(obj.id)||!oneOf(obj.kind,OBJECTS)||!validId(obj.slot)
   ||Number(obj.slot)>=MAX_OBJECTS||slots.has(obj.slot as number))return null;
  const moved=obj.x!==undefined||obj.z!==undefined;
  if(moved&&(!stageCoordinate(obj.x)||!stageCoordinate(obj.z)))return null;
  slots.add(obj.slot as number);
  objects.push({id:obj.id as number,kind:obj.kind as MagicObjectKind,slot:obj.slot as number,
   ...(moved?{x:obj.x as number,z:obj.z as number}:{})});
 }
 const wonders:MagicWonder[]=[];
 for(const entry of (data.wonders??[]) as unknown[]){
  const item=snapshotObject(entry);
  if(!item||!validId(item.id)||!oneOf(item.shape,WONDER_SHAPES)
   ||!oneOf(item.palette,WONDER_PALETTES)||!oneOf(item.motion,WONDER_MOTIONS)
   ||!Number.isSafeInteger(item.seed)||typeof item.seed!=="number"||item.seed<0||item.seed>999999
   ||!stageCoordinate(item.x)||!stageCoordinate(item.z)
   ||typeof item.size!=="number"||!Number.isFinite(item.size)||item.size<.6||item.size>1.6)return null;
  wonders.push({id:item.id as number,shape:item.shape,palette:item.palette,motion:item.motion,
   seed:item.seed as number,x:item.x,z:item.z,size:item.size});
 }
 const creations:MagicCreation[]=[];
 for(const entry of (data.creations??[]) as unknown[]){
  const c=snapshotObject(entry);
  if(!c||!validId(c.id)||!validId(c.revision)||!oneOf(c.motion,CREATOR_MOTIONS)
   ||!oneOf(c.mood,CREATOR_MOODS)||!oneOf(c.assembly,CREATOR_ASSEMBLIES)
   ||!creatorNumber(c.x,-1,1)||!creatorNumber(c.z,-1,1)
   ||!validCreatorSeed(c.seed))return null;
  const label=copy(c.label,34),idea=copy(c.idea,60),parts=readCreatorParts(c.parts);
  if(!label||!idea||!parts||creations.some(item=>item.id===c.id))return null;
  if(c.friendOf!==undefined&&(!validId(c.friendOf)||!creations.some(item=>item.id===c.friendOf)))
   return null;
  creations.push({id:c.id as number,label,idea,parts,
   assembly:c.assembly,motion:c.motion,mood:c.mood,x:c.x,z:c.z,
   revision:c.revision as number,seed:c.seed as number,
   ...(c.friendOf===undefined?{}:{friendOf:c.friendOf as number})});
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
  objects,wonders,creations,challenge,panels,chapter:data.chapter as number,
  adventureStep:([0,1,2,3].includes(data.adventureStep as number)?data.adventureStep:0) as 0|1|2|3,
  revision:data.revision as number,
  message:copy(data.message,220)||MAGIC_INITIAL_WORLD.message
 };
}
function failed(state:MagicWorld,reason:string):MagicResult{return {ok:false,world:state,event:reason}}
function updated(state:MagicWorld,changes:Partial<MagicWorld>,event:string):MagicResult{
 // First-play adventure progresses through successful world changes, whether
 // triggered by quick spells, the portal panel or the Live model. No separate
 // client-only checklist can disagree with the 3D scene.
 let step=state.adventureStep;
 if(step===0&&event==="portal-traveled")step=1;
 if(step===1&&event==="object-summoned"&&changes.objects?.some(obj=>
  (obj.kind==="dragon"||obj.kind==="fox"||obj.kind==="owl")&&
  !state.objects.some(previous=>previous.id===obj.id)))step=2;
 if(step===2&&(event==="castle-transformed"))step=3;
 let nextChanges=changes;
 if(step===3&&state.adventureStep!==3){
  const objects=changes.objects??state.objects;
  // The clue is a real, clickable 3D crystal, not a text-only achievement.
  nextChanges={...changes,event:"aurora",effect:"sparkles",
   ...(objects.length<MAX_OBJECTS&&objects.every(obj=>obj.kind!=="crystal")?
    {objects:[...objects,{id:state.revision+1,kind:"crystal" as const,slot:objects.length}]}:{})};
 }
 return {ok:true,world:{...state,cue:null,...nextChanges,adventureStep:step,revision:state.revision+1},event};
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
   const labels:{[K in MagicObjectKind]:[string,string]}={dragon:["飛龍","dragon"],chest:["寶箱","treasure chest"],portal:["傳送門","portal"],tree:["魔法樹","enchanted tree"],owl:["貓頭鷹","owl"],fox:["小狐狸","fox"],crystal:["水晶","crystal"]};
   const explicit=args.x!==undefined||args.z!==undefined;
   if(explicit&&(!stageCoordinate(args.x)||!stageCoordinate(args.z)))return failed(state,"invalid-stage-position");
   const object:MagicObject={id,kind:args.kind,slot,
    ...(explicit?{x:args.x as number,z:args.z as number}:{})};
   return updated(state,{objects:[...state.objects,object],effect:"sparkles",
    cue:args.kind==="dragon"?"dragon_arrival":null,
    message:text("一道光閃過，"+labels[args.kind][0]+"出現在島上！","A flash of light! A "+labels[args.kind][1]+" appears on the island!")}, "object-summoned");
  }
  case "move_object":{
   // The latest matching creature or object can be repositioned without
   // remounting it. Geometry stays on a bounded, obstacle-safe island path.
   if(!stageCoordinate(args.x)||!stageCoordinate(args.z))return failed(state,"invalid-stage-position");
   const byId=args.id!==undefined;
   if(byId&&!validId(args.id))return failed(state,"invalid-object-id");
   if(!byId&&!oneOf(args.kind,OBJECTS))return failed(state,"missing-object-target");
   const target=byId?state.objects.find(obj=>obj.id===args.id):
    [...state.objects].reverse().find(obj=>obj.kind===args.kind);
   if(!target)return failed(state,"object-not-found");
   if(target.x===args.x&&target.z===args.z)return failed(state,"object-already-there");
   const labels:{[K in MagicObjectKind]:[string,string]}={
    dragon:["飛龍","dragon"],owl:["貓頭鷹","owl"],fox:["小狐狸","fox"],
    chest:["寶箱","chest"],portal:["傳送門","portal"],tree:["魔法樹","tree"],crystal:["水晶","crystal"]
   };
   return updated(state,{objects:state.objects.map(obj=>obj.id===target.id?
    {...obj,x:args.x as number,z:args.z as number}:obj),
    message:text("魔法把"+labels[target.kind][0]+"帶往新的位置！","Magic moves the "+labels[target.kind][1]+" to a new spot!")
   },"object-moved");
  }
  case "move_creatures":{
   // One coordinated and bounded group action. Every member gets a distinct
   // persistent destination on the safe island ring, rather than overlapping.
   if(!stageCoordinate(args.x)||!stageCoordinate(args.z))return failed(state,"invalid-stage-position");
   const types=["dragon","owl","fox"] as const;
   if(args.kinds!==undefined&&(!Array.isArray(args.kinds)||args.kinds.length<1||
     args.kinds.length>3||args.kinds.some(kind=>!oneOf(kind,types))))return failed(state,"invalid-creature-selection");
   const requested=args.kinds as string[]|undefined;
   const group=state.objects.filter(obj=>types.includes(obj.kind as (typeof types)[number])&&
     (!requested||requested.includes(obj.kind)));
   if(!group.length)return failed(state,"no-creatures-to-move");
   const [cx,cz]=safeMagicAnchor(args.x,args.z);
   const central=Math.atan2(cz/(3.25*MAGIC_MAP_LINEAR_SCALE),cx/(3.7*MAGIC_MAP_LINEAR_SCALE));
   const occupied=state.objects.filter(obj=>!group.some(member=>member.id===obj.id));
   const points:{id:number;x:number;z:number}[]=[];
   for(let i=0;i<group.length;i++){
    let found:[number,number]|null=null;
    for(let attempt=0;attempt<28;attempt++){
     const deviation=attempt===0?0:(attempt%2===0?-1:1)*Math.ceil(attempt/2)*.2;
     const angle=central+(i-(group.length-1)/2)*.48+deviation;
     const candidate:[number,number]=[Math.cos(angle)*2.91*MAGIC_MAP_LINEAR_SCALE,
      Math.sin(angle)*2.54*MAGIC_MAP_LINEAR_SCALE];
     const blocked=occupied.some(obj=>{
      const [ox,oz]=obj.x!==undefined&&obj.z!==undefined?safeMagicAnchor(obj.x,obj.z):
       safeMagicAnchor(...([[-3.25,-.5],[3.15,-.7],[-2.7,2.65],[2.7,2.55],[-4,.8],[3.95,.95]][obj.slot] as [number,number]).map((v,j)=>v/(j===0?3.7:3.25)) as [number,number]);
      return Math.hypot(candidate[0]-ox,candidate[1]-oz)<1.04;
     })||points.some(p=>Math.hypot(candidate[0]-p.x,candidate[1]-p.z)<1.04);
     if(!blocked){found=candidate;break}
    }
    if(!found)return failed(state,"no-safe-group-position");
    const [x,z]=found;
    points.push({id:group[i].id,x:x/(3.7*MAGIC_MAP_LINEAR_SCALE),z:z/(3.25*MAGIC_MAP_LINEAR_SCALE)});
   }
   return updated(state,{objects:state.objects.map(obj=>{
    const target=points.find(p=>p.id===obj.id);
    return target?{...obj,x:target.x,z:target.z}:obj;
   }),message:text("魔法夥伴們結隊探索島嶼，彼此保持距離！","The magic companions set off together, keeping a safe distance!")
   },"creature-group-moved");
  }
  case "create_magic_entity":{
   if(state.creations.length>=MAX_CREATIONS)return failed(state,"creation-limit");
   const label=copy(args.label,34),idea=copy(args.idea,60);
   const parts=readCreatorParts(args.parts);
   if(!label||!idea||!parts||!oneOf(args.motion,CREATOR_MOTIONS)
    ||!oneOf(args.assembly,CREATOR_ASSEMBLIES)
    ||!oneOf(args.mood,CREATOR_MOODS))return failed(state,"invalid-creation");
   const x=args.x===undefined?.35:args.x,z=args.z===undefined?-.6:args.z;
   const seed=args.seed===undefined?state.revision*311%1000000:args.seed;
   if(!creatorNumber(x,-1,1)||!creatorNumber(z,-1,1)||!validCreatorSeed(seed))
    return failed(state,"invalid-creation-location");
   const friendOf=args.friend_of;
   if(friendOf!==undefined&&(!validId(friendOf)||!state.creations.some(c=>c.id===friendOf)))
    return failed(state,"invalid-creation-relation");
   const fingerprint=creationStructure(parts);
   if(state.creations.some(c=>creationStructure(c.parts)===fingerprint))
    return failed(state,"duplicate-structure-try-new-geometry");
   const entity:MagicCreation={id:state.revision+1,label,idea,parts,assembly:args.assembly,
    motion:args.motion,mood:args.mood,x,z,seed,revision:state.revision+1,
    ...(friendOf===undefined?{}:{friendOf:friendOf as number})};
   return updated(state,{creations:[...state.creations,entity],effect:"sparkles",
    message:text(label+"正在由零件組裝成形！",label+" is assembling piece by piece!")
   },"entity-created");
  }
  case "edit_magic_entity":{
   const index=args.id===undefined?state.creations.length-1:
    state.creations.findIndex(c=>c.id===args.id);
   if(index<0||index>=state.creations.length)return failed(state,"entity-not-found");
   const current=state.creations[index];
   const parts=args.parts===undefined?current.parts:readCreatorParts(args.parts);
   if(!parts)return failed(state,"invalid-entity-parts");
   const motion=args.motion===undefined?current.motion:args.motion;
   const assembly=args.assembly===undefined?current.assembly:args.assembly;
   const mood=args.mood===undefined?current.mood:args.mood;
   const x=args.x===undefined?current.x:args.x,z=args.z===undefined?current.z:args.z;
   const label=args.label===undefined?current.label:copy(args.label,34);
   const friendOf=args.friend_of===undefined?current.friendOf:args.friend_of;
   if(!label||!oneOf(motion,CREATOR_MOTIONS)||!oneOf(assembly,CREATOR_ASSEMBLIES)
    ||!oneOf(mood,CREATOR_MOODS)||!creatorNumber(x,-1,1)||!creatorNumber(z,-1,1)
    ||(friendOf!==undefined&&(!validId(friendOf)||friendOf===current.id||
      !state.creations.some(c=>c.id===friendOf))))return failed(state,"invalid-entity-edit");
   const changed=creationStructure(parts)!==creationStructure(current.parts)||motion!==current.motion
    ||assembly!==current.assembly||mood!==current.mood||x!==current.x||z!==current.z
    ||label!==current.label||friendOf!==current.friendOf
    ||parts.some((p,i)=>p.material!==current.parts[i]?.material||p.color!==current.parts[i]?.color);
   if(!changed)return failed(state,"no-entity-change");
   const next:MagicCreation={...current,parts,motion,assembly,mood,x,z,label,
    revision:state.revision+1,...(friendOf===undefined?{}:{friendOf:friendOf as number})};
   return updated(state,{creations:state.creations.map((c,i)=>i===index?next:c),
    message:text(label+"正在重新組裝，魔法讓它進化！",label+" is reassembling into something new!")
   },"entity-evolved");
  }
  case "generate_magic_wonder":{
   // LLM composes a bounded scene language. Never receive raw meshes, shaders,
   // scripts, URLs, arbitrary RGBA, or coordinate arrays.
   if(!oneOf(args.shape,WONDER_SHAPES)||!oneOf(args.palette,WONDER_PALETTES)
    ||!oneOf(args.motion,WONDER_MOTIONS))return failed(state,"invalid-wonder-primitives");
   const x=args.x===undefined?.38:args.x,z=args.z===undefined?-.55:args.z;
   const size=args.size===undefined?1:args.size;
   const seed=args.seed===undefined?state.revision%1000000:args.seed;
   if(!stageCoordinate(x)||!stageCoordinate(z)||
    typeof size!=="number"||!Number.isFinite(size)||size<.6||size>1.6||
    typeof seed!=="number"||!Number.isSafeInteger(seed)||seed<0||seed>999999)
    return failed(state,"invalid-wonder-parameters");
   const labels:{[K in MagicWonderShape]:[string,string]}={
    vortex:["旋轉的魔法漩渦","swirling magic vortex"],
    garden:["瞬間綻放的水晶花園","blooming crystal garden"],
    orbit:["漂浮的星球環","floating celestial orbits"],
    comet:["流光彗星雨","shimmering comet trails"],
    lanterns:["升空的魔法燈海","rising enchanted lanterns"]
   };
   const wonder:MagicWonder={id:state.revision+1,shape:args.shape,
    palette:args.palette,motion:args.motion,x,z,size,seed};
   return updated(state,{
    wonders:[...state.wonders.slice(-(MAX_WONDERS-1)),wonder],
    effect:"sparkles",message:text("島上出現"+labels[args.shape][0]+"，魔法正在改變風景！",
     "The island transforms with "+labels[args.shape][1]+"!")
   },"wonder-created");
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
export function demoMagicCommand(intent:"creator"|"evolve"|"wonder"|"dragon"|"fox"|"dragonice"|"icecastle"|"thawcastle"|"night"|"puzzle"|"portal"|"snow"|"forest"|"candy"|"sunny"|"rain"|"meteor"|"rainbow"|"aurora"|"reset",world:MagicWorld,lang:"zh"|"en"="zh"):MagicResult{
 switch(intent){
  case "creator":{
   const color=lang==="en";
   const part=(shape:MagicCreatorShape,material:MagicCreatorMaterial,tint:MagicCreatorColor,
    x:number,y:number,z:number,size:number,joint?:MagicCreatorJoint):MagicCreatorPart=>
    ({shape,material,color:tint,x,y,z,size,...(joint?{joint}:{})});
   const index=world.creations.length%3;
   const designs=[
    {label:color?"Clockwork gardener":"齒輪園丁",idea:"a playful walking machine",
     assembly:"gather",motion:"walk",mood:"curious",
     parts:[
      part("cylinder","metal","gold",0,.8,0,1.05),
      part("sphere","glass","azure",0,1.64,0,.7),
      part("capsule","metal","coral",-.77,.9,0,.55,"hinge"),
      part("capsule","metal","coral",.77,.9,0,.55,"hinge"),
      part("capsule","stone","slate",-.34,.22,0,.43,"hinge"),
      part("capsule","stone","slate",.34,.22,0,.43,"hinge"),
      part("torus","glow","mint",0,1.3,.5,.6),
      part("leaf","wood","mint",-.8,.54,.1,.5),
      part("leaf","wood","mint",.8,.54,.1,.5)
     ]},
    {label:color?"Floating moon jelly":"漂浮月光水母",idea:"a floating glass creature",
     assembly:"bloom",motion:"hover",mood:"gentle",
     parts:[
      part("sphere","glass","violet",0,2.1,0,1.3),
      part("torus","glow","mint",0,1.58,0,1.1),
      part("cone","glass","azure",-.6,.9,0,.5),
      part("cone","glass","azure",.6,.9,0,.5),
      part("capsule","glow","rose",-.35,.56,0,.25,"tail"),
      part("capsule","glow","mint",.35,.56,0,.25,"tail"),
      part("cylinder","glow","gold",0,.35,.5,.35),
      part("octahedron","metal","violet",0,2.65,0,.28)
     ]},
    {label:color?"Stargazer tower":"觀星機械塔",idea:"a moving miniature observatory",
     assembly:"stack",motion:"spin",mood:"mischievous",
     parts:[
      part("box","stone","slate",0,.23,0,1.32),
      part("cylinder","metal","ivory",0,.88,0,1),
      part("cylinder","metal","azure",0,1.6,0,.72),
      part("cone","metal","gold",0,2.28,0,.95),
      part("torus","glow","violet",0,1.63,0,1.23,"wheel"),
      part("sphere","glass","rose",.79,1.22,0,.45),
      part("sphere","glass","mint",-.79,1.22,0,.45),
      part("octahedron","glow","gold",0,2.9,0,.45)
     ]}
   ] as const;
   const design=designs[index];
   // Keyless examples also use the same freely composable AI part grammar.
   // Connect each subassembly to a structural predecessor, not a prefab skeleton.
   const parts=design.parts.map((p,i)=>({
    ...p,
    ...(i>0&&index!==1?{connectTo:i<5?0:i-1}:{}),
    ...(index===0&&i===1?{detail:"face"}:
     index===0&&i===0?{detail:"core"}:
     index===0&&(i===2||i===3)?{detail:"vent"}:
     index===2&&i===0?{detail:"rune"}:
     index===2&&(i===1||i===2)?{detail:"vent"}:
     index===1&&i===0?{detail:"rune"}:{}) ,
    ...(index===1?{profile:i===0?"organic":"smooth",width:i===0?1.22:.85,height:1.15,depth:1.1}:
     i===0?{width:1.32,height:1.2,depth:1.13,profile:"armor"}:
     i===1?{width:1.12,height:1.02,depth:.86,profile:"mechanical"}:
     p.shape==="leaf"?{width:1.28,height:.7,depth:.75,profile:"organic"}:
     p.shape==="capsule"?{width:.82,height:1.35,depth:.84,profile:"mechanical"}:
     {profile:"smooth"})
   }));
   return applyMagicCommand(world,"create_magic_entity",{
    ...design,parts,x:index===0?-.83:index===1?.65:-.3,
    z:index===0?-.23:index===1?-.5:.84,seed:(world.revision*331+index*7207)%1000000
   },lang);
  }
  case "evolve":{
   const current=world.creations[world.creations.length-1];
   if(!current)return {ok:false,event:"entity-not-found",world};
   const wings:MagicCreatorPart[]=[
    {shape:"leaf",material:"glass",color:"azure",x:-1.34,y:1.6,z:-.18,size:.68,joint:"flap"},
    {shape:"leaf",material:"glass",color:"rose",x:1.34,y:1.6,z:-.18,size:.68,joint:"flap"}
   ];
   const body=current.parts.length<=10?[...current.parts,...wings]:
    current.parts.map((p,i)=>i===0?{...p,shape:"octahedron" as const,size:p.size*.8}:p);
   return applyMagicCommand(world,"edit_magic_entity",{
    id:current.id,parts:body,assembly:"spiral",
    motion:current.motion==="hover"?"spin":"hover",mood:"brave"
   },lang);
  }
  case "wonder":{
   const shapes:MagicWonderShape[]=["vortex","garden","orbit","comet","lanterns"];
   const palettes:MagicWonderPalette[]=["aurora","ember","rose","gold","ocean"];
   const motions:MagicWonderMotion[]=["rise","spin","bloom"];
   const seed=Math.floor(Math.random()*1000000),index=seed%shapes.length;
   // Two contrasting but compatible wonders build a surprising composition.
   const first=applyMagicCommand(world,"generate_magic_wonder",{
    shape:shapes[index],palette:palettes[(index+Math.floor(seed/7))%5],
    motion:motions[Math.floor(seed/31)%3],x:((seed%17)/16)*1.35-.68,
    z:-.6,size:1.05+(seed%3)*.14,seed
   },lang);
   if(!first.ok)return first;
   return applyMagicCommand(first.world,"generate_magic_wonder",{
    shape:shapes[(index+2)%5],palette:palettes[(index+3)%5],
    motion:motions[(index+1)%3],x:-.36,z:.72,size:.9,seed:(seed+1729)%1000000
   },lang);
  }
  case "dragon":return applyMagicCommand(world,"summon_object",{kind:"dragon"},lang);
  case "fox":return applyMagicCommand(world,"summon_object",{kind:"fox"},lang);
  case "dragonice":{
   let next=world;
   if(!next.objects.some(obj=>obj.kind==="dragon")){
    const summoned=applyMagicCommand(next,"summon_object",{kind:"dragon"},lang);
    if(!summoned.ok)return summoned;
    next=summoned.world;
   }
   return applyMagicCommand(next,"transform_castle",{form:"ice"},lang);
  }
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