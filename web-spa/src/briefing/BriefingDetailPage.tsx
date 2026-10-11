import {useEffect,useState} from "react";
import {Link,useParams} from "react-router-dom";
import {fetchDay} from "./data";
import {getRepoPulse,relatedCommits,type RepoPulse} from "./github";
import {agentPrompt,downloadText,getStatus,readReviews,socialDraft,updateReview} from "./storage";
import type {BriefingItem,LocalReview,ReviewStatus} from "./types";
const STATUSES:[ReviewStatus,string][]=[["unread","未處理"],["reading","正在閱讀"],["researching","研究中"],["delegated","已交給 Agent"],["adopted","已採用"],["dismissed","暫不採用"]];
function safeSource(url:string){try{const u=new URL(url);return u.protocol==="https:"?u.href:null}catch{return null}}
export function BriefingDetailPage(){
 const {date="",id=""}=useParams(),[item,setItem]=useState<BriefingItem|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 const[review,setReview]=useState<LocalReview>(()=>readReviews()[id]||{}),[pulse,setPulse]=useState<RepoPulse[]>([]),[githubLoading,setGithubLoading]=useState(false),[editor,setEditor]=useState(false),[draft,setDraft]=useState(""),[toast,setToast]=useState("");
 useEffect(()=>{setReview(readReviews()[id]||{});let alive=true;setLoading(true);setError("");fetchDay(date).then(day=>{if(!alive)return;const found=day.items.find(x=>x.id===id);if(!found)throw Error("找不到這則報告");setItem(found);setDraft(readReviews()[id]?.draft||socialDraft(found));setLoading(false);if(getStatus(readReviews()[id])==="unread"){updateReview(id,{status:"reading"});setReview(readReviews()[id])}}).catch(e=>{if(alive){setLoading(false);setError(String(e))}});return()=>{alive=false}},[date,id]);
 function change(patch:Partial<LocalReview>){const next=updateReview(id,patch);setReview(next[id])}
 async function copy(text:string){try{await navigator.clipboard.writeText(text);setToast("已複製到剪貼簿")}catch{setToast("無法存取剪貼簿，請改用下載。")}}
 async function github(){setGithubLoading(true);try{setPulse(await getRepoPulse());}finally{setGithubLoading(false)}}
 if(loading)return <div className="briefing briefing-empty">載入報告中…</div>;
 if(!item)return <div className="briefing briefing-empty"><p>{error||"找不到這則報告"}</p><Link to="/briefing">回報告首頁</Link></div>;
 const commits=relatedCommits(item.title,item.projects,pulse);
 return <article className="briefing briefing-detail">
  <nav className="briefing-breadcrumb"><Link to="/briefing">每日報告</Link> / <Link to="/briefing">{date}</Link> / 詳情</nav>
  <div className="briefing-detail-head"><span className="briefing-topic">{item.topic}</span><h1>{item.title}</h1><p>{item.summary}</p><div className="briefing-tags">{item.projects.map(p=><span key={p}>{p}</span>)}</div></div>
  <div className="briefing-detail-grid"><main>
   <section className="briefing-section"><h2>為什麼值得研究</h2><p>{item.relevance}</p></section>
   {item.body&&<section className="briefing-section"><h2>研究摘要</h2>{item.body.split(/\n\n+/).map((paragraph,i)=><p key={i}>{paragraph}</p>)}</section>}
   <section className="briefing-section"><h2>下一步的研究任務</h2><ol>{item.actions.map((action,i)=><li key={i}>{action}</li>)}</ol></section>
   <section className="briefing-section"><h2>原始來源</h2>{item.sources.length?item.sources.map((source,i)=>{const href=safeSource(source.url);return <div className="briefing-source" key={i}>{href?<a href={href} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>:<span>{source.title}</span>}<small>{source.publishedAt||""} · {source.kind||"資料來源"}</small></div>}):<p>未附上可驗證的來源，請勿直接採用。</p>}</section>
   <section className="briefing-section"><div className="briefing-section-head"><h2>與 GitHub 進度核對</h2><button className="btn secondary small" disabled={githubLoading} onClick={()=>void github()}>{githubLoading?"讀取中…":"檢查公開 Commits"}</button></div><p className="meta">只比對公開 repo、標題和 commit 訊息；結果是線索，不代表功能已經實作。</p>{pulse.length>0&&(commits.length?commits.map(c=><a className="briefing-source" target="_blank" rel="noopener noreferrer" href={c.url} key={c.url}><b>{c.repo.split("/")[1]} · {c.sha}</b><span>{c.message}</span></a>):<p className="meta">目前沒找到文字相近的 commit，不能據此判斷尚未實作。</p>)}</section>
   <section className="briefing-section"><div className="briefing-section-head"><h2>Crew Lab SI 文章草稿</h2><button className="btn secondary small" onClick={()=>{setEditor(v=>!v);setDraft(review.draft||socialDraft(item))}}>{editor?"關閉編輯":"編輯草稿"}</button></div><p className="meta">預設只存在此瀏覽器。發布前請人工補上實驗證據與個人觀點，不會自動發到社群。</p>{editor&&<><textarea className="briefing-draft" value={draft} onChange={e=>setDraft(e.target.value)} aria-label="社群文章草稿"/><div className="briefing-actions"><button className="btn" onClick={()=>{change({draft});setToast("草稿已保存在本機")}}>儲存草稿</button><button className="btn secondary" onClick={()=>void copy(draft)}>複製文案</button><button className="btn secondary" onClick={()=>downloadText("crew-lab-si-"+date+".md",draft)}>下載 Markdown</button></div></>}</section>
  </main>
  <aside className="briefing-detail-aside"><div className="briefing-action-panel"><h3>研究工作台</h3><label>處理進度</label><select value={getStatus(review)} onChange={e=>change({status:e.target.value as ReviewStatus})}>{STATUSES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><button className="btn secondary" onClick={()=>change({saved:!review.saved})}>{review.saved?"★ 取消收藏":"☆ 收藏研究"}</button><label>個人筆記</label><textarea value={review.notes||""} onChange={e=>change({notes:e.target.value})} placeholder="記下想驗證的假設或下一步…" rows={5}/><button className="btn" onClick={()=>{change({status:"delegated"});void copy(agentPrompt(item))}}>複製 Agent 研究 Prompt</button><button className="btn secondary" onClick={()=>downloadText("crew-agent-"+date+".md",agentPrompt(item))}>下載任務 Prompt</button><p className="meta">複製後可貼給 Crew Pocket / Crew Deck。此頁不會假裝已自動送達 Agent。</p>{toast&&<p className="briefing-toast" role="status">{toast}</p>}</div></aside></div>
 </article>
}
