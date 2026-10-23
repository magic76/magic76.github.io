import {nonsenseJudges,type NonsenseJudgeId} from "./nonsenseTopics";

const L=(zh:boolean,a:string,b:string)=>zh?a:b;
const stageFaces:Record<NonsenseJudgeId,{idle:string;active:string;result:string}>={
 stern:{idle:"😐",active:"🧐",result:"⚖️"},
 roast:{idle:"😏",active:"🤣",result:"🎤"},
 scientist:{idle:"🤓",active:"🤯",result:"🧪"},
 queen:{idle:"😌",active:"😲",result:"👑"}
};
type Props={
 zh:boolean;phase:"setup"|"prep"|"speaking"|"review"|"judging"|"result";
 judgeId:NonsenseJudgeId;waveActive:boolean;
 liveState:"idle"|"connecting"|"speaking"|"error";
};
/** Purely decorative judges. Only the selected persona participates in the actual scoring request. */
export function NonsenseJudgeRow({zh,phase,judgeId,waveActive,liveState}:Props){
 return <div className="nonsense-judge-row" aria-label={L(zh,"舞台評審","Stage judges")}>
     {nonsenseJudges.map((judge,index)=><div key={judge.id} className={"nonsense-judge-tile"+(judgeId===judge.id?" chosen":"")} data-mood={phase==="result"&&judgeId===judge.id&&liveState==="speaking"?"pulse":phase==="result"?"result":phase==="judging"?"waiting":phase==="speaking"&&waveActive?(index%2?"pulse":"bounce"):"idle"}>
      <span className="nonsense-judge-face" aria-hidden="true">{phase==="result"&&judgeId===judge.id&&liveState==="speaking"?stageFaces[judge.id].active:phase==="result"&&judgeId===judge.id?stageFaces[judge.id].result:phase==="speaking"&&waveActive?stageFaces[judge.id].active:stageFaces[judge.id].idle}</span>
      <strong>{zh?judge.zh:judge.en}</strong>
      <small>{phase==="result"&&judgeId===judge.id&&liveState==="speaking"?L(zh,"正在播報評語","Announcing verdict"):phase==="result"&&judgeId===judge.id?L(zh,"已完成真實評分","Verified result"):phase==="judging"&&judgeId===judge.id?L(zh,"評分中","Judging"):phase==="speaking"&&waveActive?L(zh,"舞台動效","Stage effect"):judgeId===judge.id?L(zh,"本局評審","Selected judge"):L(zh,"舞台嘉賓","Stage guest")}</small>
     </div>)}
    </div>;
}
