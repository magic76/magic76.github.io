import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ConversationMode = "natural" | "scenario" | "practice";
export type Guidance = "light" | "normal" | "strict";
export type LanguageStyle = "auto" | "us" | "gb" | "au";

type TeacherState = {
  targetLanguage: string;
  conversationMode: ConversationMode;
  guidance: Guidance;
  voice: string;
  languageStyle: LanguageStyle;
  setTargetLanguage(value: string): void;
  setConversationMode(value: ConversationMode): void;
  setGuidance(value: Guidance): void;
  setVoice(value: string): void;
  setLanguageStyle(value: LanguageStyle): void;
};

function legacy(key: string, fallback: string) {
  return localStorage.getItem("crew_teacher_" + key) || fallback;
}
function write(key: string, value: string) {
  localStorage.setItem("crew_teacher_" + key, value);
}

export const useTeacherStore = create<TeacherState>()(
  persist(
    (set) => ({
      targetLanguage: legacy("lang", "英文"),
      conversationMode: legacy("chatMode", "natural") as ConversationMode,
      guidance: legacy("guidance", "normal") as Guidance,
      voice: legacy("voice", "Kore"),
      languageStyle: legacy("languageStyle", "auto") as LanguageStyle,
      setTargetLanguage: (value) => {
        write("lang", value);
        if (value !== "英文") write("languageStyle", "auto");
        set({ targetLanguage: value, ...(value !== "英文" ? { languageStyle: "auto" as LanguageStyle } : {}) });
      },
      setConversationMode: (value) => { write("chatMode", value); set({ conversationMode: value }); },
      setGuidance: (value) => { write("guidance", value); set({ guidance: value }); },
      setVoice: (value) => { write("voice", value); set({ voice: value }); },
      setLanguageStyle: (value) => { write("languageStyle", value); set({ languageStyle: value }); }
    }),
    { name: "crew_teacher_spa_state" }
  )
);
