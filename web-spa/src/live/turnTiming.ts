/** Tuned for speaking practice, not an objective CEFR or fluency diagnosis. */
export type TurnTiming={silenceDurationMs:number;endOfSpeechSensitivity:"END_SENSITIVITY_LOW"|"END_SENSITIVITY_HIGH"};
export function turnTimingForLevel(level:string):TurnTiming{
 switch(level){
  case "A1":return{silenceDurationMs:2000,endOfSpeechSensitivity:"END_SENSITIVITY_LOW"};
  case "A2":return{silenceDurationMs:1400,endOfSpeechSensitivity:"END_SENSITIVITY_LOW"};
  case "B1":return{silenceDurationMs:1000,endOfSpeechSensitivity:"END_SENSITIVITY_HIGH"};
  case "B2":return{silenceDurationMs:800,endOfSpeechSensitivity:"END_SENSITIVITY_HIGH"};
  default:return{silenceDurationMs:1200,endOfSpeechSensitivity:"END_SENSITIVITY_HIGH"};
 }
}
