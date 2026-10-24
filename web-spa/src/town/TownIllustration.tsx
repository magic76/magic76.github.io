import type {ReactNode} from "react";

/** A lightweight art-direction prototype, not an exported Spline scene.
 * Keep this isolated so an approved GLB/Spline scene can replace it later. */
function Building({x,y,roof,front,side,sign,detail}:{x:number;y:number;roof:string;front:string;side:string;sign:string;detail:ReactNode}){
 return <g transform={"translate("+x+" "+y+")"}>
  <ellipse cy="94" rx="112" ry="22" fill="#4E654E" opacity=".13"/>
  <path d="M-82 -18 L0 24 L82 -18 L82 75 L0 118 L-82 75Z" fill={front}/>
  <path d="M0 24 L82 -18 L82 75 L0 118Z" fill={side}/>
  <path d="M-95 -25 L0 -79 L95 -25 L0 31Z" fill={roof} stroke="#fffaf1" strokeWidth="5" strokeLinejoin="round"/>
  <path d="M-91 -24 L0 26 L91 -24" fill="none" stroke="#8b625c" strokeOpacity=".17" strokeWidth="4"/>
  <path d="M-59 35 L-19 55 L-19 97 L-59 76Z" fill="#fff9dc" stroke="#ffffff" strokeWidth="4"/>
  <path d="M-40 45V86M-59 55L-19 76" stroke="#8b9f9a" strokeOpacity=".7" strokeWidth="3"/>
  <path d="M28 50 L55 36 L55 93 L28 106Z" fill="#f6d9b5" stroke="#fff3db" strokeWidth="3"/>
  <path d="M-86 -7 L-3 37 L-3 52 L-86 9Z" fill="#fff2df" opacity=".94"/>
  <path d="M-85 9 L-64 21 L-64 30 L-85 18Z M-64 21 L-44 32 L-44 41 L-64 30Z M-44 32 L-23 43 L-23 52 L-44 41Z M-23 43 L-3 54 L-3 63 L-23 52Z" fill="#edb5ac"/>
  <rect x="-50" y="-62" width="98" height="25" rx="12" fill="#fffaf4" opacity=".94" transform="rotate(-1)"/>
  <text x="0" y="-44" fill="#655364" fontFamily="system-ui,sans-serif" fontSize="13" fontWeight="800" letterSpacing="1" textAnchor="middle">{sign}</text>
  {detail}
 </g>;
}

function Tree({x,y,scale=1,color="#8caf83"}:{x:number;y:number;scale?:number;color?:string}){
 return <g transform={"translate("+x+" "+y+") scale("+scale+")"}>
  <ellipse cy="11" rx="26" ry="10" fill="#526f5d" opacity=".13"/>
  <path d="M-4 6V-22" stroke="#91745d" strokeWidth="9" strokeLinecap="round"/>
  <circle cx="-14" cy="-31" r="19" fill={color}/>
  <circle cx="13" cy="-38" r="22" fill={color}/>
  <circle cx="-1" cy="-53" r="23" fill="#b7d7a0"/>
  <circle cx="-10" cy="-54" r="8" fill="#dbe8b4" opacity=".65"/>
 </g>;
}

