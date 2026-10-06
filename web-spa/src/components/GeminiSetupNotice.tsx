import{Link}from"react-router-dom";
import{geminiKey}from"../lib/runtime";

export function GeminiSetupNotice({product}:{product:"story"|"fortune"}){
 const configured=Boolean(geminiKey());
 const story=product==="story";
 return <Link className={"gemini-setup-notice "+product} to="/settings">
  <span>
   <strong>{story?"Gemini API Key":"Gemini API Key（選用）"}</strong>
   <small>{configured?"已設定":story?"尚未設定 · 查看取得教學":"尚未設定 · 基本命盤仍可使用"}</small>
   <em>{story?"故事創作、實體書陪讀與 AI 功能需要 Key。":"命盤計算與基本結果不需要 Key；AI 解讀與老師對話才需要。"}</em>
  </span>
  <b>{configured?"管理 ›":"取得教學 ›"}</b>
 </Link>;
}
