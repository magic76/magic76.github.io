import {useEffect,useState} from "react";

const PHOTO_API="/api/circle/photo";
export const MAX_PHOTOS=3;
export const MAX_IMAGE_BYTES=750*1024;
export async function preparePhoto(file:File):Promise<Blob>{
 if(!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)||file.size>12*1024*1024)
  throw Error("請選擇 12 MB 以下的照片（JPEG、PNG、WebP，或支援的 HEIC）");
 const bitmap=await createImageBitmap(file).catch(()=>{throw Error("無法讀取這張照片，請先轉成 JPEG 再試")});
 try{
  const scale=Math.min(1,1280/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext("2d");if(!ctx)throw Error("瀏覽器無法處理圖片");
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const encode=(type:string,quality:number)=>new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,type,quality));
  // Re-encoding strips original EXIF, including geolocation metadata.
  for(const quality of [.8,.65,.5,.35]){
   const blob=await encode("image/webp",quality);
   if(blob?.type==="image/webp"&&blob.size<=MAX_IMAGE_BYTES)return blob;
  }
  for(const quality of [.75,.55,.4]){
   const blob=await encode("image/jpeg",quality);
   if(blob?.type==="image/jpeg"&&blob.size<=MAX_IMAGE_BYTES)return blob;
  }
  throw Error("圖片壓縮後仍太大，請選另一張照片");
 }finally{bitmap.close();}
}
export async function uploadPhoto(invite:string,postId:string,token:string,file:File){
 const bytes=await preparePhoto(file);
 const response=await fetch(PHOTO_API,{method:"POST",headers:{
  "Content-Type":bytes.type,"x-crew-books-invite":invite,
  "x-crew-circle-post-id":postId,"x-crew-circle-owner-token":token
 },body:bytes});
 const payload=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(
  payload.error==="IMAGES_NOT_CONFIGURED"?"管理員尚未設定 R2 圖片空間":
  payload.error==="MEDIA_SCHEMA_REQUIRED"?"圖片資料表尚未建立，請執行 0003 migration":
  payload.error==="PHOTO_LIMIT"?"每篇最多上傳三張圖片":"照片上傳失敗，請稍後再試"
 );
 return payload.photoId as string;
}
export async function removePhoto(invite:string,postId:string,token:string,photoId:string){
 const response=await fetch(PHOTO_API+"?photoId="+encodeURIComponent(photoId),{
  method:"DELETE",headers:{"x-crew-books-invite":invite,
   "x-crew-circle-post-id":postId,"x-crew-circle-owner-token":token}
 });
 if(!response.ok)throw Error("無法刪除照片");
}
export function CirclePhotoStrip({invite,postId,photoIds,editable=false,onDelete}:{
 invite:string;postId:string;photoIds:string[];editable?:boolean;onDelete?:(id:string)=>void
}){
 const [urls,setUrls]=useState<{id:string;url:string}[]>([]);
 const joined=photoIds.join(",");
 useEffect(()=>{
  if(!invite||!photoIds.length){setUrls([]);return;}
  const controller=new AbortController();const local:string[]=[];
  void Promise.all(photoIds.slice(0,MAX_PHOTOS).map(async id=>{
   try{
    const res=await fetch(PHOTO_API+"?postId="+encodeURIComponent(postId)+"&photoId="+encodeURIComponent(id),{
      headers:{"x-crew-books-invite":invite},signal:controller.signal
    });
    if(!res.ok)return null;
    const url=URL.createObjectURL(await res.blob());local.push(url);return {id,url};
   }catch{return null;}
  })).then(data=>{if(!controller.signal.aborted)setUrls(data.filter((x):x is {id:string;url:string}=>Boolean(x)))});
  return()=>{controller.abort();local.forEach(url=>URL.revokeObjectURL(url))};
 },[invite,postId,joined]);
 if(!urls.length)return null;
 return <div className="books-photo-strip" aria-label="貼文照片">{urls.map(({id,url},index)=>
  <div className="books-photo-item" key={id}><img src={url} alt={"貼文照片 "+(index+1)} loading="lazy"/>
   {editable&&onDelete&&<button type="button" aria-label="移除照片" onClick={()=>onDelete(id)}>×</button>}
  </div>)}</div>;
}
