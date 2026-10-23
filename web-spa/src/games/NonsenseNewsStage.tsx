import type {NewsScene} from "./nonsenseNewsEngine";

const L=(zh:boolean,a:string,b:string)=>zh?a:b;
const stageSymbols={breaking:"📡",witness:"🎙️",evidence:"🗂️",poll:"📊",crisis:"🚨",finale:"🏆"};
type Props={scene:NewsScene;zh:boolean;round:number;playing:boolean;hostDraft:string;playerDraft:string;aiSpeaking:boolean};
export function NonsenseNewsStage({scene,zh,round,playing,hostDraft,playerDraft,aiSpeaking}:Props){
 const finished=scene.type==="finale";
 return <section className={"news-stage news-stage-"+scene.type} aria-label={L(zh,"荒謬新聞現場","Absurd newsroom")} aria-live="polite">
  <div className="news-studio-top"><span className="news-live-light"><i/> CREW NEWS · LIVE</span><span className="news-studio-round">{finished?L(zh,"大結局","FINALE"):L(zh,"第 "+round+" / 3 回合","ROUND "+round+" / 3")}</span></div>
  <div className="news-stage-visual" aria-hidden="true">
   <div className="news-orbit news-orbit-a"/><div className="news-orbit news-orbit-b"/>
   <span className="news-stage-symbol">{stageSymbols[scene.type]}</span>
   <span className="news-studio-watermark">CREW / ON AIR</span>
  </div>
  <div className="news-broadcast-copy">
   <span className="news-eyebrow">{({breaking:L(zh,"突發快訊","BREAKING NEWS"),witness:L(zh,"現場連線","LIVE INTERVIEW"),evidence:L(zh,"最新證據","NEW EVIDENCE"),poll:L(zh,"民調速報","LIVE POLL"),crisis:L(zh,"重大危機","EMERGENCY UPDATE"),finale:L(zh,"新聞大結局","FINAL REPORT")})[scene.type]}</span>
   <h2>{scene.headline}</h2>
   <p>{scene.detail}</p>
  </div>
  {(scene.type==="witness"||scene.type==="evidence"||scene.type==="crisis")&&<div className="news-breaking-insert">
   <span className="news-insert-icon">{scene.type==="witness"?"🎥":scene.type==="evidence"?"📁":"⚡"}</span>
   <div><small>{scene.type==="witness"?L(zh,"獨家連線","SPECIAL GUEST"):scene.type==="evidence"?L(zh,"檔案已解鎖","EVIDENCE UNLOCKED"):L(zh,"事件升級","CHAOS ALERT")}</small><strong>{scene.character||L(zh,"新聞現場","NEWS DESK")}</strong>{scene.reaction&&<span>{scene.reaction}</span>}</div>
  </div>}
  {scene.type==="poll"&&<div className="news-poll-box"><span>{L(zh,"節目虛構觀眾民調","Fictional audience poll")}</span><div className="news-poll-track"><div style={{width:(scene.audience??50)+"%"}}/></div><strong>{scene.audience==null?L(zh,"觀眾意見分歧","Opinions are divided"):scene.audience+"%"}</strong></div>}
  {finished?<div className="news-outcome"><span>{L(zh,"今晚的最終下場","HOW THIS ENDED")}</span><strong>{scene.ending}</strong></div>:
  <div className="news-host-box"><span className="news-host-avatar" aria-hidden="true">🎤</span><div><span className="news-host-name">{scene.character||L(zh,"AI 主播","AI News Anchor")}</span><p>{scene.question}</p></div></div>}
  {scene.options.length>0&&!finished&&<div className="news-bottom-tips">{scene.options.map((option,i)=><span key={i}>{option}</span>)}</div>}
  {playing&&hostDraft&&<p className={"news-captions"+(aiSpeaking?" active":"")}>{L(zh,"主播：","HOST: ")}{hostDraft.slice(-200)}</p>}
  {playing&&playerDraft&&<p className="news-captions user">{L(zh,"你：","YOU: ")}{playerDraft.slice(-200)}</p>}
  <div className="news-ticker"><span>{scene.ticker||L(zh,"即時荒謬新聞 · 純屬虛構","FICTIONAL BREAKING NEWS · CREW PLAY")}</span></div>
 </section>;
}
