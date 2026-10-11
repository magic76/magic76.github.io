import{TeacherMemoryConsent}from"./TeacherMemoryConsent";
import{Outlet,useLocation}from"react-router-dom";
import{AppChrome}from"../components/AppChrome";
import{ProductTabs}from"../components/ProductTabs";
export function TeacherLayout(){
 const {pathname}=useLocation();
 return <AppChrome product="teacher">
  <ProductTabs items={[["/teacher/practice","練習"],["/teacher/learn","學習"],["/teacher/tutor","老師"],["/teacher/friends","朋友"],["/teacher/me","我的"]]}/>
  <Outlet/>
  {!pathname.endsWith("/friends")&&<TeacherMemoryConsent/>}
 </AppChrome>;
}
