import type {FriendProfile} from "../friends/friendProfiles";
import type {TeacherProfile} from "./teacherProfiles";
import {LIVE_VOICES,normalizeLiveVoice} from "../live/voiceIdentity";

/** Read-only assignment audit; never changes a character's production voice. */
export type VoiceUser={role:"friend"|"teacher";id:string;name:string};
type FriendVoice=Pick<FriendProfile,"id"|"name"|"voice">;
type TeacherVoice=Pick<TeacherProfile,"id"|"name"|"recommendedVoice">;

export function auditVoiceAssignments(
 friends:readonly FriendVoice[],teachers:readonly TeacherVoice[],
 catalog:readonly string[]=LIVE_VOICES
){
 const users=new Map<string,VoiceUser[]>(catalog.map(v=>[v,[]]));
 for(const friend of friends){
  const voice=normalizeLiveVoice(friend.voice);
  users.get(voice)?.push({role:"friend",id:friend.id,name:friend.name});
 }
 for(const teacher of teachers){
  const voice=normalizeLiveVoice(teacher.recommendedVoice);
  users.get(voice)?.push({role:"teacher",id:teacher.id,name:teacher.name});
 }
 return {
  users,
  assigned:catalog.filter(v=>(users.get(v)?.length||0)>0),
  shared:catalog.filter(v=>(users.get(v)?.length||0)>1),
  unused:catalog.filter(v=>(users.get(v)?.length||0)===0),
  totalRoles:friends.length+teachers.length
 };
}
