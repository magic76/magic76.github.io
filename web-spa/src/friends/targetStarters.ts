/** Beginner target-language content, loaded only with the Friend text-chat route. */
type StarterIntent="cafe"|"intro"|"smalltalk";
const TARGET_STARTERS:Record<string,Record<StarterIntent,string>>={
 ja:{cafe:"こんにちは、{{name}}！コーヒーをください。",intro:"こんにちは、{{name}}！自己紹介をしたいです。",smalltalk:"こんにちは、{{name}}！今日は元気ですか？"},
 ko:{cafe:"안녕, {{name}}! 커피 한 잔 주세요.",intro:"안녕, {{name}}! 자기소개를 하고 싶어요.",smalltalk:"안녕, {{name}}! 오늘 잘 지내요?"},
 es:{cafe:"¡Hola, {{name}}! Un café, por favor.",intro:"¡Hola, {{name}}! Quiero presentarme.",smalltalk:"¡Hola, {{name}}! ¿Cómo estás hoy?"},
 fr:{cafe:"Salut {{name}} ! Un café, s’il te plaît.",intro:"Salut {{name}} ! J’aimerais me présenter.",smalltalk:"Salut {{name}} ! Comment vas-tu aujourd’hui ?"},
 de:{cafe:"Hallo {{name}}! Einen Kaffee, bitte.",intro:"Hallo {{name}}! Ich möchte mich vorstellen.",smalltalk:"Hallo {{name}}! Wie geht es dir heute?"},
 it:{cafe:"Ciao {{name}}! Un caffè, per favore.",intro:"Ciao {{name}}! Vorrei presentarmi.",smalltalk:"Ciao {{name}}! Come stai oggi?"},
 vi:{cafe:"Chào {{name}}! Cho mình một ly cà phê nhé.",intro:"Chào {{name}}! Mình muốn giới thiệu bản thân.",smalltalk:"Chào {{name}}! Hôm nay bạn khỏe không?"},
 th:{cafe:"สวัสดี {{name}}! ขอกาแฟหนึ่งแก้วนะ",intro:"สวัสดี {{name}}! ฉันอยากแนะนำตัวเอง",smalltalk:"สวัสดี {{name}}! วันนี้สบายดีไหม?"},
 zh:{cafe:"嗨，{{name}}！請給我一杯咖啡。",intro:"嗨，{{name}}！我想自我介紹。",smalltalk:"嗨，{{name}}！你今天好嗎？"},
 pt:{cafe:"Oi, {{name}}! Um café, por favor.",intro:"Oi, {{name}}! Quero me apresentar.",smalltalk:"Oi, {{name}}! Como você está hoje?"},
 id:{cafe:"Hai {{name}}! Kopi satu, ya.",intro:"Hai {{name}}! Aku ingin memperkenalkan diri.",smalltalk:"Hai {{name}}! Apa kabarmu hari ini?"},
};
export function targetStarterPhrase(code:string,intent:StarterIntent,name:string){
 return (TARGET_STARTERS[code]?.[intent]||"").replaceAll("{{name}}",name);
}
