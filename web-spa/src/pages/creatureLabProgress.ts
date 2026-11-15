export const CREATURE_LAB_SAVE = "crew-creature-lab-v1";

const species = new Set(["moonfox", "stardragon", "flowerfairy", "cat", "snowbunny", "redpanda", "dolphin", "phoenix"]);
const stages = ["egg", "baby", "growing", "mature", "final"] as const;
const costs = [2, 4, 5, 5] as const;

export type CreatureLabProgress = {
  line: string | null;
  form: typeof stages[number];
  remaining: number;
};

// The standalone document sits outside both the localized SPA and the legacy hash router.
export function creatureLabHref(pathname = typeof window === "undefined" ? "/" : window.location.pathname) {
  return (pathname.startsWith("/crew-app/") ? "/crew-app" : "") + "/crew-creature-lab/";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function knownLine(value: unknown): value is string {
  return typeof value === "string" && species.has(value);
}

export function readCreatureLabProgress(store?: Pick<Storage, "getItem">): CreatureLabProgress | null {
  try {
    const saved = (store ?? window.localStorage).getItem(CREATURE_LAB_SAVE);
    if (!saved) return null;
    const data: unknown = JSON.parse(saved);
    if (!isRecord(data) || data.version !== 1 || !isRecord(data.creature)) return null;
    const { line, stage, sentences } = data.creature;
    if (!isCount(stage) || stage >= stages.length || !isCount(data.energy)) return null;
    if (!Array.isArray(data.creature.topics) || (sentences !== undefined && !isCount(sentences))) return null;
    if (line !== null && !knownLine(line)) return null;
    if (stage > 0 && line === null) return null;

    // A reset writes an empty save. An older collection or a gift egg can still be
    // genuine progress even when the current egg has no sentences or energy yet.
    if (stage === 0 && line === null && !(isCount(sentences) && sentences > 0) && !data.energy) {
      const hasCollection = Array.isArray(data.collection) && data.collection.some(
        item => isRecord(item) && item.stage === 4 && knownLine(item.line)
      );
      const gifts = isCount(data.gifts) ? data.gifts : data.boxes;
      const inventory = isRecord(data.giftCollection) ? data.giftCollection : data.boxCollection;
      const hasInventory = isRecord(inventory) && Object.values(inventory).some(n => isCount(n) && n > 0);
      if (!hasCollection && !(isCount(gifts) && gifts > 0) && !hasInventory) return null;
    }
    const cost = costs[stage];
    return { line, form: stages[stage], remaining: cost === undefined ? 0 : Math.max(0, cost - data.energy) };
  } catch {
    // Restricted storage, unsupported saves and malformed JSON must not affect the home page.
    return null;
  }
}
