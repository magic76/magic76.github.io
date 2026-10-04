import{useEffect,useRef,useState}from"react";import{useNavigate,useParams}from"react-router-dom";import{ensureStoryServices,geminiKey}from"../lib/runtime";import type{StoryBook}from"./catalog";

type Img={data:string;mimeType:string;preview:string;width:number;height:number;bytes:number};
export function PhysicalBookPage(){
 const{id=""}=useParams(),nav=useNavigate(),camera=useRef<HTMLInputElement>(null);
 const[book,setBook]=useState<StoryBook|null|undefined>(id?undefined:null),[busy,setBusy]=useState(false),[status,setStatus]=useState(id?"正在載入…":"先拍故事書封面");
 useEffect(()=>{if(!id)return;void ensureStoryServices().then(async()=>{const b=await window.CrewStoryStore!.get(decodeURIComponent(id));setBook(b as StoryBook|null);setStatus(b?"翻到下一頁後拍照":"找不到這本實體書")})},[id]);
 async function prep(file:File){await ensureStoryServices();const img=await window.CrewLiveUI?.prepareImage(file,{maxSide:1600,quality:.86});if(!img)throw new Error("無法處理照片");return img as Img}
 async function startCover(file?:File){
  if(!file)return;if(!geminiKey()){nav("/settings");return}setBusy(true);setStatus("阿奇正在看封面…");
  try{
   const image=await prep(file),meta=await window.CrewBookAnalyzer.analyzeCover({data:image.data,mimeType:image.mimeType});
   const next:StoryBook={id:window.CrewDB.id("book"),title:String(meta.title||"我的故事書"),summary:String(meta.summary||""),coverEmoji:"📖",coverIndex:0,images:[image],pages:[],currentPage:0,sourceType:"user",readingMode:"physical",language:String(meta.language||"zh-TW"),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
   await window.CrewStoryStore!.save(next as any);setBook(next);setStatus("封面完成。翻到第一頁後拍照");nav("/story/physical/"+encodeURIComponent(next.id),{replace:true});
  }catch(e){setStatus(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
 }
 async function addPage(file?:File){
  if(!file||!book)return;if(!geminiKey()){nav("/settings");return}setBusy(true);setStatus("阿奇正在辨識這一頁…");
  try{
   const image=await prep(file),images=(book.images||[]).slice();images.push(image);
   const page=await window.CrewBookAnalyzer.analyzePage({data:image.data,mimeType:image.mimeType},book,book.pages.length);
   page.imageIndex=images.length-1;page.pageIndex=book.pages.length;
   const next={...book,images,pages:[...book.pages,page],currentPage:book.pages.length,updatedAt:new Date().toISOString()};
   await window.CrewStoryStore!.save(next as any);setBook(next);setStatus("第 "+next.pages.length+" 頁已加入。翻到下一頁可以繼續拍");
  }catch(e){setStatus(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
 }
 function talk(){
  if(!book||!book.pages.length)return;
  const i=book.pages.length-1;
  localStorage.setItem("crew_story_book_live_context",JSON.stringify({id:book.id,title:book.title,currentPage:i,pages:book.pages.slice(Math.max(0,i-2)).map(p=>p.text||p.context?.currentEvent||"")}));
  nav("/story/live?from=physical");
 }
 const cover=(book?.images||[])[0],last=book?.pages?.[book.pages.length-1],lastImg=last?(book?.images||[])[Number(last.imageIndex)]:null;
 return <><section className="hero"><span className="kicker">Physical book</span><h1>實體書陪讀</h1><p>照 APK 的流程：先拍封面建立一本書，之後每翻一頁拍一張；阿奇只談已經拍過的內容，不偷看後面。</p></section>
 <section className="section physical-book-flow">
  {!book?<div className="panel physical-cover-setup"><div className="physical-preview">{cover?<img src={cover.preview}/>:<span>📖</span>}</div><h2>把封面放進畫面中</h2><p className="meta">{status}</p><label className="btn">{busy?"辨識中…":"拍故事書封面"}<input type="file" accept="image/*" capture="environment" hidden disabled={busy} onChange={e=>{void startCover(e.target.files?.[0]);e.currentTarget.value=""}}/></label></div>:
   <><div className="panel physical-book-head"><div className="physical-cover-small">{cover?<img src={cover.preview}/>:<span>📖</span>}</div><div><span className="kicker">實體書</span><h2>{book.title}</h2><p>{book.summary||"封面已建立"}</p><small>{book.pages.length} 頁 · {book.language||"語言未辨識"}</small></div></div>
   <div className="story-reader"><div className="story-reader-media">{lastImg?<img src={lastImg.preview}/>:<div className="story-empty">準備拍第一頁</div>}</div><section className="story-reader-copy"><span className="kicker">{book.pages.length?"PAGE "+book.pages.length:"COVER"}</span><h2>{book.pages.length?"阿奇已讀到這裡":"翻到第一頁"}</h2><p className="page-text">{last?.text||last?.context?.currentEvent||"拍完第一頁後，文字與畫面重點會出現在這裡。"}</p><p className="meta">{status}</p><div className="actions"><label className="btn">{busy?"辨識中…":book.pages.length?"拍下一頁":"拍第一頁"}<input ref={camera} type="file" accept="image/*" capture="environment" hidden disabled={busy} onChange={e=>{void addPage(e.target.files?.[0]);e.currentTarget.value=""}}/></label><button className="btn secondary" disabled={!book.pages.length} onClick={talk}>跟阿奇聊這一頁</button><button className="btn secondary" disabled={!book.pages.length} onClick={()=>nav("/story/read/"+encodeURIComponent(book.id))}>打開閱讀器</button></div></section></div></>}
 </section></>
}