// Character-specific immediate consequences for all 21 conditional life scenes.
type Bilingual=[string,string];
const line=(zh:string,en:string):Bilingual=>[zh,en];
const scenes:Record<string,[Bilingual,Bilingual]>={
 "mira-16-choice":[
  line("Mira 把作品整理成一組照片送出。結果還不知道，但她第一次願意讓別人看見自己的視角。","Mira submits a collection of photographs. The result is uncertain, but she has shown others how she sees the world."),
  line("Mira 和外公把星圖補完。那些夜晚讓她記住：熱愛的事不一定只能選一種。","Mira and Grandpa complete the star map. Those nights remind her that interests need not compete forever.")
 ],
 "mira-25-documentary":[
  line("她帶著相機出門，開始記錄熟悉的街區。錢沒有變多，作品卻慢慢有了新的重量。","She begins photographing familiar streets. The pay remains uncertain, but the work starts to mean something."),
  line("她先留住收入，再利用週末拍下快消失的地方。速度慢了些，卻能持續下去。","Steady clients pay the bills while weekends are spent documenting disappearing places. The pace is slower but sustainable.")
 ],
 "mira-25-starmap":[
  line("合作讓她找到影像和天文之間的共同語言，也認識了一群不同領域的夥伴。","The project brings photography and astronomy together and introduces her to collaborators from other fields."),
  line("短期拍攝讓她知道團隊的工作方式，還保留了之後重新決定的餘地。","A short project helps her understand the team while keeping her options open.")
 ],
 "mira-40-exhibition":[
  line("巡展真的開始了。她也提前替重要的人留出時間，卻仍得學著面對不能兩全的日子。","The tour begins. She protects time for loved ones, even though some days still require difficult compromises."),
  line("本地展覽規模較小，開幕時卻有許多熟悉的面孔，讓作品換了一種方式被看見。","The local exhibition is smaller, but familiar faces at the opening give the photographs a different kind of meaning.")
 ],
 "mira-40-community":[
  line("居民開始帶著家裡的舊照片來找她。原本獨自完成的事，慢慢成了大家的共同記憶。","Neighbours begin bringing family photos. What started as a solo project becomes a shared memory."),
  line("小展覽吸引了一些回應，讓她更清楚大家真正想留下哪些故事。","A modest exhibition draws feedback and helps her learn which stories residents most want to preserve.")
 ],
 "mira-70-archive":[
  line("她先問照片裡的人願不願意公開。展覽開得比較慢，卻讓作品受到更多信任。","She seeks consent from the people in the photographs. The exhibition takes longer, but earns trust."),
  line("數位典藏保留了城市的痕跡，也讓不願公開的人仍能守住自己的故事。","A privacy-aware digital archive preserves the changing city while respecting stories that should remain private.")
 ],
 "mira-70-starlight":[
  line("孩子們一開始只顧著看星星，後來有人學會了自己構圖。她笑著想起外公。","The children start by watching the stars; soon someone learns to frame a photograph. She remembers Grandpa."),
  line("她把舊星圖和新照片排在一起。那些曾經只能自己懂的回憶，變成別人可以翻閱的故事。","She pairs the old star map with new photographs, turning private memories into a small book others can explore.")
 ],
 "ethan-16-audition":[
  line("Ethan 真的報名甄選。他練到手指發酸，但開始相信自己值得被聽見。","Ethan enters the audition. His fingers ache from practice, but he begins believing his music deserves to be heard."),
  line("他先把琴練好，也和家人談清楚下一次機會。夢想沒有結束，只是還沒輪到今天。","He practises and speaks with family about the next opportunity. The dream remains, even without this audition.")
 ],
 "ethan-25-studio":[
  line("第一張作品進度混亂，預算又少，但 Ethan 第一次有機會把自己的想法完整錄下來。","The first release is chaotic and underfunded, but Ethan finally gets to record something he believes in."),
  line("固定工作讓他繳得起房租，夜晚仍留給自己的音樂，只是完成一首歌需要更久。","Steady studio work pays the rent, while evenings remain for his music, even if each song takes longer.")
 ],
 "ethan-25-radio":[
  line("第一集節目不夠順暢，卻有人留言說第一次在電台聽到自己的故事。","The first show is clumsy, but a listener says they heard their own life reflected on air."),
  line("他留在幕後，仔細替每一段人聲找對位置，也開始受到其他製作人的信任。","He stays behind the desk, giving every voice room and gradually earning other producers' trust.")
 ],
 "ethan-40-tour":[
  line("合約接下了，他努力彌補缺席的時間，也發現承諾不能只靠一句『下次一定』。","He takes the contract and tries to make up for missed time, learning that promises need more than words."),
  line("他留在家裡完成約定，並找到一群能一起工作的本地音樂人。","He keeps the family promise and finds local musicians eager to collaborate.")
 ],
 "ethan-40-mentors":[
  line("新人第一次混音並不完美，卻做出 Ethan 從沒想到的聲音，他開始真正學會放手。","The newcomer's first mix is imperfect but contains something Ethan never imagined. He begins learning to let go."),
  line("共同製作花了比較多時間，卻讓兩個人都更明白彼此的長處。","Co-producing takes longer, but both discover what the other does best.")
 ],
 "ethan-70-recordings":[
  line("一些人願意把聲音捐給檔案館，也有人選擇保留。Ethan 尊重每一種答案。","Some people consent to the archive while others keep recordings private. Ethan respects both."),
  line("家人坐在一起聽老錄音，有笑聲，也有很長的沉默。那些聲音不必讓全世界知道。","The family listens together, laughing and sometimes falling quiet. These voices need not belong to the world.")
 ],
 "ethan-70-community":[
  line("第一堂課來的人不多，有個孩子卻第一次錄下了祖母講的故事。","Only a few attend the workshop, but one child records a grandmother's story for the first time."),
  line("長期計畫起步得很慢，卻逐漸讓社區知道：自己的聲音值得留下。","The archive grows slowly, showing the community that its voices are worth remembering.")
 ],
 "hana-16-journey":[
  line("Hana 走出了熟悉的車站。一路上有些慌張，卻也第一次靠自己找到回家的路。","Hana leaves her familiar station. The trip is nervous and imperfect, but she finds her own way home."),
  line("她陪朋友重新走遍巷弄，發現即使是熟悉的地方，換個人同行也會有不同風景。","Exploring familiar streets with visitors reveals how different the same place can look through new eyes.")
 ],
 "hana-25-travel-story":[
  line("她出發採訪陌生人，筆記本漸漸寫滿。每一個故事都讓遠方沒那麼陌生。","She begins interviewing strangers. Her notebook fills, and each story makes the distance feel smaller."),
  line("她用短途旅行慢慢建立作品，也能有空回家整理那些匆忙記下的感受。","Short trips build her portfolio while leaving time to reflect at home.")
 ],
 "hana-25-guides":[
  line("導覽的第一批客人問了很多難回答的問題，Hana 反而更想深入認識自己的城市。","Visitors ask difficult questions, inspiring Hana to learn more about her own city."),
  line("她自己辦的第一場散步活動只有幾個人，卻得到真誠的回饋。","Only a few join her first walking tour, but their feedback is thoughtful and encouraging.")
 ],
 "hana-40-documentary":[
  line("Hana 接下了採訪，提前和身邊的人討論怎麼互相照顧，旅途因此多了一份牽掛。","Hana takes the assignment and arranges support with loved ones, travelling with greater awareness of home."),
  line("她縮短行程，少拍了一些故事，卻也親身經歷了另一段值得記下的生活。","She shortens the trip and misses some stories, but stays for a different kind of meaningful moment.")
 ],
 "hana-40-neighbourhood":[
  line("店主拿出一張舊照片。一起整理時，大家慢慢說出了很多從未被記錄的日常。","A shopkeeper brings an old photograph; sorting it together leads to stories never written down before."),
  line("居民提出自己的界線，導覽因此不那麼熱鬧，卻更尊重真正住在這裡的人。","Residents set boundaries. The walking tour grows quieter but more respectful of those who live there.")
 ],
 "hana-70-worldmap":[
  line("她把人名寫在地名旁邊，發現最珍貴的篇章往往從一次平凡的問路開始。","She writes names beside places and finds that the most meaningful chapters began with ordinary encounters."),
  line("舊旅伴帶來不同的照片和回憶，原來同一趟旅程在每個人心裡都不一樣。","Old companions bring their own photographs and memories, revealing that a shared journey can hold many stories.")
 ],
 "hana-70-citymap":[
  line("孩子們從最熟悉的街口開始畫圖，Hana 看見故事有了新的眼睛。","The children begin mapping a familiar corner, and Hana sees old stories through new eyes."),
  line("故事冊每年都有人補上一頁，這座城市的記憶因此不會停在她自己的年代。","New pages are added each year, allowing the city's memories to keep growing beyond her generation.")
 ]
};
export function lifeArcConsequence(id:string,choice:number,english:boolean):string{
 if(choice===2)return english
  ?"They made the decision themselves. The memory remains, and the next chapter depends on who they have become."
  :"這次他自己做了決定。那段經歷仍然留下痕跡，下一段人生也會受到影響。";
 const value=scenes[id]?.[choice];
 return value?value[english?1:0]:"";
}
export const LIFE_ARC_CONSEQUENCE_COUNT=Object.keys(scenes).length;
