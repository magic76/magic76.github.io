/**
 * Deterministic, dependency-free 1200x630 Open Graph artwork.
 * Runs at Cloudflare build time, never in the visitor's browser.
 * Curated Koolo home and feature PNGs use versioned filenames.
 */
import {deflateSync} from "node:zlib";
import {mkdirSync,writeFileSync,readFileSync,existsSync} from "node:fs";
import {dirname,join} from "node:path";

const W=1200,H=630;
const THEMES={
 teacher:{bg:[239,243,255],accent:[91,104,209],tag:"TEACHER",sub:"SPEAK & LEARN",scene:"people"},
 story:{bg:[255,245,233],accent:[224,128,73],tag:"STORY",sub:"READ & IMAGINE",scene:"book"},
 fortune:{bg:[245,238,255],accent:[132,93,181],tag:"FORTUNE",sub:"PATTERNS & REFLECTION",scene:"cards"},
 research:{bg:[233,248,241],accent:[52,143,117],tag:"RESEARCH",sub:"AI IDEAS & ENGINEERING",scene:"laptop"},
 games:{bg:[234,244,255],accent:[57,122,191],tag:"GAMES",sub:"PLAY WITH KOOLO FRIENDS",scene:"board"},
 travel:{bg:[230,243,255],accent:[51,122,201],tag:"TRAVEL",sub:"ENGLISH PRACTICE",scene:"plane"},
 business:{bg:[238,237,255],accent:[100,83,182],tag:"BUSINESS",sub:"ENGLISH PRACTICE",scene:"laptop"},
 daily:{bg:[255,247,231],accent:[204,136,49],tag:"DAILY",sub:"ENGLISH PRACTICE",scene:"coffee"},
 teamwork:{bg:[234,249,239],accent:[55,151,105],tag:"TEAMWORK",sub:"ENGLISH PRACTICE",scene:"people"},
 tickets:{bg:[255,238,239],accent:[193,88,108],tag:"TICKETS",sub:"ENGLISH PRACTICE",scene:"ticket"},
 services:{bg:[241,240,255],accent:[108,110,191],tag:"SERVICES",sub:"ENGLISH PRACTICE",scene:"phone"},
 "ai-english-speaking":{bg:[239,243,255],accent:[91,104,209],tag:"SPEAKING",sub:"KOOLO STUDY GUIDE",scene:"people"},
 "ai-conversation-partner":{bg:[238,247,255],accent:[53,126,188],tag:"CONVERSATION",sub:"KOOLO STUDY GUIDE",scene:"people"},
 "travel-english-dialogues":{bg:[231,245,254],accent:[59,131,204],tag:"TRAVEL",sub:"KOOLO STUDY GUIDE",scene:"plane"},
 "english-pronunciation":{bg:[244,238,255],accent:[132,93,181],tag:"PRONUNCIATION",sub:"KOOLO STUDY GUIDE",scene:"people"},
 "gemini-key-for-ai-practice":{bg:[232,249,244],accent:[60,147,116],tag:"AI SETUP",sub:"KOOLO STUDY GUIDE",scene:"laptop"},
 "friend-gomoku":{bg:[234,244,255],accent:[57,122,191],tag:"GOMOKU",sub:"KOOLO PLAY",scene:"board"},
 connect4:{bg:[255,242,229],accent:[210,120,61],tag:"CONNECT FOUR",sub:"KOOLO PLAY",scene:"board"},
 "twenty-questions":{bg:[242,241,255],accent:[109,102,190],tag:"20 QUESTIONS",sub:"KOOLO PLAY",scene:"people"},
 reversi:{bg:[239,248,244],accent:[52,143,117],tag:"REVERSI",sub:"KOOLO PLAY",scene:"board"},
 mystery:{bg:[247,238,255],accent:[130,93,177],tag:"MYSTERY",sub:"KOOLO PLAY",scene:"cards"},
 "1a2b":{bg:[241,246,255],accent:[81,107,174],tag:"1A2B",sub:"KOOLO PLAY",scene:"board"},
 taboo:{bg:[255,238,239],accent:[193,88,108],tag:"TABOO",sub:"KOOLO PLAY",scene:"people"}
};
const FONT={
 A:["01110","10001","10001","11111","10001","10001","10001"],B:["11110","10001","10001","11110","10001","10001","11110"],C:["01111","10000","10000","10000","10000","10000","01111"],
 D:["11110","10001","10001","10001","10001","10001","11110"],E:["11111","10000","10000","11110","10000","10000","11111"],F:["11111","10000","10000","11110","10000","10000","10000"],
 G:["01111","10000","10000","10111","10001","10001","01111"],H:["10001","10001","10001","11111","10001","10001","10001"],I:["11111","00100","00100","00100","00100","00100","11111"],
 J:["00111","00010","00010","00010","10010","10010","01100"],K:["10001","10010","10100","11000","10100","10010","10001"],L:["10000","10000","10000","10000","10000","10000","11111"],
 M:["10001","11011","10101","10101","10001","10001","10001"],N:["10001","11001","10101","10011","10001","10001","10001"],O:["01110","10001","10001","10001","10001","10001","01110"],
 P:["11110","10001","10001","11110","10000","10000","10000"],Q:["01110","10001","10001","10001","10101","10010","01101"],R:["11110","10001","10001","11110","10100","10010","10001"],
 S:["01111","10000","10000","01110","00001","00001","11110"],T:["11111","00100","00100","00100","00100","00100","00100"],U:["10001","10001","10001","10001","10001","10001","01110"],
 V:["10001","10001","10001","10001","10001","01010","00100"],W:["10001","10001","10001","10101","10101","10101","01010"],X:["10001","10001","01010","00100","01010","10001","10001"],
 Y:["10001","10001","01010","00100","00100","00100","00100"],Z:["11111","00001","00010","00100","01000","10000","11111"],
 "0":["01110","10001","10011","10101","11001","10001","01110"],"1":["00100","01100","00100","00100","00100","00100","01110"],
 "2":["01110","10001","00001","00010","00100","01000","11111"],"3":["11110","00001","00001","00110","00001","00001","11110"],
 "4":["00010","00110","01010","10010","11111","00010","00010"],"5":["11111","10000","10000","11110","00001","00001","11110"],
 "6":["01111","10000","10000","11110","10001","10001","01110"],"7":["11111","00001","00010","00100","01000","01000","01000"],
 "8":["01110","10001","10001","01110","10001","10001","01110"],"9":["01110","10001","10001","01111","00001","00001","11110"],
 " ":["00000","00000","00000","00000","00000","00000","00000"],
 "&":["01100","10010","10100","01000","10101","10010","01101"],
 "-":["00000","00000","00000","11111","00000","00000","00000"]
};
const clamp=v=>Math.max(0,Math.min(255,Math.round(v)));
const tint=(a,b,t)=>a.map((v,i)=>clamp(v*(1-t)+b[i]*t));
function render({kind,tag,sub,locale="zh",date=""}){
 const t=THEMES[kind]||THEMES.research, rgb=t.bg,acc=t.accent, p=new Uint8Array(W*H*4);
 function pixel(x,y,c,a=1){x=Math.round(x);y=Math.round(y);if(x<0||x>=W||y<0||y>=H)return;const i=(y*W+x)*4,s=1-a;p[i]=clamp(p[i]*s+c[0]*a);p[i+1]=clamp(p[i+1]*s+c[1]*a);p[i+2]=clamp(p[i+2]*s+c[2]*a);p[i+3]=255}
 function rect(x,y,w,h,c,a=1){const x0=Math.max(0,Math.floor(x)),y0=Math.max(0,Math.floor(y));for(let j=y0;j<Math.min(H,y+h);j++)for(let i=x0;i<Math.min(W,x+w);i++)pixel(i,j,c,a)}
 function disk(cx,cy,r,c,a=1){const x0=Math.max(0,Math.floor(cx-r)),x1=Math.min(W-1,Math.ceil(cx+r)),y0=Math.max(0,Math.floor(cy-r)),y1=Math.min(H-1,Math.ceil(cy+r)),rr=r*r;for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if((x-cx)**2+(y-cy)**2<=rr)pixel(x,y,c,a)}
 function ellipse(cx,cy,rx,ry,c,a=1){const x0=Math.max(0,Math.floor(cx-rx)),x1=Math.min(W-1,Math.ceil(cx+rx)),y0=Math.max(0,Math.floor(cy-ry)),y1=Math.min(H-1,Math.ceil(cy+ry));for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1)pixel(x,y,c,a)}
 function round(x,y,w,h,r,c,a=1){rect(x+r,y,w-2*r,h,c,a);rect(x,y+r,r,h-2*r,c,a);rect(x+w-r,y+r,r,h-2*r,c,a);disk(x+r,y+r,r,c,a);disk(x+w-r,y+r,r,c,a);disk(x+r,y+h-r,r,c,a);disk(x+w-r,y+h-r,r,c,a)}
 function line(x1,y1,x2,y2,r,c,a=1){const dx=x2-x1,dy=y2-y1,n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/(r*.75)));for(let i=0;i<=n;i++){let v=i/n;disk(x1+dx*v,y1+dy*v,r,c,a)}}
 function star(x,y,r,c){line(x-r,y,x+r,y,2,c);line(x,y-r,x,y+r,2,c);disk(x,y,3,c)}
 function txt(s,x,y,scale,c,limit=530){s=String(s).toUpperCase().replace(/[^A-Z0-9 &-]/g," ");const width=s.length*6*scale;if(width>limit)scale=Math.max(3,Math.floor(limit/(s.length*6)));for(const ch of s){const glyph=FONT[ch]||FONT[" "];for(let row=0;row<7;row++)for(let col=0;col<5;col++)if(glyph[row][col]==="1")rect(x+col*scale,y+row*scale,scale,scale,c);x+=scale*6}}
 function bubble(x,y,r){disk(x,y,r,[255,255,255]);disk(x,y,r-6,tint(rgb,acc,.16));disk(x-r*.18,y-r*.12,5,acc);disk(x+r*.15,y-r*.12,5,acc);line(x-r*.18,y+r*.22,x+r*.15,y+r*.22,4,acc)}
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const q=(x/W*.10+y/H*.06);const c=tint(rgb,[255,255,255],q);const i=(y*W+x)*4;p[i]=c[0];p[i+1]=c[1];p[i+2]=c[2];p[i+3]=255}
 // Full-bleed atmosphere, no blurry rectangular margins.
 disk(982,296,243,tint(acc,[255,255,255],.70),.68);
 disk(1170,510,185,tint(acc,[255,255,255],.82),.60);
 disk(675,585,115,tint(acc,[255,255,255],.85),.6);
 for(const s of [[824,90,13],[1095,99,18],[731,434,9],[1060,550,12]])star(...s,tint(acc,[255,255,255],.35));
 // Shared brand identity.
 round(72,62,68,58,20,[21,58,53]);
 // Approved K + smiling oo mark in brand colors.
 line(86,77,86,105,4,[217,242,177]);line(86,97,96,87,4,[217,242,177]);line(86,97,96,106,4,[217,242,177]);
 for(const cx of [107,127]){disk(cx,95,10,[217,242,177]);disk(cx,95,5,[21,58,53]);}
 disk(131,78,4,[255,150,120]);line(111,109,122,113,2,[147,227,178]);line(122,113,130,109,2,[147,227,178]);
 txt("KOOLO",158,74,9,[21,58,53],390);
 round(74,161,Math.min(440,95+(tag||t.tag).length*16),52,25,tint(acc,[255,255,255],.74));
 txt(tag||t.tag,99,174,5,acc,420);
 const headline=tag||t.tag;
 const titleScale=headline.length>12?9:headline.length>8?11:14;
 txt(headline,74,277,titleScale,[31,43,70],590);
 rect(76,399,74,6,acc);
 txt(sub||t.sub,75,439,5,tint(acc,[40,50,71],.38),595);
 txt("KOOLO.APP",76,558,4,[101,113,135],250);
 // Illustration language is shared; subject changes, not random AI art.
 const scene=t.scene;
 if(scene==="people"){
  // Two friendly Koolo figures with large expressive faces.
  ellipse(906,468,145,112,tint(acc,[255,255,255],.40));
  round(762,388,148,151,50,acc);round(916,387,142,151,50,tint(acc,[255,255,255],.20));
  disk(842,302,78,[244,204,177]);disk(979,309,75,[249,210,186]);
  ellipse(837,258,83,57,[68,70,94]);ellipse(979,261,75,53,[113,90,103]);
  disk(818,310,6,[47,56,82]);disk(860,310,6,[47,56,82]);
  disk(956,318,6,[47,56,82]);disk(1000,318,6,[47,56,82]);
  line(828,334,851,334,3,[153,92,96]);line(968,342,990,342,3,[156,93,93]);
  round(882,181,128,58,25,[255,255,255]);disk(912,211,6,acc);disk(937,211,6,acc);disk(962,211,6,acc);
 }else if(scene==="book"){
  ellipse(938,487,246,57,[206,172,150],.35);
  round(757,273,173,214,15,[255,255,255]);round(934,273,175,214,15,[255,255,255]);
  line(932,289,932,480,8,acc);for(let k=0;k<4;k++){line(786,314+k*31,902,314+k*31,3,tint(acc,[255,255,255],.50));line(958,314+k*31,1071,314+k*31,3,tint(acc,[255,255,255],.50))}
  disk(930,195,44,tint(acc,[255,255,255],.55));star(930,195,35,acc);
 }else if(scene==="cards"){
  disk(941,317,185,tint(acc,[255,255,255],.38));
  disk(937,317,125,acc,.34);disk(976,285,99,tint(rgb,[255,255,255],.3));
  round(795,347,126,205,18,[255,255,255]);round(951,345,126,205,18,[255,255,255]);
  round(810,362,97,172,12,tint(acc,[255,255,255],.50));round(966,361,96,172,12,tint(acc,[255,255,255],.55));
  star(859,438,45,acc);disk(1013,440,34,acc);disk(1028,425,28,tint(rgb,[255,255,255],.5));
 }else if(scene==="laptop"){
  round(747,246,341,235,24,[55,70,102]);round(761,260,313,205,16,[246,251,255]);
  for(let k=0;k<4;k++)round(796+k*63,398-k*34,39,48+k*34,7,tint(acc,[255,255,255],.30-k*.07));
  line(782,367,843,328,5,acc);line(843,328,907,357,5,acc);line(907,357,1005,288,5,acc);
  round(704,472,431,28,13,[78,86,117]);round(825,486,180,9,4,[165,176,194]);
 }else if(scene==="board"){
  round(744,207,372,372,35,[255,255,255]);round(761,223,338,337,24,tint(acc,[255,255,255],.63));
  for(let k=1;k<6;k++){line(777+k*51,241,777+k*51,545,2,acc,.6);line(777,241+k*50,1084,241+k*50,2,acc,.6)}
  for(const [x,y,b] of [[829,297,1],[930,397,0],[1030,496,1],[930,295,0],[829,449,0],[1030,347,1]]){
   disk(x,y,22,b?[47,64,91]:[255,255,255]);disk(x-5,y-7,6,b?[124,144,175]:[229,232,239]);
  }
 }else if(scene==="plane"){
  ellipse(942,438,232,105,[255,255,255],.8);
  line(752,401,1110,349,20,acc);line(900,384,832,294,19,acc);line(964,374,1051,277,18,acc);
  line(824,393,793,452,11,acc);line(1061,357,1100,405,11,acc);
 }else if(scene==="coffee"){
  round(804,293,221,190,38,[255,255,255]);round(822,308,187,159,27,tint(acc,[255,255,255],.72));
  disk(1057,371,63,acc);disk(1057,371,36,rgb);
  ellipse(915,481,172,23,acc,.40);
  for(let k=0;k<3;k++)line(863+k*55,255,880+k*55,215,5,acc,.5);
 }else if(scene==="ticket"){
  round(755,265,353,222,29,[255,255,255]);round(773,282,318,188,20,tint(acc,[255,255,255],.73));
  line(967,296,967,455,4,acc,.4);disk(967,269,21,rgb);disk(967,484,21,rgb);
  txt("KOOLO",807,323,9,acc,260);txt("ADMIT",810,416,5,acc,190);
 }else if(scene==="phone"){
  round(816,211,243,340,35,[46,62,93]);round(833,236,208,282,22,[255,255,255]);
  round(854,270,168,122,20,tint(acc,[255,255,255],.69));bubble(938,328,33);
  round(857,421,141,10,5,tint(acc,[255,255,255],.45));round(857,449,111,10,5,tint(acc,[255,255,255],.45));
 }
 if(date)txt(date,78,520,4,tint(acc,[61,71,86],.5),430);
 return png(p);
}
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0});
function crc(data){let v=0xffffffff;for(const b of data)v=crcTable[(v^b)&255]^(v>>>8);return (v^0xffffffff)>>>0}
function chunk(type,data){const name=Buffer.from(type),len=Buffer.alloc(4),check=Buffer.alloc(4);len.writeUInt32BE(data.length);check.writeUInt32BE(crc(Buffer.concat([name,data])));return Buffer.concat([len,name,data,check])}
function png(p){const scan=Buffer.alloc((W*4+1)*H);for(let y=0;y<H;y++)scan.set(p.subarray(y*W*4,(y+1)*W*4),y*(W*4+1)+1);
 const head=Buffer.alloc(13);head.writeUInt32BE(W,0);head.writeUInt32BE(H,4);head[8]=8;head[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",head),chunk("IDAT",deflateSync(scan,{level:9})),chunk("IEND",Buffer.alloc(0))]);
}
export const OG_ORIGIN="https://koolo.app";
export function previewUrl(category,slug,locale="zh"){
 if(category==="home")return OG_ORIGIN+"/social/koolo-shared-v1.png";
 if(category==="feature"){if(!["teacher","story","fortune","research","games"].includes(slug))throw Error("Invalid feature OG preview");return OG_ORIGIN+"/social/og/"+slug+"-koolo-v1.png";}
 if(category==="article"){if(!/^\d{4}-\d\d-\d\d\/[a-zA-Z0-9_-]{4,100}$/.test(slug))throw Error("Invalid article image id");return OG_ORIGIN+"/social/og/research/"+slug+".png"}
 if(!/^[a-z0-9-]{1,64}$/.test(slug)||!["course","guide","game"].includes(category))throw Error("Invalid OG preview key");
 return OG_ORIGIN+"/social/og/"+category+"/"+slug+(category==="game"?"":"-"+(locale==="en"?"en":"zh"))+".png";
}
export function writePreview(out,category,slug,locale="zh",date=""){
 if(category==="feature")throw Error("Feature OG art is curated; do not replace it with generated art");
 const src=previewUrl(category,slug,locale),relative=new URL(src).pathname.slice(1),file=join(out,relative);
 const kind=category==="feature"?slug:category==="course"||category==="guide"||category==="game"?slug:"research";
 const theme=THEMES[kind]||THEMES.research;
 const header=category==="article"?"RESEARCH":category==="guide"?"STUDY GUIDE":category==="course"?"KOOLO TEACHER":category==="game"?"KOOLO PLAY":theme.tag;
 const sub=category==="article"?"RESEARCH NOTE":theme.sub;
 mkdirSync(dirname(file),{recursive:true});
 writeFileSync(file,render({kind,tag:header,sub,locale,date}));
 return src;
}
export function writeStaticPreviews(out,{courseSlugs,guideSlugs,gameSlugs}){
 // Published feature art is curated from original chibi illustrations.
 // The assets folder is copied into /dist before this function runs.
 // Fail closed rather than silently replacing artwork with geometric placeholders.
 for(const slug of ["teacher","story","fortune","research","games"]){
  const curated=join(out,"social","og",slug+"-koolo-v1.png");
  if(!existsSync(curated))throw Error("Missing curated Koolo OG image: "+curated);
  const data=readFileSync(curated);
  const magic=[137,80,78,71,13,10,26,10];
  if(data.length<20000 || magic.some((byte,i)=>data[i]!==byte) ||
     data.readUInt32BE(16)!==W || data.readUInt32BE(20)!==H)
   throw Error("Invalid curated Koolo OG image: "+curated);
  // Preserve the old geometric URL for previously shared links.
  const legacy=join(out,"social","og",slug+".png");
  mkdirSync(dirname(legacy),{recursive:true});
  writeFileSync(legacy,render({kind:slug,tag:THEMES[slug].tag,sub:THEMES[slug].sub}));
 }
 for(const slug of courseSlugs)for(const locale of ["zh","en"])writePreview(out,"course",slug,locale);
 for(const slug of guideSlugs)for(const locale of ["zh","en"])writePreview(out,"guide",slug,locale);
 for(const slug of gameSlugs)writePreview(out,"game",slug);
}
export function replacePreviewMeta(html,url,alt){
 for(const prop of ["og:image","og:image:secure_url"]){
  const re=new RegExp('<meta property="'+prop+'" content="[^"]*">');
  if(!re.test(html))throw Error("Missing "+prop+" metadata");
  html=html.replace(re,'<meta property="'+prop+'" content="'+url+'">');
 }
 const re=/<meta name="twitter:image" content="[^"]*">/;
 if(!re.test(html))throw Error("Missing twitter:image");
 html=html.replace(re,'<meta name="twitter:image" content="'+url+'">');
 const safe=String(alt||"Koolo").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
 html=html.replace(/<meta property="og:image:alt" content="[^"]*">/,'<meta property="og:image:alt" content="'+safe+'">');
 return html;
}
