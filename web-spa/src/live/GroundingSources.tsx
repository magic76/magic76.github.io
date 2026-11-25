import {Arrow} from "../components/Arrow";
import "./grounding-sources.css";
import type {GroundingSource} from "./grounding";
export function GroundingSources({sources,english=false,searchSuggestions=""}:{sources:GroundingSource[];english?:boolean;searchSuggestions?:string}){
 if(!sources.length&&!searchSuggestions)return null;
 return <aside className="crew-grounding-sources" aria-label={english?"Google Search sources":"Google 搜尋來源"}>
  <strong>{english?"Sources":"資料來源"}</strong>
  <div>{sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title} <Arrow direction="up-right"/></a>)}</div>
  {searchSuggestions&&<iframe className="crew-google-search-suggestions" title={english?"Google Search suggestions":"Google 搜尋建議"} srcDoc={searchSuggestions} sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer"/>}
  <small>{english?"Check original sources for details.":"請確認原始來源與日期。"}</small>
 </aside>;
}
