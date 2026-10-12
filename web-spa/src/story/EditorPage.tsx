import{useEffect,useState}from"react";import{useTranslation}from"react-i18next";import{useNavigate,useParams}from"react-router-dom";import{builtInStory,StoryBook}from"./catalog";import{ensureStoryServices}from"../lib/runtime";

const EMOTIONS=["warm","excited","mysterious","joyful","dramatic","whisper","tender"] as const;

export function StoryEditorPage(){
 const {t}=useTranslation("story");
 const{id=""}=useParams(),nav=useNavigate(),[book,setBook]=useState<StoryBook|null|undefined>(undefined),[index,setIndex]=useState(0),[saving,setSaving]=useState(false);
 useEffect(()=>{void ensureStoryServices().then(async()=>{const key=decodeURIComponent(id),stored=await window.CrewStoryStore!.get(key),builtin=builtInStory(key);const src=(stored||builtin) as StoryBook|null;if(!src){setBook(null);return}const clone=JSON.parse(JSON.stringify(src));if(clone.sourceType==="built-in"){clone.id=window.CrewDB.id("story");clone.title=clone.title+t("editor.copySuffix");clone.sourceType="user";clone.createdAt=new Date().toISOString()}clone.pages=clone.pages?.length?clone.pages:[{text:"",emotion:"warm",characterName:"",dialogue:"",imageIndex:-1}];setBook(clone)})},[id]);
 if(book===undefined)return <div className="spa-loading">{t("editor.loading")}</div>;
 if(!book)return <div className="story-empty">{t("editor.notFound")}</div>;
 const current=book;
 const page=current.pages[index]||{text:""};
 const patchBook=(patch:Partial<StoryBook>)=>setBook({...current,...patch});
 const patchPage=(patch:any)=>{const pages=current.pages.slice();pages[index]={...pages[index],...patch};setBook({...current,pages})};
 const addPage=()=>{const pages=current.pages.concat([{text:"",emotion:"warm",characterName:"",dialogue:"",imageIndex:-1}]);setBook({...current,pages});setIndex(pages.length-1)};
 const removePage=()=>{if(current.pages.length<=1)return;const pages=current.pages.filter((_,i)=>i!==index);setBook({...current,pages});setIndex(Math.min(index,pages.length-1))};
 async function chooseImage(file?:File){if(!file)return;await ensureStoryServices();const img=await window.CrewLiveUI?.prepareImage(file,{maxSide:1600,quality:.84});if(!img)return;const images=(current.images||[]).slice();images.push(img);patchBook({images,pages:current.pages.map((p,i)=>i===index?{...p,imageIndex:images.length-1}:p)})}
 async function save(){setSaving(true);try{await window.CrewStoryStore!.save({...current,readingMode:current.readingMode||"generated"} as any);nav("/story/read/"+encodeURIComponent(current.id))}finally{setSaving(false)}}
 const image=(current.images||[])[Number(page.imageIndex)];
 return <><section className="hero"><span className="kicker">{t("editor.kicker")}</span><h1>{t("editor.title")}</h1><p>{t("editor.intro")}</p></section>
 <section className="story-editor section">
  <div className="story-editor-meta panel"><label className="label">{t("editor.name")}</label><input className="field" value={current.title||""} onChange={e=>patchBook({title:e.target.value})}/><label className="label">{t("editor.summary")}</label><textarea className="field" value={current.summary||""} onChange={e=>patchBook({summary:e.target.value})}/></div>
  <div className="story-editor-main">
   <aside className="story-filmstrip">{current.pages.map((p,i)=>{const im=(current.images||[])[Number(p.imageIndex)];return <button className={i===index?"active":""} key={i} onClick={()=>setIndex(i)}>{im?<img src={im.preview}/>:<span>{i+1}</span>}<small>{i+1}</small></button>})}<button className="add" aria-label={t("editor.addPage")} onClick={addPage}>＋</button></aside>
   <section className="panel story-page-editor"><div className="section-head"><h2>{t("editor.page",{page:index+1})}</h2><button className="btn danger small" disabled={current.pages.length<=1} onClick={removePage}>{t("editor.deletePage")}</button></div>
    <div className="story-editor-image">{image?<img src={image.preview}/>:<div className="story-empty">{t("editor.noImage")}</div>}<label className="btn secondary small">{t("editor.choosePhoto")}<input type="file" accept="image/*" hidden onChange={e=>void chooseImage(e.target.files?.[0])}/></label></div>
    <label className="label">{t("editor.pageText")}</label><textarea className="field" value={page.text||""} onChange={e=>patchPage({text:e.target.value})}/>
    <div className="two"><label><span className="label">{t("editor.character")}</span><input className="field" value={page.characterName||""} onChange={e=>patchPage({characterName:e.target.value})}/></label><label><span className="label">{t("editor.emotion")}</span><select className="field" value={page.emotion||"warm"} onChange={e=>patchPage({emotion:e.target.value})}>{EMOTIONS.map(emotion=><option key={emotion} value={emotion}>{t("editor.emotions."+emotion)}</option>)}</select></label></div>
    <label className="label">{t("editor.dialogue")}</label><textarea className="field" value={page.dialogue||""} onChange={e=>patchPage({dialogue:e.target.value})}/>
   </section>
  </div>
  <div className="actions"><button className="btn" disabled={saving} onClick={()=>void save()}>{saving?t("editor.saving"):t("editor.save")}</button><button className="btn secondary" onClick={()=>nav(-1)}>{t("editor.cancel")}</button></div>
 </section></>
}