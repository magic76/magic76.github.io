export const CREATURE_CHAT_REWARDS_KEY: string;
export const CREATURE_CHAT_DAILY_LIMIT: number;
export type CreatureChatSource = "friend-text" | "teacher-text" | "friend-voice" | "teacher-voice";
export type CreatureChatLedger = { version: 1; total: number; day: string; todayCount: number; seen: string[] };
export function readCreatureChatRewards(store?: Pick<Storage, "getItem">): CreatureChatLedger | null;
export function awardCreatureChatEnergy(source: CreatureChatSource, turnId: string, store?: Pick<Storage, "getItem" | "setItem">, now?: Date): boolean;
