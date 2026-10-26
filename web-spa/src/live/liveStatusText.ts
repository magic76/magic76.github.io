// Display-only lookup: useLiveSession keeps its Chinese status strings because
// error classification matches on them; LiveControls shows the translated text.
const STATUS_KEYS:Record<string,string>={
 "按開始後就可以直接說話。":"idle","正在整理課後學習報告…":"reporting",
 "練習已保存，但課後報告產生失敗，可從歷史紀錄繼續練習。":"reportFailed","已結束。":"ended",
 "尚未設定 Gemini API key。":"noKey","正在準備麥克風…":"mic",
 "剛才的語音尚未辨識到，請再說一次。":"noTranscript","朋友尚未回覆，請再說一次或重新連線。":"noReply",
 "正在重新取得朋友的回答…":"retrying","麥克風已停止收音，請重新開始語音對話。":"micStopped",
 "朋友正在準備回答…":"preparing","連線已恢復，Mira 接著回答…":"resumedMira",
 "已恢復連線，接續剛才的回答…":"resumedFriend","已恢復連線，老師接續剛才的回答…":"resumedTeacher",
 "🎙️ 正在聽你說…":"hearing","🎙️ 已收到聲音，等你說完後就會回應…":"heard",
 "正在結束…":"ending","語音連線發生問題":"generic"
};
/** i18n key in the voice namespace for a known useLiveSession status, else null. */
export function liveStatusKey(status:string):string|null{
 const key=STATUS_KEYS[status];
 return key?"status."+key:null;
}
