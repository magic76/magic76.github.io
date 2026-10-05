export type PhrasebookItem={id:string;phrase:string;translation?:string;note?:string;source?:string;createdAt:string};
const KEY="crew_teacher_phrasebook_v1";
export function phrasebookItems():PhrasebookItem[]{try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return[]}}
function save(items:PhrasebookItem[]){localStorage.setItem(KEY,JSON.stringify(items.slice(0,200)))}
export function phrasebookId(phrase:string,translation=""){return(phrase+"|"+translation).trim().toLowerCase()}
export function hasPhrase(phrase:string,translation=""){const id=phrasebookId(phrase,translation);return phrasebookItems().some(x=>x.id===id)}
export function togglePhrase(item:Omit<PhrasebookItem,"id"|"createdAt">){
 const id=phrasebookId(item.phrase,item.translation||""),items=phrasebookItems(),i=items.findIndex(x=>x.id===id);
 if(i>=0){items.splice(i,1);save(items);return false}
 items.unshift({...item,id,createdAt:new Date().toISOString()});save(items);return true
}
export function addPhrases(items:Array<Omit<PhrasebookItem,"id"|"createdAt">>){
 const current=phrasebookItems(),seen=new Set(current.map(x=>x.id));
 for(const item of items){const id=phrasebookId(item.phrase,item.translation||"");if(seen.has(id))continue;current.unshift({...item,id,createdAt:new Date().toISOString()});seen.add(id)}
 save(current);return current
}
