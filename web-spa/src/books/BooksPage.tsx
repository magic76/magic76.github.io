import {useEffect,useMemo,useState} from "react";
import "./books.css";

type Kind="swap"|"sell"|"give"|"want";
type Status="open"|"reserved"|"closed";
type Post={id:string;author:string;title:string;description:string;kind:Kind;price:number|null;status:Status;createdAt:string;updatedAt?:string;commentCount:number};
type Comment={id:string;postId:string;author:string;message:string;createdAt:string};
type Form={author:string;title:string;description:string;kind:Kind;price:string};
const STORAGE="crew_books_preview_v1";
const OWNER_STORAGE="crew_books_owner_tokens_v1";
const INVITE_STORAGE="crew_books_invite";
const NAME_STORAGE="crew_books_nickname";
const EMPTY:Form={author:"",title:"",description:"",kind:"swap",price:""};
const KINDS:{key:"all"|Kind;label:string}[]=[
 {key:"all",label:"全部"},{key:"swap",label:"交換"},{key:"sell",label:"出售"},
 {key:"give",label:"贈送"},{key:"want",label:"徵求"}
];
const names:Record<Kind,string>={swap:"交換",sell:"出售",give:"贈送",want:"徵求"};
const statuses:Record<Status,string>={open:"開放中",reserved:"已保留",closed:"已完成"};
const now=new Date().toISOString();
const seed:Post[]=[
 {id:"sample-1",author:"安安媽媽",title:"英文繪本 3 本",description:"孩子長大了，想換適合小學中年級的英文故事書。書況良好。",kind:"swap",price:null,status:"open",createdAt:now,commentCount:2},
 {id:"sample-2",author:"晴晴媽媽",title:"兒童百科全書 5 冊",description:"家中書櫃整理，一套 5 本，內頁乾淨，可以面交。",kind:"sell",price:300,status:"open",createdAt:now,commentCount:1},
 {id:"sample-3",author:"Emma 媽媽",title:"徵求適合小二的橋梁書",description:"想找小學二年級能自己閱讀的中文橋梁書，歡迎推薦或交換。",kind:"want",price:null,status:"open",createdAt:now,commentCount:0}
];
const examples:Comment[]=[
 {id:"sample-c1",postId:"sample-1",author:"小悠媽媽",message:"想請問這三本大概適合幾歲呢？",createdAt:now},
 {id:"sample-c2",postId:"sample-1",author:"安安媽媽",message:"大約 6–9 歲，我家小二看得很開心。",createdAt:now},
 {id:"sample-c3",postId:"sample-2",author:"樂樂媽媽",message:"請問可以單買其中兩本嗎？",createdAt:now}
];
function readJson<T>(key:string,fallback:T):T{try{const data=localStorage.getItem(key);return data?JSON.parse(data) as T:fallback}catch{return fallback}}
function shortDate(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?"最近":date.toLocaleDateString("zh-TW",{month:"numeric",day:"numeric"})}
function ownerTokens():Record<string,string>{return readJson(OWNER_STORAGE,{})}
async function api(invite:string,body?:object,postId?:string) {
 const response=await fetch("/api/books"+(postId?"?postId="+encodeURIComponent(postId):""),{
  method:body?"POST":"GET",
  headers:{"x-crew-books-invite":invite,...(body?{"Content-Type":"application/json"}:{})},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 let result:any={};try{result=await response.json()}catch{throw Error("伺服器回應異常")}
 if(!response.ok) {
  const messages:Record<string,string>={
   BOOKS_NOT_CONFIGURED:"正式交換板尚未設定資料庫與邀請碼，可先使用示範模式。",
   INVITE_REQUIRED:"邀請碼不正確，請跟群組管理員確認。",
   BOOKS_DATABASE_ERROR:"資料庫暫時無法使用，請稍後再試。",
   ORIGIN_REJECTED:"安全檢查失敗，請重新開啟本網站。",
   NOT_OWNER:"這篇貼文只能由原刊登裝置修改。",
   POST_CLOSED:"這篇資訊已完成，無法再留言。"
  };
  throw Error(messages[String(result.error)]||"操作失敗，請確認內容後再試。");
 }
 return result;
}
function BookArt({kind}:{kind:Kind}){return <div className={"books-art books-art-"+kind} aria-hidden="true"><span>{kind==="want"?"?":kind==="give"?"♡":kind==="sell"?"↗":"↔"}</span><span className="books-art-book">▰ ▰ ▰</span></div>}
export default function BooksPage(){
 const [demo,setDemo]=useState(true);
 const [invite,setInvite]=useState(()=>{try{return sessionStorage.getItem(INVITE_STORAGE)||""}catch{return ""}});
 const [access,setAccess]=useState(false);
 const [inviteInput,setInviteInput]=useState("");
 const [name,setName]=useState(()=>{try{return localStorage.getItem(NAME_STORAGE)||""}catch{return ""}});
 const [posts,setPosts]=useState<Post[]>(()=>readJson<{posts:Post[];comments:Comment[]}>(STORAGE,{posts:seed,comments:examples}).posts);
 const [comments,setComments]=useState<Comment[]>(()=>readJson<{posts:Post[];comments:Comment[]}>(STORAGE,{posts:seed,comments:examples}).comments);
 const [selected,setSelected]=useState<string|null>(null);
 const [filter,setFilter]=useState<"all"|Kind>("all");
 const [query,setQuery]=useState("");
 const [showForm,setShowForm]=useState(false);
 const [form,setForm]=useState<Form>(EMPTY);
 const [commentText,setCommentText]=useState("");
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{
  const previous=document.title;document.title="書友交換板｜媽媽友的小小交流角落";
  const meta=document.querySelector('meta[name="robots"]');
  const before=meta?.getAttribute("content")||"";
  meta?.setAttribute("content","noindex,nofollow");
  return()=>{document.title=previous;meta?.setAttribute("content",before)};
 },[]);
 useEffect(()=>{if(demo)try{localStorage.setItem(STORAGE,JSON.stringify({posts,comments}))}catch{/* optional preview storage */}},[demo,posts,comments]);
 useEffect(()=>{if(name)try{localStorage.setItem(NAME_STORAGE,name)}catch{/* optional */}},[name]);
 useEffect(()=>{if(!invite)return;let alive=true;
  setLoading(true);
  void api(invite).then(data=>{if(!alive)return;setPosts(data.posts);setDemo(false);setAccess(true);setError("");})
  .catch(e=>{if(alive){setDemo(true);setAccess(false);setError(e instanceof Error?e.message:"連線失敗")}})
  .finally(()=>{if(alive)setLoading(false)});
  return()=>{alive=false};
 },[invite]);
 const visible=useMemo(()=>posts.filter(post=>(filter==="all"||post.kind===filter)&&
  (post.title+" "+post.description+" "+post.author).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())),[posts,filter,query]);
 const selectedPost=selected?posts.find(p=>p.id===selected):undefined;
 async function refreshLive(code=invite){const data=await api(code);setPosts(data.posts);}
 async function join(event:React.FormEvent){event.preventDefault();const code=inviteInput.trim();if(!code)return;
  setLoading(true);setError("");
  try{const data=await api(code);sessionStorage.setItem(INVITE_STORAGE,code);setInvite(code);setPosts(data.posts);setDemo(false);setAccess(true);setSelected(null);setNotice("已進入群組交換板");}
  catch(e){setError(e instanceof Error?e.message:"無法加入");}
  finally{setLoading(false)}
 }
 function usePreview(){setDemo(true);setAccess(false);setInvite("");setError("");setNotice("目前是示範模式，資料只會留在這台裝置");setSelected(null);
  try{sessionStorage.removeItem(INVITE_STORAGE)}catch{/* optional */}
  const data=readJson(STORAGE,{posts:seed,comments:examples});setPosts(data.posts);setComments(data.comments);
 }
 async function publish(event:React.FormEvent){event.preventDefault();if(busy)return;
  const author=form.author.trim(),title=form.title.trim(),description=form.description.trim();
  if(author.length<2||author.length>20||title.length<2||title.length>80||description.length>600){setNotice("請確認暱稱、標題與內容長度");return}
  if(form.kind==="sell"&&(!/^\d+$/.test(form.price)||Number(form.price)>100000)){setNotice("出售價格請輸入 0–100000 元");return}
  setBusy(true);
  try{
   const price=form.kind==="sell"?Number(form.price):null;
   if(demo){const post:Post={id:crypto.randomUUID(),author,title,description,kind:form.kind,price,status:"open",createdAt:new Date().toISOString(),commentCount:0};
    setPosts(current=>[post,...current]);}
   else {
    const result=await api(invite,{action:"post",author,title,description,kind:form.kind,price});
    const tokens=ownerTokens();tokens[result.id]=result.ownerToken;localStorage.setItem(OWNER_STORAGE,JSON.stringify(tokens));
    await refreshLive();
   }
   setName(author);setShowForm(false);setForm({...EMPTY,author});setFilter("all");setQuery("");setNotice(demo?"已建立示範貼文（只存在本機）":"刊登成功，媽媽友們都能看見！");
  }catch(e){setNotice(e instanceof Error?e.message:"刊登失敗")}
  finally{setBusy(false)}
 }
 async function openComments(id:string){if(selected===id){setSelected(null);return}
  setSelected(id);setCommentText("");
  if(demo)return;
  try{const result=await api(invite,undefined,id);setComments(old=>[...old.filter(c=>c.postId!==id),...result.comments]);}
  catch(e){setNotice(e instanceof Error?e.message:"無法讀取留言")}
 }
 async function comment(event:React.FormEvent){event.preventDefault();if(!selectedPost||busy)return;
  const author=name.trim(),message=commentText.trim();if(author.length<2||author.length>20||!message||message.length>300){setNotice("請填寫 2–20 字暱稱和 1–300 字留言");return}
  setBusy(true);
  try{
   if(demo){setComments(old=>[...old,{id:crypto.randomUUID(),postId:selectedPost.id,author,message,createdAt:new Date().toISOString()}]);
    setPosts(old=>old.map(p=>p.id===selectedPost.id?{...p,commentCount:p.commentCount+1}:p));}
   else{await api(invite,{action:"comment",postId:selectedPost.id,author,message});const result=await api(invite,undefined,selectedPost.id);setComments(old=>[...old.filter(c=>c.postId!==selectedPost.id),...result.comments]);await refreshLive();}
   setCommentText("");setNotice(demo?"已送出示範留言":"留言成功");
  }catch(e){setNotice(e instanceof Error?e.message:"留言失敗")}
  finally{setBusy(false)}
 }
 async function changeStatus(post:Post,status:Status){if(busy)return;setBusy(true);
  try{
   if(demo)setPosts(old=>old.map(p=>p.id===post.id?{...p,status}:p));
   else{const token=ownerTokens()[post.id];if(!token)throw Error("找不到刊登憑證，請使用原本刊登的瀏覽器");
    await api(invite,{action:"status",postId:post.id,ownerToken:token,status});await refreshLive();}
   setNotice("狀態已更新");
  }catch(e){setNotice(e instanceof Error?e.message:"更新失敗")}
  finally{setBusy(false)}
 }
 return <div className="books-root">
  <div className="books-wrap">
   <header className="books-top"><a href="/" className="books-brand"><span className="books-logo">本</span><span>書友交換板<small>OUR LITTLE BOOK CIRCLE</small></span></a><span className="books-top-label">媽媽友的分享角落</span></header>
   <section className="books-hero"><div className="books-eyebrow"><span className="books-dot"/> 好書流動，友誼繼續</div>
    <h1>讀完的書，<br/><em>換個人繼續喜歡。</em></h1>
    <p>交換、贈送、出售，或許願找一本好書。讓媽媽友們的閒置好書，遇見下一位小讀者。</p>
    <div className="books-hero-actions"><button type="button" className="books-primary" onClick={()=>{setForm({...EMPTY,author:name});setShowForm(true)}}>＋ 我要分享一本書</button><span>簡單刊登，不用開商店</span></div>
    <div className="books-hero-ornament" aria-hidden="true"><span className="books-book-b1"/><span className="books-book-b2"/><span className="books-book-b3"/><span className="books-hero-spark">✳</span></div>
   </section>
   <div className={"books-mode "+(demo?"is-demo":"is-live")} role="status">
    <div><strong>{demo?"互動示範模式":"群組共用模式"}</strong><span>{demo?"貼文與留言只儲存在這台裝置，不會分享給其他人":"已通過邀請碼，刊登與留言會同步給同群組的朋友"}</span></div>
    <button type="button" onClick={()=>{if(demo){setAccess(true);setNotice("");}else usePreview()}}>{demo?"輸入邀請碼 →":"返回示範"}</button>
   </div>
   {access&&demo&&<form className="books-join" onSubmit={join}><label htmlFor="books-invite">群組邀請碼</label><div><input id="books-invite" type="password" value={inviteInput} onChange={e=>setInviteInput(e.target.value)} placeholder="請向群組管理員索取" autoComplete="off"/><button className="books-primary" disabled={loading}>{loading?"連線中":"加入群組"}</button></div><small>僅邀請的朋友能看到正式貼文，不會公開索引。</small>{error&&<p role="alert">{error}</p>}</form>}
   {!access&&error&&<p className="books-error" role="alert">{error}</p>}
   <section className="books-feed" aria-label="書友貼文">
    <div className="books-feed-heading"><div><span className="books-eyebrow">COMMUNITY BOARD</span><h2>看看大家分享什麼</h2><p>{demo?"這裡是可互動的範例資料":"群組裡最新的交換資訊"}</p></div><div className="books-feed-count">{visible.length}<small>則資訊</small></div></div>
    <div className="books-filter"><div className="books-chips">{KINDS.map(item=><button key={item.key} className={filter===item.key?"active":""} onClick={()=>setFilter(item.key)}>{item.label}</button>)}</div><label className="books-search"><span aria-hidden="true">⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜尋書名、內容或媽媽暱稱" aria-label="搜尋書籍"/></label></div>
    {loading&&!demo&&<div className="books-empty">正在讀取群組資訊…</div>}
    <div className="books-list">{visible.length?visible.map((post,index)=>{
      const own=demo||Boolean(ownerTokens()[post.id]);
      const expanded=selected===post.id;
      return <article className="books-card" key={post.id}>
       <div className="books-card-media"><BookArt kind={post.kind}/>{index===0&&post.status==="open"&&<span className="books-new">最新分享</span>}</div>
       <div className="books-card-content"><div className="books-card-meta"><span className="books-avatar">{post.author.slice(0,1)}</span><strong>{post.author}</strong><span>· {shortDate(post.createdAt)}</span></div><div className="books-tags"><span className={"books-kind books-kind-"+post.kind}>{names[post.kind]}</span><span className={"books-status books-status-"+post.status}>{statuses[post.status]}</span></div>
        <h3>{post.title}</h3><p>{post.description||"歡迎留言詢問更多資訊。"}</p>
        {post.kind==="sell"&&<div className="books-price">NT$ {post.price?.toLocaleString("zh-TW")}</div>}
        <div className="books-card-footer"><button onClick={()=>void openComments(post.id)} aria-expanded={expanded}>♡ 留言詢問 <span>{post.commentCount?post.commentCount:""}</span></button>{own&&<div className="books-owner"><label htmlFor={"books-status-"+post.id}>狀態</label><select id={"books-status-"+post.id} value={post.status} disabled={busy} onChange={e=>void changeStatus(post,e.target.value as Status)}><option value="open">開放中</option><option value="reserved">已保留</option><option value="closed">已完成</option></select></div>}</div>
       </div>
       {expanded&&<div className="books-comments"><h4>留言交流</h4>{comments.filter(c=>c.postId===post.id).map(c=><div className="books-comment" key={c.id}><div className="books-mini-avatar">{c.author.slice(0,1)}</div><div><strong>{c.author}</strong><p>{c.message}</p></div></div>)}{!comments.some(c=>c.postId===post.id)&&<p className="books-comment-empty">還沒有留言，來打個招呼吧。</p>}{post.status!=="closed"?<form onSubmit={comment}><input aria-label="留言暱稱" value={name} maxLength={20} onChange={e=>setName(e.target.value)} placeholder="你的暱稱"/><textarea aria-label="留言內容" value={commentText} maxLength={300} onChange={e=>setCommentText(e.target.value)} placeholder="想問書況、交換方式……" rows={2}/><button className="books-primary" disabled={busy}>送出留言</button></form>:<p className="books-comment-empty">這篇已完成，留言已關閉。</p>}</div>}
      </article>
    }):<div className="books-empty"><strong>這裡還沒有符合的資訊</strong><p>換個搜尋條件，或成為第一個分享的人。</p><button onClick={()=>setShowForm(true)}>＋ 我要刊登</button></div>}</div>
   </section>
   <div className="books-bottom"><div><strong>一本書不只一個故事。</strong><p>下一段故事，或許就從你的分享開始。</p></div><button className="books-primary" onClick={()=>{setForm({...EMPTY,author:name});setShowForm(true)}}>分享一本書 →</button></div>
   <footer className="books-footer">書友交換板 · 小圈圈試用中 <a href="/">返回 Crew</a><span>請勿公開電話、住址或交易帳號，交易細節請自行確認。</span></footer>
  </div>
  {notice&&<div className="books-toast" role="status">{notice}<button onClick={()=>setNotice("")} aria-label="關閉提示">×</button></div>}
  {showForm&&<div className="books-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setShowForm(false)}}><section className="books-dialog" role="dialog" aria-modal="true" aria-labelledby="books-dialog-title"><div className="books-dialog-head"><div><span className="books-eyebrow">SHARE A BOOK</span><h2 id="books-dialog-title">分享一本好書</h2></div><button onClick={()=>setShowForm(false)} aria-label="關閉">×</button></div><form onSubmit={publish}>
   <label>分享類型<div className="books-form-kinds">{KINDS.filter(k=>k.key!=="all").map(k=><button type="button" key={k.key} className={form.kind===k.key?"active":""} onClick={()=>setForm(old=>({...old,kind:k.key as Kind,price:""}))}>{k.label}</button>)}</div></label>
   <label>媽媽暱稱 <span>必填</span><input required minLength={2} maxLength={20} value={form.author} onChange={e=>setForm(old=>({...old,author:e.target.value}))} placeholder="例如：安安媽媽"/></label>
   <label>書名 / 主題 <span>必填</span><input required minLength={2} maxLength={80} value={form.title} onChange={e=>setForm(old=>({...old,title:e.target.value}))} placeholder="例如：英文繪本三本"/></label>
   <label>補充說明 <span>選填</span><textarea maxLength={600} rows={4} value={form.description} onChange={e=>setForm(old=>({...old,description:e.target.value}))} placeholder="書況、適合年齡、交換希望…（請勿寫個人聯絡資訊）"/></label>
   {form.kind==="sell"&&<label>出售價格（台幣） <span>必填</span><input required inputMode="numeric" pattern="[0-9]+" value={form.price} onChange={e=>setForm(old=>({...old,price:e.target.value}))} placeholder="300"/></label>}
   <p className="books-form-note">{demo?"示範貼文只會保存在目前裝置。":"正式貼文將出現在群組裡；請使用同一瀏覽器修改狀態。"}</p>
   <button className="books-primary books-submit" disabled={busy}>{busy?"刊登中…":"確認刊登"}</button>
  </form></section></div>}
 </div>;
}
