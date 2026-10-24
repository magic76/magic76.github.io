import type {MatePhase} from "./mateState";
export function MateExternalDock({phase,english,onSupplement,onTakeOver,onComplete,onEnd,onRestart}:{
 phase:MatePhase;english:boolean;onSupplement:()=>void;onTakeOver:()=>void;
 onComplete:()=>void;onEnd:()=>void;onRestart:()=>void;
}){
 const t=(zh:string,en:string)=>english?en:zh;
 return <div className="mate-dock">
  {phase==="external"&&<>
   <button type="button" className="mate-secondary" onClick={onSupplement}>{t("私下補充","Private update")}</button>
   <button type="button" className="mate-secondary" onClick={onTakeOver}>{t("我要自己說","Take over")}</button>
   <button type="button" className="mate-primary" onClick={onComplete}>{t("完成任務","Complete task")}</button>
   <button type="button" className="mate-quiet" onClick={onEnd}>{t("結束通話","End call")}</button>
  </>}
  {phase==="finished"&&<button className="mate-primary" type="button" onClick={onRestart}>{t("建立新任務","New task")}</button>}
  {phase==="decision"&&<button className="mate-quiet" type="button" onClick={onEnd}>{t("結束","End")}</button>}
 </div>;
}
