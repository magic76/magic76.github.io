/** Format stored assistant text for display only; never change the resume storage contract. */
export function formatResumePreview(value:string,maxLength=84):string{
 const clean=value.trim().replace(/\s+/g," ").replace(/([.!?。！？…])(?=[\p{L}\p{N}])/gu,"$1 ");
 if(clean.length<=maxLength)return clean;
 const clipped=clean.slice(0,maxLength);
 // Trim at a word boundary for Latin text, while allowing CJK character boundaries.
 const end=clipped.match(/[\p{L}\p{N}]+$/u);
 const crossing=Boolean(end&&/[\p{Script=Latin}0-9]/u.test(end[0])&&/[\p{Script=Latin}0-9]/u.test(clean[maxLength]||""));
 const prefix=crossing?clipped.slice(0,-end![0].length).trimEnd():clipped.trimEnd();
 return (prefix||clean.slice(0,maxLength).trimEnd())+"…";
}
