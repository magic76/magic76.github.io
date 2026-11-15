const CREATURE_NAMES={
 moonfox:"月狐",stardragon:"星龍",flowerfairy:"花妖精",cat:"小貓咪",
 snowbunny:"雪兔",redpanda:"小熊貓",dolphin:"海豚",phoenix:"鳳凰"
};
const STAGES=["蛋","幼體","成長體","成熟體","完全體"];
const TOPICS={
 food:"食物",cosmos:"宇宙",tech:"科技",travel:"旅行",love:"溫暖",
 weather:"天氣",nature:"自然",dream:"夢境",stress:"心事",play:"遊戲",
 animals:"動物",music:"音樂",snow:"雪",bamboo:"竹林",ocean:"海洋",
 fire:"火焰",daily:"日常"
};
const ID=/^[a-zA-Z0-9._:-]{1,160}$/;

export function validCreatureContext(message){
 if(!message||typeof message!=="object"||message.type!=="CREW_CREATURE_VOICE_CONTEXT")return null;
 const {channelId,creature}=message;
 if(typeof channelId!=="string"||!ID.test(channelId)||!creature||typeof creature!=="object")return null;
 const {line,stage,energy,topic}=creature;
 if(line!==null&&(typeof line!=="string"||!Object.hasOwn(CREATURE_NAMES,line)))return null;
 if(!Number.isInteger(stage)||stage<0||stage>=STAGES.length||(stage>0&&line===null))return null;
 if(!Number.isSafeInteger(energy)||energy<0||energy>9999)return null;
 if(typeof topic!=="string"||!Object.hasOwn(TOPICS,topic))return null;
 return {channelId,creature:{line,stage,energy,topic}};
}

export function creatureVoiceInstruction(creature){
 const name=creature.line?CREATURE_NAMES[creature.line]:"神秘的蛋";
 return "[CREATURE LAB] You and the user are caring for a creature together. "+
  "Current creature: "+name+". Growth stage: "+STAGES[creature.stage]+". "+
  "Recent conversation theme: "+TOPICS[creature.topic]+". "+
  "Keep the conversation natural and bring up the creature when it fits. "+
  "Respect the current stage and do not claim it has evolved before the user evolves it. "+
  "Continue following the user's selected conversation language. [/CREATURE LAB]";
}

export function validCreatureVoiceTurn(turn){
 if(!turn||typeof turn!=="object"||typeof turn.id!=="string"||!ID.test(turn.id))return null;
 if(typeof turn.input!=="string"||typeof turn.output!=="string")return null;
 const input=turn.input.trim(),output=turn.output.trim();
 if(!input||!output)return null;
 return {turnId:turn.id,input:input.slice(0,1200),output:output.slice(0,1200)};
}
