const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {stripTypeScriptTypes}=require('node:module');
const root=path.join(__dirname,'..');
const src=n=>fs.readFileSync(path.join(root,'web-spa/src/magic',n),'utf8');
function load(name,exported){const code=stripTypeScriptTypes(src(name),{mode:'strip'}).replace(/\bexport\s+(?=(?:function|const|class)\b)/g,'');const mod={exports:{}};new Function('module','exports',code+`\nmodule.exports={${exported.join(',')}}`)(mod,mod.exports);return mod.exports}
const w=load('world.ts',['applyMagicCommand','MAGIC_INITIAL_WORLD','readMagicWorldSnapshot','magicCreatorContext']);
const wish=load('magicWish.ts',['magicWishTraits','magicWishCreation']);
const auraEnum=['bubbles','fire','stars','flowers','ice','music','hearts','leaves'];
test('offline wishes detect language cues and produce distinct validated structures',()=>{
 assert.equal(wish.magicWishTraits('會吹泡泡的藍色水母').aura,'bubbles');
 assert.equal(wish.magicWishTraits('戴皇冠的火焰狐狸').accessory,'crown');
 assert.equal(wish.magicWishTraits('空に星がいっぱい').aura,'stars');
 assert.equal(wish.magicWishTraits('bubbles in a glass ocean').material,'glass');
 const first=wish.magicWishCreation('會吹泡泡的藍色水母',w.MAGIC_INITIAL_WORLD,'zh');
 assert.equal(first.aura,'bubbles');assert.equal(first.motion,'hover');
 const a=w.applyMagicCommand(w.MAGIC_INITIAL_WORLD,'create_magic_entity',first);
 assert.equal(a.ok,true, a.event);
 const second=wish.magicWishCreation('戴皇冠的火焰狐狸',a.world,'zh');
 const b=w.applyMagicCommand(a.world,'create_magic_lifeform',second);
 assert.equal(b.ok,true,b.event);assert.equal(second.aura,'fire');
 assert.notDeepEqual(a.world.creations[0].parts,b.world.creations[1].blueprint);
});
test('aura enum validation and snapshot roundtrip',()=>{
 const valid=wish.magicWishCreation('星星',w.MAGIC_INITIAL_WORLD,'zh');valid.aura='stars';
 const result=w.applyMagicCommand(w.MAGIC_INITIAL_WORLD,'create_magic_entity',valid);assert.equal(result.ok,true);
 const invalid=w.applyMagicCommand(result.world,'edit_magic_entity',{aura:'javascript'});assert.equal(invalid.ok,false);
 const next=w.applyMagicCommand(result.world,'edit_magic_entity',{aura:'fire'});assert.equal(next.ok,true,next.event);
 assert.equal(next.world.creations[0].aura,'fire');
 const snap=w.readMagicWorldSnapshot(JSON.stringify(next.world));assert.deepEqual(snap,next.world);
 const old={...next.world,creations:next.world.creations.map(({aura,...c})=>c)};
 assert.deepEqual(w.readMagicWorldSnapshot(JSON.stringify(old)),old);
});
test('aura tools and prompt are bounded',()=>{
 const tools=src('liveTools.ts'),enums=[...tools.matchAll(/aura:\{type:"STRING",enum:\[([^\]]+)\]/g)];
 assert.equal(enums.length,4);for(const m of enums)assert.deepEqual(JSON.parse(`[${m[1]}]`),auraEnum);
 assert.match(tools,/Decompose one vivid wish/);assert.match(tools,/snowy night dragon/);
 const world=w.MAGIC_INITIAL_WORLD;let current=world;
 for(let i=0;i<10;i++){let result;for(let j=0;j<5;j++){
  result=w.applyMagicCommand(current,'create_magic_entity',wish.magicWishCreation('custom wish '+i+' variant '+j,current,'en',j));if(result.ok)break;
 }
 if(result.ok)current=result.world;
 }
 assert.ok(w.magicCreatorContext(current).length<=3600);
});
test('fixed assembly strings and reduced motion paths',()=>{
 const s=src('MagicCreations3D.tsx');assert.match(s,/ASSEMBLY_SECONDS=5\.6/);
 assert.match(s,/phases\.current\[i\]>=\.97/);assert.match(s,/length<=Math\.max\(\.3,rest\)\*1\.35/);
 assert.match(s,/Math\.PI\/2-\.42/);assert.match(s,/joint==="wheel"\?t\*\.78/);
 assert.match(s,/animated&&assembled>\.98/);assert.doesNotMatch(s,/clock\.elapsedTime-started\.current/);
 const live=src('MagicCreationLife3D.tsx'),cast=src('MagicCasting3D.tsx');
 assert.match(live,/useFrame/);assert.match(cast,/animated/);
 for(const content of [live,cast])assert.doesNotMatch(content,/EffectComposer|castShadow|<points/);
 assert.match(src("MagicParticleLayers3D.tsx"),/PointsMaterial/);
 assert.doesNotMatch(src('magicSound.ts'),/fetch\(|new Audio\(/);assert.match(src('magicSound.ts'),/navigator\.vibrate/);
});
test('11 magic locale files contain localized keys',()=>{
 const langs=['zh-TW','en','ja','es','pt-BR','id','fr','de','ko','vi','th'];
 const keys=['Offline wishes use island magic; connect Lumi for full creativity','Magic sound on','Magic sound off','Try a different wish'];
 for(const lang of langs){const data=JSON.parse(fs.readFileSync(path.join(root,'web-spa/src/i18n/locales',lang,'magic.json')));
  for(const key of keys){assert.ok(data[key],lang+': '+key);if(!['en','zh-TW'].includes(lang))assert.notEqual(data[key],key)}
 }
});

test('five noun-aware wishes route to distinct silhouettes',()=>{
 const cases=[['會噴泡泡的雲朵貓','cat','bubbles'],['火焰飛龍','dragon','fire'],
  ['冰晶花園守護者','flower','ice'],['a musical star robot','robot','music'],['花いっぱいの狐','fox','flowers']];
 const parsed=load('magicWish.ts',['magicWishKind','magicWishTraits','magicWishCreation']);
 let state=w.MAGIC_INITIAL_WORLD;const structures=[];
 for(const [label,kind,aura] of cases){
  assert.equal(parsed.magicWishKind(label),kind);
  assert.equal(parsed.magicWishTraits(label).aura,aura);
  let res;for(let attempt=0;attempt<3;attempt++){
   const args=parsed.magicWishCreation(label,state,'zh',attempt);
   res=w.applyMagicCommand(state,['dragon','fox','robot'].includes(kind)?'create_magic_lifeform':'create_magic_entity',args);
   if(res.ok)break;
  }
  assert.equal(res.ok,true,res.event);state=res.world;
  const c=state.creations.at(-1);
  structures.push(JSON.stringify(c.blueprint??c.parts.map(p=>[p.shape,p.x,p.y,p.joint])));
 }
 assert.equal(new Set(structures).size,5);
});
test('particle graphics have bounded shared layers',()=>{
 const layer=src('MagicParticleLayers3D.tsx');
 assert.match(layer,/256\*3/);assert.match(layer,/setDrawRange/);
 assert.match(layer,/CanvasTexture/);assert.match(layer,/depthWrite:false/);
 assert.match(layer,/"sparkle","star","heart","bubble","flame","flower","leaf","snow","note","z"/);
 for(const n of ['MagicCreationLife3D.tsx','MagicCasting3D.tsx'])assert.doesNotMatch(src(n),/<points/);
});
