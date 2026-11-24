import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {trackUsageEvent} from "../analytics/usage";
import {prepareHomeChat, type HomeChatChoice} from "./homeChatHandoff";

type Topic = {friendId: string; language: string; topicId: string};

export function HomeChatChoices({friendId, returning, active = true}: {
 friendId: string;
 returning: boolean;
 active?: boolean;
}) {
 const {t} = useTranslation("home");
 const navigate = useNavigate();
 const [topic, setTopic] = useState<Topic | null>(null);
 useEffect(() => {
  if (!returning) return;
  let cancelled = false;
  const sync = async () => {
   const [memory, {useTeacherStore}] = await Promise.all([import("../friends/friendMemory"), import("../store/teacherStore")]);
   if (cancelled) return;
   const language = useTeacherStore.getState().targetLanguage;
   const note = memory.getHomeChatTopic(friendId, language);
   setTopic(note ? {friendId, language, topicId: note.id} : null);
  };
  const refresh = () => void sync().catch(() => {if (!cancelled) setTopic(null)});
  refresh();
  window.addEventListener("storage", refresh);
  window.addEventListener("focus", refresh);
  return () => {
   cancelled = true;
   window.removeEventListener("storage", refresh);
   window.removeEventListener("focus", refresh);
  };
 }, [friendId, returning]);
 const scoped = returning && topic?.friendId === friendId ? topic : null;
 const choices: HomeChatChoice[] = scoped ? ["resume", "fresh"] : ["funny", "casual"];
 function start(choice: HomeChatChoice) {
  const state = prepareHomeChat(friendId, choice, scoped?.language, scoped?.topicId);
  trackUsageEvent("home_entry_click", "friend");
  trackUsageEvent("home_friend_chat", `${choice}_pick`);
  navigate("/friend/live?id=" + encodeURIComponent(friendId) + "&from=home&chat=text", {state});
 }
 return <div className="home-chat-choices">
  {choices.map(choice => <button type="button" key={choice} tabIndex={active ? 0 : -1}
   onClick={() => start(choice)}>{t("chatChoices." + choice)}</button>)}
 </div>;
}
