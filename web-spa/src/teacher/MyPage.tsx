import {Arrow} from "../components/Arrow";
import{Link}from"react-router-dom";
import{useTranslation}from"react-i18next";
import{PlayStoreLink}from"../components/PlayStoreLink";
import{isCrewAndroidShell}from"../lib/platform";
import{useClientReady}from"../lib/useClientReady";
import{history}from"../lib/runtime";
import{completedLessons,totalStars}from"./courseProgress";
import{dueDeckItems,learningDeck}from"./learningDeck";
import{vocabularySummary}from"./learningCoordinator";
import{todayVocabulary}from"./vocabularyProgress";

export function MyPage(){
 const {t}=useTranslation("teacher");
 const ready=useClientReady();
 const h=history("teacher"),reports=h.filter((x:any)=>x.report),deck=learningDeck(),due=dueDeckItems().length,v=vocabularySummary(),courses=completedLessons();
 return <><section className="hero"><span className="kicker">{t("my.kicker")}</span><h1>{t("my.title")}</h1><p>{t("my.intro")}</p></section>
 <section className="section panel teacher-my-summary"><div className="actions"><Link className="btn" to="/learn">{t("my.title")} · {t("my.speaking")} <Arrow/></Link><Link className="btn secondary" to="/teacher/phrasebook">{t("my.phrases")} <Arrow/></Link></div><div className="teacher-stats"><div><strong>{h.length}</strong><span>{t("my.speaking")}</span></div><div><strong>{v.level}</strong><span>{t("my.level")}</span></div><div><strong>{todayVocabulary()}</strong><span>{t("my.today")}</span></div></div><div className="teacher-stats teacher-stats-secondary"><div><strong>{courses}</strong><span>{t("my.completed")}</span></div><div><strong>★ {totalStars()}</strong><span>{t("my.stars")}</span></div><div><strong>{deck.length}</strong><span>{t("my.phrases")}</span></div></div></section>
 <section className="section"><div className="section-head"><h2>{t("my.records")}</h2><small>{t("my.localOnly")}</small></div><div className="list"><Link className="list-item" to="/settings#memory-settings"><span className="list-icon">⚙</span><span className="list-copy"><strong>{t("my.personal")}</strong><small>{t("my.personalDesc")}</small></span><Arrow className="chevron"/></Link><Link className="list-item" to="/teacher/memory"><span className="list-icon">◎</span><span className="list-copy"><strong>{t("my.memory")}</strong><small>{t("my.memoryDesc")}</small></span><Arrow className="chevron"/></Link><Link className="list-item" to="/chat"><span className="list-icon">◉</span><span className="list-copy"><strong>{t("my.friends")}</strong><small>{t("my.friendsDesc")}</small></span><Arrow className="chevron"/></Link><Link className="list-item" to="/teacher/phrasebook"><span className="list-icon">★</span><span className="list-copy"><strong>{t("my.phrases")}</strong><small>{t("my.phraseDesc",{count:deck.length,due})}</small></span><Arrow className="chevron"/></Link><Link className="list-item" to="/teacher/reports"><span className="list-icon">R</span><span className="list-copy"><strong>{t("my.reports")}</strong><small>{t("my.reportDesc",{count:reports.length})}</small></span><Arrow className="chevron"/></Link><Link className="list-item" to="/teacher/reading-library"><span className="list-icon">▤</span><span className="list-copy"><strong>{t("my.library")}</strong><small>{t("my.libraryDesc")}</small></span><Arrow className="chevron"/></Link></div></section>
 {ready&&!isCrewAndroidShell()&&<section className="section panel"><div className="section-head"><h2>{t("my.android")}</h2><small>Google Play</small></div><p className="meta">{t("my.androidDesc")}</p><PlayStoreLink product="teacher" compact/></section>}
 </>;
}
