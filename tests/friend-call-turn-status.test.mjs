import test from "node:test";
import assert from "node:assert/strict";
import {friendVoiceStatusKey} from "../web-spa/src/friends/friendVoiceStatusKey.ts";

test("friend interruption returns to the actual input mode",()=>{
 for(const [micEnabled,muted,expected] of [
  [true,false,"liveStatus.hearing"],
  [true,true,"liveStatus.micMuted"],
  [false,false,"voice:friendLive.textChat"]
 ]){
  assert.equal(friendVoiceStatusKey("speaking","idle",false,true,micEnabled,muted),"liveStatus.speaking");
  assert.equal(friendVoiceStatusKey("listening","idle",false,true,micEnabled,muted),expected);
 }
});

test("reply and connection feedback is preserved when the mic is muted",()=>{
 for(const [phase,key] of [["processing","processing"],["no-reply","noReply"],["recovering","recovering"]]){
  assert.equal(friendVoiceStatusKey("listening",phase,false,true,true,true),"liveStatus."+key);
 }
 assert.equal(friendVoiceStatusKey("error","idle",true,false,false,false),"common:gemini.keyNeeded");
});
