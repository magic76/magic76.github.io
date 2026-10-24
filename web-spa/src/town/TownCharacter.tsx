import {useId} from "react";

/**
 * Consistent illustrated isometric actors. They intentionally don't reuse the
 * photorealistic profile portraits inside the stage; those stay in the detail
 * panel so the miniature-world art direction remains coherent.
 */
export type TownCharacterId="zoe"|"yuna"|"theo"|"hugo"|"bella"|"noah";
const SKIN:Record<TownCharacterId,string>={
 zoe:"#f3cdb5",yuna:"#f2d2ba",theo:"#dfb79f",
 hugo:"#e6c4a6",bella:"#dfab95",noah:"#e7c0aa"
};

export function TownCharacter({id,coat,hair}:{id:TownCharacterId;coat:string;hair:string}){
 const seed=useId().replace(/:/g,"");
 const face=SKIN[id];
 const long=id==="zoe"||id==="bella";
 const side=id==="yuna"||id==="noah";
 const curly=id==="bella";
 return <svg className="crew-town-character-svg" viewBox="0 0 60 96" fill="none" aria-hidden="true" focusable="false">
  <defs>
   <linearGradient id={seed+"coat"} x1="0" y1="0" x2="1" y2=".8"><stop stopColor={coat}/><stop offset="1" stopColor="#514c65" stopOpacity=".78"/></linearGradient>
   <linearGradient id={seed+"skin"} x1="0" y1="0" x2=".9" y2="1"><stop stopColor="#fff0db"/><stop offset=".5" stopColor={face}/><stop offset="1" stopColor="#bd908a"/></linearGradient>
  </defs>
  <path d="M20 66l-2 17q1 4 6 4h4l3-18ZM32 69l4 15q5 3 10 0l-4-20Z" fill="#626a6c"/>
  <path d="M16 83q-4 6 4 7h10q3-4-2-7ZM36 82q0 5 6 7h8q3-5-5-8Z" fill="#5d5555"/>
  {long&&<path d="M13 23Q10 2 30 3Q51 6 48 27L51 50L39 47L19 47L10 49Z" fill={hair}/>}
  <path d="M17 47Q15 52 11 70Q26 81 49 69L44 50Q40 44 34 43L24 43Q20 44 17 47Z" fill={"url(#"+seed+"coat)"} stroke="#fff4dd" strokeWidth="1.1"/>
  <path d="M20 44L27 54L20 67M40 44L34 54L41 66" stroke="#f9ddc3" strokeWidth="2" strokeOpacity=".66"/>
  <path d="M28 50v22" stroke="#f9ead1" strokeWidth="1.5" opacity=".75"/>
  <circle cx="28" cy="58" r="1.4" fill="#fff3df"/><circle cx="29" cy="67" r="1.4" fill="#fff3df"/>
  <path d="M16 52Q8 56 12 68L16 72Q20 72 21 67L20 52" fill={coat} stroke="#f0d2ba" strokeWidth="1.2"/>
  <path d="M44 52Q52 58 49 71L44 74Q40 71 40 67L40 52" fill={coat} stroke="#f0d2ba" strokeWidth="1.2"/>
  <path d="M11 69l5 6q5 0 5-5l-7-6Z" fill={face}/>
  <path d="M46 70l-3 7q-5 1-5-6l5-5Z" fill={face}/>
  <path d="M25 37v11q5 8 10 0V38" fill={face}/>
  <path d="M15 19Q15 7 29 6Q44 7 44 22L43 35Q37 44 29 45Q20 44 17 35Z" fill={"url(#"+seed+"skin)"} stroke="#ab8679" strokeOpacity=".24" strokeWidth="1.2"/>
  <path d="M17 31q-5-3-5 2q0 5 5 6M43 32q5-4 5 2q0 4-5 5" fill={face}/>
  <path d="M20 28Q24 26 27 28M33 28q4-2 8 1" stroke="#765b56" strokeWidth="1.6" strokeLinecap="round"/>
  <ellipse cx="24" cy="32" rx="1.45" ry="2" fill="#534847"/>
  <ellipse cx="37" cy="32" rx="1.45" ry="2" fill="#534847"/>
  <path d="M30 34l-1 4q2 1 4 0" stroke="#b98981" strokeWidth="1.2" strokeLinecap="round"/>
  <path d={id==="noah"?"M27 41q4-1 7-1":"M27 40q4 4 8-1"} stroke="#a57271" strokeWidth="1.3" strokeLinecap="round"/>
  <ellipse cx="20" cy="37" rx="3.3" ry="1.7" fill="#db908d" opacity=".3"/>
  <ellipse cx="41" cy="37" rx="3.3" ry="1.7" fill="#db908d" opacity=".3"/>
  {side?<path d="M13 29Q7 4 27 5Q45 2 48 24L42 24Q34 16 31 15Q24 23 16 24Z" fill={hair}/>:null}
  {!side&&!long&&<path d="M16 30Q8 12 22 7Q43 -2 48 20L45 29Q39 13 32 18L27 14Q23 24 16 30Z" fill={hair}/>}
  {long&&!curly&&<path d="M15 28Q11 10 27 7Q42 5 47 26Q41 22 38 14Q27 23 18 24Z" fill={hair}/>}
  {curly&&<g fill={hair}>
   <circle cx="17" cy="14" r="10"/><circle cx="26" cy="8" r="9"/>
   <circle cx="37" cy="9" r="10"/><circle cx="45" cy="17" r="9"/>
   <circle cx="12" cy="28" r="6.7"/><circle cx="47" cy="30" r="6.7"/>
  </g>}
  {id==="theo"&&<g stroke="#566d71" strokeWidth="2" fill="none">
   <rect x="18" y="29" width="11" height="8" rx="3"/>
   <rect x="32" y="29" width="11" height="8" rx="3"/>
   <path d="M29 32h3M17 31l-3-2M44 31l3-2"/>
  </g>}
  {id==="hugo"&&<><path d="M22 45q12 8 21 0l-4 10q-12 4-19-1Z" fill="#f0d3a0"/><path d="M40 53l4 14" stroke="#dfb77f" strokeWidth="6"/></>}
  {id==="bella"&&<><path d="M45 61q10-1 11 11l-4 10l-14-2l3-12Z" fill="#dfc399" stroke="#b99079" strokeWidth="1.5"/><path d="M45 62q-4-10-1-12" stroke="#f7e5cf" strokeWidth="2"/></>}
  {id==="zoe"&&<path d="M22 47q7 3 14 0" stroke="#fff4eb" strokeWidth="2.5" strokeLinecap="round"/>}
  {id==="noah"&&<path d="M25 9q10-6 21 4" stroke="#f2e4d2" opacity=".25" strokeWidth="3" strokeLinecap="round"/>}
  <path d="M21 12q9-7 16-2" stroke="#ffffff" strokeWidth="2" opacity=".13" strokeLinecap="round"/>
 </svg>;
}
