// Local-only energy rewards for completed Crew conversations. No transcripts or user IDs.
export const CREATURE_CHAT_REWARDS_KEY = "crew-creature-chat-rewards-v1";
export const CREATURE_CHAT_DAILY_LIMIT = 8;
const SOURCES = new Set(["friend-text", "teacher-text", "friend-voice", "teacher-voice"]);
const ID = /^[a-zA-Z0-9._:-]{1,160}$/;
const cleanInt = (n, max) => Number.isSafeInteger(n) && n >= 0 && n <= max;
const civilDay = now => now.getFullYear() + "-" +
 String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");

export function readCreatureChatRewards(store = globalThis.localStorage) {
 try {
  if (!store || typeof store.getItem !== "function") return null;
  const raw = store.getItem(CREATURE_CHAT_REWARDS_KEY);
  if (raw === null) return { version: 1, total: 0, day: "", todayCount: 0, seen: [] };
  const value = JSON.parse(raw);
  if (!value || value.version !== 1 ||
      !cleanInt(value.total, 9999) || !cleanInt(value.todayCount, CREATURE_CHAT_DAILY_LIMIT) ||
      typeof value.day !== "string" || !/^(?:|\d{4}-\d{2}-\d{2})$/.test(value.day) ||
      !Array.isArray(value.seen) || value.seen.length > 128 ||
      !value.seen.every(x => typeof x === "string" && ID.test(x))) return null;
  return value;
 } catch { return null; }
}

// Return true only after a successfully persisted award. Invalid or unavailable
// storage fails closed, rather than silently recreating/re-awarding old progress.
export function awardCreatureChatEnergy(source, turnId, store = globalThis.localStorage, now = new Date()) {
 if (!SOURCES.has(source) || typeof turnId !== "string" || !ID.test(turnId) ||
     !(now instanceof Date) || !Number.isFinite(now.getTime())) return false;
 const id = source + ":" + turnId;
 if (id.length > 160) return false;
 const ledger = readCreatureChatRewards(store);
 if (!ledger || ledger.seen.includes(id) || ledger.total >= 9999) return false;
 const day = civilDay(now);
 const todayCount = ledger.day === day ? ledger.todayCount : 0;
 if (todayCount >= CREATURE_CHAT_DAILY_LIMIT) return false;
 const updated = { version: 1, total: ledger.total + 1, day,
  todayCount: todayCount + 1, seen: [...ledger.seen, id].slice(-128) };
 try {
  store.setItem(CREATURE_CHAT_REWARDS_KEY, JSON.stringify(updated));
  return true;
 } catch { return false; }
}