export function TownIllustration(){
 return <svg className="crew-town-art" viewBox="0 0 960 600" aria-hidden="true" focusable="false">
  <defs>
   <linearGradient id="town-grass" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#def0c7"/><stop offset=".52" stopColor="#cbe4b8"/><stop offset="1" stopColor="#a7d0ab"/></linearGradient>
   <linearGradient id="town-lake" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#bde6d8"/><stop offset="1" stopColor="#72bcb5"/></linearGradient>
   <linearGradient id="town-path" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fcf2dd"/><stop offset="1" stopColor="#e8d9c0"/></linearGradient>
   <filter id="town-shadow" x="-30%" y="-30%" width="160%" height="180%"><feGaussianBlur stdDeviation="16"/></filter>
  </defs>
  <ellipse cx="480" cy="520" rx="415" ry="50" fill="#718d8c" opacity=".18" filter="url(#town-shadow)"/>
  <path d="M82 268 Q89 155 242 118 Q398 69 584 98 Q767 112 862 225 Q916 310 864 420 Q813 511 643 544 Q456 584 264 530 Q86 488 73 369Z" fill="#8eb8a2" opacity=".45" transform="translate(0 21)"/>
  <path d="M82 268 Q89 155 242 118 Q398 69 584 98 Q767 112 862 225 Q916 310 864 420 Q813 511 643 544 Q456 584 264 530 Q86 488 73 369Z" fill="url(#town-grass)" stroke="#e9f5df" strokeWidth="9"/>
  <path d="M160 348 Q312 288 455 340 T790 322" stroke="#c2bea4" strokeWidth="47" fill="none" opacity=".3" strokeLinecap="round"/>
  <path d="M160 337 Q312 277 455 329 T790 311" stroke="url(#town-path)" strokeWidth="43" fill="none" strokeLinecap="round"/>
  <path d="M448 160 Q468 246 462 329 T501 488" stroke="#d1c7af" strokeWidth="43" fill="none" opacity=".3" strokeLinecap="round"/>
  <path d="M448 153 Q468 238 462 322 T501 481" stroke="url(#town-path)" strokeWidth="37" fill="none" strokeLinecap="round"/>
  <path d="M690 372 Q725 350 780 374 Q822 397 806 430 Q780 468 713 459 Q660 452 661 419 Q664 387 690 372Z" fill="#e4e4c3" opacity=".7"/>
  <path d="M685 367 Q727 345 777 373 Q817 395 799 423 Q773 459 715 450 Q664 443 668 414 Q670 387 685 367Z" fill="url(#town-lake)" stroke="#f4fcde" strokeWidth="8"/>
  <path d="M703 391Q744 379 782 405M693 414Q730 397 767 422" stroke="#e5f7f0" strokeWidth="4" strokeLinecap="round" opacity=".8"/>
  <g fill="#eef5ce" opacity=".86">
   <ellipse cx="185" cy="200" rx="47" ry="23"/><ellipse cx="797" cy="219" rx="42" ry="25"/><ellipse cx="250" cy="462" rx="56" ry="30"/>
  </g>
  <Tree x={166} y={247} scale={1.1}/><Tree x={126} y={332} scale={.92} color="#7cae9d"/><Tree x={217} y={478} scale={.92}/>
  <Tree x={395} y={151} scale={.8} color="#8fbb9f"/><Tree x={574} y={130} scale={.74}/>
  <Tree x={775} y={240} scale={1.04} color="#8ab6a6"/><Tree x={833} y={337} scale={.9}/>
  <Tree x={610} y={490} scale={1.06} color="#84a996"/><Tree x={321} y={517} scale={.85}/>
  <Building x={283} y={276} roof="#dc9f92" front="#f6dfca" side="#e9c6b2" sign="THE CAFÉ" detail={<>
   <path d="M-92 -13Q-108 -4 -98 12" stroke="#fff3d6" strokeWidth="7" fill="none" strokeLinecap="round"/>
   <ellipse cx="-109" cy="80" rx="24" ry="10" fill="#d1a67a" opacity=".2"/>
   <path d="M-109 68v15" stroke="#9f7660" strokeWidth="5"/><ellipse cx="-109" cy="65" rx="21" ry="8" fill="#fff6e8"/>
   <path d="M-120 54h22" stroke="#e6b2b0" strokeWidth="4" strokeLinecap="round"/>
  </>}/>
  <Building x={647} y={267} roof="#a1b7d8" front="#e7e4ee" side="#cacfe2" sign="STUDIO" detail={<>
   <circle cx="-2" cy="-59" r="10" fill="#f7efe9" opacity=".8"/><path d="M-6 -59h8m-4 -4v8" stroke="#7b92b7" strokeWidth="2"/>
   <path d="M-97 -1L-99 26" stroke="#f8eac4" strokeWidth="6" strokeLinecap="round"/>
  </>}/>
  <Building x={481} y={424} roof="#e4bf80" front="#f8eccf" side="#e5d6ae" sign="PLAY HOUSE" detail={<>
   <path d="M-45 3Q0 -17 48 3" fill="none" stroke="#fff5e5" strokeWidth="5"/>
   <circle cx="-73" cy="106" r="5" fill="#ec9a8b"/>
  </>}/>
  <g transform="translate(754 485)">
   <ellipse rx="65" ry="15" fill="#4b795d" opacity=".12"/>
   <path d="M-45 -21L3 -49L51 -19L4 9Z" fill="#f9e3c0" stroke="#fff7e0" strokeWidth="4"/>
   <path d="M-45 -21V4L4 33V9M4 33L51 4V-19" fill="#d9ae97" stroke="#f2d6b7" strokeWidth="4"/>
   <path d="M-44 -43L4 -70L53 -43L4 -14Z" fill="#adc5aa" stroke="#f8f4de" strokeWidth="4"/>
   <path d="M-15 6v13M17 8v15" stroke="#a67b72" strokeWidth="7"/>
  </g>
  <g stroke="#f8e9d5" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".94">
   <path d="M133 406Q156 418 179 406"/><path d="M382 471Q406 484 425 468"/><path d="M780 347Q793 350 811 343"/>
  </g>
  <g fill="#f9f7db">
   <circle cx="167" cy="412" r="5"/><circle cx="185" cy="422" r="3"/><circle cx="391" cy="466" r="4"/>
   <circle cx="810" cy="351" r="4"/><circle cx="582" cy="448" r="4"/>
  </g>
  <g fill="#eab9b2">
   <circle cx="196" cy="436" r="5"/><circle cx="207" cy="444" r="4"/><circle cx="599" cy="437" r="4"/><circle cx="617" cy="441" r="3"/>
  </g>
  <g fill="#fffdf5" opacity=".83"><path d="m99 178 4 11 11 4-11 4-4 11-4-11-11-4 11-4z"/><path d="m823 170 3 9 9 3-9 3-3 9-3-9-9-3 9-3z"/></g>
 </svg>;
}
