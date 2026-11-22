import type {CSSProperties} from "react";
import "./Arrow.css";

export type ArrowDirection="right"|"left"|"up-right"|"down"|"up";
type Props={direction?:ArrowDirection;disabled?:boolean;className?:string;size?:number;style?:CSSProperties};
const paths:Record<ArrowDirection,string>={
 right:"M4 8h8m-4-4 4 4-4 4",
 left:"M12 8H4m4-4L4 8l4 4",
 "up-right":"M4 12 12 4M5 4h7v7",
 down:"M4 6l4 4 4-4",
 up:"M4 10l4-4 4 4"
};
/** Decorative direction glyph. The parent link/button owns the accessible label and touch target. */
export function Arrow({direction="right",disabled=false,className="",size=16,style}:Props){
 return <span aria-hidden="true" className={"crew-arrow "+(disabled?"is-disabled ":"")+className} style={style}>
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false"><path d={paths[direction]}/></svg>
 </span>;
}
