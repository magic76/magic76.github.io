const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {stripTypeScriptTypes}=require('node:module');
const source=fs.readFileSync(path.join(__dirname,'../web-spa/src/pages/creatureLabProgress.ts'),'utf8');
const code=stripTypeScriptTypes(source,{mode:'strip'}).replace(/\bexport\s+(?=(?:const|function))/g,'');
const ctx={};
vm.runInNewContext(code+'\nthis.api={readCreatureLabProgress,creatureLabHref};',ctx);
const {readCreatureLabProgress:read,creatureLabHref:href}=ctx.api;
const save=(creature,extras={})=>({version:1,energy:0,creature:{line:null,stage:0,topics:[],sentences:0,...creature},collection:[],...extras});
const store=data=>({getItem:()=>JSON.stringify(data)});

test('homepage shows meaningful saved progress with the correct next action',()=>{
 assert.equal(read(store(save({}))),null);
 assert.equal(read(store(save({sentences:1},{energy:1}))).remaining,1);
 const baby=read(store(save({line:'cat',stage:1,sentences:2},{energy:4})));
 assert.equal(baby.line,'cat');assert.equal(baby.form,'baby');assert.equal(baby.remaining,0);
 assert.equal(read(store(save({line:'moonfox',stage:4}))).form,'final');
 assert.equal(read(store(save({}, {collection:[{stage:4,line:'cat'}]}))).form,'egg');
 assert.equal(read(store(save({}, {boxes:1}))).form,'egg');
 assert.equal(read(store(save({line:'cat'}))).line,'cat');
});

test('malformed and inaccessible storage never breaks the homepage',()=>{
 for(const data of [null,{},save({stage:1}),save({line:'__proto__'}),save({stage:5}),save({}, {energy:-1})])assert.equal(read(store(data)),null);
 assert.equal(read({getItem(){throw Error('disabled')}}),null);
 assert.equal(read({getItem:()=>'{broken'}),null);
});

test('standalone route follows legacy app hosting',()=>{
 assert.equal(href('/'),'/crew-creature-lab/');
 assert.equal(href('/en/explore'),'/crew-creature-lab/');
 assert.equal(href('/crew-app/index.html'),'/crew-app/crew-creature-lab/');
});
