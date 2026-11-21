import {Link} from "react-router-dom";
import {Arrow} from "../components/Arrow";
import {useTranslation} from "react-i18next";
import {Icon,type IconName} from "../components/Icon";
import {useRouteNamespace} from "../i18n/useRouteNamespace";

type Tool={to:string;title:string;desc:string;icon:IconName};
export function LearnHubExtras({tools,speakingPath}:{tools:Tool[];speakingPath:string}){
 const {t}=useTranslation("lesson");
 const {t:tTeacher}=useTranslation("teacher");
 const ready=useRouteNamespace("lesson");
 if(!ready)return null;
 return <section className="crew-learn-tools" aria-label={tTeacher("learn.method")}>
  <div className="crew-section-grid crew-learn-tool-grid">
   {tools.map(tool=><Link className="crew-section-card crew-learn-tool" key={tool.to} to={tool.to}>
    <span className="crew-section-card-icon"><Icon name={tool.icon}/></span>
    <span className="crew-section-card-copy"><strong>{tool.title}</strong><small>{tool.desc}</small></span>
    <Arrow className="crew-learn-tool-arrow"/>
   </Link>)}
  </div>
  <Link className="crew-learn-three-minute" to={speakingPath}>
   <span className="crew-section-card-icon crew-learn-three-minute-icon"><Icon name="chat"/></span>
   <span className="crew-learn-three-minute-copy"><strong>{t("learnToday.threeMinute")}</strong><small>{t("learnToday.threeMinuteDesc")}</small></span>
   <Arrow className="crew-learn-three-minute-arrow"/>
  </Link>
  <nav className="crew-learn-secondary-links" aria-label={t("learnToday.more")}>
   <Link to="/teacher/reading-library">{tTeacher("learn.library")}</Link>
   <Link to="/teacher/reports">{t("learnToday.records")}</Link>
   <Link to="/settings#settings-learning">{t("learnToday.settings")}</Link>
   <Link to="/teacher/course">{tTeacher("learn.course")}</Link>
  </nav>
 </section>;
}
