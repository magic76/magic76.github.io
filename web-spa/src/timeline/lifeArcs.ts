import type {LifeEvent,LifeTrait,LocalizedText} from "./lifeEvents";
import type {TimelineCharacterId} from "./timelineCharacters";

// Separate, authored alternate biographies. Never mutates canonical Timeline biographies.
// Each of these stories is deliberately conditional on a recorded earlier decision.
export type LifePath="bold"|"steady";
type ArcChapter={base?:LifeEvent;bold?:LifeEvent;steady?:LifeEvent};
const tr=(zh:string,en:string):LocalizedText=>({zh,en});
const arc=(age:number,id:string,trait:LifeTrait,title:[string,string],story:[string,string],
 first:[string,string],second:[string,string]):LifeEvent=>({
 id,age,trait,title:tr(...title),story:tr(...story),
 choices:[tr(...first),tr(...second),tr("讓他自己決定","Let them decide")]
});
const chapters:Record<TimelineCharacterId,Record<16|25|40|70,ArcChapter>>={
 mira:{
 16:{base:arc(16,"mira-16-choice","courage",["鏡頭與星空的岔路","Camera or constellations"],
 ["Mira 同時收到攝影徵件和天文社的觀測邀請。兩個都很重要，但只能全心準備一件事。","Mira is invited to a photo exhibition and an astronomy project on the same weekend. Both matter, but she cannot fully pursue both."],
 ["鼓勵她交出紀實攝影作品","Submit her documentary photographs"],["陪她完成外公的星圖","Finish the star map with Grandpa"])},
 25:{
  bold:arc(25,"mira-25-documentary","ambition",["一份不穩定的紀實邀約","An uncertain documentary offer"],
  ["當年敢把照片交出去的 Mira，如今收到長期街區紀錄計畫的邀請。收入不穩定，但她想拍下那些會消失的地方。","After daring to exhibit her work as a teen, Mira is offered a documentary project about neighbourhoods at risk of disappearing. The pay is uncertain."],
  ["接受紀實計畫並承擔風險","Accept the documentary assignment"],["保留穩定接案，週末自己拍","Keep steady clients and film on weekends"]),
  steady:arc(25,"mira-25-starmap","trust",["科學影像的合作邀請","An invitation to visualise science"],
  ["曾經和外公完成星圖的 Mira，受邀替一座小型天文館拍攝影像。她既喜歡科學，也怕失去自由創作的時間。","Years after finishing a star map with Grandpa, Mira is invited to work with a small planetarium. She loves science but fears losing her artistic freedom."],
  ["接下天文館的跨領域合作","Join the planetarium project"],["先以短期合作確認方向","Try a limited collaboration"])
 },
 40:{
  bold:arc(40,"mira-40-exhibition","empathy",["巡迴攝影展與家人約定","An exhibition and a family promise"],
  ["Mira 的紀實作品有機會巡展，但第一站撞上她承諾陪伴家人的重要日子。她開始想起 25 歲時為理想做的選擇。","Mira's documentary work could go on tour, but opening night clashes with a family promise. Her choices at twenty-five weigh on her."],
  ["接受巡展，提前安排陪伴時間","Accept the tour and make time for family"],["選擇本地展覽，讓重要的人參與","Hold a local exhibition with loved ones"]),
  steady:arc(40,"mira-40-community","trust",["把影像留給社區","Making photographs useful to a community"],
  ["多年影像工作的經驗，讓 Mira 有機會幫居民建立地方影像檔案。案子沒什麼名氣，卻可能留下真正重要的東西。","Mira could create a community photo archive. It is unlikely to win fame but may preserve things people care about."],
  ["帶領居民親自拍攝與整理","Teach residents to document their lives"],["先用小規模展覽測試需求","Start with a modest exhibition"])
 },
 70:{
  bold:arc(70,"mira-70-archive","empathy",["最後一卷底片","The last roll of film"],
  ["七十歲的 Mira 翻出多年前街區變遷的底片。她得決定如何公開作品，也必須尊重照片裡的人。","At seventy, Mira discovers old negatives documenting changes to a neighbourhood. Sharing them means considering the privacy of people in the frames."],
  ["和當事人一起整理公開展覽","Curate an exhibition with the subjects"],["先做保留隱私的數位典藏","Build a privacy-aware digital archive"]),
  steady:arc(70,"mira-70-starlight","courage",["把星空交給下一代","Passing down the night sky"],
  ["外公的星圖一直伴著 Mira。如今附近的孩子想跟她學拍夜空，她考慮是否帶大家再次走向海邊。","Grandpa's star map has stayed with Mira. Local children ask her to teach them to photograph the night sky."],
  ["帶孩子去海邊記錄星光","Take the children on a night-sky walk"],["把星圖和照片整理成小冊子","Make a small photo book and star guide"])
 }
 },
 ethan:{
 16:{base:arc(16,"ethan-16-audition","courage",["音樂學院甄選","The music school audition"],
 ["Ethan 夢想進錄音室，卻遇到交通費與家庭活動撞期。他害怕參加後才發現自己沒有天分。","Ethan dreams of recording music, but an audition clashes with family plans and costs money he does not have."],
 ["鼓勵他報名，設法籌措交通費","Apply and plan for the travel costs"],["先留下來練琴，穩住家裡的安排","Practice at home and protect family plans"])},
 25:{
  bold:arc(25,"ethan-25-studio","ambition",["自己做唱片還是領薪水？","Start a label or take a studio job?"],
 ["Ethan 十六歲敢報名甄選的經驗，讓他一直想做自己的音樂。現在獨立廠牌邀請他入夥，薪水卻不穩定。","The audition gave Ethan a taste for taking musical risks. A small independent label now offers him a partnership without dependable income."],
 ["加入獨立廠牌，試做第一張唱片","Join the label and produce its first album"],["先接穩定錄音工作，再慢慢製作","Take steady studio work and produce on the side"]),
  steady:arc(25,"ethan-25-radio","trust",["社區廣播的機會","A place in community radio"],
 ["Ethan 留下來磨練錄音技巧，逐漸認識一些社區音樂人。當地電台邀他設計節目，他不知道這算不算走向夢想。","Ethan honed his recording skills and met local musicians. A community radio station now asks him to build a show."],
 ["幫電台開一個自己的節目","Create a community radio programme"],["先擔任幕後音效製作","Work as a behind-the-scenes producer"])
 },
 40:{
  bold:arc(40,"ethan-40-tour","empathy",["一份海外錄音合約","An overseas recording contract"],
 ["Ethan 的作品得到海外巡演錄音邀請；但他曾答應陪家人參加一場重要演出，這一次他不想輕易失約。","Ethan's productions attract an overseas live-recording offer, but it overlaps an important family performance."],
 ["接下海外合約並安排補償","Take the contract and plan time together"],["留下來完成承諾，另找合作","Keep the promise and seek local collaborators"]),
  steady:arc(40,"ethan-40-mentors","trust",["把工作交給年輕錄音師","Letting a young engineer lead"],
 ["Ethan 的工作室逐漸受到信任。年輕錄音師想主導一個重要計畫，他卻擔心交出去會出錯。","Ethan's studio has earned trust. A younger engineer wants to lead an important project, but handing over control is hard."],
 ["給新人完整主導權","Let the newcomer lead"],["兩人共同製作並逐步交接","Co-produce and hand over gradually"])
 },
 70:{
  bold:arc(70,"ethan-70-recordings","trust",["留給世界的聲音","Voices worth preserving"],
 ["Ethan 整理一生錄下的聲音。有些記錄適合分享，有些包含私人對話，他需要作出謹慎決定。","Ethan sorts decades of recordings. Some are worth sharing; others capture private conversations."],
 ["先取得同意再捐給公共檔案館","Seek consent before donating to an archive"],["和家人整理成私人聲音盒","Make a private family sound collection"]),
  steady:arc(70,"ethan-70-community","empathy",["每個人都有值得聽的故事","Every voice has a story"],
 ["年輕時的錄音技巧如今能幫助社區記下珍貴故事。Ethan 有機會教一批年輕人自己錄音。","Ethan can now teach young people to record the stories of their community."],
 ["開一堂免費錄音工作坊","Host a free recording workshop"],["替社區建立長期錄音計畫","Plan a long-term community archive"])
 }
 },
 hana:{
 16:{base:arc(16,"hana-16-journey","courage",["第一張遠行車票","Her first ticket away"],
 ["Hana 很想搭上前往陌生城市的列車。家人擔心，她也不確定一個人是否能應付旅途。","Hana wants to take a train to an unfamiliar city. Her family worries, and she is uncertain about going alone."],
 ["做好計畫，去看看外面的世界","Plan carefully and take the trip"],["先帶外地朋友探索自己的城市","Explore her own city with visiting friends"])},
 25:{
  bold:arc(25,"hana-25-travel-story","ambition",["去遠方寫故事","Stories far from home"],
 ["十六歲的旅程讓 Hana 迷上陌生街道。現在一家小刊物邀請她長期到不同地方採訪，收入卻不保證。","A teenage journey sparked Hana's curiosity. A small magazine offers her an uncertain job collecting stories far from home."],
 ["接受採訪邀約，走出熟悉城市","Accept the roaming assignment"],["先以短期旅行建立作品集","Build a portfolio through shorter trips"]),
  steady:arc(25,"hana-25-guides","trust",["把故鄉介紹給陌生人","Show visitors the hometown she loves"],
 ["Hana 早年陪朋友探索京都小巷，慢慢整理出自己的街區筆記。如今有團隊邀她設計在地步行體驗。","Showing friends Kyoto's back streets helped Hana build a detailed local notebook. A team wants her to design walking experiences."],
 ["加入地方導覽團隊","Join the neighbourhood guide team"],["自己推出小規模步行企劃","Launch a small walking project"])
 },
 40:{
  bold:arc(40,"hana-40-documentary","empathy",["遠方紀錄與熟悉的人","The long assignment"],
 ["Hana 可以參與一場長達數月的跨國文化紀錄，卻也知道身邊重要的人正需要她。","Hana is invited to a months-long cultural documentary project abroad while someone close needs her at home."],
 ["接受任務，建立互相照顧的安排","Take the assignment and arrange support"],["縮短旅程，將重要日子留給家人","Shorten the trip and protect family time"]),
  steady:arc(40,"hana-40-neighbourhood","trust",["小巷的老店要關了","The shop at the end of the lane"],
 ["Hana 熟悉的街區有幾家老店準備關門。她想留下這些故事，但居民擔心訪客打擾生活。","Several beloved neighbourhood shops are closing. Hana wants to preserve their stories without overwhelming residents with visitors."],
 ["跟店主一起製作低調的街區記錄","Document stories with the shopkeepers"],["和居民討論合適的導覽方式","Plan respectful local walks with residents"])
 },
 70:{
  bold:arc(70,"hana-70-worldmap","empathy",["一本未完成的旅行地圖","The unfinished travel map"],
 ["Hana 把許多年的路線與故事攤在桌上，發現最難忘的常常不是景點，而是遇見的人。","Hana spreads decades of maps on a table and realises that the people mattered more than the destinations."],
 ["把旅途的人物故事寫成書","Write a book about the people met"],["邀請旅伴一起補上彼此的版本","Invite travelling companions to tell their side"]),
  steady:arc(70,"hana-70-citymap","courage",["把城市故事留在街角","A city map that belongs to everyone"],
 ["Hana 手中有多年街區筆記。附近的孩子想知道從前的生活，她考慮怎麼讓這些記憶繼續流動。","Hana has decades of neighbourhood notes. Local children ask what the streets used to be like."],
 ["帶孩子一起走一趟故事地圖","Walk the story map with local children"],["做一本可以持續更新的地方故事冊","Create a living neighbourhood storybook"])
 }
 }
};
export const LIFE_ARC_EVENTS:LifeEvent[]=
 (Object.values(chapters) as Record<16|25|40|70,ArcChapter>[]).flatMap(stages=>
  (Object.values(stages) as ArcChapter[]).flatMap(stage=>[stage.base,stage.bold,stage.steady].filter((item):item is LifeEvent=>!!item)));
export function characterArcEvent(character:TimelineCharacterId,age:16|25|40|70,branch:LifePath):LifeEvent{
 const stage=chapters[character][age];
 const selected=stage.base||(branch==="bold"?stage.bold:stage.steady);
 if(!selected)throw new Error("Missing life arc for "+character+":"+age+":"+branch);
 return selected;
}
