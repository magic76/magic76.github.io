import type{TeacherProfile}from"./teacherProfiles";

const HQ_POSITION:Partial<Record<TeacherProfile["id"],string>>={
 emma:"0%",alex:"33.333%",james:"66.667%",mia:"100%"
};

export function TeacherAvatar({profile,className="",decorative=false}:{profile:TeacherProfile;className?:string;decorative?:boolean}){
 const position=HQ_POSITION[profile.id];
 if(!position)return <img className={className} src={profile.avatar} alt={decorative?"":profile.name}/>;
 return <span
  className={"teacher-avatar-image "+className}
  role={decorative?undefined:"img"}
  aria-hidden={decorative||undefined}
  aria-label={decorative?undefined:profile.name}
  style={{backgroundImage:'url("/assets/teacher/teacher-portraits-hq.webp")',backgroundPosition:position+" center"}}
 />;
}
