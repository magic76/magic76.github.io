// Maps raw vocabulary topics (Chinese labels from the core list, snake_case ids from the Android seed)
// to a small set of translated topic groups, so learners never see internal ids such as "adult_work".
const TOPIC_GROUPS:Record<string,string>={
 "日常":"daily","購物":"shopping","餐廳":"dining","生活":"life","工作":"work","旅遊":"travel","表達":"expression","一般":"general",
 family:"family",school:"school",colors_shapes:"general",numbers_time:"general",body:"health",food:"dining",animals:"nature",
 home_objects:"daily",clothes:"shopping",actions:"general",more_actions:"daily",feelings:"feelings",nature_weather:"nature",
 places_transport:"travel",adjectives:"expression",question_function:"expression",daily:"daily",sports:"sports",
 basic_verbs:"general",basic_nouns:"general",adult_travel:"travel",adult_work:"work",adult_shopping:"shopping",
 adult_health:"health",adult_tech:"tech",adult_social:"social"
};
export const vocabularyTopicGroup=(topic:string)=>TOPIC_GROUPS[topic]||"general";
