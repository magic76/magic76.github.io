/**
 * Gemini Live Function Calling: small typed actions, not arbitrary generated HTML.
 * The runtime must validate every call with applyMagicCommand before rendering.
 */
export const MAGIC_TOOLS=[{functionDeclarations:[
 {name:"change_world",description:"Change the visible magical world. Use when the player asks to change the location, weather, stars, or time.",parameters:{type:"OBJECT",properties:{
  theme:{type:"STRING",enum:["sky","forest","candy"],description:"World setting: floating islands, enchanted forest or candy world"},
  weather:{type:"STRING",enum:["clear","rain","snow","stars"]},
  time:{type:"STRING",enum:["day","night"]}
 }}},
 {name:"summon_object",description:"Make an interactive new creature or magical object appear on the island, and describe what happens in speech.",parameters:{type:"OBJECT",properties:{
  kind:{type:"STRING",enum:["dragon","chest","portal","tree","owl","crystal"]}
 },required:["kind"]}},
 {name:"cast_spell",description:"Show a magical spell effect on the world.",parameters:{type:"OBJECT",properties:{
  spell:{type:"STRING",enum:["sparkles","fire","wind","heal"]}
 },required:["spell"]}},
 {name:"create_challenge",description:"Create a short child-friendly interactive 3-choice magic riddle or quest. Make exactly one objectively correct answer. Always use the tool instead of reciting choices only.",parameters:{type:"OBJECT",properties:{
  title:{type:"STRING"},question:{type:"STRING"},
  option_a:{type:"STRING"},option_b:{type:"STRING"},option_c:{type:"STRING"},
  correct_option:{type:"STRING",enum:["A","B","C"]},
  feedback:{type:"STRING",description:"Narration after a correct answer"}
 },required:["title","question","option_a","option_b","option_c","correct_option"]}},
 {name:"answer_challenge",description:"Record the player's spoken answer to the active on-screen 3-choice riddle.",parameters:{type:"OBJECT",properties:{
  choice:{type:"STRING",enum:["A","B","C"]}
 },required:["choice"]}},
 {name:"tell_story",description:"Show a very short new story beat in the scene's narration panel. The UI renders text safely; never return HTML, JS or CSS.",parameters:{type:"OBJECT",properties:{
  message:{type:"STRING"}
 },required:["message"]}}
]}];

export function magicSystemPrompt(english:boolean){
 return [
  "You are Lumi, a playful and gentle magic-world guide inside a LIVE interactive website.",
  "The user is actually viewing a floating enchanted island with a changing backdrop, creatures and interactive cards.",
  "Respond naturally, in short sentences and with a sense of wonder. Ask one simple follow-up question at a time.",
  "The UI can change only by the provided tools. Call them promptly for the user's imaginative requests.",
  "For puzzles, call create_challenge so the player can TAP choices. When the user gives a SPOKEN answer, call answer_challenge.",
  "Build on the existing world, not reset it. Do not claim an object, location or puzzle is rendered unless a corresponding tool succeeded.",
  "Available settings are sky/forest/candy; rain/snow/stars/clear; day/night; summon dragon/chest/portal/tree/owl/crystal.",
  "If a tool fails, apologize briefly and offer a different action. Never show code or speak technical API instructions.",
  "Never ask for personal information or make scary threats. Keep all stories family-friendly.",
  english?"Speak primarily in English, but follow a user who prefers another language.":"Speak in Traditional Chinese by default, but match the player's language."
 ].join("\n");
}
