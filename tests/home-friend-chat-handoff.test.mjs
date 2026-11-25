import assert from "node:assert/strict";
import test from "node:test";
import {consumeHomeChat, peekHomeChat, prepareHomeChat} from "../web-spa/src/pages/homeChatHandoff.ts";

test("homepage chat opener only belongs to the friend and navigation that selected it", () => {
 const state = prepareHomeChat("noah", "resume", "English", "topic-1");
 assert.equal(peekHomeChat(null, "noah"), null);
 assert.equal(peekHomeChat(state, "zoe"), null);
 assert.deepEqual(peekHomeChat(state, "noah"), {
  token: state.homeChatToken, friendId: "noah", choice: "resume", language: "English", topicId: "topic-1"
 });
 consumeHomeChat("unrelated");
 assert.equal(peekHomeChat(state, "noah")?.choice, "resume");
 consumeHomeChat(state.homeChatToken);
 assert.equal(peekHomeChat(state, "noah"), null);
});

test("a newer opener replaces any previous unconsumed navigation", () => {
 const old = prepareHomeChat("zoe", "casual");
 const current = prepareHomeChat("zoe", "funny");
 consumeHomeChat(old.homeChatToken);
 assert.equal(peekHomeChat(old, "zoe"), null);
 assert.equal(peekHomeChat(current, "zoe")?.choice, "funny");
 consumeHomeChat(current.homeChatToken);
});
