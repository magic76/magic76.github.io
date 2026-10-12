export type BriefingSource = { title: string; url: string; publishedAt?: string; kind?: string };
export type BriefingItem = {
 id: string; title: string; summary: string; publishedAt: string;
 topic: string; projects: string[]; relevance: string; actions: string[];
 sources: BriefingSource[]; score: number; body?: string;
};
export type BriefingDay = { date: string; generatedAt: string; edition: "public"; items: BriefingItem[]; notes?: string };
export type BriefingIndex = { days: string[]; updatedAt?: string };
export type ReviewStatus = "unread" | "reading" | "researching" | "delegated" | "adopted" | "dismissed" | "finished";
export type LocalReview = { saved?: boolean; status?: ReviewStatus; notes?: string; updatedAt?: string; draft?: string };
export type ReviewMap = Record<string, LocalReview>;
export const PROJECTS = ["Crew Pocket", "Crew Deck", "Crew Teacher", "Crew Story", "Crew Fortune", "Crew Web", "Crew Lab SI"];
