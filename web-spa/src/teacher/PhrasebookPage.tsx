import{useState}from"react";import{dueDeckItems,learningDeck,removeDeckItem,reviewDeckItem,reviewStage,type DeckItem}from"./learningDeck";

function tag(x:DeckItem){return{correction:"道地糾錯",hint:"回答小抄",vocab:"重點單字",phrase:"實用金句"}[x.category]||"收藏"}
export function PhrasebookPage(){
 const[items,setItems]=useState(()=>learningDeck()),due=dueDeckItems().length;
 function refresh(){setItems(learningDeck())}
 return <><section className="hero"><span className="kicker">My Learning Deck</span><h1>收藏片語</h1><p>把真實對話與課後報告中的單字、修正與實用句留下來複習。</p></section>
 <section className="section"><div className="section-head"><h2>我的收藏</h2><small>{items.length} 張 · {due} 張待複習</small></div>
 <div className="learning-deck-list">{items.length?items.map(x=><article className="learning-deck-card" key={x.id}><div className="row" style={{justifyContent:"space-between"}}><span className="pill">{tag(x)} · {reviewStage(x)}</span><button className="text-button danger-text" onClick={()=>{removeDeckItem(x.id);refresh()}}>刪除</button></div><h3>{x.originalText}</h3>{x.translation&&<p className="translation">{x.translation}</p>}{x.notes&&<p className="meta">{x.notes}</p>}<div className="actions"><button className="btn secondary small" onClick={()=>{reviewDeckItem(x.id);refresh()}}>我複習過了</button>{x.nextReviewAt&&<small className="meta">下次：{new Date(x.nextReviewAt).toLocaleDateString()}</small>}</div></article>):<div className="notice"><div><b>你的學習卡還是空的</b><p>完成口說練習後，可以把課後報告裡的 recast 與實用表達存進來。</p></div></div>}</div></section></>
}