'use strict';

class CrewLiveOutputProcessor extends AudioWorkletProcessor {
  constructor(){
    super();
    this.queue=[];
    this.offset=0;
    this.samples=0;
    this.playing=false;
    this.forceOutput=false;
    this.fadeRemaining=0;
    this.startThresholdSamples=Math.max(256,Math.round(sampleRate*0.12));

    this.port.onmessage=(event)=>{
      const message=event.data||{};
      if(message.type==='output'&&message.samples){
        const source=new Float32Array(message.samples);
        const converted=this.resample(source,Number(message.sampleRate)||24000,sampleRate);
        if(converted.length){
          this.queue.push(converted);
          this.samples+=converted.length;
          this.port.postMessage({type:'queue-state',samples:this.samples});
        }
      }else if(message.type==='clear-output'){
        this.queue=[];
        this.offset=0;
        this.samples=0;
        this.playing=false;
        this.forceOutput=false;
        this.fadeRemaining=0;
        this.port.postMessage({type:'output-drained'});
      }else if(message.type==='turn-complete'){
        this.forceOutput=true;
      }
    };
  }

  resample(input,sourceRate,targetRate){
    if(!input.length||sourceRate<=0||targetRate<=0)return new Float32Array(0);
    if(sourceRate===targetRate)return new Float32Array(input);
    const outputLength=Math.max(1,Math.round(input.length*targetRate/sourceRate));
    const output=new Float32Array(outputLength);
    const ratio=sourceRate/targetRate;
    for(let i=0;i<outputLength;i++){
      const position=i*ratio;
      const left=Math.min(input.length-1,Math.floor(position));
      const right=Math.min(input.length-1,left+1);
      const fraction=position-left;
      output[i]=input[left]+(input[right]-input[left])*fraction;
    }
    return output;
  }

  render(channel){
    channel.fill(0);
    let out=0;

    if(!this.playing&&this.samples>0&&(this.forceOutput||this.samples>=this.startThresholdSamples)){
      this.playing=true;
      this.fadeRemaining=Math.min(128,this.samples);
      this.port.postMessage({type:'output-started'});
    }

    if(!this.playing)return;

    while(out<channel.length&&this.queue.length){
      const head=this.queue[0];
      const available=head.length-this.offset;
      const count=Math.min(channel.length-out,available);
      for(let i=0;i<count;i++){
        let value=head[this.offset+i];
        if(this.fadeRemaining>0){
          value*=1-(this.fadeRemaining/128);
          this.fadeRemaining--;
        }
        channel[out+i]=value;
      }
      out+=count;
      this.offset+=count;
      this.samples-=count;
      if(this.offset>=head.length){
        this.queue.shift();
        this.offset=0;
      }
    }

    if(this.playing&&this.samples===0&&this.queue.length===0){
      this.playing=false;
      this.forceOutput=false;
      this.port.postMessage({type:'output-drained'});
    }
  }

  process(inputs,outputs){
    const output=outputs[0];
    if(output&&output.length){
      this.render(output[0]);
      for(let i=1;i<output.length;i++)output[i].set(output[0]);
    }
    return true;
  }
}

registerProcessor('crew-live-output',CrewLiveOutputProcessor);
