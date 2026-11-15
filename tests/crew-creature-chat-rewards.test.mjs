import test from "node:test";
import assert from "node:assert/strict";
import {awardCreatureChatEnergy, readCreatureChatRewards,
 CREATURE_CHAT_REWARDS_KEY, CREATURE_CHAT_DAILY_LIMIT} from "../web-spa/src/pages/creatureChatRewards.mjs";

const memory = () => {
 const saved = new Map();
 return {
  getItem: key => saved.has(key) ? saved.get(key) : null,
  setItem: (key, value) => saved.set(key, value),
  saved
 };
};
const day1 = new Date("2026-11-15T10:00:00+08:00");
const day2 = new Date("2026-11-16T10:00:00+08:00");

test("only successfully reported unique text/voice exchanges are eligible", () => {
 const store = memory();
 assert.equal(awardCreatureChatEnergy("friend-text", "tx1", store, day1), true);
 assert.equal(awardCreatureChatEnergy("friend-text", "tx1", store, day1), false);
 assert.equal(awardCreatureChatEnergy("friend-voice", "vx1", store, day1), true);
 assert.equal(awardCreatureChatEnergy("teacher-text", "tx2", store, day1), true);
 assert.equal(awardCreatureChatEnergy("teacher-voice", "vx2", store, day1), true);
 assert.equal(readCreatureChatRewards(store).total, 4);
 assert.equal(readCreatureChatRewards(store).todayCount, 4);
 assert.equal(awardCreatureChatEnergy("other", "fake", store, day1), false);
 assert.equal(awardCreatureChatEnergy("friend-text", "bad transcript with spaces", store, day1), false);
 assert.equal(awardCreatureChatEnergy("friend-text", "", store, day1), false);
 assert.equal(readCreatureChatRewards(store).total, 4);
 assert.ok(!store.getItem(CREATURE_CHAT_REWARDS_KEY).includes("transcript"));
});

test("daily eight cap persists over reload and resets the next local day", () => {
 const store = memory();
 for (let i = 0; i < CREATURE_CHAT_DAILY_LIMIT; i++)
  assert.equal(awardCreatureChatEnergy("friend-text", "day1-"+i, store, day1), true);
 assert.equal(awardCreatureChatEnergy("teacher-voice", "ninth", store, day1), false);
 assert.equal(readCreatureChatRewards(store).total, 8);
 assert.equal(awardCreatureChatEnergy("teacher-voice", "tomorrow", store, day2), true);
 assert.equal(readCreatureChatRewards(store).todayCount, 1);
 assert.equal(readCreatureChatRewards(store).total, 9);
 assert.equal(awardCreatureChatEnergy("teacher-voice", "tomorrow", store, day2), false);
});

test("storage errors, corruption and malformed awards fail closed", () => {
 const store = memory();
 store.setItem(CREATURE_CHAT_REWARDS_KEY, "{");
 assert.equal(awardCreatureChatEnergy("friend-text", "x", store, day1), false);
 assert.equal(store.getItem(CREATURE_CHAT_REWARDS_KEY), "{");
 const blocked = {getItem(){throw new Error("blocked")},setItem(){throw new Error("blocked")}};
 assert.equal(awardCreatureChatEnergy("teacher-voice", "x", blocked, day1), false);
 const writeBlocked = {getItem: () => null,setItem(){throw new Error("blocked")}};
 assert.equal(awardCreatureChatEnergy("teacher-text", "x", writeBlocked, day1), false);
 assert.equal(awardCreatureChatEnergy("teacher-text", "x", store, new Date("invalid")), false);
});

test("browser-local ledger never contains message text or identifiers tied to users", () => {
 const store = memory();
 awardCreatureChatEnergy("friend-text", "sessionABC:1", store, day1);
 const raw = store.getItem(CREATURE_CHAT_REWARDS_KEY);
 assert.deepEqual(Object.keys(JSON.parse(raw)).sort(),
  ["day", "seen", "todayCount", "total", "version"].sort());
 assert.equal(JSON.parse(raw).seen[0], "friend-text:sessionABC:1");
});
