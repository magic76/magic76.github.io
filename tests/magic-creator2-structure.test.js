const fs=require('fs');const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'../web-spa/src/magic/creator2.ts'),'utf8');
const assert=require('node:assert/strict');
const {describe,it}=require('node:test');

describe('Crew Magic Creator 2 structure engine',()=>{
 it('supports five semantic archetypes without executable payload fields',()=>{
  for(const kind of ['quadruped','humanoid','flying','machine','architecture'])assert(src.includes(`"${kind}"`));
  assert(!/shader|glb|html|javascript|assetUrl\s*:/.test(src.replace(/never shaders|shader text|scripts|URLs|GLB/g,'')));
 });
 it('freezes legacy parts behind a compatibility adapter',()=>{
  assert(src.includes('upgradeLegacyLifeBlueprint'));
  assert(src.includes('compileMagicStructure'));
  assert(src.includes('structure compiler instead of extending MagicCreatorPart forever'));
 });
 it('keeps AI intent bounded and renderer-owned',()=>{
  assert(src.includes('validateMagicBlueprint2'));
  assert(src.includes('n>=.6&&n<=1.5'));
  assert(src.includes('No model can'));
 });
});
