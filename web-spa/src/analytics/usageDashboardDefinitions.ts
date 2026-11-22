import {SOULS_USAGE_EVENTS,SOULS_USAGE_NAMES} from "./SoulsUsagePanel";
export type Category="all"|"guest"|"chat"|"timeline"|"shorts"|"games"|"learning"|"story"|"fortune"|"worlds"|"mate"|"souls"|"research"|"circle";

export const names:Record<string,string>={
 app_opened:"開啟網站",visitor_first_seen:"首次造訪瀏覽器",user_returned:"跨日回訪事件",
 retention_cohort_started:"新訪客留存 cohort",retention_d1_returned:"新訪客 D1 回訪",retention_d7_returned:"新訪客 D7 回訪",user_returned_engaged:"有效回訪",
 teacher_conversation:"老師有效雙向對話",friend_conversation:"朋友有效雙向對話",
 timeline_conversation:"Timeline 有效雙向對話",
 teacher_conversation_start:"老師連線成功",friend_conversation_start:"朋友連線成功",
 timeline_conversation_start:"Timeline 連線成功",
 teacher_user_spoke:"老師 · 使用者開口",friend_user_spoke:"朋友 · 使用者開口",timeline_user_spoke:"Timeline · 使用者開口",
 teacher_ai_replied:"老師 · AI 已回覆",friend_ai_replied:"朋友 · AI 已回覆",timeline_ai_replied:"Timeline · AI 已回覆",
 timeline_view:"Timeline 人生探索",
 shorts_view:"Shorts 瀏覽",shorts_chat_click:"Shorts 點擊聊天",shorts_conversation:"Shorts 有效聊天",
 game_open:"遊戲頁面開啟",game_started:"開始遊戲",game_completed:"完成遊戲",
 game_route_loaded:"遊戲頁面載入完成",game_route_stalled:"遊戲載入超過 8 秒",game_route_asset_error:"遊戲資源載入失敗",
 vocabulary_practice:"單字作答",textbook_study:"教材語音開始",textbook_open:"教材陪讀開啟",
 story_reading:"故事閱讀",story_narration:"語音說故事",story_created:"故事創作",
 fortune_calculated:"命盤計算",fortune_ai_interpreted:"AI 命理解讀",fortune_price_view:"八字價格曝光",fortune_price_interest:"八字付費意願",
 fortune_identity_shared:"命格卡分享",fortune_identity_feedback:"命格卡回饋",fortune_identity_copy_link:"命格卡邀請連結複製",
 gemini_key_missing:"缺少 Gemini Key",gemini_key_verified:"Gemini Key 驗證成功",
 guest_trial_entry_view:"免費試用入口曝光",guest_trial_unavailable:"免費試用入口不可用",guest_trial_start_click:"點擊開始免費試用",guest_trial_mic_denied:"免費試用麥克風拒絕",guest_trial_setup_failed:"免費試用準備失敗",
 guest_trial_token_issued:"免費試用取得憑證",guest_trial_token_failed:"免費試用憑證失敗",guest_trial_connected:"免費試用連線成功",guest_trial_connect_failed:"免費試用連線失敗",guest_trial_ended:"免費試用結束",
 home_entry_click:"首頁入口點擊",explore_entry_click:"探索入口點擊",menu_open:"全部功能選單開啟",menu_item_click:"全部功能選單點擊",
 home_live_bubble_view:"Zoe 聊天泡泡曝光",home_live_bubble_click:"Zoe 聊天泡泡點擊",home_live_bubble_connected:"Zoe 泡泡成功連線",home_live_bubble_conversation:"Zoe 泡泡有效對話",
 home_gift_view:"盲盒曝光",home_gift_open:"盲盒開啟",home_gift_result:"盲盒抽中類別",home_gift_go:"盲盒進入體驗",home_gift_minimize:"盲盒縮小",
 ...SOULS_USAGE_NAMES,
 town_enter:"進入 Town 3D",town_interaction:"Town 互動",town_chat_click:"Town 轉入聊天",town_3d_fallback:"Town 3D 降級",
 magic_enter:"進入 Magic",magic_spell:"Magic 施法",magic_challenge_answer:"Magic 解謎",magic_panel_choice:"Magic 互動卡選擇",
 magic_voice_connected:"Magic 語音連線成功",magic_voice_failed:"Magic 語音連線失敗",magic_3d_fallback:"Magic 3D 降級",magic_world_reset:"Magic 世界重置",
 mate_open:"進入 Mate",mate_briefing_ready:"Mate 交代整理成功",mate_handoff_started:"Mate 交接連線成功",mate_handoff_completed:"Mate 完成任務",mate_handoff_failed:"Mate 交接連線失敗",
 research_article_open:"研究文章開啟",research_article_saved:"研究文章收藏",research_article_completed:"研究文章標記已讀",research_source_open:"研究原始來源開啟",
 circle_thread_open:"交流圈留言展開",circle_post_published:"交流圈發布貼文",circle_comment_posted:"交流圈送出留言"
};
export const categories:{id:Category;label:string;events:string[]}[]=[
 {id:"all",label:"所有有效互動",events:["teacher_conversation","friend_conversation","timeline_conversation","game_completed","vocabulary_practice","textbook_study","story_reading","story_narration","story_created","fortune_calculated","fortune_ai_interpreted","town_interaction","magic_spell","magic_challenge_answer","magic_panel_choice","magic_voice_connected","mate_briefing_ready","mate_handoff_started","mate_handoff_completed","souls_created","souls_conversation","research_article_completed","circle_post_published","circle_comment_posted"]},
 {id:"guest",label:"免費試用",events:["guest_trial_entry_view","guest_trial_unavailable","guest_trial_start_click","guest_trial_mic_denied","guest_trial_setup_failed","guest_trial_token_issued","guest_trial_token_failed","guest_trial_connected","guest_trial_connect_failed","guest_trial_ended"]},
 {id:"chat",label:"老師／朋友／Souls 聊天",events:["teacher_conversation","friend_conversation","timeline_conversation","souls_conversation","home_live_bubble_view","home_live_bubble_click","home_live_bubble_connected","home_live_bubble_conversation"]},
 {id:"timeline",label:"Timeline",events:["timeline_view","timeline_conversation_start","timeline_conversation"]},
 {id:"shorts",label:"Shorts",events:["shorts_view","shorts_chat_click","shorts_conversation"]},
 {id:"games",label:"遊戲",events:["game_open","game_started","game_completed","game_route_loaded","game_route_stalled","game_route_asset_error"]},
 {id:"learning",label:"學習",events:["vocabulary_practice","textbook_study"]},
 {id:"story",label:"故事",events:["story_reading","story_narration","story_created"]},
 {id:"fortune",label:"命理",events:["fortune_calculated","fortune_ai_interpreted","fortune_price_view","fortune_price_interest"]},
 {id:"worlds",label:"Town / Magic",events:["town_enter","town_interaction","town_chat_click","magic_enter","magic_spell","magic_challenge_answer","magic_panel_choice","magic_voice_connected"]},
 {id:"mate",label:"Mate",events:["mate_open","mate_briefing_ready","mate_handoff_started","mate_handoff_completed"]},
 {id:"souls",label:"Souls",events:SOULS_USAGE_EVENTS},
 {id:"research",label:"Briefing",events:["research_article_open","research_article_saved","research_article_completed"]},
 {id:"circle",label:"交流圈",events:["circle_thread_open","circle_post_published","circle_comment_posted"]}
];
export const games:{id:string;label:string}[]=[
 {id:"taboo",label:"Taboo 描述猜詞"},{id:"1a2b",label:"1A2B 猜數字"},
 {id:"number-bomb",label:"終極密碼"},{id:"memory",label:"翻牌記憶"},
 {id:"gomoku",label:"五子棋"},{id:"connect4",label:"四子棋"},
 {id:"reversi",label:"黑白棋"},{id:"nonsense",label:"荒謬新聞直播 / 胡說大賽"},{id:"crazy-court",label:"荒謬法庭"},{id:"werewolf",label:"狼人殺"},{id:"twenty-questions",label:"20 Questions"},{id:"mystery",label:"海龜湯"}
];
export const eventRatio=(value:number,previous:number)=>previous>0?(value/previous*100).toFixed(1)+"%":"—";
export const chatStart=["teacher_conversation_start","friend_conversation_start","timeline_conversation_start","souls_live_connected"];
export const chatSpeech=["teacher_user_spoke","friend_user_spoke","timeline_user_spoke","souls_user_input"];
export const chatReply=["teacher_ai_replied","friend_ai_replied","timeline_ai_replied","souls_ai_replied"];
export const chatEffective=["teacher_conversation","friend_conversation","timeline_conversation","souls_conversation"];

