const test=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {Session}=require("../crew-live.js");

test("teacher voice composer uses the current session and stays out of the text-only route",()=>{
 const page=readFileSync("web-spa/src/teacher/LivePage.tsx","utf8");
 const composer=readFileSync("web-spa/src/friends/FriendUnifiedComposer.tsx","utf8");
 assert.match(page,/textMode\?<TeacherTextCourseChat[\s\S]*?\(sessionActive\|\|interruptedCaptions\)&&!endingCourse&&<FriendUnifiedComposer live=\{live\} connectedOnly\/>/);
 assert.match(page,/useFriendTextViewport\(!textMode,stage\)/);
 assert.match(composer,/connectedOnly&&!connected/);
 assert.match(composer,/connectedOnly\?live\.sendText\(text,true\)/);
 assert.match(composer,/!event\.nativeEvent\.isComposing/);
});

test("typed learner input appears in the voice transcript without recording tutor shortcuts",()=>{
 const sent=[],transcript=[];
 const session=new Session({onInputTranscript:text=>transcript.push(text)});
 const socket={readyState:1,send:message=>sent.push(JSON.parse(message))};
 session.ws=socket;
 session.activeAttempt={socket,id:session.attemptSeq};
 session.ready=true;
 session.running=true;
 assert.equal(session.sendText("Could we practice this again?",true),true);
 assert.equal(session.sendText("Change today's activity"),true);
 assert.deepEqual(transcript,["Could we practice this again?"]);
 assert.equal(sent[0].clientContent.turns[0].parts[0].text,"Could we practice this again?");
 session.ready=false;
 assert.equal(session.sendText("Still here?",true),false);
 assert.equal(sent.length,2);
});
