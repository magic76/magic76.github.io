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
 "bazi-癸":"bazi-gui.webp",
 "vedic-aries":"vedic-aries.webp",
 "vedic-taurus":"vedic-taurus.webp",
 "vedic-gemini":"vedic-gemini.webp",
 "vedic-cancer":"vedic-cancer.webp",
 "vedic-leo":"vedic-leo.webp",
 "vedic-virgo":"vedic-virgo.webp",
 "vedic-libra":"vedic-libra.webp",
 "vedic-scorpio":"vedic-scorpio.webp",
 "vedic-sagittarius":"vedic-sagittarius.webp",
 "vedic-capricorn":"vedic-capricorn.webp",
 "vedic-aquarius":"vedic-aquarius.webp",
 "vedic-pisces":"vedic-pisces.webp"
} as const;

/** Activate an identity only after its reviewed WebP is committed at the exact path. */
export const APPROVED_IDENTITY_ARTWORK:readonly (keyof typeof IDENTITY_ARTWORK_PATHS)[] = [
 "bazi-甲","bazi-乙","bazi-丙","bazi-丁","bazi-戊",
 "bazi-己","bazi-庚","bazi-辛","bazi-壬","bazi-癸",
 "vedic-aries", "vedic-taurus", "vedic-gemini", "vedic-cancer", "vedic-leo", "vedic-virgo", "vedic-libra", "vedic-scorpio", "vedic-sagittarius", "vedic-capricorn", "vedic-aquarius", "vedic-pisces"
];
/** Tarot ZIP labels 1..22 describe art order, NOT the site's personalityCardNumber.
 * Runtime card 22 is the Fool / 自由冒險家, then cards 1..21 follow.
 * All images are installed under their true runtime ID (see art QA documentation).
 */
export const APPROVED_TAROT_ARTWORK_IDS:readonly string[] = [
 "tarot-1",
 "tarot-2",
 "tarot-3",
 "tarot-4",
 "tarot-5",
 "tarot-6",
 "tarot-7",
 "tarot-8",
 "tarot-9",
 "tarot-10",
 "tarot-11",
 "tarot-12",
 "tarot-13",
 "tarot-14",
 "tarot-15",
 "tarot-16",
 "tarot-17",
 "tarot-18",
 "tarot-19",
 "tarot-20",
 "tarot-21",
 "tarot-22"
];
const approvedTarot=new Set<string>(APPROVED_TAROT_ARTWORK_IDS);
const approved=new Set<string>(APPROVED_IDENTITY_ARTWORK);
export function identityArtworkUrl(id:string):string|null{
 if(id==="tarot-0")return "/fortune/identity/art/tarot-22.webp";
 if(approvedTarot.has(id))return "/fortune/identity/art/"+id+".webp";
 if(!approved.has(id))return null;
 const file=IDENTITY_ARTWORK_PATHS[id as keyof typeof IDENTITY_ARTWORK_PATHS];
 return file?"/fortune/identity/art/"+file:null;
}
