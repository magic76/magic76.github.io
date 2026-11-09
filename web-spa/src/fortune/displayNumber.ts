// Presentation-only formatting: calculation values and saved reading facts stay untouched.
// Use enough precision for planetary coordinates, without binary float artifacts.
const formatter=new Intl.NumberFormat("zh-TW",{
 useGrouping:false,
 maximumFractionDigits:6
});
const weightedFormatter=new Intl.NumberFormat("zh-TW",{
 useGrouping:false,
 maximumFractionDigits:2
});
export function formatFortuneNumber(value:number,weighted=false):string{
 if(!Number.isFinite(value))return "—";
 if(Object.is(value,-0))return "0";
 const display=(weighted?weightedFormatter:formatter).format(value);
 return display==="-0"?"0":display;
}

// Old saved results may contain decimal values serialized as long strings.
// Only normalize full numeric values, never arbitrary dates, text, or identifiers.
export function formatFortuneValue(value:unknown,weighted=false):string{
 if(typeof value==="number")return formatFortuneNumber(value,weighted);
 if(typeof value==="string"&&/^[-+]?[0-9]+[.][0-9]{9,}$/.test(value.trim())){
  const parsed=Number(value);
  if(Number.isFinite(parsed))return formatFortuneNumber(parsed,weighted);
 }
 return value===null||value===undefined?"":String(value);
}


/** Presentation fallback for old saved AI prose. Only shorten obvious float artifacts
 * very close to a two-decimal number; leave coordinates, IDs and other precision intact.
 */
export function formatFortuneProse(value:string):string{
 return value.replace(/(^|[^\d.])(-?\d+\.\d{9,})(?=$|[^\d.])/g,(match,prefix:string,raw:string)=>{
  const number=Number(raw);
  if(!Number.isFinite(number))return match;
  const rounded=Math.round(number*100)/100;
  return Math.abs(number-rounded)<1e-8?prefix+formatFortuneNumber(rounded,true):match;
 });
}
