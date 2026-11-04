/** Keep the portrait privacy explanation visible without expanding the Souls controller. */
export function SoulPrivacyFooter({en}:{en:boolean}){
 return <footer className="souls-footer">{en?
  "Create fictional object or portrait characters; a person Soul does not represent the actual photographed person. Cutout and brush edits run on-device. Photos and memories stay in this browser unless cleared. Only explicit Gemini photo analysis uploads an image; Live conversations go to Gemini.":
  "人物與物品照片都能創造虛構角色；人物不代表照片中本人。去背與筆刷修補在本機進行，照片與回憶存在此瀏覽器，清除網站資料就會消失。只有主動要求 Gemini 分析照片才會上傳影像；Live 對話會傳給 Gemini。"
 }</footer>;
}
