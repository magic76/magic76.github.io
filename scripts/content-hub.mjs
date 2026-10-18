/**
 * Crew Content Hub v2 metadata contract (no runtime service or database).
 * Publication remains owned by the existing research/Shorts pipelines.
 */
export const CONTENT_SCHEMA=2;
export const CONTENT_TYPES=["article","moment"];
export const CONTENT_STATES=["draft","review","approved","scheduled","published","archived"];
const safeId=value=>typeof value==="string"&&/^[A-Za-z0-9][\w-]{2,95}$/.test(value);
const safeUrl=value=>typeof value==="string"&&(/^\/(?!\/)(?!.*\.\.)[^\s]*$/.test(value)||/^https:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/i.test(value));
export function validateMediaAsset(asset){
 if(!asset||!["image","video"].includes(asset.type)||!safeId(asset.assetId)||!safeUrl(asset.url))
  throw Error("Invalid content media asset");
 if(asset.type==="video"){
  if(asset.posterUrl!==undefined&&!safeUrl(asset.posterUrl))throw Error("Unsafe video poster");
  if(asset.durationSec!==undefined&&(!Number.isFinite(asset.durationSec)||asset.durationSec<=0))throw Error("Invalid video duration");
 }
 return asset;
}
export function validateContentRecord(value){
 if(!value||value.schema!==CONTENT_SCHEMA||!CONTENT_TYPES.includes(value.type)||!CONTENT_STATES.includes(value.status)||!safeId(value.id))
  throw Error("Invalid Crew Content Hub record");
 if(typeof value.publishedAt!=="string"||!Number.isFinite(Date.parse(value.publishedAt)))
  throw Error("Missing or invalid content publication time");
 if(!value.locales||typeof value.locales!=="object"||!Object.values(value.locales).some(x=>typeof x==="string"&&x.trim()))
  throw Error("Missing localized content");
 if(!Array.isArray(value.media))throw Error("Missing content media array");
 for(const asset of value.media)validateMediaAsset(asset);
 if(value.type==="moment"&&!safeId(value.authorId))throw Error("Missing moment author");
 return value;
}
export function asMomentRecord(post,status){
 const src=post.image;
 const record={schema:2,type:"moment",id:post.id,status,publishedAt:post.publishedAt,authorId:post.friendId,
  storyId:post.storyId,locales:{[post.language]:post.caption,...(post.translationZh?{"zh-TW":post.translationZh}:{})},
  media:src?[{type:"image",assetId:post.id,url:src.startsWith("media/")?"/content/crew-shorts/approved/"+src:src}]:[]};
 return validateContentRecord(record);
}
export function asArticleRecord(item,day){
 const record={schema:2,type:"article",id:"research-"+day+"-"+item.id,status:"published",
  publishedAt:item.publishedAt,locales:{zh:item.title},media:[]};
 return validateContentRecord(record);
}
export function transitionContent(record,to){
 validateContentRecord(record);
 const allowed={draft:["review"],review:["draft","approved"],approved:["review","scheduled","published"],scheduled:["review","published"],published:["archived"],archived:["published"]};
 if(!allowed[record.status]?.includes(to))throw Error("Disallowed content transition "+record.status+" -> "+to);
 return validateContentRecord({...record,status:to});
}
