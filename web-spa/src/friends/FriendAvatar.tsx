import type{FriendProfile}from"./friendProfiles";
export function FriendAvatar({friend,className="",decorative=false}:{friend:FriendProfile;className?:string;decorative?:boolean}){
 return <img className={"crew-friend-avatar "+className} src={friend.avatar} alt={decorative?"":friend.name} aria-hidden={decorative||undefined} loading="lazy"/>;
}
