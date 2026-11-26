import {useEffect,useState} from "react";
import {TARGET_LANGUAGES} from "../teacher/targetLanguages";

import type {TeacherProfile} from "../teacher/teacherProfiles";

type HomeTeacher={name:string;profile:TeacherProfile;language:string};

/** Keep teacher personas out of the first-load bundle and the SSG render deterministic. */
export function useHomeTeacher(locale:string){
 const [teacher,setTeacher]=useState<HomeTeacher|null>(null);
 useEffect(()=>{
  let active=true;
  const load=async()=>{
   if(!localStorage.getItem("crew_teacher_profile")&&!localStorage.getItem("crew_teacher_lang"))return;
   const [{useTeacherStore},{getTeacherProfile}]=await Promise.all([
    import("../store/teacherStore"),import("../teacher/teacherProfiles")
   ]);
   const {teacherProfile,targetLanguage}=useTeacherStore.getState();
   const profile=getTeacherProfile(teacherProfile);
   const language=TARGET_LANGUAGES.find(item=>item.value===targetLanguage||item.code===targetLanguage);
   if(active&&language){
    const label=locale.startsWith("zh")?language.value:new Intl.DisplayNames([locale],{type:"language"}).of(language.code);
    setTeacher({name:profile.name,profile,language:label||language.spoken});
   }
  };
  void load().catch(()=>{/* Keep the generic teacher entry available when storage is restricted. */});
  return()=>{active=false};
 },[locale]);
 return teacher;
}
