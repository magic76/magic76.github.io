// New optional simulator content. Existing Timeline biographies and portraits are canonical and untouched.
export type LifeTrait="courage"|"trust"|"ambition"|"empathy";
export type LocalizedText={zh:string;en:string};
export type LifeEvent={id:string;age:number;trait:LifeTrait;title:LocalizedText;story:LocalizedText;choices:[LocalizedText,LocalizedText,LocalizedText]};
const t=([zh,en]:[string,string]):LocalizedText=>({zh,en});
const watch=t(["先不介入，看看會怎樣","Let them decide"]);
const event=(age:number,id:string,trait:LifeTrait,title:[string,string],story:[string,string],first:[string,string],second:[string,string]):LifeEvent=>({
 id,age,trait,title:t(title),story:t(story),choices:[t(first),t(second),watch]
});
export const LIFE_EVENTS:LifeEvent[]=[
 event(7,"first-stage","courage",["第一次站上台","The first performance"],["班上邀請大家分享自己的作品。站在大家面前，比想像中更可怕。","The class invites everyone to share something they made. Standing up feels frightening."],["鼓勵他勇敢試試","Encourage them to try"],["陪他先練習一次","Practice together first"]),
 event(7,"shared-toy","empathy",["只能選一個玩伴","Choosing a playmate"],["兩個朋友同時邀請他玩遊戲，但時間只夠答應一個人。","Two friends invite them to play, but there is only time for one."],["讓他主動邀請大家一起玩","Invite everyone to join"],["陪他向另一個朋友解釋","Help explain the choice"]),
 event(7,"broken-gift","trust",["弄壞了珍貴的禮物","A broken keepsake"],["一個很珍惜的東西不小心壞掉了，他擔心說出實情會讓家人失望。","An important keepsake breaks, and telling the truth feels scary."],["鼓勵他坦白","Encourage honesty"],["先陪他想修復辦法","Help find a repair"]),
 event(10,"team-lead","courage",["誰來當隊長？","Who should lead?"],["一個小組計畫需要隊長。大家遲遲不開口，卻都期待有人帶頭。","A school project needs a leader. Everyone is waiting for someone else."],["鼓勵他自願帶隊","Volunteer to lead"],["建議他幫別人一起完成","Support another leader"]),
 event(10,"friend-secret","trust",["朋友的秘密","A friend's secret"],["朋友分享了一件心事，另一位同學卻一直追問。","A friend confides something while another classmate demands to know."],["請他尊重朋友的秘密","Keep the confidence"],["鼓勵他先問朋友需要什麼","Ask what the friend needs"]),
 event(13,"class-rumour","trust",["一句被傳開的話","A rumour spreads"],["一段原本私下說的話被同學誤傳，大家開始用奇怪的眼光看他。","A private comment gets repeated incorrectly, and classmates start staring."],["直接向大家解釋","Speak up openly"],["先找信任的人釐清","Talk to a trusted person"]),
 event(13,"first-project","ambition",["不被看好的作品","An unlikely project"],["他有個很喜歡的點子，身邊的人卻覺得不值得浪費時間。","They love an idea that others dismiss as a waste of time."],["鼓勵他做出第一個版本","Build a first version"],["建議他先蒐集回饋","Collect feedback first"]),
 event(13,"friend-distance","empathy",["好友漸漸疏遠","Growing apart"],["以前總是一起玩的朋友突然變忙，兩個人越來越少說話。","A close friend is suddenly busy, and the friendship feels different."],["主動約朋友聊聊","Reach out and talk"],["尊重彼此新的生活","Give each other space"]),
 event(16,"audition","courage",["重要甄選","The big audition"],["一個與夢想有關的甄選來了，但準備不足、時間與家裡的安排都有衝突。","An exciting audition arrives, but preparation and family plans collide."],["鼓勵他報名挑戰","Take the chance"],["先和家人討論現實安排","Plan with family first"]),
 event(16,"moving-away","trust",["要離開熟悉的地方嗎？","Leaving home behind"],["一個新機會可能意味著離開熟悉的朋友與生活。","A new opportunity could mean leaving friends and familiar places."],["鼓勵他走出去看看","Explore the new place"],["先和重要的人談談","Talk it through first"]),
 event(16,"misunderstood","empathy",["被誤會的那一天","The misunderstanding"],["好友以為他故意失約，兩人都不願意先開口。","A friend believes they were deliberately stood up. Neither wants to speak first."],["主動道歉並解釋","Apologize and explain"],["先聽對方的感受","Listen before responding"]),
 event(19,"new-city","courage",["陌生城市的第一晚","First night in a new city"],["換了新的生活環境，今天晚上突然覺得自己沒有任何熟人。","In a new place, an ordinary evening suddenly feels lonely."],["鼓勵他走出門認識人","Go meet someone"],["陪他聯絡老朋友","Reconnect with old friends"]),
 event(19,"group-invite","trust",["第一次受邀加入團隊","An invitation to join"],["一群人邀他加入新的計畫，大家熱情，但彼此還不熟悉。","A new group invites them to a project, but nobody knows each other well."],["接受邀請，先做再說","Join and try"],["先問清楚分工與期待","Clarify expectations first"]),
 event(19,"first-failure","ambition",["第一次真正的失敗","The first big setback"],["花了很多時間的努力沒有結果，他開始懷疑自己是否適合這條路。","A major effort fails and makes them question the path ahead."],["鼓勵他再試一次","Try once more"],["先停下來找原因","Review what went wrong"]),
 event(22,"unpaid-work","ambition",["夢想工作卻沒有報酬","A dream job without pay"],["一個很想參與的計畫沒有合理報酬，另一份工作則可以支付生活開銷。","An exciting project offers little pay while practical work covers the bills."],["為理想爭取一次機會","Take a calculated chance"],["優先確保基本生活","Secure stability first"]),
 event(22,"hard-no","trust",["第一次說不","Learning to say no"],["熟人要求他接下超出負荷的事情，拒絕似乎又會破壞關係。","Someone asks for an unreasonable favour. Saying no might hurt the relationship."],["清楚說明自己的界線","Set a firm boundary"],["提出可負擔的替代方案","Offer a smaller commitment"]),
 event(25,"dream-or-pay","ambition",["理想與穩定的岔路","Dreams or steady pay"],["眼前有兩個方向：一個有穩定收入，另一個充滿不確定卻很有熱情。","Two paths appear: stable income or a risky project with meaning."],["試著追求想做的事","Pursue the passion"],["先建立穩定的基礎","Build a safety net"]),
 event(25,"collaboration","trust",["和陌生人合作","Trusting a new partner"],["一位陌生人提出合作，機會吸引人，但還沒建立足夠的信任。","A stranger suggests a promising collaboration before trust has been earned."],["小規模試著合作","Test a small partnership"],["先確認彼此的承諾","Set expectations clearly"]),
 event(25,"new-start","courage",["換個地方重新開始","A fresh start"],["熟悉的城市讓人安心，但也好像限制了未來的可能。","The familiar city feels safe, yet opportunities seem limited."],["鼓勵他踏出舒適圈","Make the move"],["先安排一段短期體驗","Try a short visit"]),
 event(35,"big-offer","ambition",["讓人心動的邀約","The big offer"],["一個重要邀約能帶來成就，卻可能犧牲許多陪伴家人的時間。","A prestigious offer promises recognition but costs time with loved ones."],["接下挑戰並承擔代價","Accept the challenge"],["先談出能維持生活的條件","Negotiate a balance"]),
 event(35,"old-friend","empathy",["一段快失去的友誼","A fading friendship"],["多年好友因一次爭執不再聯絡，兩個人似乎都等著對方先找自己。","Long-time friends stop speaking after an argument."],["先放下面子聯絡對方","Reach out first"],["寫下想說的話慢慢整理","Work through feelings first"]),
 event(40,"work-family","empathy",["承諾與工作撞期","A promise on the same day"],["早已答應陪伴重要的人，偏偏同一天工作出現無法忽視的急事。","A personal promise clashes with an urgent work request."],["守住原本的承諾","Keep the promise"],["想辦法安排替代人手","Find another solution"]),
 event(40,"truth-cost","trust",["說實話的代價","The cost of honesty"],["發現一個可能影響團隊的錯誤，說出來會讓自己也很難堪。","A mistake could affect the team, and admitting it is embarrassing."],["直接承認並負責","Own the mistake"],["先找人確認修正方式","Verify and plan a fix"]),
 event(50,"mentor","empathy",["把舞台交給新人","Passing the spotlight"],["一位年輕人很有潛力，但交出重要工作難免會擔心品質。","A promising newcomer could lead, but letting go is difficult."],["給對方真正的主導權","Let them lead"],["先一起做一個小專案","Start with a small project"]),
 event(50,"new-chapter","courage",["五十歲的新學習","Starting something new at fifty"],["有件想學很久的事，現在開始好像太晚，但放棄又不甘心。","A long-delayed dream feels too late to begin."],["從今天開始學","Begin today"],["先安排適合的節奏","Start with an easy schedule"]),
 event(55,"community","ambition",["要不要幫一群陌生人？","A community project"],["社區需要有人發起小型計畫，但沒人知道會不會成功。","A community project needs a volunteer to get things moving."],["願意出面號召大家","Organize the effort"],["先從自己能負擔的部分做起","Offer manageable support"]),
 event(55,"apology","trust",["多年沒說出口的道歉","The overdue apology"],["年輕時的一句傷人的話，這麼多年過去，仍偶爾想起。","A hurtful sentence from years ago still lingers."],["試著聯絡對方道歉","Offer an apology"],["先寫下對方可能的感受","Reflect before reaching out"]),
 event(70,"memory-box","empathy",["留下哪些回憶？","A box of memories"],["正在整理一箱舊照片和信件，有些適合分享，有些只屬於自己。","Sorting letters and photos raises questions about what should remain private."],["把能分享的故事留給後人","Share meaningful stories"],["保留珍貴的私人記憶","Protect private memories"]),
 event(70,"old-dream","courage",["最後想完成的心願","One wish remains"],["人生還有一件小小的心願，身邊的人覺得沒有必要這麼折騰。","A modest old dream still matters, even if others dismiss it."],["試著完成這個心願","Give it a try"],["換一種適合現在的方式","Adapt the dream"]),
 event(70,"legacy","trust",["下一代的請求","Passing something on"],["年輕人想接手一件珍貴的事。他需要決定要交出多少自由與責任。","Someone younger wants to carry on a treasured effort."],["完全信任對方來決定","Let them make it their own"],["分享經驗並慢慢交接","Offer guidance and transition"])
];
