import{useEffect,useState}from"react";import{useNavigate,useParams}from"react-router-dom";import{builtInStory,StoryBook}from"./catalog";import{ensureStoryServices}from"../lib/runtime";

const EMOTIONS=[["warm","溫暖"],["excited","興奮"],["mysterious","神秘"],["joyful","開心"],["dramatic","戲劇"],["whisper","輕聲"],["tender","柔和"]];

export function StoryEditorPage(){
 const{id=""}=useParams(),nav=useNavigate(),[book,setBook]=useState<StoryBook|null|undefined>(undefined),[index,setIndex]=useState(0),[saving,setSaving]=useState(false);
 useEffect(()=>{void ensureStoryServices().then(async()=>{const key=decodeURIComponent(id),stored=await window.CrewStoryStore!.get(key),builtin=builtInStory(key);const src=(stored||builtin) as StoryBook|null;if(!src){setBook(null);return}const clone=JSON.parse(JSON.stringify(src));if(clone.sourceType==="built-in"){clone.id=window.CrewDB.id("story");clone.title=clone.title+"（我的版本）";clone.sourceType="user";clone.createdAt=new Date().toISOString()}clone.pages=clone.pages?.length?clone.pages:[{text:"",emotion:"warm",characterName:"",dialogue:"",imageIndex:-1}];setBook(clone)})},[id]);
 if(book===undefined)return <div className="spa-loading">正在打開編輯器…</div>;
 if(!book)return <div className="story-empty">找不到這本故事。</div>;
 const current=book;
 const page=current.pages[index]||{text:""};
 const patchBook=(patch:Partial<StoryBook>)=>setBook({...current,...patch});
 const patchPage=(patch:any)=>{const pages=current.pages.slice();pages[index]={...pages[index],...patch};setBook({...current,pages})};
 const addPage=()=>{const pages=current.pages.concat([{text:"",emotion:"warm",characterName:"",dialogue:"",imageIndex:-1}]);setBook({...current,pages});setIndex(pages.length-1)};
 const removePage=()=>{if(current.pages.length<=1)return;const pages=current.pages.filter((_,i)=>i!==index);setBook({...current,pages});setIndex(Math.min(index,pages.length-1))};
 async function chooseImage(file?:File){if(!file)return;await ensureStoryServices();const img=await window.CrewLiveUI?.prepareImage(file,{maxSide:1600,quality:.84});if(!img)return;const images=(current.images||[]).slice();images.push(img);patchBook({images,pages:current.pages.map((p,i)=>i===index?{...p,imageIndex:images.length-1}:p)})}
 async function save(){setSaving(true);try{await window.CrewStoryStore!.save({...current,readingMode:current.readingMode||"generated"} as any);nav("/story/read/"+encodeURIComponent(current.id))}finally{setSaving(false)}}
 const image=(current.images||[])[Number(page.imageIndex)];
 return <><section className="hero"><span className="kicker">Story editor</span><h1>編輯繪本</h1><p>和 APK 一樣，以「一頁」為單位調整旁白、角色、對話、情緒與圖片。</p></section>
 <section className="story-editor section">
  <div className="story-editor-meta panel"><label className="label">故事名稱</label><input className="field" value={current.title||""} onChange={e=>patchBook({title:e.target.value})}/><label className="label">一句話介紹</label><textarea className="field" value={current.summary||""} onChange={e=>patchBook({summary:e.target.value})}/></div>
  <div className="story-editor-main">
   <aside className="story-filmstrip">{current.pages.map((p,i)=>{const im=(current.images||[])[Number(p.imageIndex)];return <button className={i===index?"active":""} key={i} onClick={()=>setIndex(i)}>{im?<img src={im.preview}/>:<span>{i+1}</span>}<small>{i+1}</small></button>})}<button className="add" onClick={addPage}>＋</button></aside>
   <section className="panel story-page-editor"><div className="section-head"><h2>第 {index+1} 頁</h2><button className="btn danger small" disabled={current.pages.length<=1} onClick={removePage}>刪除此頁</button></div>
    <div className="story-editor-image">{image?<img src={image.preview}/>:<div className="story-empty">這一頁還沒有圖片</div>}<label className="btn secondary small">選擇本機相片<input type="file" accept="image/*" hidden onChange={e=>void chooseImage(e.target.files?.[0])}/></label></div>
    <label className="label">這一頁發生了什麼？</label><textarea className="field" value={page.text||""} onChange={e=>patchPage({text:e.target.value})}/>
    <div className="two"><label><span className="label">角色</span><input className="field" value={page.characterName||""} onChange={e=>patchPage({characterName:e.target.value})}/></label><label><span className="label">說故事的感覺</span><select className="field" value={page.emotion||"warm"} onChange={e=>patchPage({emotion:e.target.value})}>{EMOTIONS.map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></label></div>
    <label className="label">角色台詞</label><textarea className="field" value={page.dialogue||""} onChange={e=>patchPage({dialogue:e.target.value})}/>
   </section>
  </div>
  <div className="actions"><button className="btn" disabled={saving} onClick={()=>void save()}>{saving?"儲存中…":"儲存故事"}</button><button className="btn secondary" onClick={()=>nav(-1)}>取消</button></div>
 </section></>
}