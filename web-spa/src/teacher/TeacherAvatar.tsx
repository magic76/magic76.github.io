import type{TeacherProfile}from"./teacherProfiles";
import portraitSprite from "../../../assets/teacher/teacher-portraits-hq.webp";

/** Six legacy HQ sprite portraits + ten native Android photographic assets. */
const HQ_POSITION:Record<string,string>={emma:"0%",alex:"20%",james:"40%",mia:"60%",sophie:"80%",lina:"100%"};
export function TeacherAvatar({profile,className="",decorative=false}:{profile:TeacherProfile;className?:string;decorative?:boolean}){
 const hq=HQ_POSITION[profile.id];
 return <span className={"teacher-avatar-image "+className}
  role={decorative?undefined:"img"} aria-hidden={decorative||undefined}
  aria-label={decorative?undefined:profile.name}
  style={{backgroundImage:"url("+(hq!==undefined?portraitSprite:profile.avatar)+")",
   backgroundPosition:hq!==undefined?hq+" center":"center 30%",
   backgroundSize:hq!==undefined?"600% 100%":"cover",backgroundRepeat:"no-repeat"}}
 />;
}
