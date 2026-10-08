import type{TeacherProfile}from"./teacherProfiles";

const HQ_POSITION:Record<TeacherProfile["id"],string>={
 emma:"0%",alex:"20%",james:"40%",mia:"60%",sophie:"80%",lina:"100%"
};

export function TeacherAvatar({profile,className="",decorative=false}:{profile:TeacherProfile;className?:string;decorative?:boolean}){
 return <span
  className={"teacher-avatar-image "+className}
  role={decorative?undefined:"img"}
  aria-hidden={decorative||undefined}
  aria-label={decorative?undefined:profile.name}
  style={{
   backgroundImage:'url("/assets/teacher/teacher-portraits-hq.webp")',
   backgroundPosition:HQ_POSITION[profile.id]+" center",
   backgroundSize:"600% 100%",
   backgroundRepeat:"no-repeat"
  }}
 />;
}
