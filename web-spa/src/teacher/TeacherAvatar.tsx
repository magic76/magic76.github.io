import type{TeacherProfile}from"./teacherProfiles";
import portraitSprite from "../../../assets/teacher/teacher-portraits-hq.webp";

/** Six legacy HQ sprite portraits + ten native Android photographic assets. */
const HQ_POSITION:Record<string,string>={emma:"0%",alex:"20%",james:"40%",mia:"60%",sophie:"80%",lina:"100%"};
export function TeacherAvatar({profile,className="",decorative=false,portrait=false}:{profile:TeacherProfile;className?:string;decorative?:boolean;portrait?:boolean}){
 const hq=HQ_POSITION[profile.id];
 return <span className={"teacher-avatar-image "+className}
  role={decorative?undefined:"img"} aria-hidden={decorative||undefined}
  aria-label={decorative?undefined:profile.name}
  style={{backgroundImage:"url("+(hq!==undefined?portraitSprite:profile.avatar)+")",
   backgroundPosition:hq!==undefined?hq+" center":"center 30%",
   // The sprite is six square frames. Scale by height in a tall frame so the
   // browser crops the sides without stretching the face.
   backgroundSize:hq===undefined?"cover":portrait?"auto 100%":"600% 100%",backgroundRepeat:"no-repeat"}}
 />;
}
