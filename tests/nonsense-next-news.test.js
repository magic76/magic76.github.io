const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {stripTypeScriptTypes}=require("node:module");
const read=file=>fs.readFileSync(path.resolve(__dirname,"..",file),"utf8");

function loadTopics(){
 const source=read("web-spa/src/games/nonsenseTopics.ts");
 const code=stripTypeScriptTypes(source).replace(/^export /gm,"");
 const scope={};
 new Function("scope",code+"\nObject.assign(scope,{nonsenseTopics,customNonsenseTopic,nextNonsenseTopic});")(scope);
 return scope;
}

test("next broadcast always picks a different news story within the chosen category",()=>{
 const {nonsenseTopics,nextNonsenseTopic}=loadTopics();
 const current=nonsenseTopics.find(topic=>topic.category==="animals");
 const result=nextNonsenseTopic(current,"animals",()=>0);
 assert.equal(result.category,"animals");
 assert.equal(result.topic.category,"animals");
 assert.notEqual(result.topic.id,current.id);
 assert.equal(nonsenseTopics.length,150);
});

test("after a custom topic the next news story comes from the full 150-topic library",()=>{
 const {nextNonsenseTopic,customNonsenseTopic,nonsenseTopics}=loadTopics();
 const custom=customNonsenseTopic("今天所有電梯罷工");
 const result=nextNonsenseTopic(custom,"custom",()=>0);
 assert.equal(result.category,"all");
 assert.ok(nonsenseTopics.some(topic=>topic.id===result.topic.id));
 assert.notEqual(result.topic.id,custom.id);
});

test("finished news offers a one-tap next broadcast and pins its selected topic across voice/text/fallback/share",()=>{
 const page=read("web-spa/src/games/NonsenseLiveNewsPage.tsx");
 assert.match(page,/const nextBroadcast=\(\)=>/);
 assert.match(page,/if\(status!=="finished"\)return;/);
 assert.match(page,/nextNonsenseTopic\(activeTopicRef.current,category\)/);
 assert.match(page,/setCategory\(next.category\);setTopic\(next.topic\);/);
 assert.match(page,/void start\(next.topic\)/);
 assert.match(page,/const start=async\(playTopic:NonsenseTopic=liveTopic\)=>/);
 assert.match(page,/activeTopicRef.current=playTopic/);
 assert.match(page,/startNonsenseNewsLive\(playTopic,language/);
 assert.match(page,/nextNewsScene\(activeTopicRef.current,language/);
 assert.match(page,/topic:activeTopicRef.current\[language\]/);
 assert.match(page,/onClick=\{nextBroadcast\}/);
 assert.match(page,/onClick=\{reset\}>\{L\(zh,"重新設定","Change settings"\)\}/);
 assert.doesNotMatch(page,/onClick=\{reset\}>\{L\(zh,"再玩一局","Play again"\)\}/);
});
