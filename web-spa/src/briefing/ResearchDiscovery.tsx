import {Arrow} from "../components/Arrow";
import {Link} from "react-router-dom";
import type {BriefingItem} from "./types";
import type {RelatedResearch} from "./PublicResearchContext";

const localProducts={
 "Crew Teacher":{to:"/teacher",label:"探索 Crew Teacher 語言練習"},
 "Crew Story":{to:"/story",label:"探索 Crew Story 親子共讀"},
 "Crew Fortune":{to:"/fortune",label:"探索 Crew Fortune 命理服務"},
 "Crew Web":{to:"/",label:"了解 Crew Web"}
} as const;

const allowedResearchPath=(path:string)=>/^\/research\/\d{4}-\d{2}-\d{2}\/[a-zA-Z0-9_-]+\/$/.test(path);

/** Only link actual published research and products explicitly associated with this item. */
export function ResearchDiscovery({item,related}:{item:BriefingItem;related:RelatedResearch[]}){
 const products=[...new Set(item.projects)].flatMap(name=>{
  const found=localProducts[name as keyof typeof localProducts];
  return found?[{name,...found}]:[];
 });
 const stories=related.filter(entry=>entry.id!==item.id&&allowedResearchPath(entry.path)).slice(0,3);
 if(!stories.length&&!products.length)return null;
 return <section className="briefing-section briefing-discovery" aria-label="延伸探索">
  <h2>延伸探索</h2>
  {stories.length>0&&<div className="briefing-discovery-group">
   <h3>相關研究</h3>
   <ul>{stories.map(entry=><li key={entry.path}><Link to={entry.path}>{entry.title}</Link><small>{entry.reason} · {entry.date}</small></li>)}</ul>
  </div>}
  {products.length>0&&<div className="briefing-discovery-group">
   <h3>相關 Crew 功能</h3>
   <p className="meta">依文章標記的相關專案連結；研究觀點不代表功能已完成驗證。</p>
   <div className="briefing-discovery-products">
    {products.map(product=><Link key={product.name} to={product.to}>{product.label} <Arrow/></Link>)}
   </div>
  </div>}
 </section>;
}
