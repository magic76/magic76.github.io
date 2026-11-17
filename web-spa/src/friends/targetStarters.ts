/** Beginner target-language content, loaded only with the Friend text-chat route. */
type BasicIntent="cafe"|"intro"|"smalltalk";
type PersonalIntent="funny"|"food"|"travel"|"make"|"idea"|"outdoors"|"weekend";
type StarterIntent=BasicIntent|PersonalIntent;
const TARGET_STARTERS:Record<string,Record<BasicIntent,string>>={
 en:{cafe:"Hi {{name}}! A coffee, please.",intro:"Hi {{name}}! I want to introduce myself.",smalltalk:"Hi {{name}}! How are you today?"},
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
const PERSONAL_STARTERS:Record<string,Record<PersonalIntent,string>>={
 en:{funny:"Hi {{name}}! What made you laugh today?",food:"Hi {{name}}! What food do you like?",travel:"Hi {{name}}! Where would you like to go?",make:"Hi {{name}}! What can we make today?",idea:"Hi {{name}}! What is one small idea you have?",outdoors:"Hi {{name}}! Do you like walking outside?",weekend:"Hi {{name}}! What do you do on weekends?"},
 ja:{funny:"こんにちは、{{name}}！今日は何が面白かった？",food:"こんにちは、{{name}}！好きな食べ物は何？",travel:"こんにちは、{{name}}！どこに行きたい？",make:"こんにちは、{{name}}！今日は何を作ろうか？",idea:"こんにちは、{{name}}！何か小さなアイデアはある？",outdoors:"こんにちは、{{name}}！散歩は好き？",weekend:"こんにちは、{{name}}！週末は何をする？"},
 ko:{funny:"안녕, {{name}}! 오늘 뭐가 재미있었어?",food:"안녕, {{name}}! 무슨 음식을 좋아해?",travel:"안녕, {{name}}! 어디에 가고 싶어?",make:"안녕, {{name}}! 오늘 뭘 만들까?",idea:"안녕, {{name}}! 작은 아이디어가 있어?",outdoors:"안녕, {{name}}! 산책 좋아해?",weekend:"안녕, {{name}}! 주말에 뭐 해?"},
 es:{funny:"¡Hola, {{name}}! ¿Qué te hizo reír hoy?",food:"¡Hola, {{name}}! ¿Qué comida te gusta?",travel:"¡Hola, {{name}}! ¿Adónde quieres ir?",make:"¡Hola, {{name}}! ¿Qué podemos hacer hoy?",idea:"¡Hola, {{name}}! ¿Tienes una idea pequeña?",outdoors:"¡Hola, {{name}}! ¿Te gusta pasear?",weekend:"¡Hola, {{name}}! ¿Qué haces el fin de semana?"},
 fr:{funny:"Salut {{name}} ! Qu’est-ce qui t’a fait rire aujourd’hui ?",food:"Salut {{name}} ! Quel plat aimes-tu ?",travel:"Salut {{name}} ! Où veux-tu aller ?",make:"Salut {{name}} ! Qu’est-ce qu’on peut créer ?",idea:"Salut {{name}} ! Tu as une petite idée ?",outdoors:"Salut {{name}} ! Tu aimes te promener ?",weekend:"Salut {{name}} ! Que fais-tu le week-end ?"},
 de:{funny:"Hallo {{name}}! Was war heute lustig?",food:"Hallo {{name}}! Welches Essen magst du?",travel:"Hallo {{name}}! Wohin möchtest du reisen?",make:"Hallo {{name}}! Was können wir heute machen?",idea:"Hallo {{name}}! Hast du eine kleine Idee?",outdoors:"Hallo {{name}}! Gehst du gern spazieren?",weekend:"Hallo {{name}}! Was machst du am Wochenende?"},
 it:{funny:"Ciao {{name}}! Cosa ti ha fatto ridere oggi?",food:"Ciao {{name}}! Quale cibo ti piace?",travel:"Ciao {{name}}! Dove vorresti andare?",make:"Ciao {{name}}! Cosa possiamo creare oggi?",idea:"Ciao {{name}}! Hai una piccola idea?",outdoors:"Ciao {{name}}! Ti piace passeggiare?",weekend:"Ciao {{name}}! Cosa fai nel weekend?"},
 vi:{funny:"Chào {{name}}! Hôm nay điều gì làm bạn cười?",food:"Chào {{name}}! Bạn thích món ăn nào?",travel:"Chào {{name}}! Bạn muốn đi đâu?",make:"Chào {{name}}! Hôm nay mình làm gì nhé?",idea:"Chào {{name}}! Bạn có ý tưởng nhỏ nào không?",outdoors:"Chào {{name}}! Bạn thích đi dạo không?",weekend:"Chào {{name}}! Cuối tuần bạn làm gì?"},
 th:{funny:"สวัสดี {{name}}! วันนี้อะไรทำให้คุณหัวเราะ?",food:"สวัสดี {{name}}! คุณชอบอาหารอะไร?",travel:"สวัสดี {{name}}! คุณอยากไปที่ไหน?",make:"สวัสดี {{name}}! วันนี้เราทำอะไรดี?",idea:"สวัสดี {{name}}! คุณมีไอเดียเล็ก ๆ ไหม?",outdoors:"สวัสดี {{name}}! คุณชอบเดินเล่นไหม?",weekend:"สวัสดี {{name}}! วันหยุดคุณทำอะไร?"},
 zh:{funny:"嗨，{{name}}！今天什麼事讓你笑了？",food:"嗨，{{name}}！你喜歡吃什麼？",travel:"嗨，{{name}}！你想去哪裡玩？",make:"嗨，{{name}}！今天我們做什麼？",idea:"嗨，{{name}}！你有什麼小點子？",outdoors:"嗨，{{name}}！你喜歡散步嗎？",weekend:"嗨，{{name}}！你週末都做什麼？"},
 pt:{funny:"Oi, {{name}}! O que te fez rir hoje?",food:"Oi, {{name}}! Que comida você gosta?",travel:"Oi, {{name}}! Para onde quer ir?",make:"Oi, {{name}}! O que podemos criar hoje?",idea:"Oi, {{name}}! Você tem uma ideia simples?",outdoors:"Oi, {{name}}! Gosta de caminhar?",weekend:"Oi, {{name}}! O que faz no fim de semana?"},
 id:{funny:"Hai {{name}}! Apa yang membuatmu tertawa hari ini?",food:"Hai {{name}}! Kamu suka makanan apa?",travel:"Hai {{name}}! Kamu ingin pergi ke mana?",make:"Hai {{name}}! Mau membuat apa hari ini?",idea:"Hai {{name}}! Punya ide kecil?",outdoors:"Hai {{name}}! Suka jalan-jalan?",weekend:"Hai {{name}}! Akhir pekan biasanya apa?"}
};
const FRIEND_TOPICS:Record<string,readonly StarterIntent[]>={
 zoe:["smalltalk","funny","intro"],hugo:["cafe","food","travel"],
 ada:["intro","make","idea"],max:["smalltalk","outdoors","weekend"],
 noah:["smalltalk","idea","intro"],iris:["make","funny","idea"],
 yuna:["smalltalk","food","intro"],felix:["idea","funny","smalltalk"],
 luna:["funny","make","intro"],theo:["make","idea","smalltalk"],
 isla:["intro","funny","idea"],finn:["outdoors","weekend","food"],
 maya:["travel","food","intro"],oscar:["funny","smalltalk","idea"],
 bella:["weekend","funny","smalltalk"],ryan:["smalltalk","weekend","idea"]
};
/** Each phrase and its UI translation share an intent; Shorts/quote starters take priority upstream. */
export function friendStarterTopics(speaker:string):StarterIntent[]{
 return [...(FRIEND_TOPICS[speaker.trim().toLowerCase()]||["cafe","intro","smalltalk"])];
}
export function targetStarterPhrase(code:string,intent:StarterIntent,name:string){
 const phrase=intent==="cafe"||intent==="intro"||intent==="smalltalk"
  ?TARGET_STARTERS[code]?.[intent]:PERSONAL_STARTERS[code]?.[intent];
 return (phrase||"").replaceAll("{{name}}",name);
}
