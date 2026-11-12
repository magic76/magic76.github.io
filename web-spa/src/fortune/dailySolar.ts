import type {SolarEngine} from "./dailyCard";

/** Civil-date arithmetic matching lunar-javascript's day GanZhi (no runtime scripts). */
export function dailyGanZhi(year:number,month:number,day:number):string{
 const epochDays=Math.floor(Date.UTC(year,month-1,day)/86400000);
 const index=((epochDays+17)%60+60)%60;
 return "甲乙丙丁戊己庚辛壬癸"[index%10]+"子丑寅卯辰巳午未申酉戌亥"[index%12];
}
export const DAILY_SOLAR:SolarEngine={fromYmd:(year,month,day)=>({getLunar:()=>({
 getDayInGanZhi:()=>dailyGanZhi(year,month,day)
})})};
