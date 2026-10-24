import {useId} from "react";

/**
 * Original illustrated miniature-world art.
 * Single scalable SVG, with a cohesive palette, layered architecture and tiny
 * environmental details. No external texture/GL download; safe in Android WebView.
 */
const STONES=[
 [174,344,10,3,-23],[210,327,7,2,11],[253,316,11,3,-9],[302,313,7,2,10],
 [350,321,9,2,-18],[404,336,8,3,22],[469,345,10,3,-12],
 [542,342,8,2,15],[612,341,11,2,-11],[669,332,7,2,4],[721,321,12,3,-9],
 [460,190,7,2,-10],[466,223,9,2,20],[470,263,8,2,4],
 [477,383,11,3,24],[482,468,8,2,-7]
] as const;
const FLOWERS=[
 [149,387],[173,415],[194,433],[235,453],[261,484],[285,498],[345,489],
 [368,449],[553,456],[583,478],[625,465],[657,492],[693,482],
 [814,340],[827,364],[854,387],[794,237],[806,262],
 [222,161],[246,149],[333,149],[579,151],[594,155],[704,184]
] as const;

function Flower({x,y,pink=false}:{x:number;y:number;pink?:boolean}){
 return <g transform={"translate("+x+" "+y+")"} strokeLinecap="round">
  <path d="M0 2V-8" stroke="#6d9d72" strokeWidth="1.8"/>
  <path d="M0 -4q-5 -4 -7 -1M0 -2q6 -5 8 -2" stroke="#77aa79" strokeWidth="2" fill="none"/>
  <circle cx="-3" cy="-10" r="3.2" fill={pink?"#efb3ba":"#f9f1cf"}/>
  <circle cx="2" cy="-13" r="3.2" fill={pink?"#f7c7ca":"#fff8df"}/>
  <circle cx="4" cy="-8" r="3.2" fill={pink?"#e5a2ab":"#fff3bd"}/>
  <circle cx="0" cy="-10" r="2" fill="#d5a668"/>
 </g>;
}
function Bush({x,y,s=1,color="#89b6a0"}:{x:number;y:number;s?:number;color?:string}){
 return <g transform={"translate("+x+" "+y+") scale("+s+")"}>
  <ellipse cy="5" rx="23" ry="6" fill="#426e5f" opacity=".13"/>
  <circle cx="-12" cy="-6" r="11" fill="#679c84"/>
  <circle cx="9" cy="-8" r="14" fill={color}/>
  <circle cx="-1" cy="-14" r="15" fill="#b4d1a4"/>
  <path d="M-15 -13q8-8 15-5m5-4q9-2 13 6" stroke="#e1edcc" strokeWidth="2" opacity=".7" fill="none"/>
 </g>;
}
function Tree({x,y,s=1,blossom=false}:{x:number;y:number;s?:number;blossom?:boolean}){
 const foliage=blossom?"#e7bbc4":"#77aa90",light=blossom?"#f4d6d6":"#c0d8ab";
 return <g transform={"translate("+x+" "+y+") scale("+s+")"}>
  <ellipse cy="4" rx="34" ry="11" fill="#456b58" opacity=".15"/>
  <path d="M-2 1 L-1 -57M-2 -24L-19 -41M0 -36L17 -55" stroke="#876f61" strokeWidth="10" strokeLinecap="round"/>
  <path d="M-3 0 L-2 -53M0 -36L14 -52" stroke="#bc9376" strokeWidth="2.7" strokeLinecap="round"/>
  <g stroke="#ffffff" strokeOpacity=".14" strokeWidth="2">
   <circle cx="-20" cy="-62" r="26" fill={foliage}/>
   <circle cx="21" cy="-66" r="27" fill={foliage}/>
   <circle cx="-2" cy="-84" r="29" fill={light}/>
   <circle cx="-27" cy="-83" r="16" fill={light}/>
   <circle cx="23" cy="-90" r="18" fill={light}/>
  </g>
  <path d="M-26 -88q11-16 29-13m4 1q13-5 25 7M-41 -67q8-8 15-8" stroke="#fffae6" strokeOpacity=".55" strokeWidth="3" fill="none" strokeLinecap="round"/>
  <circle cx="-16" cy="-96" r="3" fill="#fff9ee" opacity=".8"/>
  <circle cx="32" cy="-78" r="3" fill="#fff9ee" opacity=".6"/>
 </g>;
}
function Pine({x,y,s=1}:{x:number;y:number;s?:number}){
 return <g transform={"translate("+x+" "+y+") scale("+s+")"}>
  <ellipse cy="3" rx="20" ry="6" fill="#487b65" opacity=".18"/>
  <path d="M0 0v-58" stroke="#927a61" strokeWidth="7"/>
  <path d="M0 -91L-25 -37Q0 -20 25 -37Z" fill="#547f79"/>
  <path d="M0 -99L-22 -55Q-2 -39 22 -55Z" fill="#669991"/>
  <path d="M0 -108L-17 -72Q0 -62 17 -72Z" fill="#98c0a3"/>
  <path d="M0 -95L-10 -75M2 -74l10 15" stroke="#d7e7c4" opacity=".5" strokeWidth="2.4"/>
 </g>;
}
function Lantern({x,y,s=1}:{x:number;y:number;s?:number}){
 return <g transform={"translate("+x+" "+y+") scale("+s+")"}>
  <ellipse cy="5" rx="9" ry="4" fill="#4d6e5c" opacity=".16"/>
  <path d="M0 0v-49" stroke="#71837c" strokeWidth="4.2" strokeLinecap="round"/>
  <path d="M-10 -50h20l-4 -18h-12Z" fill="#f3e8cd" stroke="#947f69" strokeWidth="2"/>
  <path d="M-11 -69h22l-5 -6h-12Z" fill="#688581"/>
  <path d="M0 -69v21" stroke="#d8c09d" strokeWidth="1.4"/>
  <circle className="crew-town-lamp-glow" cx="0" cy="-58" r="22" fill="#ffe6a3"/>
 </g>;
}
function Bench({x,y,s=1}:{x:number;y:number;s?:number}){
 return <g transform={"translate("+x+" "+y+") scale("+s+")"}>
  <ellipse cx="4" cy="12" rx="35" ry="10" fill="#456553" opacity=".13"/>
  <path d="M-23 -10L7 5L33 -8L2 -24Z" fill="#bf9279" stroke="#e9c19c" strokeWidth="2"/>
  <path d="M-23 -21L7 -6L33 -19L2 -36Z" fill="#d4a58b" stroke="#efd1aa" strokeWidth="2"/>
  <path d="M-20 -5V11M29 -6V10" stroke="#6b756d" strokeWidth="4" strokeLinecap="round"/>
  <path d="M-17 -18L10 -4M-15 -8L11 6" stroke="#f7d2ad" strokeOpacity=".7" strokeWidth="1.3"/>
 </g>;
}
function RoofTiles({type="terracotta"}:{type?:"terracotta"|"slate"|"gold"}){
 const c=type==="slate"?"#b6c8d7":type==="gold"?"#f3d69b":"#eab6a4";
 return <g opacity=".65" stroke={c} strokeWidth="2.3" strokeLinecap="round" fill="none">
  <path d="M-66 -39L0 -5M-44 -51L23 -17M-20 -64L48 -30M5 -63L71 -36"/>
  <path d="M-75 -20L-8 12M-55 -31L12 1M-32 -44L35 -12M-10 -56L58 -24"/>
 </g>;
}
function Window({x,y,slant="left"}:{x:number;y:number;slant?:"left"|"right"}){
 return <g transform={"translate("+x+" "+y+")"}>
  {slant==="left"?<>
   <path d="M0 0l29 15v37L0 38Z" fill="#faf3e9" stroke="#fffbf0" strokeWidth="4"/>
   <path d="M4 5l21 11v29L4 34Z" fill="#b6d5cf"/>
   <path d="M4 5l21 11v10L4 16Z" fill="#e1efe1"/>
   <path d="M14 10v30M4 19l21 11" stroke="#fff7ea" strokeWidth="2.5"/>
   <path d="M-2 39l33 17" stroke="#c49a89" strokeWidth="4" strokeLinecap="round"/>
  </>:<>
   <path d="M0 13l25 -14v39L0 52Z" fill="#fef6e9" stroke="#fffcf1" strokeWidth="4"/>
   <path d="M4 15l17 -9v29L4 44Z" fill="#b2d9d8"/>
   <path d="M4 15l17 -9v11L4 26Z" fill="#e6f5e4"/>
   <path d="M13 11v29M4 29l17 -9" stroke="#fff7ea" strokeWidth="2.5"/>
   <path d="M-2 54l29 -16" stroke="#b49483" strokeWidth="4" strokeLinecap="round"/>
  </>}
 </g>;
}
function Cafe(){
 return <g transform="translate(283 266)">
  <ellipse cx="6" cy="103" rx="122" ry="23" fill="#486c5c" opacity=".13"/>
  <path d="M-90 -28L0 17L93 -27V77L0 125L-90 80Z" fill="#f7e5cc" stroke="#dbbcaa" strokeWidth="2"/>
  <path d="M0 17L93 -27V77L0 125Z" fill="#eac8b0"/>
  <path d="M0 17v108" stroke="#d6b39e" strokeWidth="2"/>
  <path d="M-92 -26L-1 -81L95 -25L3 32Z" fill="#ad7774" opacity=".35" transform="translate(0 8)"/>
  <path d="M-94 -34L-6 -91L96 -32L7 24Z" fill="#d18f87" stroke="#fff0dc" strokeWidth="5" strokeLinejoin="round"/>
  <path d="M-95 -34L-6 -91L8 -82L-79 -24Z" fill="#efb6aa" opacity=".9"/>
  <path d="M-6 -91L96 -32L7 24L-6 14L78 -32Z" fill="#ba7a79" opacity=".43"/>
  <RoofTiles/>
  <path d="M-94 -30L4 29L96 -30" stroke="#f6d1bd" strokeWidth="8" fill="none" strokeLinecap="round"/>
  <path d="M-93 -21L1 32L1 45L-93 -8Z" fill="#fff5e7"/>
  {Array.from({length:6},(_,i)=><path key={i} d={"M"+(-91+i*15.3)+" "+(-20+i*8.75)+"l15 8.6v13.5l-15 -9Z"} fill={i%2?"#f9efdc":"#d99893"}/>)}
  <path d="M-80 8L-9 49" stroke="#b7887e" strokeWidth="2"/>
  <Window x={-73} y={42}/>
  <path d="M28 40l40 -21v76l-40 22Z" fill="#b98f80" stroke="#fdf1de" strokeWidth="4"/>
  <path d="M33 44l30 -15v62l-30 15Z" fill="#8bafa1"/>
  <path d="M36 48l24 -12v29l-24 13Z" fill="#d5e8d2"/>
  <circle cx="57" cy="76" r="2.5" fill="#f5d5a7"/>
  <path d="M-62 -40L-11 -69L39 -38L-10 -9Z" fill="#e3a399" opacity=".55"/>
  <path d="M-53 -35l42 -24l42 23l-42 24Z" fill="#fff8e8" stroke="#f3decb" strokeWidth="3"/>
  <text x="-10" y="-29" textAnchor="middle" fill="#916768" fontSize="12" fontWeight="800" letterSpacing="1">CAFÉ</text>
  <path d="M-77 -5L-77 5" stroke="#729480" strokeWidth="3"/>
  <g transform="translate(-103 85)">
   <path d="M0 0v-26" stroke="#8c6f5e" strokeWidth="4"/>
   <ellipse cy="-27" rx="29" ry="9" fill="#f9eedc" stroke="#d9a98d" strokeWidth="2"/>
   <path d="M-29 -28Q0 -60 29 -28" fill="#e8ada5" stroke="#fff3db" strokeWidth="3"/>
   <path d="M0 -54v25" stroke="#c88d82" strokeWidth="2"/>
   <path d="M-10 0l-5 14M10 0l5 14" stroke="#9b8474" strokeWidth="3"/>
   <ellipse cx="-11" cy="-3" rx="11" ry="5" fill="#dec2a1"/>
   <ellipse cx="12" cy="1" rx="11" ry="5" fill="#e9d7b7"/>
  </g>
  <Bush x={87} y={84} s={.7}/><Flower x={85} y={77} pink/>
 </g>;
}
function Studio(){
 return <g transform="translate(648 267)">
  <ellipse cy="115" rx="125" ry="24" fill="#496b72" opacity=".16"/>
  <path d="M-89 -24L0 19L88 -26V83L0 127L-89 84Z" fill="#dee7e9" stroke="#becdd2" strokeWidth="2"/>
  <path d="M0 19L88 -26V83L0 127Z" fill="#bdcfd9"/>
  <path d="M-92 -33L0 -93L92 -34L0 27Z" fill="#839fae" stroke="#f0f6ef" strokeWidth="5" strokeLinejoin="round"/>
  <path d="M0 -93L92 -34L0 27L-12 19L77 -35Z" fill="#668e9e" opacity=".38"/>
  <RoofTiles type="slate"/>
  <path d="M-44 -53L0 -81L42 -53L0 -25Z" fill="#c1d9d8" stroke="#e8f0e9" strokeWidth="3"/>
  <path d="M-35 -54L0 -76L34 -53L-1 -31Z" fill="#a5cbd2"/>
  <path d="M-18 -64l36 23M-1 -75v44" stroke="#e8f2ef" strokeWidth="3"/>
  <path d="M-93 -30L0 26L93 -30" stroke="#d4e1e3" strokeWidth="7" fill="none"/>
  <Window x={-73} y={39}/>
  <Window x={36} y={48} slant="right"/>
  <path d="M-90 0L-1 52" stroke="#a3bac3" strokeWidth="2"/>
  <path d="M-52 -34L-5 -61L45 -32L-1 -5Z" fill="#f3f6ed" stroke="#b8cbd1" strokeWidth="3"/>
  <text x="-2" y="-29" textAnchor="middle" fill="#668c93" fontSize="10.5" fontWeight="900" letterSpacing="1">STUDIO</text>
  <g transform="translate(84 83)">
   <path d="M-14 0v25M15 -16v24" stroke="#78958f" strokeWidth="4"/>
   <path d="M-22 -28L21 -48L33 -14L-10 6Z" fill="#b3d3c9" stroke="#edf8e9" strokeWidth="3"/>
   <path d="M-9 -18l16 -8M-4 -6l22 -11" stroke="#f5f5dd" strokeWidth="3" strokeLinecap="round"/>
  </g>
  <Bush x={-87} y={86} s={.55} color="#8caeaf"/>
 </g>;
}
function PlayHouse(){
 return <g transform="translate(480 423)">
  <ellipse cx="3" cy="114" rx="111" ry="20" fill="#6c7459" opacity=".14"/>
  <path d="M-81 -23L0 16L83 -24V81L0 124L-81 85Z" fill="#f8e9c4" stroke="#e5d1a6" strokeWidth="2"/>
  <path d="M0 16L83 -24V81L0 124Z" fill="#dbcbae"/>
  <path d="M-92 -29L0 -87L92 -29L0 27Z" fill="#d5ae76" stroke="#fff7da" strokeWidth="5"/>
  <path d="M-92 -29L0 -87L-1 -73L-78 -23Z" fill="#f4d9a7"/>
  <RoofTiles type="gold"/>
  <path d="M-89 -28L0 26L90 -28" stroke="#ffe5af" strokeWidth="7" fill="none"/>
  <Window x={-67} y={37}/>
  <path d="M32 42l34 -17v64l-34 18Z" fill="#e9af9b" stroke="#fff4dc" strokeWidth="3"/>
  <path d="M38 46l22 -11v55l-22 12Z" fill="#f7dcca"/>
  <circle cx="56" cy="79" r="2.8" fill="#977968"/>
  <path d="M-46 -34L-4 -61L42 -35L0 -9Z" fill="#fffaf1" stroke="#ead9ba" strokeWidth="3"/>
  <text x="-3" y="-29" textAnchor="middle" fill="#aa8d60" fontSize="10" fontWeight="800" letterSpacing=".4">PLAY</text>
  <path d="M-94 71l-17 8v17l18 -9M93 72l20 12v19l-20 -11" stroke="#fff6e0" strokeWidth="4" fill="none"/>
  <g transform="translate(-107 86)">
   <path d="M-5 15l-6 -28M9 18l8 -28" stroke="#a28a72" strokeWidth="3"/>
   <path d="M-18 -20L1 -30L20 -20L0 -10Z" fill="#e7b2a6" stroke="#fff4e4" strokeWidth="2"/>
   <path d="M-18 -20v13L0 3v-13M0 3L20 -8v-12" fill="#d8988e"/>
  </g>
  <Bush x={87} y={98} s={.58} color="#8dbda2"/>
 </g>;
}
function Pavilion(){
 return <g transform="translate(753 484)">
  <ellipse cy="25" rx="87" ry="18" fill="#456b5b" opacity=".16"/>
  <path d="M-63 -3L0 -36L61 -5L1 30Z" fill="#f4e1c6" stroke="#fff6e1" strokeWidth="3"/>
  <path d="M-63 -3V14L0 48V30M0 48L61 13V-5" fill="#d4b89f" stroke="#f2e1ca" strokeWidth="3"/>
  <path d="M-49 -13v37M46 -11v38" stroke="#9b8975" strokeWidth="7" strokeLinecap="round"/>
  <path d="M-49 -7v30M46 -5v30" stroke="#f5e0c0" strokeWidth="2"/>
  <path d="M-75 -29L-3 -82L72 -29L0 12Z" fill="#86b2a1" stroke="#eaf6d6" strokeWidth="5" strokeLinejoin="round"/>
  <path d="M-75 -29L-3 -82L-2 -69L-59 -25Z" fill="#b8d8b6"/>
  <path d="M-4 -81L72 -29L0 12L-4 1L56 -31Z" fill="#629f94" opacity=".55"/>
  <path d="M-72 -25L0 17L70 -25" stroke="#d3e8ce" strokeWidth="7" fill="none"/>
  <path d="M-22 0L-1 13L24 1" stroke="#f7f4db" strokeWidth="3" fill="none"/>
  <path d="M-10 22l22 -12M0 36V24" stroke="#a68b79" strokeWidth="4"/>
  <path d="M-10 22l11 6l12 -7" fill="none" stroke="#f0d8b4" strokeWidth="5" strokeLinecap="round"/>
 </g>;
}
export function TownIllustration(){
 const seed=useId().replace(/:/g,"");
 const g=(name:string)=>seed+"-"+name;
 return <svg className="crew-town-art" viewBox="0 0 960 600" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
  <defs>
   <linearGradient id={g("ground")} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#dcedc4"/><stop offset=".48" stopColor="#c2dcae"/><stop offset="1" stopColor="#9fc4ac"/></linearGradient>
   <linearGradient id={g("water")} x1="0" y1="0" x2=".9" y2="1"><stop stopColor="#b7e9da"/><stop offset=".5" stopColor="#91d6cf"/><stop offset="1" stopColor="#5cafa9"/></linearGradient>
   <linearGradient id={g("path")} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fdf4e1"/><stop offset=".6" stopColor="#f0dfc6"/><stop offset="1" stopColor="#dfd0b5"/></linearGradient>
   <linearGradient id={g("edge")} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#a0c7a6"/><stop offset="1" stopColor="#6da696"/></linearGradient>
   <filter id={g("shadow")} x="-35%" y="-35%" width="170%" height="170%"><feGaussianBlur stdDeviation="15"/></filter>
   <pattern id={g("paper")} width="23" height="21" patternUnits="userSpaceOnUse"><circle cx="3" cy="5" r=".8" fill="#ffffff" opacity=".3"/><circle cx="17" cy="15" r=".7" fill="#65836d" opacity=".13"/></pattern>
  </defs>
  <g className="crew-town-landscape">
   <ellipse cx="483" cy="522" rx="411" ry="54" fill="#607d76" opacity=".15" filter={"url(#"+g("shadow")+")"}/>
   <path d="M76 273Q89 160 244 126Q401 79 580 107Q779 125 867 243Q924 345 852 439Q765 552 576 562Q380 587 218 528Q74 477 70 362Z" fill={"url(#"+g("edge")+")"} transform="translate(0 23)"/>
   <path d="M76 273Q89 160 244 126Q401 79 580 107Q779 125 867 243Q924 345 852 439Q765 552 576 562Q380 587 218 528Q74 477 70 362Z" fill={"url(#"+g("ground")+")"} stroke="#ecf5da" strokeWidth="7"/>
   <path d="M76 273Q89 160 244 126Q401 79 580 107Q779 125 867 243Q924 345 852 439Q765 552 576 562Q380 587 218 528Q74 477 70 362Z" fill={"url(#"+g("paper")+")"} opacity=".88"/>
   <path d="M107 378Q108 480 224 513Q391 574 577 548Q774 534 835 441" stroke="#e0edd6" strokeWidth="3" fill="none" opacity=".65"/>
   <path d="M159 347Q312 283 457 334T800 315" stroke="#7a9c79" strokeOpacity=".14" strokeWidth="52" strokeLinecap="round" fill="none" transform="translate(0 6)"/>
   <path d="M159 347Q312 283 457 334T800 315" stroke={"url(#"+g("path")+")"} strokeWidth="47" strokeLinecap="round" fill="none"/>
   <path d="M450 165Q474 260 461 329T501 487" stroke="#789477" strokeOpacity=".14" strokeWidth="44" strokeLinecap="round" fill="none" transform="translate(0 5)"/>
   <path d="M450 165Q474 260 461 329T501 487" stroke={"url(#"+g("path")+")"} strokeWidth="39" strokeLinecap="round" fill="none"/>
   {STONES.map(([x,y,rx,ry,rot],i)=><ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} transform={"rotate("+rot+" "+x+" "+y+")"} fill={i%3===0?"#fff8e9":"#d7c8b0"} opacity=".74"/>)}
   <path d="M682 362Q721 344 772 360Q823 376 826 411Q820 462 747 470Q680 477 660 443Q647 411 682 362Z" fill="#c6d9b0" stroke="#edebc7" strokeWidth="6"/>
   <path d="M687 368Q727 349 771 365Q814 379 815 409Q808 453 745 462Q684 467 670 437Q662 400 687 368Z" fill={"url(#"+g("water")+")"} stroke="#f0f6d5" strokeWidth="6"/>
   <path d="M701 391q25-17 51-11M706 406q37-13 73 2M697 426q26-11 47-7M767 438q18-6 29-14" stroke="#e3faf1" strokeWidth="3.5" opacity=".72" fill="none" strokeLinecap="round"/>
   <ellipse cx="740" cy="412" rx="11" ry="4" fill="#a0cbb4" opacity=".8"/>
   <path d="M732 410q7-7 13 0q5-7 12 0" stroke="#d7ece3" fill="none" strokeWidth="2"/>
   <path d="M675 385q8-13 17-16M678 390q13-11 16-8" stroke="#6aaf91" strokeWidth="3" strokeLinecap="round" fill="none"/>
   <path d="M803 437q12-8 15-19M797 445q13-4 24-11" stroke="#6aaf91" strokeWidth="3" strokeLinecap="round" fill="none"/>
   <g opacity=".67" fill="#e4f0ca"><ellipse cx="174" cy="221" rx="48" ry="19"/><ellipse cx="795" cy="226" rx="48" ry="22"/><ellipse cx="250" cy="460" rx="58" ry="22"/><ellipse cx="578" cy="168" rx="64" ry="20"/></g>
   <g opacity=".7" fill="none" stroke="#9ec5a0" strokeWidth="3" strokeLinecap="round">
    <path d="M135 286q30-19 51-9M267 510q33-13 54-8M577 526q30-8 57-3M842 296q12 15 7 25"/>
   </g>
   <Tree x={150} y={261} s={.83}/><Tree x={218} y={192} s={.72} blossom/>
   <Pine x={385} y={170} s={.82}/><Tree x={565} y={165} s={.68}/>
   <Pine x={788} y={264} s={.91}/><Tree x={835} y={365} s={.73}/>
   <Bush x={121} y={306} s={.9}/><Bush x={256} y={178} s={.63}/><Bush x={807} y={299} s={.85}/>
   <Cafe/><Studio/>
   <Tree x={125} y={380} s={.74}/><Bush x={174} y={372} s={.62}/>
   <g transform="translate(353 359)">
    <ellipse rx="39" ry="10" fill="#597961" opacity=".12"/>
    <path d="M0 -9v27" stroke="#9d8373" strokeWidth="4"/>
    <ellipse cy="-10" rx="23" ry="9" fill="#fbf1df" stroke="#d4baa5" strokeWidth="2"/>
    <path d="M-17 8l-6 14M16 8l6 14" stroke="#9a8b7f" strokeWidth="3"/>
    <path d="M-40 2l11-7l13 7l-13 7Z" fill="#b7afa0"/>
    <path d="M27 1l12-6l12 6l-12 6Z" fill="#c6ae97"/>
    <path d="M-30 -5v21M41 -5v20" stroke="#7e8c86" strokeWidth="3"/>
    <circle cx="-7" cy="-15" r="4" fill="#e3a4a1"/>
   </g>
   <Lantern x={427} y={349} s={.87}/>
   <Lantern x={620} y={339} s={.85}/>
   <g transform="translate(195 437)">
    <ellipse cx="0" cy="10" rx="41" ry="10" fill="#426759" opacity=".13"/>
    <path d="M-28 -9l56 -2v22l-56 2Z" fill="#d7aa86" stroke="#fff3d8" strokeWidth="2"/>
    <path d="M-25 -14l49 -1v9l-49 1Z" fill="#fff2da"/>
    <path d="M-17 -11v20M0 -12v20M16 -13v20" stroke="#a67e6e" strokeWidth="2"/>
    <circle cx="-17" cy="-16" r="6" fill="#e8b5a2"/><circle cx="-5" cy="-18" r="5" fill="#f4d197"/><circle cx="8" cy="-17" r="7" fill="#b6d39e"/>
   </g>
   <PlayHouse/>
   <Bench x={366} y={480} s={.88}/><Tree x={305} y={528} s={.75} blossom/>
   <Bush x={602} y={503} s={.85}/><Pine x={650} y={535} s={.63}/>
   <g transform="translate(786 446)">
    <path d="M-41 -8l-5 25M-25 -17l-4 23M-9 -20l-3 22M7 -18l-1 20" stroke="#c1aa8a" strokeWidth="4"/>
    <path d="M-49 -13L13 -27L36 -11L-26 3Z" fill="#e7c9a5" stroke="#fff1d6" strokeWidth="3"/>
    <path d="M-43 -8L18 -23M-35 -3L27 -19M-26 1L34 -12" stroke="#c89c82" strokeWidth="2"/>
   </g>
   <Pavilion/>
   <Bench x={855} y={477} s={.72}/>
   {FLOWERS.map(([x,y],i)=><Flower key={i} x={x} y={y} pink={i%3===0}/>)}
   <g fill="#fffaf0" opacity=".9">
    <circle cx="244" cy="393" r="2.5"/><circle cx="274" cy="390" r="3"/><circle cx="568" cy="403" r="2.5"/>
    <circle cx="598" cy="411" r="2.5"/><circle cx="735" cy="212" r="3"/><circle cx="780" cy="212" r="2"/>
   </g>
   <g stroke="#f8f5dc" strokeWidth="2.5" strokeLinecap="round" fill="none">
    <path d="M95 324q12-10 24-3M301 168q12-7 18-4M875 385q8 7 5 18"/>
   </g>
  </g>
  <g className="crew-town-night-lights" aria-hidden="true">
   <circle cx="427" cy="297" r="51" fill="#ffd99e" opacity=".35"/><circle cx="620" cy="289" r="51" fill="#ffd99e" opacity=".35"/>
   <circle cx="279" cy="310" r="70" fill="#ffe6bb" opacity=".19"/><circle cx="669" cy="313" r="57" fill="#ffe6bb" opacity=".17"/>
   <circle cx="472" cy="460" r="55" fill="#ffddaa" opacity=".14"/>
  </g>
 </svg>;
}
