import {ensureFortuneServices} from "../lib/runtime";
import {saveFortuneSpeakingContext} from "../teacher/fortuneSpeaking";
import type {FortuneReading} from "./types";

/**
 * Lazy, explicit click-only handoff. Keep /fortune and /fortune/history
 * independent of optional remote astrology engines and preserve local privacy.
 */
export async function prepareFriendExplanation(id:string):Promise<void>{
 await ensureFortuneServices();
 const reading=window.CrewFortuneProfile.get(id) as FortuneReading|null;
 if(!reading||!reading.result||!["bazi","tarot","vedic"].includes(reading.mode))
  throw new Error("This saved reading is unavailable.");
 saveFortuneSpeakingContext(reading);
}
