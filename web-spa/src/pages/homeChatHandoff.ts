export type HomeChatChoice = "funny" | "casual" | "resume" | "fresh";

type HomeChatHandoff = {
 token: string;
 friendId: string;
 choice: HomeChatChoice;
 language?: string;
 topicId?: string;
};
let pending: HomeChatHandoff | null = null;

// The selected opener stays in memory. Reloading a URL never starts a new turn.
export function prepareHomeChat(friendId: string, choice: HomeChatChoice, language?: string, topicId?: string) {
 pending = {token: crypto.randomUUID(), friendId, choice, language, topicId};
 return {homeChatToken: pending.token};
}

export function peekHomeChat(state: unknown, friendId: string) {
 if (!pending || pending.friendId !== friendId || !state || typeof state !== "object" || !("homeChatToken" in state)) return null;
 return state.homeChatToken === pending.token ? pending : null;
}

export function consumeHomeChat(token: string) {
 if (pending?.token === token) pending = null;
}
