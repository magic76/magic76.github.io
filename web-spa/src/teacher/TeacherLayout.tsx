import{Outlet}from"react-router-dom";
import{useTranslation}from"react-i18next";
import{AppChrome}from"../components/AppChrome";
import{ProductTabs}from"../components/ProductTabs";
export function TeacherLayout(){
 const {t}=useTranslation("teacher");
 return <AppChrome product="teacher">
  <ProductTabs items={[["/teacher",t("tabs.practice")],["/teacher/learn",t("tabs.learn")],["/teacher/roles",t("tabs.roles")],["/teacher/me",t("tabs.me")]]}/>
  <Outlet/>
 </AppChrome>;
}
