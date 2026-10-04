import{useEffect,useState}from"react";
import{Link,useNavigate}from"react-router-dom";
import type{StoryBook,StoryPage}from"../catalog";
import{useStoryNarrator}from"./useStoryNarrator";

function active(state:string){return["requesting-mic","connecting","listening","speaking","ending"].includes(state)}
function playLabel(state:string){
 if(state==="requesting-mic"||state==="connecting")return"連線中…";
 if(state==="speaking")return"暫停";
 if(state==="listening")return"▶ 繼續本頁";
 return"▶ 播放";
}

export function StoryPlayerView({initialBook}:{initialBook:StoryBook}){
 const[book,setBook]=useState(initialBook),[index,setIndex]=useState(Math.max(0,Math.min(Number(initialBook.currentPage)||0,(initialBook.pages||[]).length-1))),nav=useNavigate();
 const page:StoryPage=book.pages[index]||{text:""};
 const image=(book.images||[])[Number(page.imageIndex)];
 const live=useStoryNarrator(book,index,page,image);

 useEffect(()=>{if(book.sourceType!=="built-in"){const next={...book,currentPage:index};setBook(next);void window.CrewStoryStore?.save(next as any)}},[index]);
 
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

 return <><section className="story-player-head"><div><span className="kicker">{book.readingMode==="physical"?"實體書陪讀":"Live Story Player"}</span><h1>{book.title}</h1><p>{book.summary||""}</p></div><div className="actions">{book.sourceType!=="built-in"&&book.readingMode!=="physical"&&<Link className="btn secondary small" to={"/story/edit/"+encodeURIComponent(book.id)}>✎ 編輯</Link>}{book.readingMode==="physical"&&<Link className="btn secondary small" to={"/story/physical/"+encodeURIComponent(book.id)}>拍下一頁</Link>}<Link className="btn secondary small" to="/story/shelf">回書架</Link></div></section>
 <div className="story-reader story-player">
  <div className="story-reader-media">{image?<img src={image.preview} alt="故事頁面"/>:<div className="story-player-placeholder"><span>{book.coverEmoji||"S"}</span></div>}</div>
  <section className="story-reader-copy">
   <div className="story-player-meta"><span className="kicker">PAGE {index+1} / {Math.max(1,book.pages.length)}</span>{page.emotion&&<span className="pill">{page.emotion}</span>}</div>
   <p className="page-text">{page.text||page.context?.currentEvent||"這一頁還沒有文字。"}</p>
   {page.characterName&&<div className="story-dialogue"><strong>{page.characterName}</strong>{page.dialogue&&<span>「{page.dialogue}」</span>}</div>}
   <input className="story-page-slider" type="range" min="0" max={Math.max(0,book.pages.length-1)} value={index} onChange={e=>go(Number(e.target.value))}/>
   <div className="story-player-live-status" data-state={live.state}><i/><span>{live.state==="speaking"?"阿奇正在說故事":live.state==="listening"?"Live 已開啟，可以直接跟阿奇說話":live.status}</span></div>
   <div className="story-player-controls"><button className="btn secondary small" disabled={index===0} onClick={()=>go(index-1)}>上一頁</button><button className="btn" disabled={live.state==="requesting-mic"||live.state==="connecting"||live.state==="ending"} onClick={()=>void live.startOrResume()}>{playLabel(live.state)}</button><button className="btn secondary small" disabled={index>=book.pages.length-1} onClick={()=>go(index+1)}>下一頁</button></div>
   {active(live.state)&&<div className="story-player-live-tools"><button className={"live-tool-btn "+(live.muted?"active":"")} onClick={live.toggleMute}>{live.muted?"開啟麥克風":"麥克風靜音"}</button><button className="live-tool-btn" disabled={live.state!=="speaking"} onClick={live.interrupt}>打斷阿奇</button><label className="live-volume">音量 <input type="range" min="0" max="100" value={live.volume} onChange={e=>live.setVolume(Number(e.target.value))}/><span>{live.volume}%</span></label><button className="live-tool-btn" onClick={()=>void live.stop()}>結束 Live</button></div>}
   <div className="story-player-transcript">{live.input&&<div><small>你</small><span>{live.input}</span></div>}{live.output&&<div><small>阿奇</small><span>{live.output}</span></div>}</div>
   <p className="meta">說故事由 Gemini Live 阿奇負責。Live 開啟後可直接說話；阿奇說話時可按「暫停 / 打斷阿奇」再插話。</p>
   <div className="actions">{book.sourceType==="built-in"&&<Link className="btn secondary" to={"/story/edit/"+encodeURIComponent(book.id)}>建立我的版本</Link>}{book.sourceType!=="built-in"&&<button className="btn danger small" onClick={()=>void remove()}>刪除故事</button>}</div>
  </section>
 </div></>
}