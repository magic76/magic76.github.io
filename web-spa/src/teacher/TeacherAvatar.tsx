import type{TeacherProfile}from"./teacherProfiles";

/** Vite resolves these profile imports under /crew-app/ as hashed public assets.
 * Avoid root-absolute sprite URLs: they break on GitHub Pages subpaths.
 */
export function TeacherAvatar({profile,className="",decorative=false}:{profile:TeacherProfile;className?:string;decorative?:boolean}){
 return <img
  className={"teacher-avatar-image "+className}
  src={profile.avatar}
  alt={decorative?"":profile.name}
  aria-hidden={decorative||undefined}
  loading="eager"
  decoding="async"
 />;
}
