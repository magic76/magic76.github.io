import{useEffect,useState}from"react";import{useTranslation}from"react-i18next";
import{useParams}from"react-router-dom";
import{ensureStoryServices}from"../lib/runtime";
import{builtInStory,type StoryBook}from"./catalog";
import{StoryPlayerView}from"./player/StoryPlayerView";

export function StoryReaderPage(){
 const {t}=useTranslation("story");
 const{id=""}=useParams(),[book,setBook]=useState<StoryBook|null|undefined>(undefined);
 useEffect(()=>{void ensureStoryServices().then(async()=>{
  const key=decodeURIComponent(id),stored=await window.CrewStoryStore!.get(key),value=(stored||builtInStory(key)) as StoryBook|null;
  setBook(value);
 })},[id]);
 if(book===undefined)return <div className="spa-loading">{t("reader.loading")}</div>;
 if(!book)return <div className="story-empty">{t("reader.notFound")}</div>;
 return <StoryPlayerView initialBook={book}/>;
}
