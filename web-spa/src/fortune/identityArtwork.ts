/** Art asset contract shared by the reading preview and Canvas exporter.
 * Assets are approved manually after visual QA; an unapproved or absent asset
 * never triggers a network request and always retains the text/symbol fallback.
 * Files live under web-spa/public/fortune/identity/art/.
 */
export const IDENTITY_ARTWORK_PATHS = {
 "bazi-甲":"bazi-jia.webp",
 "bazi-乙":"bazi-yi.webp",
 "bazi-丙":"bazi-bing.webp",
 "bazi-丁":"bazi-ding.webp",
 "bazi-戊":"bazi-wu.webp",
 "bazi-己":"bazi-ji.webp",
 "bazi-庚":"bazi-geng.webp",
 "bazi-辛":"bazi-xin.webp",
 "bazi-壬":"bazi-ren.webp",
 "bazi-癸":"bazi-gui.webp"
} as const;

/** Activate an identity only after its reviewed WebP is committed at the exact path. */
export const APPROVED_IDENTITY_ARTWORK:readonly (keyof typeof IDENTITY_ARTWORK_PATHS)[] = [
 "bazi-甲","bazi-乙","bazi-丙","bazi-丁","bazi-戊",
 "bazi-己","bazi-庚","bazi-辛","bazi-壬","bazi-癸"
];
const approved=new Set<string>(APPROVED_IDENTITY_ARTWORK);
export function identityArtworkUrl(id:string):string|null{
 if(!approved.has(id))return null;
 const file=IDENTITY_ARTWORK_PATHS[id as keyof typeof IDENTITY_ARTWORK_PATHS];
 return file?"/fortune/identity/art/"+file:null;
}
