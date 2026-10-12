import{Link,Outlet}from"react-router-dom";
import{useTranslation}from"react-i18next";
import{AppChrome}from"../components/AppChrome";
export function FortuneLayout(){const {t}=useTranslation("fortune");return <AppChrome product="fortune" headerAction={<Link className="fortune-header-history" to="/fortune/history">{t("home.historyButton")}</Link>}><Outlet/></AppChrome>}
