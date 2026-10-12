import{Outlet}from"react-router-dom";
import{useTranslation}from"react-i18next";
import{AppChrome}from"../components/AppChrome";
import{ProductTabs}from"../components/ProductTabs";
export function StoryLayout(){const {t}=useTranslation("story");return <AppChrome product="story"><ProductTabs items={[["/story/shelf",t("tabs.shelf")],["/story/me",t("tabs.me")]]}/><Outlet/></AppChrome>}
