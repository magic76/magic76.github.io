import type {GroundingSource} from "./grounding";
export function GroundingSources({sources,english=false}:{sources:GroundingSource[];english?:boolean}){
 if(!sources.length)return null;
 return <aside className="crew-grounding-sources" aria-label={english?"Google Search sources":"Google 搜尋來源"}>
  <strong>{english?"Sources":"資料來源"}</strong>
  <div>{sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>)}</div>
  <small>{english?"Check original sources for details.":"請確認原始來源與日期。"}</small>
 </aside>;
}
