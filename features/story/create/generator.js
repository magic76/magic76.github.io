(function(global){
  "use strict";
  function sanitizeNarrationText(value){
    return String(value||"")
      .replace(/[（(][^）)]*(停頓|等待使用者|等待孩子|等待小朋友)[^）)]*[）)]/gi,"")
      .replace(/\([^)]*(pause|wait(?:ing)?\s+(?:for\s+)?(?:the\s+)?(?:user|child))[^)]*\)/gi,"")
      .replace(/\s{2,}/g," ")
      .trim();
  }
  function normalize(result,images,prompt){
    var pages=Array.isArray(result&&result.pages)?result.pages:[];
    if(!pages.length){
      pages=(images.length?images:[null,null,null,null]).map(function(_,i){
        return {text:"第 "+(i+1)+" 頁：故事正準備展開。",imageIndex:images.length?i:-1};
      });
    }
    return {
      title:String(result&&result.title||"我的故事"),
      summary:String(result&&result.summary||prompt||"一個新的故事"),
      pages:pages.map(function(page,i){
        var idx=Number(page.imageIndex);
        if(!Number.isFinite(idx)||idx<0||idx>=images.length)idx=images.length?Math.min(i,images.length-1):-1;
        return {text:sanitizeNarrationText(page.text),imageIndex:idx};
      })
    };
  }
  async function create(prompt,images){
    prompt=String(prompt||"").trim();
    var instruction=
      "你是 Crew Story 的故事編輯。請根據使用者的故事靈感與圖片，建立適合逐頁閱讀的繁體中文故事。"+
      "如果有圖片，圖片順序就是故事順序，不可打亂；每張圖片至少要被使用一次。"+
      "不要描述看不到的細節，不要長篇說教。"+
      "故事文字只能包含可直接朗讀的內容；禁止加入「停頓」「等待使用者／孩子回應」等舞台指示或要求聽眾回應的提示，頁面朗讀完成後會自動翻頁。"+
      "回傳 JSON：{title,summary,pages:[{text,imageIndex}]}。"+
      "每頁 45-110 個中文字；有圖片時 pages 數量以圖片數為主，可多 1-2 個純文字頁；imageIndex 從 0 開始，純文字頁用 -1。"+
      "故事靈感："+(prompt||"請根據圖片創作一個溫暖、有起承轉合的故事。");
    var result=await CrewGeminiVision.generate(instruction,images,{json:true,temperature:.85,maxOutputTokens:2400,timeoutMs:28000});
    return normalize(result,images,prompt);
  }
  global.CrewStoryGenerator={create:create};
})(window);