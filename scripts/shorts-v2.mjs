/**
 * Versioned, paginated public archive. Existing /posts.json remains a legacy
 * latest-100 contract for already installed Android clients.
 * All paths are first-party and media bytes stay outside the JavaScript bundle.
 */
export const SHORTS_PAGE_SIZE=50;
export const SHORTS_V2_ROOT="/features/teacher/shorts/v2";
const safeId=id=>typeof id==="string"&&/^[a-zA-Z0-9][\w-]{2,95}$/.test(id);
export function createShortsArchive(posts,{source="daily",generatedAt=""}={}){
 if(!Array.isArray(posts))throw Error("Shorts archive requires posts");
 const ordered=[...posts].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||a.id.localeCompare(b.id));
 const unique=new Set(),lookup={},pages=[],descriptors=[];
 for(const post of ordered){
  if(!safeId(post.id)||unique.has(post.id))throw Error("Invalid or duplicate archive post: "+post.id);
  unique.add(post.id);
 }
 const count=Math.ceil(ordered.length/SHORTS_PAGE_SIZE);
 for(let i=0;i<count;i++){
  const file=String(i+1).padStart(5,"0")+".json";
  const url=SHORTS_V2_ROOT+"/pages/"+file;
  const slice=ordered.slice(i*SHORTS_PAGE_SIZE,(i+1)*SHORTS_PAGE_SIZE);
  const nextPage=i+1<count?SHORTS_V2_ROOT+"/pages/"+String(i+2).padStart(5,"0")+".json":null;
  for(const post of slice)lookup[post.id]=url;
  descriptors.push({url,count:slice.length});
  pages.push({file,url,data:{schema:2,kind:"crew-short-page",source,generatedAt,posts:slice,nextPage}});
 }
 return {index:{schema:2,kind:"crew-short-index",source,generatedAt,total:ordered.length,pageSize:SHORTS_PAGE_SIZE,pages:descriptors,lookup},pages};
}
