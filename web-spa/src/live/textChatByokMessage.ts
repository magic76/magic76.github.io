/** Existing BYOK error copy, separated to keep the 26 KB live panel boundary. */
export function textChatByokMessage(category:string,type:string,english:boolean){
 const byokMessage=category==="key"?(english?"This Gemini key is invalid or lacks permission.":"目前的 Gemini Key 無效或沒有存取權限。")
     :category==="quota"?(english?"Gemini rejected this Live text request (429: rate or usage limit). This does not necessarily mean your API key is out of quota. Try again later or check this model in Google AI Studio.":"Gemini 暫時拒絕這次 Live 文字請求（429：速率或用量限制）。不代表整把 API Key 的額度已用完；可稍後重試，或查看 Google AI Studio 的模型限制。")
     :category==="model"?(english?"The Gemini text model is unavailable for this key.":"目前的 Gemini Key 無法使用這個文字模型。")
     :/transcri|no text|no reply/i.test(type)?(english?"Gemini Live connected but returned no text transcript.":"Gemini Live 已連線，但沒有收到文字轉錄。")
     :/1006|WebSocket|socket|setup/i.test(type)?(english?"Gemini Live WebSocket connection was interrupted or rejected. Please retry.":"Gemini Live WebSocket 連線中斷或遭拒，請重試。")
     :(english?"Gemini Live text connection failed. Retry or switch to free practice.":"Gemini Live 文字連線失敗，請重試或改用免費文字練習。");
 return byokMessage;
}
