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
 return (weighted?weightedFormatter:formatter).format(value);
}

// Old saved results may contain decimal values serialized as long strings.
// Only normalize full numeric values, never arbitrary dates, text, or identifiers.
export function formatFortuneValue(value:unknown,weighted=false):string{
 if(typeof value==="number")return formatFortuneNumber(value,weighted);
 if(typeof value==="string"&&/^[-+]?\\d+\\.\\d{9,}$/.test(value.trim())){
  const parsed=Number(value);
  if(Number.isFinite(parsed))return formatFortuneNumber(parsed,weighted);
 }
 return value===null||value===undefined?"":String(value);
}
