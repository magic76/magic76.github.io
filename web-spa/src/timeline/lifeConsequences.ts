// Human-authored immediate consequences. These are fictional scene reactions, not LLM predictions.
type Pair=[string,string];
const results:Record<string,[Pair,Pair]>={
 "first-stage":[["他帶著顫抖的聲音完成分享。雖然還會害怕，卻發現自己真的做得到。","They share despite shaking hands. The fear remains, but so does proof they can do it."],["練習時出錯了好幾次；正式站上台時，熟悉的節奏讓他安心不少。","Practice has its stumbles, but a familiar routine makes the real moment gentler."]],
 "shared-toy":[["原本尷尬的邀請變成大家一起玩；他開始知道自己能主動創造快樂。","An awkward invitation becomes a shared game. They discover that including others takes courage."],["另一位朋友有點失落，但因為得到解釋，沒有把沉默當成拒絕。","The other friend is disappointed, but an honest explanation prevents hurtful assumptions."]],
 "broken-gift":[["家人沒有想像中生氣，反而一起討論能不能修好。他學到坦白並不一定失去信任。","The family is less angry than expected and offers to help. Honesty does not always cost trust."],["修補沒有完全恢復原樣，卻留下了兩人一起努力的痕跡。","The keepsake never looks quite the same, but the repair becomes a shared memory."]],
 "team-lead":[["計畫過程忙亂，大家卻開始習慣聽他的意見。他第一次理解帶頭不等於什麼都會。","The project is messy, but classmates begin listening. Leading does not mean knowing everything."],["他協助隊長解決幾個難題，也發現團隊裡不只有一種重要的角色。","Helping the leader solve problems reveals more than one way to matter in a team."]],
 "friend-secret":[["同學再怎麼問，他也沒有說出去。朋友因此更願意向他傾訴。","They refuse to repeat the secret. Their friend begins to trust them more."],["他先問對方想得到什麼幫助，意外發現朋友需要的只是有人陪伴。","Asking what help is needed reveals that the friend mostly wants company."]],
 "class-rumour":[["解釋不可能讓每個人立刻相信，但至少不再只有別人在替他說話。","Not everyone believes the explanation, but their voice is finally part of the story."],["有人願意聽完事情的前因後果，誤會慢慢縮小了。","A trusted listener helps clarify what happened, and the rumour slowly loses momentum."]],
 "first-project":[["初版很粗糙，卻真的有人喜歡。這比一直想像完美成品更鼓舞他。","The rough first version finds one enthusiastic supporter. That matters more than perfection."],["幾個實際問題被早早發現，他把大夢想拆成了可以完成的小步驟。","Early feedback reveals practical problems and turns a huge dream into achievable steps."]],
 "friend-distance":[["再次見面雖然有點生疏，兩人卻發現還是有話可以聊。","Meeting again feels awkward at first, then familiar conversation returns."],["他學會接受朋友有新的生活，也開始認識不同的人。","They accept that friendship changes and slowly form new connections too."]],
 "audition":[["他真的報名了。準備過程不輕鬆，但甄選從遙遠的幻想變成了真實的經驗。","They apply. Preparation is difficult, yet the audition becomes an experience instead of a distant dream."],["安排好時間與交通後，壓力減輕了。他發現有夢想也需要面對現實。","Making a practical plan eases the stress. Big dreams still need real-world details."]],
 "moving-away":[["新地方讓他又興奮又不安；他開始懂得自己可以在陌生環境裡找到節奏。","The unfamiliar place is exciting and unsettling. They begin finding their own rhythm."],["他沒有匆忙答應，但重要的人知道他的想法，也比較願意支持。","There is no rushed decision, but loved ones understand what the opportunity means."]],
 "misunderstood":[["事情沒有立刻恢復原樣，但他們終於知道彼此真正介意的是什麼。","The friendship does not heal overnight, but both finally understand what hurt."],["對方把委屈說完後，原本準備好的辯解反而不那麼重要了。","After listening to the hurt, the perfect defence suddenly matters less."]],
 "new-city":[["第一次加入陌生人的活動還有點彆扭，但他記住了兩個新名字。","The first gathering is awkward, yet they leave knowing two new names."],["熟悉的聲音讓夜晚變得容易一些。明天的陌生感依然在，卻沒有那麼可怕。","A familiar voice softens the evening. Tomorrow still feels uncertain, but manageable."]],
 "group-invite":[["第一次合作出了小差錯，卻遇見幾個願意一起解決問題的人。","The first task goes wrong, but a few teammates prove willing to help fix it."],["事先講清楚規則，讓大家少了誤會，也比較敢提自己的想法。","Clear expectations prevent early friction and make it easier to speak up."]],
 "first-failure":[["重試依然不是保證成功，但他發現自己已經比第一次更懂得面對挫折。","Trying again guarantees nothing, but the setback feels less mysterious now."],["找出失敗原因後，他不再把一件事沒做好當成自己整個人不夠好。","Understanding what failed helps separate one bad result from personal worth."]],
 "unpaid-work":[["他為熱情留下一點時間，也必須開始認真計算自己能承受的風險。","They make room for passion while learning to measure the risks."],["穩定收入帶來喘息空間；夢想沒有消失，只是換了步調。","Steady pay brings breathing room. The dream continues at a different pace."]],
 "hard-no":[["對方一開始不高興，但他終於沒有再把所有負擔都吞下來。","The other person is annoyed at first, yet the boundary stands."],["合作範圍縮小，彼此反而更清楚什麼事情真的能做到。","A smaller commitment makes everyone's expectations more realistic."]],
 "dream-or-pay":[["機會還很不穩定，但每天醒來都有更明確的方向感。","The future remains uncertain, but there is renewed purpose each morning."],["生活逐漸穩定，他開始能用自己的節奏投入喜歡的事。","A reliable foundation leaves room to pursue what matters at a sustainable pace."]],
 "collaboration":[["小小的試做讓他看清對方的優點，也早早發現溝通上的差異。","A small trial reveals both the partner's strengths and communication gaps."],["雙方寫下分工與承諾，合作少了一點熱血，卻多了可靠。","Clear agreements make the partnership less impulsive but more dependable."]],
 "new-start":[["陌生生活並不浪漫，每件小事都得重來。但他開始有了新的可能。","Starting over is harder than expected, yet unfamiliar doors begin to open."],["短暫體驗讓他知道自己真正喜歡與害怕的是什麼，再決定下一步。","A short trial clarifies both hopes and worries before making a larger move."]],
 "big-offer":[["機會讓他快速成長，也讓他第一次認真計算那些缺席的日子。","The opportunity brings growth, alongside a clearer awareness of missed moments."],["邀約條件沒有完全照他的意思走，但他為重要的人留下一些空間。","Negotiations are imperfect, yet they protect time for people who matter."]],
 "old-friend":[["第一封訊息只有短短幾個字；關係不一定回得去，但終於不再停在原地。","The first message is brief. The friendship may not return, but the silence ends."],["整理好想說的話後，他比較能分清楚自己的委屈與責任。","Writing things down helps separate hurt feelings from personal responsibility."]],
 "work-family":[["工作需要重新安排，但他守住了承諾，也讓對方知道自己真的在乎。","Work needs rearranging, but keeping the promise strengthens a valued bond."],["新的分工沒有完美解決所有壓力，卻讓他不必一個人扛住全部。","Delegation does not erase the pressure, but it makes the burden shareable."]],
 "truth-cost":[["承認錯誤很難受，卻讓其他人更早知道該怎麼一起補救。","Admitting the error is painful, but it gives the team time to repair it."],["先釐清問題避免了不必要的指責，也讓後續溝通更有根據。","Checking the facts prevents needless blame and improves the eventual conversation."]],
 "mentor":[["新人做法與他不同，卻找到了一條自己沒想過的路。","The newcomer takes a different approach and discovers a path they never imagined."],["小專案讓雙方開始建立信心，交棒變成逐步完成的事。","A small project builds trust and makes handing over responsibility gradual."]],
 "new-chapter":[["第一堂課並不容易，他卻重新找回了久違的期待。","The first lesson is difficult, but it brings back a long-missed anticipation."],["慢慢累積的進步讓他發現，開始得晚也能走得遠。","Small, steady progress proves that a late start can still matter."]],
 "community":[["一開始只有少數人響應，慢慢卻有人帶著自己的點子加入。","Only a few people show up at first. Gradually, others bring their own ideas."],["他不必獨自扛起整個計畫，卻確實幫忙把第一步做了出來。","They do not have to carry the whole project to help it begin."]],
 "apology":[["那封道歉沒有保證得到回覆，但他終於願意面對當年的自己。","The apology may receive no reply, yet it finally acknowledges an old mistake."],["想清楚之後，他更明白道歉不是為了要求對方原諒。","Reflection makes it clear that an apology is not a demand for forgiveness."]],
 "memory-box":[["留下的故事不只是成就，也有曾經犯錯與重新開始的日子。","The shared stories include mistakes and fresh starts, not just achievements."],["他替私人回憶留下安全的空間，知道不是所有故事都需要公開。","Keeping some memories private gives them the care they deserve."]],
 "old-dream":[["這個心願不一定照年輕時的想像實現，過程卻讓生活再次亮了起來。","The wish may look different from the childhood version, but pursuing it brings joy."],["換了適合自己的方法，心願不再是勉強，而是能好好享受的事。","Adapting the goal turns it from a struggle into something meaningful."]],
 "legacy":[["年輕人帶來新方法，讓他一度不習慣，最後卻看到另一種延續。","New methods feel strange at first, then reveal another way for the work to endure."],["交接多花了一點時間，卻讓雙方都更有信心面對接下來的改變。","A gradual handover takes longer but leaves everyone better prepared."]]
};
export function immediateLifeConsequence(eventId:string,choice:number,english:boolean):string{
 if(choice===2)return english?
  "No one stepped in this time. Their response was their own, and the moment still becomes part of their history.":
  "這次你沒有介入。他用自己的方式面對眼前的事，而這一刻仍成為人生的一部分。";
 const pair=results[eventId]?.[choice];
 return pair?(english?pair[1]:pair[0]):"";
}
export const LIFE_RESULT_COUNT=Object.keys(results).length;
