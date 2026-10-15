/** Optional homepage conversation goals. Never stored as learner facts or cross-role memory. */
export type ConversationIntent="share"|"speak"|"continue";
export function conversationIntent(raw:string|null,role:"friend"|"teacher"):ConversationIntent|null{
 if(role==="friend"&&(raw==="share"||raw==="speak"))return raw;
 if(role==="teacher"&&raw==="continue")return raw;
 return null;
}
export function conversationOpening(intent:ConversationIntent|null,role:"friend"|"teacher"):string{
 if(!intent)return "";
 if(role==="friend"&&intent==="share")return "[OPTIONAL FRIEND CONVERSATION GOAL — silent instruction] The learner came to share something from their own day. Give them the floor with one warm, short invitation. Listen and respond to the actual content instead of interviewing them. Do not claim to know what happened today, invent earlier chats, teach, or automatically correct. If they change subjects, follow them naturally.";
 if(role==="friend"&&intent==="speak")return "[OPTIONAL FRIEND CONVERSATION GOAL — silent instruction] The learner chose an informal roughly three-minute target-language chat, NOT a test or forced timer. Start with one simple, specific everyday remark in the selected chat language mode. React and share thoughts like a friend, without sentence-by-sentence corrections, teaching, grading, or forced follow-up questions. Let the learner change subject or leave whenever they want.";
 if(role==="teacher"&&intent==="continue")return "[OPTIONAL TEACHER GOAL — silent instruction] Start a tiny speaking practice based ONLY on verified learner memory or a demonstrated learning weakness in your available context. If no verified prior focus exists, openly offer a simple everyday speaking task instead. Do NOT pretend to remember exact past dialogues or assert unfinished homework. Keep it natural, invite one short learner response, and adapt to actual ability. This is normal tutoring, NOT roleplay.";
 return "";
}
