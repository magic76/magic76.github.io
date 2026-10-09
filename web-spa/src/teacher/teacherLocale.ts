/** Teacher learner-native-language preferences shared by voice prompts and learning UI. */
export const NATIVE_LANGUAGES=[
 ["zh-TW","繁體中文"],["zh-CN","简体中文"],["en","English"],["ja","日本語"],["ko","한국어"],
 ["vi","Tiếng Việt"],["id","Bahasa Indonesia"],["es","Español"],["fr","Français"],
 ["th","ภาษาไทย"],["pt","Português"]
] as const;
export type NativeLanguage=typeof NATIVE_LANGUAGES[number][0];
export function detectNativeLanguage(locale:string=typeof navigator!=="undefined"?navigator.language:"zh-TW"):NativeLanguage{
 const v=locale.toLowerCase();
 if(v.startsWith("zh"))return /cn|sg|hans/.test(v)?"zh-CN":"zh-TW";
 for(const [tag] of NATIVE_LANGUAGES)if(tag!=="zh-TW"&&tag!=="zh-CN"&&v.startsWith(tag))return tag;
 return"en";
}
type TeacherTextKey="memoryTitle"|"nativeLanguage"|"targetLanguage"|"languageHelp"|"teacher"|"practice"|"learn"|"my"|"vocabQuestion"|"right"|"wrong"|"memoryOn"|"memoryOff";
const EN:Record<TeacherTextKey,string>={memoryTitle:"Let your teacher remember how you learn?",nativeLanguage:"My language",targetLanguage:"Language to learn",languageHelp:"The teacher explains difficult points in your language only when needed.",teacher:"Teacher",practice:"Practice",learn:"Learn",my:"My",vocabQuestion:"Select the closest meaning.",right:"Correct",wrong:"Correct answer",memoryOn:"On",memoryOff:"Off"};
const ZH:Record<TeacherTextKey,string>={memoryTitle:"讓老師越來越了解你？",nativeLanguage:"我的母語",targetLanguage:"學習語言",languageHelp:"遇到困難時，老師才會用你的母語簡短協助。",teacher:"老師",practice:"練習",learn:"學習",my:"我的",vocabQuestion:"選出最接近的意思。",right:"答對了",wrong:"正確答案",memoryOn:"已開啟",memoryOff:"已關閉"};
const REST:Partial<Record<NativeLanguage,Partial<Record<TeacherTextKey,string>>>>={
 "zh-CN":{memoryTitle:"让老师越来越了解你？",nativeLanguage:"我的母语",targetLanguage:"学习语言",languageHelp:"只有需要时，老师才会用你的母语简短解释。",practice:"练习",learn:"学习",teacher:"老师",my:"我的",vocabQuestion:"选择最接近的意思。",right:"答对了",wrong:"正确答案"},
 ja:{memoryTitle:"先生にあなたの学習スタイルを覚えてもらいますか？",nativeLanguage:"母語",targetLanguage:"学習する言語",languageHelp:"必要な時だけ母語で説明します。",practice:"練習",learn:"学習",teacher:"先生",my:"マイページ",vocabQuestion:"最も近い意味を選んでください。",right:"正解",wrong:"正解は"},
 ko:{memoryTitle:"선생님이 학습 스타일을 기억하도록 허용할까요?",nativeLanguage:"모국어",targetLanguage:"학습 언어",practice:"연습",learn:"학습",teacher:"선생님",my:"내 학습",vocabQuestion:"가장 가까운 뜻을 선택하세요.",right:"정답",wrong:"정답은"},
 vi:{memoryTitle:"Cho phép giáo viên ghi nhớ cách bạn học?",nativeLanguage:"Tiếng mẹ đẻ",targetLanguage:"Ngôn ngữ học",practice:"Luyện tập",learn:"Học",teacher:"Giáo viên",my:"Của tôi",vocabQuestion:"Chọn nghĩa gần nhất.",right:"Chính xác",wrong:"Đáp án"},
 id:{memoryTitle:"Izinkan guru mengingat cara belajarmu?",nativeLanguage:"Bahasa ibu",targetLanguage:"Bahasa yang dipelajari",practice:"Latihan",learn:"Belajar",teacher:"Guru",my:"Saya",vocabQuestion:"Pilih arti yang paling tepat.",right:"Benar",wrong:"Jawaban"},
 es:{memoryTitle:"¿Permitir que el profesor recuerde cómo aprendes?",nativeLanguage:"Idioma materno",targetLanguage:"Idioma de aprendizaje",practice:"Practicar",learn:"Aprender",teacher:"Profesor",my:"Mi progreso",vocabQuestion:"Elige el significado más cercano.",right:"Correcto",wrong:"Respuesta"},
 fr:{memoryTitle:"Autoriser le professeur à mémoriser votre apprentissage ?",nativeLanguage:"Langue maternelle",targetLanguage:"Langue étudiée",practice:"Pratique",learn:"Apprendre",teacher:"Professeur",my:"Moi",vocabQuestion:"Choisissez le sens le plus proche.",right:"Correct",wrong:"Réponse"},
 th:{memoryTitle:"อนุญาตให้ครูจดจำรูปแบบการเรียนของคุณหรือไม่?",nativeLanguage:"ภาษาแม่",targetLanguage:"ภาษาที่เรียน",practice:"ฝึกฝน",learn:"เรียนรู้",teacher:"ครู",my:"ของฉัน",vocabQuestion:"เลือกความหมายที่ใกล้เคียงที่สุด",right:"ถูกต้อง",wrong:"คำตอบ"},
 pt:{memoryTitle:"Permitir que o professor lembre como você aprende?",nativeLanguage:"Idioma nativo",targetLanguage:"Idioma de estudo",practice:"Praticar",learn:"Aprender",teacher:"Professor",my:"Meu",vocabQuestion:"Escolha o significado mais próximo.",right:"Correto",wrong:"Resposta"}
};
export function teacherText(native:NativeLanguage,key:TeacherTextKey){return REST[native]?.[key]||(native==="zh-TW"?ZH[key]:EN[key])}
export function nativeLanguageName(value:NativeLanguage){return NATIVE_LANGUAGES.find(x=>x[0]===value)?.[1]||"English"}
