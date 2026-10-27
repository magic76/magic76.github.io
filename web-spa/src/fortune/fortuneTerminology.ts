const planets:Record<string,string>={Sun:"太陽",Moon:"月亮",Mars:"火星",Mercury:"水星",Jupiter:"木星",Venus:"金星",Saturn:"土星",Rahu:"北交點",Ketu:"南交點"};
const signs:Record<string,string>={Aries:"牡羊座",Taurus:"金牛座",Gemini:"雙子座",Cancer:"巨蟹座",Leo:"獅子座",Virgo:"處女座",Libra:"天秤座",Scorpio:"天蠍座",Sagittarius:"射手座",Capricorn:"摩羯座",Aquarius:"寶瓶座",Pisces:"雙魚座"};
const periods:Record<string,string>={Lagna:"上升",Mahadasha:"大運期",Antardasha:"次運期",Nakshatra:"星宿",Gochar:"行運",Vimshottari:"行星大運"};
/** Shared display mapping; calculated evidence stays unmodified. */
export function formatVedicTerm(raw:unknown,locale:string):string{
 let text=String(raw??"");
 if(locale!=="zh-TW"){
  return text.replace(/H(\d{1,2})\b/g,"House $1").replace(/第\s*(\d+)\s*宮/g,"House $1")
   .replace(/(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\s+(?:牡羊|金牛|雙子|巨蟹|獅子|處女|天秤|天蠍|射手|摩羯|寶瓶|雙魚)/g,"$1");
 }
 // One pass avoids translating English a second time inside the new parentheses.
 const terms={...planets,...signs,...periods};
 return text.replace(/H(\d{1,2})\b/g,(_,n)=>"第 "+n+" 宮")
  .replace(/第\s*(\d+)\s*宮/g,(_,n)=>"第 "+n+" 宮")
  .replace(/\b(?:Antardasha|Mahadasha|Nakshatra|Vimshottari|Lagna|Gochar|Sagittarius|Capricorn|Aquarius|Scorpio|Gemini|Cancer|Aries|Taurus|Virgo|Libra|Pisces|Leo|Jupiter|Saturn|Mercury|Venus|Mars|Rahu|Ketu|Moon|Sun)\b(?:\s+(?:牡羊|金牛|雙子|巨蟹|獅子|處女|天秤|天蠍|射手|摩羯|寶瓶|雙魚))?/g,
   match=>{const token=match.split(" ")[0];return terms[token]?terms[token]+"（"+token+"）":match});
}
