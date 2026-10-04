(function(global){
  "use strict";
  function fallbackPlan(images){
    return {
      title:"我的教材",
      objective:"逐頁理解內容，抓重點字詞，最後用自己的話說一次。",
      pages:(images||[]).map(function(_,index){
        return {
          title:"教材 "+(index+1),
          summary:"先觀察這一頁的主題、標題與最重要的句子。",
          keywords:[],
          question:"這一頁最重要的內容是什麼？",
          practice:"請先用自己的話說出你看懂的部分。"
        };
      })
    };
  }
  async function prepare(images,options){
    options=options||{};
    var target=options.targetLanguage||"英文";
    var level=options.level||"B1-B2";
    var prompt=
      "你是 Crew Teacher 的教材備課老師。使用者依閱讀順序提供 "+images.length+" 張教材/照片。"+
      "請把全部圖片當成同一堂課，逐頁分析，目標語言："+target+"，學生程度："+level+"。"+
      "不要把整頁文字逐字抄出。只抓真正需要學的內容。"+
      "回傳 JSON：{title,objective,pages:[{title,summary,keywords:[最多5個],question,practice}]}。"+
      "pages 必須剛好 "+images.length+" 個，順序必須與圖片一致。"+
      "summary/question/practice 用繁體中文輔助；keywords 優先保留目標語言原文。";
    try{
      var plan=await CrewGeminiVision.generate(prompt,images,{json:true,temperature:.25,maxOutputTokens:1800,timeoutMs:26000});
      if(!plan||!Array.isArray(plan.pages)||plan.pages.length!==images.length)throw new Error("備課格式不完整");
      return plan;
    }catch(error){
      var plan=fallbackPlan(images);
      plan.fallbackReason=error.message;
      return plan;
    }
  }
  function pagePrompt(session,index){
    var plan=session.plan||{},page=(plan.pages||[])[index]||{};
    return "現在進入教材第 "+(index+1)+" 頁，共 "+session.images.length+" 頁。"+
      "備課重點："+(page.summary||"請觀察圖片重點")+"。"+
      "關鍵詞："+(page.keywords||[]).join("、")+"。"+
      "這一頁練習目標："+(page.practice||"讓學生用自己的話表達")+"。"+
      "請先看我剛傳的這一頁圖片，再用 "+(session.targetLanguage||"英文")+" 帶我學。"+
      "不要一次講完；一次 1-3 句，先問一個和這一頁直接相關的問題。";
  }
  global.CrewTextbookLesson={prepare:prepare,pagePrompt:pagePrompt};
})(window);