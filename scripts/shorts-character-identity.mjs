import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,sep,extname} from 'node:path';

function check(value,message){if(!value)throw Error('Crew Shorts identity: '+message)}
function local(root,name){const path=resolve(root,name);check(path.startsWith(resolve(root)+sep),'outside repository');return path}
export function blobSha(data){return createHash('sha1').update(Buffer.from('blob '+data.length+'\0')).update(data).digest('hex')}
export function loadIdentity(root,role,id){
 check(['friend','teacher'].includes(role)&&/^[a-z]+$/.test(id),'invalid character');
 const base='content/character-identities/';
 const manifest=JSON.parse(readFileSync(local(root,base+'manifest.json'),'utf8'));
 check(manifest.schemaVersion===1&&manifest.counts?.total===32,'incomplete catalog');
 const entry=manifest.characters.find(x=>x.role===role&&x.id===id);
 check(entry,'missing character '+id);
 const identity=JSON.parse(readFileSync(local(root,base+entry.identityPath),'utf8'));
 check(identity.identityId==='crew-'+role+'-'+id+'-v1'&&identity.characterId===id,'identity mismatch');
 check(identity.referenceSet?.master?.status==='canonical_verified','unapproved master');
 check(identity.generation?.masterImageAttachmentRequired===true&&identity.generation?.promptOnlyGenerationForbidden===true,'unlocked character');
 const expected=role==='friend'?'assets/friends/crew_friend_'+id+'.webp':'assets/teacher/teacher-'+id;
 const path=identity.source.path;
 check(role==='friend'?path===expected:[expected+'.jpg',expected+'.webp'].includes(path),'unexpected master path');
 check(identity.referenceSet.master.sourcePath===path,'reference path mismatch');
 const data=readFileSync(local(root,path));
 check(data.length>8000&&blobSha(data)===identity.source.gitBlobSha,'official master image changed: '+id);
 return {identity,identityId:identity.identityId,sha:identity.source.gitBlobSha,reference:{data,mimeType:extname(path)==='.webp'?'image/webp':'image/jpeg'}};
}
export function imagePrompt(story,identity){
 check(story.friendId===identity.characterId,'story identity mismatch');
 return [
 'One 3:4 vertical photorealistic candid smartphone photo, exactly one adult person, face visible and assessable from front or natural three-quarter view.',
 'The FIRST attached image is the canonical identity reference. SAME PERSON, not a similar stranger. Preserve face geometry, eyes, hairline, nose, lips, skin tone and age.',
 'Immutable appearance: '+identity.visualIdentity.block,
 'Photo style: '+identity.generation.styleLock,
 'Scene: '+story.scene,
 'Context (not visible text): '+story.imageAlt,
 'Prior events, TEXT CONTEXT ONLY: '+(story.storyContext||'none'),
 'Clothing, natural expression and pose may change. No forced camera-facing smile.',
 'Negative constraints: '+identity.generation.negativePrompt,
 'One single photograph. No collage, extra people, text, logos or watermarks.'
 ].join('\n');
}
export const QA_FIELDS=['sameFace','sameEyes','sameHair','sameSkin','faceVisible','singleCharacter','sceneMatch','photorealistic','noTextOrLogo'];
export function validateIdentityQa(result,id){
 check(result?.pass===true,'visual QA rejected '+id+': '+String(result?.reason||'unknown').slice(0,150));
 const fail=QA_FIELDS.filter(key=>result.checks?.[key]!==true);
 check(fail.length===0,'identity QA rejected '+id+' (unverified: '+fail.join(', ')+')');
 return {pass:true,reason:String(result.reason||'confirmed').slice(0,200),checks:result.checks};
}
