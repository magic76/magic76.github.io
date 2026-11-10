/** Route-local, dependency-free copy. Every public share string and trait has an 11-locale entry.
 * Archetype names for non-zh/en are formed from two sourced, translated traits,
 * never by pretending a machine-translated full chart is authoritative.
 */
const keys=["share","deep","native","copyInvite","copyLink","download","close","shared","downloaded","copied","failed","clipboardError","question","friend","mine","fallback","manual","preview","bazi","tarot","vedic","symbolic","unavailable","details"] as const;
type Key=typeof keys[number];
const rows:Record<string,string>={
 "zh-TW":"分享我的命格|查看完整命格|分享圖片與連結|複製邀請文字|複製連結|下載 PNG|關閉|已開啟系統分享視窗|已要求下載圖片|已複製到剪貼簿|分享未完成，請使用複製或下載|無法自動複製，請手動選取下方文字|你是哪一型？|朋友分享了一張命格收藏卡|測出我的命格|依傳統命理象徵整理，供自我探索|請選取並複製以下文字|收藏卡預覽|八字|塔羅生命靈數|印度星盤|這是一個探索線索，不代表已知朋友的私人命盤|目前沒有可公開的命格|進一步了解我的命格",
 en:"Share my archetype|Explore my full reading|Share image and link|Copy invitation|Copy link|Download PNG|Close|System share dialog opened|Image download requested|Copied to clipboard|Sharing did not complete. Copy or download instead|Clipboard unavailable. Select and copy the text below|Which type are you?|A friend shared an archetype card|Discover my archetype|Traditional symbolic reflection, not a verified personality assessment|Select and copy the invitation below|Card preview|BaZi|Tarot numerology|Vedic astrology|A symbolic invitation, not the sender's private chart|No public archetype available|Explore my archetype",
 ja:"私の命格をシェア|詳しい鑑定を見る|画像とリンクを共有|招待文をコピー|リンクをコピー|PNGを保存|閉じる|共有画面を開きました|画像の保存を開始しました|コピーしました|共有できませんでした。コピーか保存をお試しください|コピーできません。下の文を選択してください|あなたはどのタイプ？|友達から命格カードが届きました|自分の命格を調べる|伝統的な象徴による自己探求です|以下の文章を選択してコピー|カードのプレビュー|四柱推命|タロット数秘術|インド占星術|象徴的なヒントであり個人の命盤ではありません|公開カードがありません|自分の命格を詳しく見る",
 es:"Compartir mi arquetipo|Ver mi lectura completa|Compartir imagen y enlace|Copiar invitación|Copiar enlace|Descargar PNG|Cerrar|Se abrió el menú para compartir|Se inició la descarga|Copiado|No se pudo compartir. Copia o descarga|No se pudo copiar. Selecciona el texto de abajo|¿Qué tipo eres?|Alguien compartió una carta de arquetipo|Descubrir mi arquetipo|Simbolismo tradicional para explorar, no un diagnóstico|Selecciona y copia este texto|Vista previa|BaZi|Numerología del tarot|Astrología védica|Es una invitación simbólica, no una carta privada|No hay arquetipo público|Explorar mi arquetipo",
 "pt-BR":"Compartilhar meu arquétipo|Ver a leitura completa|Compartilhar imagem e link|Copiar convite|Copiar link|Baixar PNG|Fechar|Menu de compartilhamento aberto|Download iniciado|Copiado|Não foi possível compartilhar. Copie ou baixe|Não foi possível copiar. Selecione o texto abaixo|Qual é o seu tipo?|Um amigo compartilhou uma carta de arquétipo|Descobrir meu arquétipo|Símbolos tradicionais para reflexão, não um diagnóstico|Selecione e copie o texto abaixo|Prévia do cartão|BaZi|Numerologia do tarô|Astrologia védica|Convite simbólico, não um mapa pessoal|Nenhum arquétipo público|Explorar meu arquétipo",
 id:"Bagikan arketipe saya|Lihat bacaan lengkap|Bagikan gambar dan tautan|Salin undangan|Salin tautan|Unduh PNG|Tutup|Menu berbagi terbuka|Pengunduhan dimulai|Disalin|Berbagi gagal. Salin atau unduh|Gagal menyalin. Pilih teks di bawah|Kamu tipe yang mana?|Teman membagikan kartu arketipe|Temukan arketipe saya|Simbol tradisional untuk refleksi, bukan diagnosis|Pilih dan salin teks di bawah|Pratinjau kartu|BaZi|Numerologi tarot|Astrologi Weda|Undangan simbolis, bukan bagan pribadi|Arketipe publik tidak tersedia|Jelajahi arketipe saya",
 fr:"Partager mon archétype|Voir mon analyse complète|Partager image et lien|Copier l'invitation|Copier le lien|Télécharger PNG|Fermer|Fenêtre de partage ouverte|Téléchargement lancé|Copié|Partage impossible. Copiez ou téléchargez|Copie impossible. Sélectionnez le texte ci-dessous|Quel est votre type ?|Un ami a partagé une carte d'archétype|Découvrir mon archétype|Symboles traditionnels pour réfléchir, pas un diagnostic|Sélectionnez et copiez ce texte|Aperçu de la carte|BaZi|Numérologie du tarot|Astrologie védique|Une invitation symbolique, pas une carte personnelle|Aucun archétype public|Explorer mon archétype",
 de:"Meinen Archetyp teilen|Ganze Deutung ansehen|Bild und Link teilen|Einladung kopieren|Link kopieren|PNG herunterladen|Schließen|Teilen-Dialog geöffnet|Download gestartet|Kopiert|Teilen fehlgeschlagen. Bitte kopieren oder speichern|Kopieren fehlgeschlagen. Text unten auswählen|Welcher Typ bist du?|Ein Freund hat eine Archetypenkarte geteilt|Meinen Archetyp entdecken|Traditionelle Symbolik zur Reflexion, keine Diagnose|Diesen Text markieren und kopieren|Kartenvorschau|BaZi|Tarot-Numerologie|Vedische Astrologie|Ein symbolischer Impuls, kein privates Horoskop|Kein öffentlicher Archetyp|Meinen Archetyp erkunden",
 ko:"내 운명 유형 공유|전체 해석 보기|이미지와 링크 공유|초대 문구 복사|링크 복사|PNG 다운로드|닫기|공유 창을 열었습니다|다운로드를 시작했습니다|복사했습니다|공유하지 못했습니다. 복사 또는 저장하세요|복사할 수 없습니다. 아래 문구를 선택하세요|당신은 어떤 유형인가요?|친구가 운명 카드를 공유했어요|내 운명 유형 알아보기|전통 상징을 통한 자기 탐색이며 진단이 아닙니다|아래 글을 선택하여 복사하세요|카드 미리보기|사주명리|타로 수비학|베다 점성술|개인 사주가 아닌 상징적인 초대입니다|공개 유형 없음|내 유형 더 알아보기",
 vi:"Chia sẻ kiểu mệnh của tôi|Xem luận giải đầy đủ|Chia sẻ ảnh và liên kết|Sao chép lời mời|Sao chép liên kết|Tải PNG|Đóng|Đã mở bảng chia sẻ|Đã bắt đầu tải ảnh|Đã sao chép|Không thể chia sẻ. Hãy sao chép hoặc tải ảnh|Không thể sao chép. Hãy chọn đoạn văn bên dưới|Bạn thuộc kiểu nào?|Một người bạn đã chia sẻ thẻ tính cách|Khám phá kiểu mệnh của tôi|Biểu tượng truyền thống để suy ngẫm, không phải chẩn đoán|Chọn và sao chép văn bản dưới đây|Xem trước thẻ|Bát tự|Thần số học Tarot|Chiêm tinh Vệ Đà|Lời mời mang tính biểu tượng, không chứa lá số riêng|Không có kiểu công khai|Khám phá thêm",
 th:"แชร์ตัวตนตามดวง|ดูคำทำนายฉบับเต็ม|แชร์รูปและลิงก์|คัดลอกคำเชิญ|คัดลอกลิงก์|ดาวน์โหลด PNG|ปิด|เปิดหน้าต่างแชร์แล้ว|เริ่มดาวน์โหลดรูปแล้ว|คัดลอกแล้ว|แชร์ไม่สำเร็จ โปรดคัดลอกหรือดาวน์โหลด|คัดลอกไม่ได้ เลือกข้อความด้านล่าง|คุณเป็นแบบไหน?|เพื่อนแชร์การ์ดตัวตนตามดวง|ค้นหาตัวตนของฉัน|สัญลักษณ์โบราณเพื่อการสำรวจตนเอง ไม่ใช่การวินิจฉัย|เลือกและคัดลอกข้อความด้านล่าง|ตัวอย่างการ์ด|โป๊ยหยี่สี่เถียว|เลขศาสตร์ไพ่ทาโรต์|โหราศาสตร์พระเวท|เป็นคำชวนเชิงสัญลักษณ์ ไม่ใช่ดวงส่วนตัว|ไม่มีตัวตนสาธารณะ|สำรวจตัวตนเพิ่มเติม"
};
const traitKeys=["growth","adapt","warmth","insight","stability","care","decisive","detail","explore","observe","create","wisdom","connection","lead","courage","focus","balance","renewal","patience","fairness","intuition","vision","curiosity","freedom"] as const;
export type Trait=typeof traitKeys[number];
const traits:Record<string,string>={
 "zh-TW":"成長|靈活|熱情|洞察|穩定|關懷|果斷|細膩|探索|觀察|創造|智慧|連結|引領|勇氣|專注|平衡|蛻變|耐心|公正|直覺|遠見|好奇|自由",
 en:"Growth|Adaptability|Warmth|Insight|Steadiness|Care|Decisiveness|Detail|Exploration|Observation|Creativity|Wisdom|Connection|Leadership|Courage|Focus|Balance|Renewal|Patience|Fairness|Intuition|Vision|Curiosity|Freedom",
 ja:"成長|柔軟性|情熱|洞察|安定|思いやり|決断力|細やかさ|探求|観察|創造|知恵|つながり|導く力|勇気|集中|調和|再生|忍耐|公平|直感|先見性|好奇心|自由",
 es:"Crecimiento|Adaptación|Calidez|Perspicacia|Estabilidad|Cuidado|Decisión|Detalle|Exploración|Observación|Creatividad|Sabiduría|Conexión|Liderazgo|Valentía|Concentración|Equilibrio|Renovación|Paciencia|Justicia|Intuición|Visión|Curiosidad|Libertad",
 "pt-BR":"Crescimento|Adaptação|Calor|Perspicácia|Estabilidade|Cuidado|Decisão|Detalhes|Exploração|Observação|Criação|Sabedoria|Conexão|Liderança|Coragem|Foco|Equilíbrio|Renovação|Paciência|Justiça|Intuição|Visão|Curiosidade|Liberdade",
 id:"Pertumbuhan|Keluwesan|Kehangatan|Wawasan|Kestabilan|Kepedulian|Ketegasan|Ketelitian|Eksplorasi|Pengamatan|Kreasi|Kebijaksanaan|Koneksi|Kepemimpinan|Keberanian|Fokus|Keseimbangan|Pembaruan|Kesabaran|Keadilan|Intuisi|Visi|Rasa ingin tahu|Kebebasan",
 fr:"Croissance|Adaptation|Chaleur|Perspicacité|Stabilité|Bienveillance|Décision|Précision|Exploration|Observation|Créativité|Sagesse|Lien|Leadership|Courage|Concentration|Équilibre|Renouveau|Patience|Équité|Intuition|Vision|Curiosité|Liberté",
 de:"Wachstum|Anpassung|Wärme|Einsicht|Beständigkeit|Fürsorge|Entschlossenheit|Detailtreue|Entdeckung|Beobachtung|Kreativität|Weisheit|Verbindung|Führung|Mut|Fokus|Balance|Neubeginn|Geduld|Fairness|Intuition|Weitblick|Neugier|Freiheit",
 ko:"성장|유연함|따뜻함|통찰|안정|배려|결단력|섬세함|탐험|관찰|창의성|지혜|연결|리더십|용기|집중|균형|새 출발|인내|공정|직관|비전|호기심|자유",
 vi:"Phát triển|Linh hoạt|Ấm áp|Thấu hiểu|Vững vàng|Quan tâm|Quyết đoán|Tinh tế|Khám phá|Quan sát|Sáng tạo|Trí tuệ|Kết nối|Dẫn dắt|Dũng cảm|Tập trung|Cân bằng|Đổi mới|Kiên nhẫn|Công bằng|Trực giác|Tầm nhìn|Tò mò|Tự do",
 th:"เติบโต|ยืดหยุ่น|อบอุ่น|เข้าใจลึกซึ้ง|มั่นคง|ห่วงใย|เด็ดขาด|ละเอียด|สำรวจ|สังเกต|สร้างสรรค์|ปัญญา|เชื่อมโยง|ผู้นำ|กล้าหาญ|มุ่งมั่น|สมดุล|เริ่มใหม่|อดทน|ยุติธรรม|สัญชาตญาณ|วิสัยทัศน์|อยากรู้|อิสระ"
};
export function fortuneLocale(locale:string):string{
 const code=locale.toLowerCase();
 if(code.startsWith("zh"))return "zh-TW";
 if(code.startsWith("pt"))return "pt-BR";
 const found=Object.keys(rows).find(key=>key.toLowerCase()===code||key.toLowerCase()===code.split("-")[0]);
 return found||"en";
}
export function fortuneCopy(locale:string):Record<Key,string>{
 const parts=rows[fortuneLocale(locale)].split("|");
 return Object.fromEntries(keys.map((key,i)=>[key,parts[i]])) as Record<Key,string>;
}
export function fortuneTrait(locale:string,key:Trait):string{
 const idx=traitKeys.indexOf(key);
 return traits[fortuneLocale(locale)].split("|")[idx]||traits.en.split("|")[idx];
}
export function fortuneModeLabel(locale:string,mode:"bazi"|"tarot"|"vedic"):string{return fortuneCopy(locale)[mode]}
/** Personalization is limited to curated public archetype copy; never include profile or chart details. */
type InviteCopy={lead:string;reveal:string;fallback:string;question:string;action:string};
const inviteCopy:Record<string,InviteCopy>={
 "zh-TW":{
  lead:"我測出的命格角色是「{title}」✨",
  reveal:"有趣的是，它不只說優勢，還提醒了另一面：",
  fallback:"卡片不只整理了特質，還寫到做事方式和成長提醒。",
  question:"你遇到事情是先衝、先觀察，還是先想清楚每一步？",
  action:"換你測測看，回傳結果讓我看看我們是不是同一型 👇"
 },
 en:{
  lead:"My archetype turned out to be “{title}” ✨",
  reveal:"The unexpected part? It also calls out a possible blind spot:",
  fallback:"The card goes beyond a label: it explores habits and room to grow.",
  question:"Do you jump in, observe first, or plan every step?",
  action:"Find your type and show me. I wonder if we'll match 👇"
 },
 ja:{
  lead:"私のタイプは「{title}」だった ✨",
  reveal:"意外だったのは、長所だけでなく気をつけたい一面もあること。",
  fallback:"特徴だけでなく、行動の傾向や成長のヒントも載っているよ。",
  question:"あなたはまず動く？ 観察する？ じっくり計画する？",
  action:"あなたのタイプも調べて、結果を見せてね 👇"
 },
 es:{
  lead:"Mi arquetipo resultó ser «{title}» ✨",
  reveal:"Lo curioso: también señala algo que podría mejorar:",
  fallback:"La carta muestra hábitos y pistas para crecer, no solo una etiqueta.",
  question:"¿Actúas primero, observas o prefieres planificar?",
  action:"Descubre tu tipo y enséñame el resultado 👇"
 },
 "pt-BR":{
  lead:"Meu arquétipo deu «{title}» ✨",
  reveal:"O curioso é que também aponta um ponto de atenção:",
  fallback:"A carta fala de hábitos e possibilidades de evolução, não só de um rótulo.",
  question:"Você age primeiro, observa ou planeja cada passo?",
  action:"Descubra seu tipo e me mostre o resultado 👇"
 },
 id:{
  lead:"Tipe arketipeku ternyata “{title}” ✨",
  reveal:"Menariknya, ada juga sisi yang perlu diperhatikan:",
  fallback:"Kartu ini membahas kebiasaan dan cara berkembang, bukan hanya label.",
  question:"Kamu langsung bertindak, mengamati, atau menyusun rencana?",
  action:"Cari tahu tipemu, lalu tunjukkan hasilnya padaku 👇"
 },
 fr:{
  lead:"Mon archétype est « {title} » ✨",
  reveal:"Surprise : la carte évoque aussi un point à surveiller :",
  fallback:"Elle parle de mes habitudes et de pistes pour évoluer, pas seulement d'une étiquette.",
  question:"Tu fonces, tu observes ou tu planifies chaque étape ?",
  action:"Découvre ton type et montre-moi le résultat 👇"
 },
 de:{
  lead:"Mein Archetyp ist „{title}“ ✨",
  reveal:"Spannend: Die Karte nennt auch eine mögliche Schattenseite:",
  fallback:"Sie zeigt Gewohnheiten und Entwicklungsideen, nicht nur ein Etikett.",
  question:"Legst du sofort los, beobachtest du erst oder planst du genau?",
  action:"Finde deinen Typ heraus und zeig mir dein Ergebnis 👇"
 },
 ko:{
  lead:"내 유형은 ‘{title}’였어 ✨",
  reveal:"재미있는 건 장점뿐 아니라 주의할 점도 알려준다는 거야:",
  fallback:"단순한 이름이 아니라 행동 습관과 성장 힌트도 담겨 있어.",
  question:"넌 먼저 행동해, 관찰해, 아니면 차근차근 계획해?",
  action:"너의 유형도 알아보고 결과를 보여줘 👇"
 },
 vi:{
  lead:"Kiểu của mình là “{title}” ✨",
  reveal:"Thú vị là thẻ còn nhắc đến một điểm cần lưu ý:",
  fallback:"Thẻ nói về thói quen và cách phát triển, không chỉ gắn nhãn.",
  question:"Bạn hành động ngay, quan sát trước hay lên kế hoạch từng bước?",
  action:"Thử xem bạn thuộc kiểu nào rồi gửi kết quả cho mình nhé 👇"
 },
 th:{
  lead:"ประเภทของฉันคือ “{title}” ✨",
  reveal:"น่าสนใจตรงที่มีทั้งจุดเด่นและสิ่งที่ควรระวัง:",
  fallback:"การ์ดพูดถึงนิสัยและแนวทางพัฒนา ไม่ได้มีแค่ชื่อประเภท",
  question:"คุณลุยก่อน สังเกตก่อน หรือวางแผนทีละขั้น?",
  action:"ลองดูว่าคุณเป็นประเภทไหน แล้วส่งผลมาให้ดูกัน 👇"
 }
};
/** Short public challenge that fits the card, with no personal chart facts. */
export function fortuneChallenge(locale:string):{question:string;action:string}{
 const copy=inviteCopy[fortuneLocale(locale)]||inviteCopy.en;
 return {question:copy.question,action:copy.action.replace(/\s*👇\s*$/u,"")};
}
/** Controls for composing a social post with text first, artwork attached by the user. */
type TextShareLabels={textOnly:string;copyPost:string;downloadCard:string;help:string};
const textShareCopy:Record<string,TextShareLabels>={
 "zh-TW":{textOnly:"分享文字",copyPost:"複製貼文文字",downloadCard:"下載卡片 PNG",help:"想自己配圖？複製貼文文字、下載卡片，再到社群 App 新增貼文並附圖。"},
 en:{textOnly:"Share text only",copyPost:"Copy post text",downloadCard:"Download card PNG",help:"Adding your own image? Copy the text and download the card, then create a post and attach it in your social app."},
 ja:{textOnly:"文章だけ共有",copyPost:"投稿文をコピー",downloadCard:"カードPNGを保存",help:"画像を自分で添付する場合は、文章をコピーしてカードを保存し、SNSアプリで投稿を作成してください。"},
 es:{textOnly:"Compartir solo texto",copyPost:"Copiar texto",downloadCard:"Descargar tarjeta PNG",help:"¿Prefieres añadir la imagen? Copia el texto y descarga la tarjeta; crea una publicación y adjúntala en tu red social."},
 "pt-BR":{textOnly:"Compartilhar só texto",copyPost:"Copiar texto do post",downloadCard:"Baixar cartão PNG",help:"Quer adicionar a imagem? Copie o texto, baixe o cartão e anexe-o ao criar a publicação no app."},
 id:{textOnly:"Bagikan teks saja",copyPost:"Salin teks postingan",downloadCard:"Unduh kartu PNG",help:"Mau tambah gambar sendiri? Salin teks dan unduh kartu, lalu buat postingan dan lampirkan gambarnya."},
 fr:{textOnly:"Partager le texte",copyPost:"Copier le texte",downloadCard:"Télécharger la carte PNG",help:"Pour choisir une image vous-même, copiez le texte et téléchargez la carte, puis ajoutez-la dans votre appli sociale."},
 de:{textOnly:"Nur Text teilen",copyPost:"Beitragstext kopieren",downloadCard:"Karte als PNG laden",help:"Bild selbst hinzufügen? Text kopieren, Karte herunterladen und beides im sozialen Netzwerk als Beitrag einfügen."},
 ko:{textOnly:"텍스트만 공유",copyPost:"게시물 글 복사",downloadCard:"카드 PNG 저장",help:"이미지를 직접 넣으려면 글을 복사하고 카드를 저장한 뒤, SNS 앱에서 게시물을 작성해 첨부하세요."},
 vi:{textOnly:"Chỉ chia sẻ văn bản",copyPost:"Sao chép bài viết",downloadCard:"Tải thẻ PNG",help:"Muốn tự chọn ảnh? Sao chép nội dung, tải thẻ rồi tạo bài viết và đính kèm ảnh trong ứng dụng."},
 th:{textOnly:"แชร์เฉพาะข้อความ",copyPost:"คัดลอกข้อความโพสต์",downloadCard:"ดาวน์โหลดการ์ด PNG",help:"อยากแนบรูปเอง? คัดลอกข้อความ ดาวน์โหลดการ์ด แล้วสร้างโพสต์พร้อมแนบรูปในแอปโซเชียล"}
};
export function fortuneTextShareLabels(locale:string):TextShareLabels{
 return textShareCopy[fortuneLocale(locale)]||textShareCopy.en;
}
export function fortuneInvitation(locale:string,title:string,url:string,tension=""):string{
 const lang=fortuneLocale(locale),copy=inviteCopy[lang]||inviteCopy.en;
 // Identity themes are authored in zh/en. Do not put English archetype prose into
 // unrelated UI languages or republish arbitrary AI summaries in public shares.
 const safeTension=(lang==="zh-TW"||lang==="en")&&tension.length<=160
  && !/[\r\n]|https?:|www\.|@|出生|生日|姓名|birthdate|birthtime|\d{2}[-/:年]\d{1,2}/i.test(tension)
  ?tension.trim():"";
 return [
  copy.lead.replace("{title}",title),
  safeTension?copy.reveal+"\n「"+safeTension+"」":copy.fallback,
  copy.question,copy.action,url
 ].join("\n");
}
export function assertFortuneCopyComplete():boolean{
 return Object.keys(rows).length===11&&Object.keys(rows).every(code=>
  rows[code].split("|").length===keys.length&&traits[code].split("|").length===traitKeys.length
  &&Boolean(inviteCopy[code]?.lead&&inviteCopy[code]?.question&&inviteCopy[code]?.action)
  &&Boolean(textShareCopy[code]?.textOnly&&textShareCopy[code]?.copyPost&&textShareCopy[code]?.downloadCard&&textShareCopy[code]?.help));
}
