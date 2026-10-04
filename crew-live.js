
(function(global){
  "use strict";
  var MODELS=["gemini-3.8-live","gemini-3.1-flash-live-preview"];

  function bytesToBase64(bytes){
    var binary="",chunk=0x8000;
    for(var i=0;i<bytes.length;i+=chunk){
      binary+=String.fromCharCode.apply(null,bytes.subarray(i,Math.min(i+chunk,bytes.length)));
    }
    return btoa(binary);
  }

  function base64ToBytes(value){
    var binary=atob(value||"");
    var out=new Uint8Array(binary.length);
    for(var i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i);
    return out;
  }

  function pcm16Base64(float32,inputRate,targetRate){
    targetRate=targetRate||16000;
    var ratio=inputRate/targetRate;
    var length=Math.max(1,Math.floor(float32.length/ratio));
    var bytes=new Uint8Array(length*2);
    var view=new DataView(bytes.buffer);
    for(var i=0;i<length;i++){
      var start=Math.floor(i*ratio);
      var end=Math.max(start+1,Math.floor((i+1)*ratio));
      var sum=0,count=0;
      for(var j=start;j<end&&j<float32.length;j++){sum+=float32[j];count++;}
      var sample=Math.max(-1,Math.min(1,count?sum/count:0));
      view.setInt16(i*2,sample<0?sample*32768:sample*32767,true);
    }
    return bytesToBase64(bytes);
  }

  function mergeTranscript(base,chunk){
    base=(base||"").trim();
    chunk=(chunk||"").trim();
    if(!chunk)return base;
    if(!base)return chunk;
    if(chunk.indexOf(base)===0)return chunk;
    if(base.indexOf(chunk)===0)return base;
    if(base.endsWith(chunk))return base;
    var max=Math.min(base.length,chunk.length),overlap=0;
    for(var i=max;i>0;i--){
      if(base.slice(-i)===chunk.slice(0,i)){overlap=i;break;}
    }
    var tail=chunk.slice(overlap);
    if(!tail)return base;
    var needsSpace=/[A-Za-z0-9]$/.test(base)&&/^[A-Za-z0-9]/.test(tail);
    return base+(needsSpace?" ":"")+tail;
  }

  function LiveSession(options){
    this.options=options||{};
    this.ws=null;
    this.model="";
    this.ready=false;
    this.running=false;
    this.stopping=false;
    this.mediaStream=null;
    this.inputContext=null;
    this.inputSource=null;
    this.processor=null;
    this.silentGain=null;
    this.outputContext=null;
    this.outputGain=null;
    this.nextPlayTime=0;
    this.sources=[];
    this.inputTurn="";
    this.outputTurn="";
    this.connectTimer=null;
  }

  LiveSession.prototype._status=function(value){
    if(this.options.onStatus)this.options.onStatus(value);
  };

  LiveSession.prototype._state=function(value){
    if(this.options.onState)this.options.onState(value);
  };

  LiveSession.prototype._error=function(error){
    if(this.options.onError)this.options.onError(error instanceof Error?error:new Error(String(error)));
  };

  LiveSession.prototype._clearPlayback=function(){
    this.sources.forEach(function(source){
      try{source.stop();}catch(_){}
    });
    this.sources=[];
    if(this.outputContext)this.nextPlayTime=this.outputContext.currentTime;
  };

  LiveSession.prototype._playPcm=function(base64,mime){
    if(!base64||!this.outputContext)return;
    var rate=24000;
    var match=String(mime||"").match(/rate=(\d+)/i);
    if(match)rate=Number(match[1])||24000;

    var bytes=base64ToBytes(base64);
    var samples=Math.floor(bytes.length/2);
    if(!samples)return;

    var floats=new Float32Array(samples);
    var view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    for(var i=0;i<samples;i++)floats[i]=view.getInt16(i*2,true)/32768;

    var buffer=this.outputContext.createBuffer(1,samples,rate);
    buffer.copyToChannel(floats,0);

    var source=this.outputContext.createBufferSource();
    source.buffer=buffer;
    source.connect(this.outputGain||this.outputContext.destination);

    var self=this;
    source.onended=function(){
      self.sources=self.sources.filter(function(x){return x!==source;});
    };

    var start=Math.max(this.outputContext.currentTime+0.02,this.nextPlayTime||0);
    source.start(start);
    this.nextPlayTime=start+buffer.duration;
    this.sources.push(source);

    if(this.options.onSpeaking)this.options.onSpeaking(true);
  };

  LiveSession.prototype._sendOpening=function(){
    var prompt=(this.options.openingPrompt||"").trim();
    if(!prompt||!this.ws||this.ws.readyState!==WebSocket.OPEN)return;
    this.ws.send(JSON.stringify({
      clientContent:{
        turns:[{role:"user",parts:[{text:prompt}]}],
        turnComplete:true
      }
    }));
  };

  LiveSession.prototype.sendText=function(text){
    text=String(text||"").trim();
    if(!text||!this.ready||!this.ws||this.ws.readyState!==WebSocket.OPEN)return false;
    this.ws.send(JSON.stringify({realtimeInput:{text:text}}));
    return true;
  };

  LiveSession.prototype._startCapture=function(){
    if(!this.mediaStream||this.processor)return;
    var AudioCtx=global.AudioContext||global.webkitAudioContext;
    this.inputContext=new AudioCtx();
    this.inputSource=this.inputContext.createMediaStreamSource(this.mediaStream);
    this.processor=this.inputContext.createScriptProcessor(2048,1,1);
    this.silentGain=this.inputContext.createGain();
    this.silentGain.gain.value=0;

    this.inputSource.connect(this.processor);
    this.processor.connect(this.silentGain);
    this.silentGain.connect(this.inputContext.destination);

    var self=this;
    var rate=this.inputContext.sampleRate;
    this.processor.onaudioprocess=function(event){
      if(!self.running||!self.ready||!self.ws||self.ws.readyState!==WebSocket.OPEN)return;
      var data=event.inputBuffer.getChannelData(0);
      self.ws.send(JSON.stringify({
        realtimeInput:{
          audio:{
            data:pcm16Base64(data,rate,16000),
            mimeType:"audio/pcm;rate=16000"
          }
        }
      }));
    };
  };

  LiveSession.prototype._handle=function(message){
    var self=this;

    if(message.error){
      this._error(new Error(message.error.message||"Gemini Live error"));
      this.stop();
      return;
    }

    if(message.setupComplete||message.setup_complete){
      clearTimeout(this.connectTimer);
      this.ready=true;
      this._status("Live 已連線，可以直接說話");
      this._state("ready");
      this._startCapture();
      this._sendOpening();
      return;
    }

    var server=message.serverContent||message.server_content;
    if(!server)return;

    if(server.interrupted){
      this._clearPlayback();
      if(this.options.onSpeaking)this.options.onSpeaking(false);
      this._status("已打斷，正在聽你說");
    }

    var input=server.inputTranscription||server.input_transcription;
    if(input&&input.text){
      this.inputTurn=mergeTranscript(this.inputTurn,input.text);
      if(this.options.onInputTranscript)this.options.onInputTranscript(this.inputTurn);
    }

    var output=server.outputTranscription||server.output_transcription;
    if(output&&output.text){
      this.outputTurn=mergeTranscript(this.outputTurn,output.text);
      if(this.options.onOutputTranscript)this.options.onOutputTranscript(this.outputTurn);
    }

    var turn=server.modelTurn||server.model_turn;
    var parts=turn&&turn.parts;
    if(Array.isArray(parts)){
      parts.forEach(function(part){
        var inline=part&&(part.inlineData||part.inline_data);
        var mime=inline&&(inline.mimeType||inline.mime_type||"");
        if(inline&&inline.data&&String(mime).indexOf("audio/pcm")===0){
          self._playPcm(inline.data,mime);
        }
      });
    }

    if(server.turnComplete||server.turn_complete){
      if(this.options.onSpeaking)this.options.onSpeaking(false);
      if(this.options.onTurnComplete){
        this.options.onTurnComplete({input:this.inputTurn,output:this.outputTurn});
      }
      this.inputTurn="";
      this.outputTurn="";
      this._status("你可以直接繼續說");
    }
  };

  LiveSession.prototype._connectModel=function(model){
    var self=this;
    return new Promise(function(resolve,reject){
      var settled=false;
      self.model=model;
      self._status("正在連線 "+model+"…");
      self._state("connecting");

      var url="wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key="+encodeURIComponent(global.CrewAI.key());
      var ws=new WebSocket(url);
      self.ws=ws;

      self.connectTimer=setTimeout(function(){
        if(settled)return;
        settled=true;
        try{ws.close();}catch(_){}
        reject(new Error(model+" connect timeout"));
      },8000);

      ws.onopen=function(){
        ws.send(JSON.stringify({
          setup:{
            model:"models/"+model,
            generationConfig:{
              responseModalities:["AUDIO"],
              speechConfig:{
                voiceConfig:{
                  prebuiltVoiceConfig:{voiceName:self.options.voice||"Kore"}
                }
              }
            },
            inputAudioTranscription:{},
            outputAudioTranscription:{},
            contextWindowCompression:{slidingWindow:{}},
            systemInstruction:{
              parts:[{text:self.options.system||"你是 Crew 的 Live 助手。自然、簡短地對話。"}]
            }
          }
        }));
      };

      ws.onmessage=function(event){
        var message;
        try{message=JSON.parse(event.data);}catch(_){return;}

        if((message.setupComplete||message.setup_complete)&&!settled){
          settled=true;
          clearTimeout(self.connectTimer);
          self._handle(message);
          resolve(model);
          return;
        }

        if(settled)self._handle(message);
      };

      ws.onerror=function(){
        if(!settled){
          settled=true;
          clearTimeout(self.connectTimer);
          reject(new Error(model+" WebSocket error"));
        }else{
          self._error(new Error(model+" WebSocket error"));
        }
      };

      ws.onclose=function(event){
        clearTimeout(self.connectTimer);
        if(!settled){
          settled=true;
          reject(new Error(model+" closed "+(event.code||"")));
        }else if(self.running&&!self.stopping){
          self.ready=false;
          self._state("disconnected");
          self._status("Live 已中斷");
          self._error(new Error(model+" disconnected "+(event.code||"")));
        }
      };
    });
  };

  LiveSession.prototype.start=async function(){
    if(this.running)return this;
    if(!global.CrewAI||!global.CrewAI.key())throw new Error("尚未設定 Gemini API key");
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
      throw new Error("瀏覽器不支援麥克風 Live 對話");
    }

    this.running=true;
    this.stopping=false;
    this._state("requesting-mic");
    this._status("正在開啟麥克風…");

    try{
      this.mediaStream=await navigator.mediaDevices.getUserMedia({
        audio:{
          echoCancellation:true,
          noiseSuppression:true,
          autoGainControl:true,
          channelCount:1
        }
      });

      var AudioCtx=global.AudioContext||global.webkitAudioContext;
      this.outputContext=new AudioCtx();
      this.outputGain=this.outputContext.createGain();
      this.outputGain.connect(this.outputContext.destination);
      await this.outputContext.resume();

      var errors=[];
      for(var i=0;i<MODELS.length;i++){
        try{
          await this._connectModel(MODELS[i]);
          return this;
        }catch(error){
          errors.push(error.message);
          try{if(this.ws)this.ws.close();}catch(_){}
          this.ws=null;
        }
      }

      throw new Error("Live 模型都連不上："+errors.join(" | "));
    }catch(error){
      await this.stop();
      throw error;
    }
  };

  LiveSession.prototype.stop=async function(){
    if(!this.running&&!this.ws&&!this.mediaStream)return;

    this.stopping=true;
    this.ready=false;
    clearTimeout(this.connectTimer);

    try{
      if(this.ws&&this.ws.readyState===WebSocket.OPEN){
        this.ws.send(JSON.stringify({realtimeInput:{audioStreamEnd:true}}));
        this.ws.close(1000,"user stopped");
      }
    }catch(_){}

    this.ws=null;

    if(this.processor){
      try{this.processor.disconnect();}catch(_){}
      this.processor.onaudioprocess=null;
      this.processor=null;
    }

    if(this.inputSource){
      try{this.inputSource.disconnect();}catch(_){}
      this.inputSource=null;
    }

    if(this.silentGain){
      try{this.silentGain.disconnect();}catch(_){}
      this.silentGain=null;
    }

    if(this.mediaStream){
      this.mediaStream.getTracks().forEach(function(track){track.stop();});
      this.mediaStream=null;
    }

    this._clearPlayback();

    if(this.inputContext){
      try{await this.inputContext.close();}catch(_){}
      this.inputContext=null;
    }

    if(this.outputContext){
      try{await this.outputContext.close();}catch(_){}
      this.outputContext=null;
    }

    this.running=false;
    this.stopping=false;
    this._state("stopped");
    this._status("已結束 Live 對話");
    if(this.options.onSpeaking)this.options.onSpeaking(false);
  };

  global.CrewLive={Session:LiveSession,models:MODELS.slice()};
})(window);
