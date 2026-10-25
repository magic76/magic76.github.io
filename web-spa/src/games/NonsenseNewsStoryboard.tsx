import type {NewsScene,NewsSceneType} from "./nonsenseNewsEngine";

const panels:NewsSceneType[]=["breaking","witness","evidence","poll","crisis","finale"];
const labels:Record<NewsSceneType,[string,string]>={breaking:["突發現場","BREAKING"],witness:["現場連線","LIVE"],evidence:["關鍵證物","EVIDENCE"],poll:["全城民調","THE POLL"],crisis:["危機升級","CHAOS"],finale:["結局畫面","FINALE"]};
const colors:Record<NewsSceneType,[string,string,string]>={breaking:["#15365c","#ffca78","#6be1d1"],witness:["#174e62","#ffb67d","#8de0d2"],evidence:["#4c315c","#f6d184","#a6d8ff"],poll:["#324477","#f4ca72","#f6a8b8"],crisis:["#702d39","#ffd274","#ff8490"],finale:["#453166","#ffd27a","#9fe2c2"]};
const zhLabel=(zh:boolean,type:NewsSceneType)=>zh?labels[type][0]:labels[type][1];

function Art({type,headline,character,small=false}:{type:NewsSceneType;headline:string;character:string;small?:boolean}){
 const [base,glow,accent]=colors[type];
 const id="scene-"+type+(small?"-small":"");
 return <svg className="news-art-svg" viewBox="0 0 640 300" role="img" aria-label={headline}>
  <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop stopColor={base}/><stop offset="1" stopColor="#10172c"/></linearGradient><radialGradient id={id+"glow"}><stop stopColor={glow} stopOpacity=".8"/><stop offset="1" stopColor={glow} stopOpacity="0"/></radialGradient></defs>
  <rect width="640" height="300" rx="22" fill={"url(#"+id+")"}/>
  <circle cx={type==="crisis"?505:155} cy="106" r="142" fill={"url(#"+id+"glow)"} opacity=".52"/>
  <path d="M0 230 Q135 195 255 224 T640 210 V300 H0Z" fill="#10192b" opacity=".75"/>
  <g fill="#182841" stroke="#91b4d7" strokeOpacity=".22">
   <path d="M18 170h68v90H18zM96 142h84v118H96zM195 183h62v77h-62zM417 153h73v107h-73zM501 125h103v135H501z"/>
  </g>
  <g fill={glow} opacity=".7"><path d="M34 186h9v12h-9zm25 0h9v12h-9zm50-24h10v13h-10zm31 0h10v13h-10zm-28 27h10v13h-10zm316-18h10v13h-10zm27 0h10v13h-10zm57-24h10v13h-10zm27 0h10v13h-10z"/></g>
  <path d="M277 195h132v76H277z" fill="#253c5c" stroke="#ffffff" strokeOpacity=".45"/>
  <rect x="291" y="207" width="104" height="49" rx="5" fill="#121b31"/>
  {type==="breaking"||type==="crisis"?<g><path d="M342 210v39m-19-20h38" stroke={accent} strokeWidth="8" strokeLinecap="round"/><path d="M314 265l28-14 26 14" fill="none" stroke={glow} strokeWidth="4"/></g>:null}
  {type==="witness"?<g><circle cx="343" cy="222" r="13" fill={accent}/><path d="M320 251q23-37 47 0" fill={accent}/><path d="M376 216h15v24h-15z" fill="#ff586d"/><circle cx="383" cy="228" r="4" fill="#fff"/></g>:null}
  {type==="evidence"?<g transform="rotate(-8 344 230)"><rect x="322" y="212" width="47" height="33" rx="3" fill="#fff4d6"/><path d="M329 221h32m-32 7h25m-25 7h18" stroke="#8b6855" strokeWidth="3"/><circle cx="359" cy="238" r="13" fill="none" stroke="#f35c65" strokeWidth="4"/></g>:null}
  {type==="poll"?<g><path d="M322 241v-12h11v12m7 0v-24h11v24m7 0v-34h11v34" fill={accent}/><path d="M320 248h54" stroke="#fff" strokeWidth="3"/></g>:null}
  {type==="finale"?<g><path d="M319 214h50l-7 27h-36z" fill={glow}/><path d="M343 241v14m-16 0h32" stroke={accent} strokeWidth="5"/><path d="M322 206l-8-10m54 10 9-10" stroke={accent} strokeWidth="4"/></g>:null}
  <g transform="translate(112 0)">
   <ellipse cx="0" cy="265" rx="43" ry="9" fill="#070d1b" opacity=".55"/>
   <path d="M-28 253q1-52 27-55 29 4 30 55z" fill={type==="crisis"?"#ff6d72":"#efab80"}/>
   <circle cx="0" cy="178" r="32" fill="#f1bd91"/>
   <path d="M-33 178q0-43 33-43 37 0 35 42l-13-14-37 2z" fill="#252439"/>
   <circle cx="-11" cy="180" r="3" fill="#30263a"/><circle cx="12" cy="180" r="3" fill="#30263a"/>
   <path d="M-8 194q8 7 16 0" fill="none" stroke="#a95054" strokeWidth="3" strokeLinecap="round"/>
   <path d="M-40 226l-27 27m95-26 27 24" stroke="#f1bd91" strokeWidth="12" strokeLinecap="round"/>
   <rect x="-51" y="154" width="15" height="34" rx="5" fill="#fc5264"/><circle cx="-43" cy="151" r="8" fill="#fc5264"/>
  </g>
  <g fill={accent}><circle cx="82" cy="66" r="4"/><circle cx="547" cy="74" r="5"/><path d="M220 60l8-14 8 14z"/></g>
  <rect x="24" y="24" width="106" height="26" rx="13" fill="#f24f65"/><circle cx="40" cy="37" r="4" fill="#fff"/><text x="52" y="42" fill="#fff" fontSize="12" fontWeight="900" letterSpacing="2">LIVE NEWS</text>
  {!small?<><text x="24" y="282" fill="#fff" fontSize="13" fontWeight="800" opacity=".88">{character||"CREW FIELD REPORTER"}</text><text x="616" y="282" fill="#fff" textAnchor="end" fontSize="11" opacity=".6">CREW / ON AIR</text></>:null}
 </svg>;
}

export function NonsenseNewsStoryboard({scene,zh}:{scene:NewsScene;zh:boolean}){
 const title=scene.headline;
 return <div className="news-storyboard">
  <div className="news-storyboard-main" key={scene.type+title}><Art type={scene.type} headline={title} character={scene.character}/><span className="news-art-caption">{zhLabel(zh,scene.type)} <b>·</b> {title}</span></div>
  <div className="news-storyboard-strip" aria-label={zh?"本則新聞的畫面分鏡":"Story visuals"}>
   {panels.map((type,index)=><div key={type} className={"news-story-frame"+(type===scene.type?" is-current":"")}>
    <div className="news-story-thumb"><Art type={type} headline={title} character={scene.character} small/></div>
    <span><i>0{index+1}</i>{zhLabel(zh,type)}</span>
   </div>)}
  </div>
 </div>;
}
