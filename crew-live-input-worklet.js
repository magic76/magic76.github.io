'use strict';
// Always send audio; Gemini server VAD, not this processor, owns turn endings.
class CrewLiveInputProcessor extends AudioWorkletProcessor{
  constructor(){
    super();this.pending=[];
    this.chunkSamples=Math.max(128,Math.round(sampleRate*0.04));
  }
  resample(input,sourceRate,targetRate){
    if(sourceRate===targetRate)return input;
    const length=Math.max(1,Math.round(input.length*targetRate/sourceRate));
    const output=new Float32Array(length),ratio=sourceRate/targetRate;
    for(let i=0;i<length;i++){
      const position=i*ratio,left=Math.min(input.length-1,Math.floor(position));
      const right=Math.min(input.length-1,left+1),fraction=position-left;
      output[i]=input[left]+(input[right]-input[left])*fraction;
    }
    return output;
  }
  process(inputs,outputs){
    const input=inputs[0]&&inputs[0][0];
    if(input){
      for(let i=0;i<input.length;i++)this.pending.push(input[i]);
      while(this.pending.length>=this.chunkSamples){
        const samples=new Float32Array(this.pending.splice(0,this.chunkSamples));
        const pcm=this.resample(samples,sampleRate,16000);
        let power=0;
        for(let i=0;i<pcm.length;i++)power+=pcm[i]*pcm[i];
        const rms=Math.sqrt(power/Math.max(1,pcm.length));
        this.port.postMessage({type:'mic-frame',samples:pcm.buffer,rms},[pcm.buffer]);
      }
    }
    for(const output of outputs)for(const channel of output)channel.fill(0);
    return true;
  }
}
registerProcessor('crew-live-input',CrewLiveInputProcessor);
