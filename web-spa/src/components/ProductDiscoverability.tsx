import {Arrow} from "./Arrow";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {internationalLearningCopy} from "../i18n/internationalLearningCopy";

type Product="teacher"|"story"|"fortune";
const content={
 teacher:{
  zh:{heading:"用 AI 練習真實對話",intro:"Koolo Teacher 提供 AI 語言老師與 Koolo 朋友兩種練習方式。想針對發音、單字或課程獲得引導，可以選老師；想練習自然交流，則可以和不同背景的 Koolo 朋友聊天。",first:"口說與學習輔助",firstBody:"可從情境課程、單字練習與教材陪讀開始，也能直接使用語音練習。學習進度與記憶可在設定中管理。",second:"沉浸式語言聊天",secondBody:"與 Koolo 朋友延續生活話題，練習在日常情境中組織句子，不必每次都重新開始自我介紹。",action:"選擇 AI 老師",action2:"探索 Koolo 朋友"},
  en:{heading:"Practice languages through real conversations",intro:"Koolo Teacher offers two ways to learn: guided sessions with AI tutors and natural conversations with Koolo Friends. Choose a tutor for focused speaking practice, or a friend for everyday dialogue.",first:"Guided language practice",firstBody:"Explore scenarios, vocabulary, pronunciation and textbook-assisted learning, with voice practice when you are ready.",second:"Everyday conversations",secondBody:"Continue casual topics with Koolo Friends in different conversational styles and practice expressing yourself naturally.",action:"Choose an AI tutor",action2:"Meet Koolo Friends"}
 },
 story:{
  zh:{heading:"一起創作，也能陪孩子閱讀",intro:"Koolo Story 可以建立自己的故事，也能用相機陪讀手上的實體故事書。讀故事和做故事是兩種入口，適合親子共讀與想像力練習。",first:"建立專屬故事",firstBody:"從角色與主題開始創作，完成後在故事書架閱讀，並能繼續編輯。",second:"拿起實體故事書",secondBody:"使用鏡頭與語音協助閱讀家裡的故事書，保留真實翻頁與親子互動。",action:"開始創作故事",action2:"實體書陪讀"},
  en:{heading:"Create stories and read together",intro:"Koolo Story supports original story creation and camera-assisted reading with physical books. It is designed for shared reading, imagination and family storytelling.",first:"Create your own story",firstBody:"Start with a character and a topic, then read and continue editing your stories in the shelf.",second:"Read a physical book",secondBody:"Use your camera and voice to explore a book you already have, keeping the physical reading experience.",action:"Create a story",action2:"Read a physical book"}
 },
 fortune:{
  zh:{heading:"從不同角度探索自己的節奏",intro:"Koolo Fortune 提供八字、塔羅生命靈數與印度占星三種探索方式。不同系統著重的資訊不同，內容適合自我理解與參考，而非代替重要決策。",first:"三種解讀入口",firstBody:"八字聚焦命盤與大運，塔羅生命靈數整理人生主題；印度星盤則從行星、宮位及週期切入。",second:"查看與延續紀錄",secondBody:"可回看目前瀏覽器中的歷史解讀。個人命盤資訊請自行管理，不應視為醫療、法律或投資建議。",action:"開始八字探索",action2:"探索印度占星"},
  en:{heading:"Explore different perspectives on your life",intro:"Koolo Fortune offers Bazi, tarot numerology and Vedic astrology. Each system provides a different reflective framework, not a substitute for important real-world decisions.",first:"Three perspectives",firstBody:"Bazi explores cycles, numerology considers personal themes, and Vedic charts focus on planets and periods.",second:"Review past readings",secondBody:"Return to readings stored in this browser. Interpretations are for reflection, not medical, legal or financial advice.",action:"Explore Bazi",action2:"Explore Vedic astrology"}
 }
} as const;
const links:Record<Product,[string,string]>={
 teacher:["/teacher/roles?mode=teacher","/teacher/roles?mode=friends"],
 story:["/story/create","/story/physical"],
 fortune:["/fortune/reading?mode=bazi","/fortune/reading?mode=vedic"]
};
export function ProductDiscoverability({product}:{product:Product}){
 const {i18n}=useTranslation();
 const locale=i18n.resolvedLanguage==="en"?"en":"zh";
 const market=internationalLearningCopy(i18n.resolvedLanguage||i18n.language);
 const text=product==="teacher"&&market?market.about:content[product][locale];
 return <section className="section crew-product-about" aria-label={text.heading}>
  <div className="section-head"><h2>{text.heading}</h2></div>
  <p>{text.intro}</p>
  <div className="grid two-col">
   <div className="notice"><strong>{text.first}</strong><p>{text.firstBody}</p></div>
   <div className="notice"><strong>{text.second}</strong><p>{text.secondBody}</p></div>
  </div>
  <nav aria-label={text.heading} className="crew-product-about-links">
   <Link className="btn secondary" to={links[product][0]}>{text.action} <Arrow/></Link>
   <Link className="btn secondary" to={links[product][1]}>{text.action2} <Arrow/></Link>
  </nav>
 </section>;
}
