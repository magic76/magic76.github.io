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
export function fortuneInvitation(locale:string,title:string,url:string):string{
 const copy=fortuneCopy(locale);
 return title+" · "+copy.question+"\n"+url;
}
export function assertFortuneCopyComplete():boolean{
 return Object.keys(rows).length===11&&Object.keys(rows).every(code=>
  rows[code].split("|").length===keys.length&&traits[code].split("|").length===traitKeys.length);
}
