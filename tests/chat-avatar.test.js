import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=path=>fs.readFileSync(path,"utf8");
const text=read("web-spa/src/live/TextChatPanel.tsx");
const textCss=read("web-spa/src/live/TextChatPanel.css");
const captions=read("web-spa/src/friends/FriendCallCaptions.tsx");
const callCss=read("web-spa/src/friends/friendCall.css");
const page=read("web-spa/src/friends/FriendLivePage.tsx");
const styleRule=(css,selector)=>{
 const pos=css.indexOf(selector+"{");
 assert.ok(pos>=0,`missing ${selector}`);
 return css.slice(pos+selector.length+1,css.indexOf("}",pos));
};
const px=(body,name)=>Number(body.match(new RegExp(`(?:^|;)\\s*${name}:([\\d.]+)px(?:;|$)`))?.[1]||0);
test("friend assistant messages and typing both use a decorative resolved avatar",()=>{
 assert.match(text,/import \{FriendAvatar\} from "\.\.\/friends\/FriendAvatar"/);
 assert.match(text,/import \{getCrewFriend\} from "\.\.\/friends\/friendProfiles"/);
 assert.match(text,/const isFriend=sessionScope\.startsWith\("friend:"\)/);
 assert.match(text,/isFriend\?getCrewFriend\(sessionScope\.split\(":"\)\[1\]\):null/);
 assert.match(text,/isFriend&&m\.role==="assistant"&&chatFriend&&<FriendAvatar/);
 assert.match(text,/<FriendAvatar friend=\{chatFriend\} className="crew-text-ai-avatar" decorative\/>/);
 assert.match(text,/crew-text-typing-row[^\n]*chatFriend&&<FriendAvatar/);
 assert.match(text,/className=\{"crew-text-chat-message "\+m\.role\}/);
 assert.doesNotMatch(text,/m\.role==="user"&&chatFriend&&<FriendAvatar/);
 assert.match(page,/sessionScope=\{"friend:"\+friend\.id/);
});
test("teacher panel has no friend sessionScope and does not render friend avatars",()=>{
 const path="web-spa/src/teacher/LivePage.tsx";
 // The handoff includes only editable TSX; on the full repository verify the caller as well.
 if(fs.existsSync(path)){
  const teacher=read(path);
  const courseChat=read("web-spa/src/teacher/TeacherTextCourseChat.tsx");
  assert.match(teacher,/<TeacherTextCourseChat\b/);
  assert.match(courseChat,/<TextChatPanel\b/);
  assert.match(courseChat,/\bsessionScope\s*=\s*\{\s*scope\s*\}/);
  assert.match(courseChat,/teacher:course:/);
  for(const source of [teacher,courseChat]){
   assert.doesNotMatch(source,/<FriendAvatar\b/);
   assert.doesNotMatch(source,/\bsessionScope\s*=\s*\{?\s*["']friend:/);
  }
 }
 assert.match(text,/const chatFriend=isFriend\?/);
 assert.match(text,/isFriend&&m\.role==="assistant"&&chatFriend/);
});
test("both friend text bubbles and typing indicator have 36-40px circular avatars",()=>{
 const a=styleRule(textCss,".crew-text-chat-history .crew-text-ai-row .crew-friend-avatar.crew-text-ai-avatar");
 for(const prop of ["width","height"]){const value=px(a,prop);assert.ok(value>=36&&value<=40,prop+"="+value)}
 assert.match(a,/border-radius:50%/);
 assert.match(styleRule(textCss,".crew-text-chat-history .crew-text-ai-row"),/align-items:flex-start/);
 assert.match(styleRule(textCss,".crew-text-chat-history .crew-text-ai-row .crew-text-chat-message"),/min-width:0;max-width:calc\(90% - 46px\)/);
 assert.match(styleRule(textCss,".crew-text-chat-history .crew-text-typing-row .crew-text-typing-bubble"),/min-width:0/);
});
test("telephone assistant captions, but not user captions, carry FriendAvatar",()=>{
 assert.match(captions,/import \{FriendAvatar\} from "\.\/FriendAvatar"/);
 assert.match(captions,/CREW_FRIENDS\.find\(friend=>friend\.name===name\)/);
 const ai=captions.slice(captions.indexOf('<section className="friend-caption-ai"'),captions.indexOf('<section className="friend-caption-user"'));
 assert.match(ai,/<FriendAvatar friend=\{captionFriend\} className="friend-caption-avatar" decorative\/>/);
 assert.doesNotMatch(captions.slice(captions.indexOf('<section className="friend-caption-user"')),/<FriendAvatar/);
 const a=styleRule(callCss,".friend-phone-stage .friend-caption-ai .crew-friend-avatar.friend-caption-avatar");
 for(const prop of ["width","height"]){const value=px(a,prop);assert.ok(value>=36&&value<=40,prop+"="+value)}
 assert.match(a,/border-radius:50%/);
});
test("small components and keyboard-open switches remain within the contract",()=>{
 assert.ok(Buffer.byteLength(text)<26000,`TextChatPanel=${Buffer.byteLength(text)}`);
 assert.ok(Buffer.byteLength(page)<=25500,`FriendLivePage=${Buffer.byteLength(page)}`);
 assert.match(callCss,/\.friend-text-stage\.crew-text-keyboard-open \.friend-call-settings>\.friend-language-switch,\.friend-text-stage\.crew-text-keyboard-open \.friend-call-settings>\.crew-chat-mode-switch\{display:none\}/);
 assert.match(callCss,/\.friend-text-stage \.friend-call-settings\{display:contents\}/);
});
