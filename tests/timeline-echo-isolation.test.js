const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
function runtime(){
 const storage=new Map();let consent=true,tick=1000;
 const context={localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},friendMemoryEnabled:()=>consent,Date:{now:()=>++tick}};
 const source=stripTypeScriptTypes(fs.readFileSync('web-spa/src/timeline/timelineEcho.ts','utf8')).replace(/^import .*;\s*$/gm,'').replace(/^export /gm,'');
 vm.runInNewContext(source+'\nglobalThis.api={recordTimelineEcho,timelineEchoesAtAge,deleteTimelineEcho,clearTimelineEchoes};',context);
 return {api:context.api,storage,setConsent:value=>{consent=value;}};
}
test('echo metadata preserves Mira keys and isolates identical words across all three people',()=>{
 const {api,storage}=runtime();const note={age:7,text:'the same saved phrase'};
 api.recordTimelineEcho(note.age,note.text);
 const miraBytes=storage.get('crew_timeline_mira_echo_meta_v2');assert.ok(miraBytes);
 api.recordTimelineEcho(note.age,note.text,'ethan');api.recordTimelineEcho(note.age,note.text,'hana');
 const times=['mira','ethan','hana'].map(id=>api.timelineEchoesAtAge(25,[note],id)[0].savedAt);
 assert.equal(new Set(times).size,3);
 api.deleteTimelineEcho(note.age,note.text,'ethan');assert.equal(JSON.parse(storage.get('crew_timeline_ethan_echo_meta_v2')).length,0);
 assert.equal(storage.get('crew_timeline_mira_echo_meta_v2'),miraBytes);
 assert.ok(storage.get('crew_timeline_hana_echo_meta_v2'));
 api.clearTimelineEchoes('hana');assert.equal(storage.has('crew_timeline_hana_echo_meta_v2'),false);
 assert.equal(storage.get('crew_timeline_mira_echo_meta_v2'),miraBytes);
});
test('echoes require consented canonical older notes and cannot resurrect deleted or future memories',()=>{
 const {api,storage,setConsent}=runtime();const older={age:7,text:'a childhood memory'},future={age:70,text:'future private memory'};
 api.recordTimelineEcho(older.age,older.text,'ethan');api.recordTimelineEcho(future.age,future.text,'ethan');
 assert.equal(api.timelineEchoesAtAge(25,[older,future],'ethan').length,1);
 assert.equal(api.timelineEchoesAtAge(7,[older],'ethan').length,0);
 assert.equal(api.timelineEchoesAtAge(70,[],'ethan').length,0);
 const before=storage.get('crew_timeline_ethan_echo_meta_v2');setConsent(false);
 api.recordTimelineEcho(13,'must not be stored','ethan');
 assert.equal(storage.get('crew_timeline_ethan_echo_meta_v2'),before);
 assert.equal(api.timelineEchoesAtAge(25,[older],'ethan').length,0);
});
test('editorial comparison remains explicitly scoped to the existing Mira content',()=>{
 const page=fs.readFileSync('web-spa/src/timeline/TimelinePage.tsx','utf8');
 assert.match(page,/characterId==="mira"&&<Link[^>]+to="\/timeline\/compare"/);
 assert.match(page,/timelineEchoesAtAge\(age,memory,characterId\)/);
});
