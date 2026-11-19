import {num,total,totalMany,comparison,type Row} from "./usageExport";
import {chatEffective} from "./usageDashboardDefinitions";
export function UsageOverviewCards({data,rows}:{data:{activeUsers:number;previousActiveUsers:number;chatUsers:number;previousChatUsers:number};rows:Row[]}){
 return <>
  <section className="usage-cards" aria-label="主要指標">
   <article className="panel"><small>有效使用瀏覽器</small><strong>{num(data.activeUsers)}</strong><span>{comparison(data.activeUsers,data.previousActiveUsers)}</span></article>
   <article className="panel"><small>真的聊過天的瀏覽器</small><strong>{num(data.chatUsers)}</strong><span>{comparison(data.chatUsers,data.previousChatUsers)}</span></article>
   <article className="panel"><small>有效對話次數</small><strong>{num(totalMany(rows,chatEffective))}</strong><span>老師＋朋友＋Timeline＋Souls，雙方都有發言</span></article>
   <article className="panel"><small>網站開啟次數</small><strong>{num(total(rows,"app_opened"))}</strong><span>每分頁工作階段最多一次，不是獨立人數</span></article>
  </section>
 </>;
}
