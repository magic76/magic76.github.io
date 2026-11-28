const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const read=p=>fs.readFileSync(p,"utf8");
test("Learn and Chat preferences open a local dialog, not the legacy role URL",()=>{
 const hub=read("web-spa/src/pages/CrewSectionPage.tsx"),summary=read("web-spa/src/components/ConversationPreferences.tsx"),dialog=read("web-spa/src/components/RolePreferencesDialog.tsx");
 assert.match(hub,/<RolePreferenceSummary role=\{section==="chat"\?"friend":"teacher"\}/);
 assert.doesNotMatch(summary,/\/teacher\/roles/);
 assert.match(summary,/aria-haspopup="dialog" aria-expanded=\{open\}/);
 assert.match(summary,/<RolePreferencesDialog role=\{role\}/);
 assert.match(dialog,/dialog.showModal\(\)/);
 assert.match(dialog,/onCancel=/);
 assert.match(dialog,/focused\?\.isConnected/);
 assert.match(dialog,/s\.setTeachingMode/);
 assert.match(dialog,/s\.setFriendChatMode/);
 assert.match(dialog,/s\.setFriendSpeakingPace/);
 assert.match(dialog,/s\.setSpeakingPace/);
});
test("Friend directory is people-first; legacy teacher links reach canonical Learn",()=>{
 const directory=read("web-spa/src/friends/FriendsPage.tsx"),roles=read("web-spa/src/teacher/RolesPage.tsx"),card=read("web-spa/src/teacher/CurrentTeacherCard.tsx");
 assert.doesNotMatch(directory,/teacher-precall-settings|friends-game-entry|PreferenceScopeHint/);
 assert.match(directory,/friends-directory/);
 assert.match(directory,/friends-search/);
 assert.match(directory,/friends-recent/);
 assert.doesNotMatch(roles,/crew-role-switcher/);
 assert.match(roles,/<Navigate to="\/learn" replace/);
 assert.match(card,/<TeacherProfilePicker onClose=\{closePicker\}/);
 assert.match(card,/\?mission=/);
});
