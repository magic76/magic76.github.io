import{Navigate,useLocation,useSearchParams}from"react-router-dom";
import{FriendsPage}from"../friends/FriendsPage";

/** Legacy role URLs stay valid; global Learn and Chat own the two journeys. */
export function RolesPage(){
 const [params]=useSearchParams(),location=useLocation();
 const requested=params.get("mode");
 const mode=requested==="teacher"||requested==="friends"?requested:
   typeof window!=="undefined"&&localStorage.getItem("crew_teacher_last_role_v1")==="friends"?"friends":"teacher";
 if(mode==="teacher")return <Navigate to="/learn" replace state={location.state}/>;
 return <div className="crew-role-content"><FriendsPage/></div>;
}
