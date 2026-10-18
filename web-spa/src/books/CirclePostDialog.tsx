import type {Dispatch,FormEvent,SetStateAction} from "react";
import {CirclePhotoStrip,MAX_PHOTOS} from "./CirclePhotos";
type Kind="swap"|"sell"|"give"|"want"|"share"|"ask";
type Category="books"|"toys"|"school"|"clothes"|"events"|"life"|"other";
type Form={author:string;title:string;description:string;kind:Kind;category:Category;price:string};
type Option<T>={key:T;label:string};
export function CirclePostDialog({editing,form,setForm,busy,files,setFiles,setNotice,invite,demo,currentPhotoIds,onPhotoDelete,onClose,onPublish,kinds,categories}:{
 editing:string|null;form:Form;setForm:Dispatch<SetStateAction<Form>>;busy:boolean;
 files:File[];setFiles:Dispatch<SetStateAction<File[]>>;setNotice:(text:string)=>void;
 invite:string;demo:boolean;currentPhotoIds:string[];onPhotoDelete:(id:string)=>void;
 onClose:()=>void;onPublish:(event:FormEvent)=>void|Promise<void>;
 kinds:Option<"all"|Kind>[];categories:Option<"all"|Category>[];
}){
 return <div className="books-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="books-dialog" role="dialog" aria-modal="true" aria-labelledby="books-dialog-title"><div className="books-dialog-head"><div><span className="books-eyebrow">POST TO CIRCLE</span><h2 id="books-dialog-title">{editing?"編輯貼文":"發一則消息"}</h2></div><button onClick={()=>onClose()} aria-label="關閉">×</button></div><form onSubmit={onPublish}>
   <label>交流主題<select required className="books-topic-select" value={form.category} onChange={e=>setForm(old=>({...old,category:e.target.value as Category}))}>{categories.filter(c=>c.key!=="all").map(c=><option key={c.key} value={c.key}>{c.label}</option>)}</select></label>
   <label>貼文目的<div className="books-form-kinds">{kinds.filter(k=>k.key!=="all").map(k=><button type="button" key={k.key} className={form.kind===k.key?"active":""} onClick={()=>setForm(old=>({...old,kind:k.key as Kind,price:""}))}>{k.label}</button>)}</div></label>
   <label>媽媽暱稱 <span>必填</span><input required minLength={2} maxLength={20} value={form.author} onChange={e=>setForm(old=>({...old,author:e.target.value}))} placeholder="例如：安安媽媽"/></label>
   <label>標題 <span>必填</span><input required minLength={2} maxLength={80} value={form.title} onChange={e=>setForm(old=>({...old,title:e.target.value}))} placeholder="例如：週末親子活動推薦"/></label>
   <label>補充說明 <span>選填</span><textarea maxLength={600} rows={4} value={form.description} onChange={e=>setForm(old=>({...old,description:e.target.value}))} placeholder="想分享或詢問什麼？（請勿公開個人聯絡資訊）"/></label>
   {form.kind==="sell"&&<label>出售價格（台幣） <span>必填</span><input required inputMode="numeric" pattern="[0-9]+" value={form.price} onChange={e=>setForm(old=>({...old,price:e.target.value}))} placeholder="300"/></label>}
   <label>附加照片（最多 {MAX_PHOTOS} 張） <span>選填</span><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple
      onChange={e=>{const items=Array.from(e.target.files||[]);const remaining=MAX_PHOTOS-(editing?(currentPhotoIds.length||0):0);
       if(items.length>remaining)setNotice("這篇最多可有三張照片；已先選取允許的數量");
       setFiles(items.slice(0,Math.max(0,remaining)));}}/>
      {files.length>0&&<small>{files.map(file=>file.name).join("、")}</small>}
   </label>
   {editing&&!demo&&Boolean(currentPhotoIds.length)&&<div className="books-edit-photos">
     <strong>目前照片（按 × 可刪除）</strong>
     <CirclePhotoStrip invite={invite} postId={editing} photoIds={currentPhotoIds}
       editable onDelete={id=>{void onPhotoDelete(id);}}/>
   </div>}
   <p className="books-form-note">{demo?"示範模式只保留文字，照片不會儲存。":"正式貼文會同步到群組。照片會先縮圖並去除 EXIF 位置資訊；請使用原本瀏覽器修改。"}</p>
   <button className="books-primary books-submit" disabled={busy}>{busy?"儲存中…":editing?"儲存修改":"發布貼文"}</button>
  </form></section></div>;
}
