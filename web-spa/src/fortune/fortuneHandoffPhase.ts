import{computeCurrentPhase}from"./currentPhase";
import type{FortuneReading}from"./types";
/** Only computed transition facts; never forward the profile or an age. */
export function fortuneHandoffPhase(reading:FortuneReading,today=new Date()):string{
 const phase=computeCurrentPhase(reading.mode,reading.result,reading.profile.birthDate,today);
 const parts=["目前："+(phase.current||"未提供"),phase.next?"下一階段："+phase.next:"",phase.transitionYear?"轉折年："+phase.transitionYear:"",phase.remainingYears!==undefined?"剩餘年數："+phase.remainingYears:""];
 return parts.filter(Boolean).join("；").slice(0,200);
}
