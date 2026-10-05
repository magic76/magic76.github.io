import{useState}from"react";
import{phrasebookItems,togglePhrase}from"./phrasebook";

export function PhrasebookPanel(){
 const[version,setVersion]=useState(0);void version;const items=phrasebookItems();
 return <details className="teacher-library-panel"><summary><span><strong>收藏片語</strong><small>{items.length} 條已收藏</small></span><b>›</b></summary><div className="phrasebook-list">{items.length?items.slice(0,50).map(x=><div className="phrasebook-row" key={x.id}><div><strong>{x.phrase}</strong>{x.translation&&<span>{x.translation}</span>}{x.note&&<small>{x.note}</small>}</div><button className="save-phrase saved" onClick={()=>{togglePhrase({phrase:x.phrase,translation:x.translation,note:x.note,source:x.source});setVersion(v=>v+1)}}>★</button></div>):<div className="teacher-library-empty">課後報告裡的金句可以收藏到這裡。</div>}</div></details>
}
