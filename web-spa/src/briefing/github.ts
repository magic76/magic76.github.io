export type RepoPulse = {repo:string;sha:string;message:string;date:string;url:string};
const REPOS=["magic76/crew-pocket","magic76/crew-teacher","magic76/crew-story","magic76/crew-fortune","magic76/magic76.github.io"];
export async function getRepoPulse(days=7):Promise<RepoPulse[]> {
 const since=new Date(Date.now()-days*86400000).toISOString();
 const results=await Promise.allSettled(REPOS.map(async repo=>{
  const r=await fetch(`https://api.github.com/repos/${repo}/commits?since=${encodeURIComponent(since)}&per_page=8`,{headers:{Accept:"application/vnd.github+json"}});
  if(!r.ok)throw Error("GitHub rate limit / unavailable");
  const data:unknown=await r.json();
  if(!Array.isArray(data))throw Error("Invalid GitHub response");
  return data.map((entry:any)=>({repo,sha:String(entry.sha||"").slice(0,7),message:String(entry.commit?.message||"").split("\n")[0],date:entry.commit?.committer?.date||"",url:String(entry.html_url||"")})) as RepoPulse[];
 }));
 return results.flatMap(x=>x.status==="fulfilled"?x.value:[]).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20);
}
export function relatedCommits(title:string,projects:string[],commits:RepoPulse[]):RepoPulse[] {
 const projectTerms=projects.map(p=>p.toLowerCase().replace("crew ",""));
 const terms=title.toLowerCase().match(/[a-z]{4,}/g)||[];
 return commits.filter(x=>projectTerms.some(p=>x.repo.toLowerCase().includes(p))&&(terms.some(t=>x.message.toLowerCase().includes(t)))).slice(0,5);
}
