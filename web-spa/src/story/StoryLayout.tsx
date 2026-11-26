import {Outlet,useMatch} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {AppChrome} from "../components/AppChrome";
import {ProductTabs} from "../components/ProductTabs";
import "./storyHeading.css";

export function StoryLayout(){
 const {t}=useTranslation("story");
 const index=useMatch("/story"),shelf=useMatch("/story/shelf"),mine=useMatch("/story/me");
 const page=index||shelf?"shelf":mine?"my":null;
 const tabs=<ProductTabs items={[[index?"/story":"/story/shelf",t("tabs.shelf")],["/story/me",t("tabs.me")]]}/>;
 return <AppChrome product="story">
  {page?<div className="story-library-header">
   {tabs}
   <header className="hero"><span className="kicker">{page==="shelf"?"Koolo Story":"My Story"}</span><h1>{page==="shelf"?t("shelf.title"):t("my.title")}</h1><p>{page==="shelf"?t("shelf.intro"):t("my.intro")}</p></header>
  </div>:tabs}
  <Outlet/>
 </AppChrome>;
}
