import{useCallback,useEffect,useState}from"react";
import{Link,useNavigate}from"react-router-dom";
import{addHistory}from"../../lib/runtime";
import type{StoryBook,StoryPage}from"../catalog";
import{useStoryNarrator}from"./useStoryNarrator";

function active(state:string){return["requesting-mic","connecting","listening","speaking","ending"].includes(state)}
function playLabel(state:string,paused:boolean,finished:boolean){
 if(state==="requesting-mic"||state==="connecting")return"連線中…";
 if(finished)return"再聽一次";
 if(paused)return"繼續";
 if(state==="error")return"再試一次";
 if(state==="speaking"||state==="listening")return"暫停";
 return"▶ 播放";
}

export function StoryPlayerView({initialBook}:{initialBook:StoryBook}){
 const[book,setBook]=useState(initialBook),[index,setIndex]=useState(Math.max(0,Math.min(Number(initialBook.currentPage)||0,(initialBook.pages||[]).length-1))),nav=useNavigate();
 const page:StoryPage=book.pages[index]||{text:""};
 const image=(book.images||[])[Number(page.imageIndex)];
 const handlePageAdvance=useCallback((nextIndex:number)=>setIndex(nextIndex),[]);
 const live=useStoryNarrator(book,index,page,image,handlePageAdvance);

 useEffect(()=>{if(book.sourceType!=="built-in"){const next={...book,currentPage:index};setBook(next);void window.CrewStoryStore?.save(next as any)}},[index]);
 useEffect(()=>{addHistory("story",{id:"story-book:"+book.id,surface:"reader",bookId:book.id,title:book.title||"我的故事",summary:"讀到第 "+(index+1)+" 頁",currentPage:index})},[book.id,book.title,index]);

 function go(next:number){
  const target=Math.max(0,Math.min(next,book.pages.length-1));
  if(target===index)return;
  const nextPage=book.pages[target]||{text:""};
  const nextImage=(book.images||[])[Number(nextPage.imageIndex)];
  setIndex(target);
  live.narratePage(nextPage,target,nextImage);
 }

 async function remove(){
  if(book.sourceType==="built-in"||!confirm("刪除這本故事？"))return;
  await window.CrewStoryStore!.remove(book.id);nav("/story/shelf");
 }

 return <><section className="story-player-head"><div><span className="kicker">{book.readingMode==="physical"?"實體書陪讀":"說故事"}</span><h1>{book.title}</h1></div><div className="actions">{book.readingMode==="physical"&&<Link className="btn secondary small" to={"/story/physical/"+encodeURIComponent(book.id)}>拍下一頁</Link>}<Link className="btn secondary small" to="/story/shelf">回書架</Link></div></section>
 <div className="story-reader story-player">
  <div className="story-reader-media">{image?<img src={image.preview} alt="故事頁面"/>:<div className="story-player-placeholder"><span>{book.coverEmoji||"S"}</span></div>}</div>
  <section className="story-reader-copy">
   <div className="story-player-meta"><span className="kicker">{index+1} / {Math.max(1,book.pages.length)}</span>{page.emotion&&<span className="pill">{page.emotion}</span>}</div>
   <div className="story-page-progress" aria-label={"第 "+(index+1)+" 頁，共 "+Math.max(1,book.pages.length)+" 頁"}><i style={{width:((index+1)/Math.max(1,book.pages.length)*100)+"%"}}/></div>
   <p className="page-text">{page.text||page.context?.currentEvent||"這一頁還沒有文字。"}</p>
   {page.characterName&&<div className="story-dialogue"><strong>{page.characterName}</strong>{page.dialogue&&<span>「{page.dialogue}」</span>}</div>}
   {(live.state==="requesting-mic"||live.state==="connecting"||live.state==="speaking"||live.paused||live.finished||live.state==="error")&&<div className="story-player-live-status" data-state={live.state}><i/><span>{live.finished?"故事說完了":live.paused?"故事已暫停":live.state==="speaking"?"阿奇在說故事":live.state==="error"?live.status:"阿奇正在準備故事…"}</span></div>}
   {active(live.state)&&!live.paused&&!live.finished&&<><button className="btn story-talk-btn" disabled={live.state!=="speaking"} onClick={live.interrupt}>{live.state==="speaking"?"跟阿奇說話":"可以直接說話"}</button><p className="story-player-interaction-hint">{live.state==="speaking"?"想插話時按一下，阿奇會停下來聽你說。":"阿奇正在聽，你可以直接說。"}</p></>}
   <div className="story-player-controls"><button className="btn secondary small" disabled={index===0} onClick={()=>go(index-1)}>上一頁</button><button className="btn story-play-primary" disabled={live.state==="requesting-mic"||live.state==="connecting"||live.state==="ending"} onClick={()=>void live.startOrResume()}>{playLabel(live.state,live.paused,live.finished)}</button><button className="btn secondary small" disabled={index>=book.pages.length-1} onClick={()=>go(index+1)}>下一頁</button></div>
   <details className="story-player-more-controls"><summary>更多</summary><div className="story-player-secondary">
    {active(live.state)&&!live.paused&&!live.finished&&<div className="story-player-live-tools"><button className={"live-tool-btn "+(live.muted?"active":"")} onClick={live.toggleMute}>{live.muted?"開啟麥克風":"麥克風靜音"}</button><label className="live-volume">音量 <input type="range" min="0" max="100" value={live.volume} onChange={e=>live.setVolume(Number(e.target.value))}/><span>{live.volume}%</span></label><button className="live-tool-btn" onClick={()=>void live.stop()}>結束說故事</button></div>}
    {(live.input||live.output)&&<div className="story-player-transcript">{live.input&&<div><small>你</small><span>{live.input}</span></div>}{live.output&&<div><small>阿奇</small><span>{live.output}</span></div>}</div>}
    {live.turns.length>0&&<details className="story-interaction-history"><summary>互動紀錄 · {live.turns.length} 輪</summary><div>{live.turns.map((t,i)=><section key={i}>{t.input&&<p><b>你</b><span>{t.input}</span></p>}{t.output&&<p><b>阿奇</b><span>{t.output}</span></p>}</section>)}</div></details>}
    <div className="story-player-secondary-actions">{book.sourceType!=="built-in"&&book.readingMode!=="physical"&&<Link className="text-button" to={"/story/edit/"+encodeURIComponent(book.id)}>編輯故事</Link>}{book.sourceType!=="built-in"&&<button className="text-button danger-text" onClick={()=>void remove()}>刪除故事</button>}</div>
   </div></details>
   {book.sourceType==="built-in"&&<div className="actions story-player-clone"><Link className="btn secondary" to={"/story/edit/"+encodeURIComponent(book.id)}>建立我的版本</Link></div>}
  </section>
 </div></>
}