import{useSearchParams}from"react-router-dom";
import{TutorPage}from"./TutorPage";
import{FriendsPage}from"../friends/FriendsPage";

/** One Crew relationship destination; teachers and friends keep separate identities. */
export function RolesPage(){
 const[params,setParams]=useSearchParams();
 const requested=params.get("mode");
 const mode=requested==="teacher"||requested==="friends"?requested:
   localStorage.getItem("crew_teacher_last_role_v1")==="friends"?"friends":"teacher";
 function change(next:"teacher"|"friends"){
  localStorage.setItem("crew_teacher_last_role_v1",next);
  setParams({mode:next});
 }
 return <>
  <nav className="crew-role-switcher" aria-label="角色類型">
   <button type="button" className={mode==="teacher"?"active":""} aria-pressed={mode==="teacher"} onClick={()=>change("teacher")}>Crew 老師</button>
   <button type="button" className={mode==="friends"?"active":""} aria-pressed={mode==="friends"} onClick={()=>change("friends")}>Crew 朋友</button>
  </nav>
  <div className="crew-role-content" key={mode}>{mode==="friends"?<FriendsPage/>:<TutorPage/>}</div>
 </>;
}
