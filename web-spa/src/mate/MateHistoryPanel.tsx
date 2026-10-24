import type {MateHistory} from "./mateState";
export function MateHistoryPanel({history,english,onOpen,onDelete}:{
  history:MateHistory[];english:boolean;onOpen:(item:MateHistory)=>void;onDelete:(id:string)=>void;
}){
  return <section className="mate-panel" aria-label={english?"History":"紀錄"}>
    <h2>{english?"On-device task history":"本機任務紀錄"}</h2>
    {history.length===0&&<p className="mate-hint">{english?"No saved tasks.":"尚未儲存任務。"}</p>}
    {history.map(item=><div className="mate-history" key={item.id}>
      <div><strong>{item.target} · {item.goal}</strong>
        <small>{new Date(item.updatedAt).toLocaleString()} · {item.status==="stopped"?(english?"Paused":"未完成"):(english?"Completed":"已完成")}</small>
        {item.outcome&&<small>{item.outcome}</small>}
      </div>
      <button type="button" onClick={()=>onOpen(item)}>{item.status==="stopped"&&item.consensus?(english?"Resume":"繼續任務"):(english?"View":"查看")}</button>
      <button type="button" onClick={()=>onDelete(item.id)}>{english?"Delete":"刪除"}</button>
    </div>)}
  </section>;
}
