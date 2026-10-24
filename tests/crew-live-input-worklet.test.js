const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

test("input Worklet emits one 40ms frame and produces silent output",()=>{
  let Processor;
  class AudioWorkletProcessor{
    constructor(){this.port={messages:[],postMessage:(value)=>this.port.messages.push(value)};}
  }
  const scope={AudioWorkletProcessor,sampleRate:48000,Float32Array,Math,
    registerProcessor:(name,type)=>{assert.equal(name,"crew-live-input");Processor=type;}};
  const source=fs.readFileSync(path.join(__dirname,"../crew-live-input-worklet.js"),"utf8");
  vm.runInNewContext(source,scope);
  assert.ok(Processor);
  const processor=new Processor();
  for(let i=0;i<15;i++){
    const output=new Float32Array(128).fill(1);
    processor.process([[new Float32Array(128).fill(0.2)]],[[output]]);
    assert.equal(output.every(value=>value===0),true);
  }
  assert.equal(processor.port.messages.length,1);
  const packet=processor.port.messages[0];
  assert.equal(packet.type,"mic-frame");
  assert.equal(new Float32Array(packet.samples).length,640);
  assert.ok(Math.abs(packet.rms-0.2)<0.00001);
});

test("Cloudflare publishes both Live Worklets",()=>{
  const script=fs.readFileSync(path.join(__dirname,"../scripts/prepare-cloudflare.mjs"),"utf8");
  assert.match(script,/crew-live-input-worklet\.js/);
  assert.match(script,/crew-live-output-worklet\.js/);
});
