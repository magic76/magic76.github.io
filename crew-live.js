
(function(root,factory){
  var api=factory(root);
  root.CrewLive=api;
  if(typeof module==="object"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis,function(global){
  "use strict";

  var DEFAULT_MODELS=["gemini-3.1-flash-live-preview","gemini-3.8-live"];

  function sanitizeDetail(value){
    var text=String(value==null?"":value);
    text=text.replace(/AIza[0-9A-Za-z_-]{16,}/g,"[redacted-key]");
    text=text.replace(/([?&](?:key|api_key)=)[^&\s]+/gi,"$1[redacted]");
    text=text.replace(/(wss?:\/\/[^\s?]+)\?[^\s]+/gi,"$1?[redacted]");
    text=text.replace(/\s+/g," ").trim();
    return text.slice(0,240);
  }

  function safeApiError(error){
    if(!error)return "Gemini Live error";
    var bits=[];
    if(error.code!=null)bits.push(String(error.code));
    if(error.status)bits.push(String(error.status));
    if(error.message)bits.push(String(error.message));
    return sanitizeDetail(bits.join(" · ")||"Gemini Live error");
  }

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

  async function decodeWsData(data){
    if(typeof data==="string")return data;
    if(data==null)return "";
    if(typeof Blob!=="undefined"&&data instanceof Blob){
      return await data.text();
    }
    if(data instanceof ArrayBuffer){
      return new TextDecoder("utf-8").decode(new Uint8Array(data));
    }
    if(ArrayBuffer.isView&&ArrayBuffer.isView(data)){
      return new TextDecoder("utf-8").decode(new Uint8Array(data.buffer,data.byteOffset,data.byteLength));
    }
    if(typeof data.text==="function"){
      return await data.text();
    }
    return String(data);
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
    this.models=(this.options.models||DEFAULT_MODELS).slice();
    this.maxLiveAttempts=Math.max(1,Math.min(
      Number(this.options.maxLiveAttempts)||this.models.length,
      this.models.length
    ));
    this.connectTimeoutMs=Math.max(100,Number(this.options.connectTimeoutMs)||8000);
    this.replyTimeoutMs=Math.max(0,Number(this.options.replyTimeoutMs)||0);
    this.earlyCloseMs=Math.max(1000,Number(this.options.earlyCloseMs)||12000);

    var deps=this.options.deps||{};
    this._deps={
      WebSocket:deps.WebSocket||global.WebSocket,
      now:deps.now||function(){return Date.now();},
      setTimeout:deps.setTimeout||global.setTimeout.bind(global),
      clearTimeout:deps.clearTimeout||global.clearTimeout.bind(global),
      getUserMedia:deps.getUserMedia||function(constraints){
        if(!global.navigator||!global.navigator.mediaDevices||!global.navigator.mediaDevices.getUserMedia){
          return Promise.reject(new Error("瀏覽器不支援麥克風 Live 對話"));
        }
        return global.navigator.mediaDevices.getUserMedia(constraints);
      },
      createAudioContext:deps.createAudioContext||function(){
        var AudioCtx=global.AudioContext||global.webkitAudioContext;
        if(!AudioCtx)throw new Error("瀏覽器不支援 Web Audio");
        return new AudioCtx();
      },
      getKey:deps.getKey||function(){
        return global.CrewAI&&global.CrewAI.key?global.CrewAI.key():"";
      },
      logger:deps.logger||global.console
    };

    this.ws=null;
    this.model="";
    this.running=false;
    this.ready=false;
    this.stopping=false;
    this.recovering=false;

    this.attemptSeq=0;
    this.attemptsUsed=0;
    this.activeAttempt=null;
    this.activeModelIndex=-1;

    this.completedTurns=0;
    this.validOutputSeen=false;
    this.currentTurnHadAudio=false;
    this.currentTurnHadValidOutput=false;
    this.inputTurn="";
    this.outputTurn="";

    this.mediaStream=null;
    this.inputContext=null;
    this.inputSource=null;
    this.processor=null;
    this.silentGain=null;

    this.outputContext=null;
    this.outputGain=null;
    this.nextPlayTime=0;
    this.sources=[];
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

  LiveSession.prototype._isActiveAttempt=function(attempt){
    return !!attempt&&
      this.running&&
      !this.stopping&&
      this.activeAttempt===attempt&&
      this.ws===attempt.socket&&
      attempt.id===this.attemptSeq;
  };

  LiveSession.prototype._clearAttemptTimers=function(attempt){
    if(!attempt)return;
    if(attempt.setupTimer){
      this._deps.clearTimeout(attempt.setupTimer);
      attempt.setupTimer=null;
    }
    if(attempt.replyTimer){
      this._deps.clearTimeout(attempt.replyTimer);
      attempt.replyTimer=null;
    }
  };

  LiveSession.prototype._classifyClose=function(attempt,event){
    if(attempt&&attempt.closedByClient==="user-stop")return "user-stop";
    if(attempt&&attempt.closedByClient==="test-complete")return "test-complete";
    if(attempt&&attempt.closedByClient)return "client-"+attempt.closedByClient;
    if(event&&event.code===1000&&attempt&&attempt.setupComplete&&!attempt.validOutputSeen){
      return "server-early";
    }
    if(event&&event.code===1000)return "server-normal";
    return "server-abnormal";
  };

  LiveSession.prototype._logClose=function(attempt,event){
    var logger=this._deps.logger;
    if(!logger||!logger.info)return;
    var now=this._deps.now();
    var started=attempt?(attempt.openedAt||attempt.startedAt||now):now;
    logger.info("[CrewLive close]",{
      attemptId:attempt?attempt.id:null,
      model:attempt?attempt.model:"",
      code:event&&event.code!=null?event.code:null,
      reason:sanitizeDetail(event&&event.reason||""),
      wasClean:!!(event&&event.wasClean),
      setupComplete:!!(attempt&&attempt.setupComplete),
      livedMs:Math.max(0,now-started),
      classification:this._classifyClose(attempt,event)
    });
  };

  LiveSession.prototype._abandonAttempt=function(attempt,reason,closeSocket){
    if(!attempt)return;
    this._clearAttemptTimers(attempt);
    if(reason)attempt.closedByClient=reason;
    if(this.activeAttempt===attempt){
      this.activeAttempt=null;
      this.ws=null;
    }
    if(closeSocket&&attempt.socket){
      try{
        if(attempt.socket.readyState===1){
          attempt.socket.close(1000,sanitizeDetail(reason||"candidate abandoned").slice(0,80));
        }
      }catch(_){}
    }
  };

  LiveSession.prototype._clearPlayback=function(){
    this.sources.forEach(function(source){
      try{source.stop();}catch(_){}
    });
    this.sources=[];
    if(this.outputContext)this.nextPlayTime=this.outputContext.currentTime||0;
  };

  LiveSession.prototype.hasPendingPlayback=function(){
    if(this.sources.length>0)return true;
    if(!this.outputContext)return false;
    return (this.nextPlayTime-(this.outputContext.currentTime||0))>0.03;
  };

  LiveSession.prototype.getPlaybackRemainingMs=function(){
    if(!this.outputContext)return 0;
    return Math.max(0,Math.round((this.nextPlayTime-(this.outputContext.currentTime||0))*1000));
  };

  LiveSession.prototype.waitForPlaybackDrain=function(maxMs){
    var self=this;
    var limit=Math.max(100,Number(maxMs)||6000);
    var started=this._deps.now();
    return new Promise(function(resolve){
      function check(){
        if(!self.hasPendingPlayback()){resolve();return;}
        if(self._deps.now()-started>=limit){resolve();return;}
        self._deps.setTimeout(check,25);
      }
      check();
    });
  };

  LiveSession.prototype._playPcm=function(base64,mime,attempt){
    if(!base64||!this.outputContext||!this._isActiveAttempt(attempt))return;
    var rate=24000;
    var match=String(mime||"").match(/rate=(\d+)/i);
    if(match)rate=Number(match[1])||24000;

    var bytes=base64ToBytes(base64);
    var samples=Math.floor(bytes.length/2);
    if(!samples)return;

    this._markValidOutput(attempt,true);

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

    var start=Math.max((this.outputContext.currentTime||0)+0.02,this.nextPlayTime||0);
    source.start(start);
    this.nextPlayTime=start+buffer.duration;
    this.sources.push(source);

    if(this.options.onSpeaking)this.options.onSpeaking(true);
  };

  LiveSession.prototype._markValidOutput=function(attempt,isAudio){
    if(!this._isActiveAttempt(attempt))return;
    attempt.validOutputSeen=true;
    this.validOutputSeen=true;
    this.currentTurnHadValidOutput=true;
    if(isAudio)this.currentTurnHadAudio=true;
    if(attempt.replyTimer){
      this._deps.clearTimeout(attempt.replyTimer);
      attempt.replyTimer=null;
    }
  };

  LiveSession.prototype._sendOpening=function(attempt){
    if(!this._isActiveAttempt(attempt))return;
    var prompt=(this.options.openingPrompt||"").trim();
    if(!prompt)return;
    try{
      attempt.socket.send(JSON.stringify({
        clientContent:{
          turns:[{role:"user",parts:[{text:prompt}]}],
          turnComplete:true
        }
      }));
    }catch(error){
      this._beginRecovery(attempt,"opening-send",error);
    }
  };

  LiveSession.prototype.sendText=function(text){
    text=String(text||"").trim();
    var attempt=this.activeAttempt;
    if(!text||!this.ready||!this._isActiveAttempt(attempt))return false;
    try{
      attempt.socket.send(JSON.stringify({
        clientContent:{
          turns:[{role:"user",parts:[{text:text}]}],
          turnComplete:true
        }
      }));
      return true;
    }catch(error){
      this._beginRecovery(attempt,"text-send",error);
      return false;
    }
  };

  LiveSession.prototype._startCapture=function(){
    if(!this.mediaStream||this.processor)return;
    if(!this.inputContext)this.inputContext=this._deps.createAudioContext();

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
      var attempt=self.activeAttempt;
      if(!self.ready||!self._isActiveAttempt(attempt))return;
      try{
        var data=event.inputBuffer.getChannelData(0);
        attempt.socket.send(JSON.stringify({
          realtimeInput:{
            audio:{
              data:pcm16Base64(data,rate,16000),
              mimeType:"audio/pcm;rate=16000"
            }
          }
        }));
      }catch(error){
        self._beginRecovery(attempt,"audio-send",error);
      }
    };
  };

  LiveSession.prototype._armReplyTimeout=function(attempt){
    if(!this.replyTimeoutMs||!this._isActiveAttempt(attempt)||attempt.validOutputSeen)return;
    var self=this;
    if(attempt.replyTimer)this._deps.clearTimeout(attempt.replyTimer);
    attempt.replyTimer=this._deps.setTimeout(function(){
      if(!self._isActiveAttempt(attempt)||attempt.validOutputSeen)return;
      self._beginRecovery(
        attempt,
        "reply-timeout",
        new Error("Live 已完成 setup，但在期限內沒有收到有效回覆")
      );
    },this.replyTimeoutMs);
  };

  LiveSession.prototype._handleServer=function(server,attempt){
    if(!this._isActiveAttempt(attempt))return;

    var self=this;

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
      this._markValidOutput(attempt,false);
      if(this.options.onOutputTranscript)this.options.onOutputTranscript(this.outputTurn);
    }

    var turn=server.modelTurn||server.model_turn;
    var parts=turn&&turn.parts;
    if(Array.isArray(parts)){
      parts.forEach(function(part){
        var inline=part&&(part.inlineData||part.inline_data);
        var mime=inline&&(inline.mimeType||inline.mime_type||"");
        if(inline&&inline.data&&String(mime).indexOf("audio/pcm")===0){
          self._playPcm(inline.data,mime,attempt);
        }
      });
    }

    if(server.turnComplete||server.turn_complete){
      var result={
        input:this.inputTurn,
        output:this.outputTurn,
        hasValidOutput:this.currentTurnHadValidOutput,
        hadAudio:this.currentTurnHadAudio,
        model:this.model
      };

      if(this.currentTurnHadValidOutput)this.completedTurns++;

      if(this.options.onTurnComplete)this.options.onTurnComplete(result);

      this.inputTurn="";
      this.outputTurn="";
      this.currentTurnHadAudio=false;
      this.currentTurnHadValidOutput=false;

      this.waitForPlaybackDrain().then(function(){
        if(!self._isActiveAttempt(attempt))return;
        if(self.options.onSpeaking)self.options.onSpeaking(false);
        self._status("你可以直接繼續說");
      });
    }
  };

  LiveSession.prototype._handleMessage=function(message,attempt,resolveSetup,rejectSetup){
    if(!this._isActiveAttempt(attempt))return;

    if(message.error){
      var messageText=safeApiError(message.error);
      if(!attempt.setupComplete){
        rejectSetup(new Error(messageText));
      }else{
        this._beginRecovery(attempt,"api-error",new Error(messageText));
      }
      return;
    }

    if(message.setupComplete||message.setup_complete){
      if(attempt.setupComplete)return;
      attempt.setupComplete=true;
      attempt.setupCompletedAt=this._deps.now();
      this._clearAttemptTimers(attempt);
      resolveSetup(attempt);
      return;
    }

    if(!attempt.setupComplete)return;

    var server=message.serverContent||message.server_content;
    if(server)this._handleServer(server,attempt);
  };

  LiveSession.prototype._connectCandidate=function(model,index){
    var self=this;
    var WSCtor=this._deps.WebSocket;
    if(!WSCtor)return Promise.reject(new Error("瀏覽器不支援 WebSocket"));

    this.attemptsUsed++;
    this.attemptSeq++;

    var attempt={
      id:this.attemptSeq,
      model:model,
      index:index,
      startedAt:this._deps.now(),
      openedAt:0,
      setupCompletedAt:0,
      setupComplete:false,
      validOutputSeen:false,
      closedByClient:"",
      setupTimer:null,
      replyTimer:null,
      socket:null
    };

    this.activeAttempt=attempt;
    this.activeModelIndex=index;
    this.model=model;
    this.ready=false;
    this._status("正在連線 "+model+"…");
    this._state("connecting");

    return new Promise(function(resolve,reject){
      var finished=false;
      var url="wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key="+encodeURIComponent(self._deps.getKey());
      var socket=new WSCtor(url);
      attempt.socket=socket;
      self.ws=socket;

      function failBeforeSetup(error,closeReason){
        if(finished)return;
        finished=true;
        self._clearAttemptTimers(attempt);
        self._abandonAttempt(attempt,closeReason||"candidate-failed",true);
        reject(error instanceof Error?error:new Error(String(error)));
      }

      function resolveSetup(activeAttempt){
        if(finished||!self._isActiveAttempt(activeAttempt))return;
        finished=true;
        self._clearAttemptTimers(activeAttempt);
        resolve(activeAttempt);
      }

      attempt.setupTimer=self._deps.setTimeout(function(){
        if(!self._isActiveAttempt(attempt)||attempt.setupComplete)return;
        failBeforeSetup(new Error(model+" setup timeout"),"setup-timeout");
      },self.connectTimeoutMs);

      socket.onopen=function(){
        if(!self._isActiveAttempt(attempt))return;
        attempt.openedAt=self._deps.now();
        try{
          socket.send(JSON.stringify({
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
              contextWindowCompression:{slidingWindow:{}},
              sessionResumption:{},
              inputAudioTranscription:{},
              outputAudioTranscription:{},
              systemInstruction:{
                parts:[{text:self.options.system||"你是 Crew 的 Live 助手。自然、簡短地對話。"}]
              }
            }
          }));
        }catch(error){
          failBeforeSetup(error,"setup-send-failed");
        }
      };

      socket.onmessage=function(event){
        if(!self._isActiveAttempt(attempt))return;
        Promise.resolve(decodeWsData(event.data)).then(function(text){
          if(!self._isActiveAttempt(attempt))return;
          var message;
          try{message=JSON.parse(text);}catch(error){
            if(self._deps.logger&&self._deps.logger.warn){
              self._deps.logger.warn("[CrewLive unreadable frame]",{
                attemptId:attempt.id,
                model:attempt.model,
                dataType:Object.prototype.toString.call(event.data),
                detail:sanitizeDetail(error&&error.message||error)
              });
            }
            return;
          }
          self._handleMessage(message,attempt,resolveSetup,function(error){
            failBeforeSetup(error,"setup-api-error");
          });
        }).catch(function(error){
          if(!self._isActiveAttempt(attempt))return;
          if(self._deps.logger&&self._deps.logger.warn){
            self._deps.logger.warn("[CrewLive frame decode failed]",{
              attemptId:attempt.id,
              model:attempt.model,
              dataType:Object.prototype.toString.call(event.data),
              detail:sanitizeDetail(error&&error.message||error)
            });
          }
        });
      };

      socket.onerror=function(){
        if(!self._isActiveAttempt(attempt))return;
        if(!attempt.setupComplete){
          failBeforeSetup(new Error(model+" WebSocket error"),"socket-error");
          return;
        }
        self._beginRecovery(attempt,"socket-error",new Error(model+" WebSocket error"));
      };

      socket.onclose=function(event){
        self._logClose(attempt,event);
        if(!self._isActiveAttempt(attempt))return;

        self._clearAttemptTimers(attempt);

        if(!attempt.setupComplete){
          failBeforeSetup(
            new Error(model+" closed before setup ["+(event.code||0)+"] "+sanitizeDetail(event.reason||"")),
            "pre-setup-close"
          );
          return;
        }

        var classification=self._classifyClose(attempt,event);

        if(classification==="user-stop"||classification==="test-complete"){
          return;
        }

        if(classification==="server-early"){
          self._beginRecovery(
            attempt,
            "server-early-close",
            new Error(model+" ended before a valid reply ["+(event.code||0)+"]")
          );
          return;
        }

        if(event.code===1000){
          self._terminal(
            "stopped",
            null,
            "Live session 已由伺服器正常結束"
          );
          return;
        }

        self._terminal(
          "error",
          new Error(model+" disconnected ["+(event.code||0)+"] "+sanitizeDetail(event.reason||"")),
          "Live 已中斷"
        );
      };
    });
  };

  LiveSession.prototype._activateAttempt=function(attempt){
    if(!this._isActiveAttempt(attempt))throw new Error("Live attempt is no longer active");
    this.ready=true;
    this.model=attempt.model;
    this.activeModelIndex=attempt.index;
    this._state("ready");
    this._status("Live 已連線，可以直接說話");
    this._startCapture();
    this._sendOpening(attempt);
    this._armReplyTimeout(attempt);
  };

  LiveSession.prototype._connectFrom=function(startIndex){
    var self=this;
    return (async function(){
      var errors=[];
      for(var i=startIndex;i<self.models.length&&self.attemptsUsed<self.maxLiveAttempts;i++){
        try{
          var attempt=await self._connectCandidate(self.models[i],i);
          self._activateAttempt(attempt);
          return attempt;
        }catch(error){
          errors.push(sanitizeDetail(error&&error.message||error));
        }
      }
      throw new Error("Live 模型都無法使用："+errors.join(" | "));
    })();
  };

  LiveSession.prototype._beginRecovery=function(attempt,cause,error){
    if(!this._isActiveAttempt(attempt)||this.recovering||this.stopping)return;

    this.recovering=true;
    this.ready=false;

    var nextIndex=attempt.index+1;
    var shouldClose=attempt.socket&&attempt.socket.readyState===1;
    this._abandonAttempt(attempt,"fallback-"+cause,shouldClose);

    if(nextIndex>=this.models.length||this.attemptsUsed>=this.maxLiveAttempts){
      this.recovering=false;
      this._terminal("error",error,"Live 模型都無法繼續");
      return;
    }

    this._state("connecting");
    this._status(attempt.model+" 無法完成 Live，改連下一個 Live 模型…");

    var self=this;
    this._connectFrom(nextIndex).then(function(){
      self.recovering=false;
    }).catch(function(nextError){
      self.recovering=false;
      self._terminal("error",nextError||error,"Live 模型都無法連線");
    });
  };

  LiveSession.prototype._openMedia=async function(){
    this._state("requesting-mic");
    this._status("正在開啟麥克風…");

    this.outputContext=this._deps.createAudioContext();
    this.inputContext=this._deps.createAudioContext();

    this.outputGain=this.outputContext.createGain();
    this.outputGain.connect(this.outputContext.destination);

    if(this.outputContext.resume)await this.outputContext.resume();
    if(this.inputContext.resume)await this.inputContext.resume();

    this.mediaStream=await this._deps.getUserMedia({
      audio:{
        echoCancellation:true,
        noiseSuppression:true,
        autoGainControl:true,
        channelCount:1
      }
    });
  };

  LiveSession.prototype._cleanupMedia=async function(){
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
      try{
        this.mediaStream.getTracks().forEach(function(track){track.stop();});
      }catch(_){}
      this.mediaStream=null;
    }

    this._clearPlayback();

    if(this.inputContext){
      try{if(this.inputContext.close)await this.inputContext.close();}catch(_){}
      this.inputContext=null;
    }
    if(this.outputContext){
      try{if(this.outputContext.close)await this.outputContext.close();}catch(_){}
      this.outputContext=null;
    }
    this.outputGain=null;
    this.nextPlayTime=0;
  };

  LiveSession.prototype._shutdown=async function(options){
    options=options||{};
    var reason=options.reason||"user-stop";
    var attempt=this.activeAttempt;

    this.stopping=true;
    this.ready=false;
    this.recovering=false;

    if(attempt){
      attempt.closedByClient=reason;
      this._clearAttemptTimers(attempt);
      this.activeAttempt=null;
      this.ws=null;

      try{
        if(attempt.socket&&attempt.socket.readyState===1){
          try{
            attempt.socket.send(JSON.stringify({realtimeInput:{audioStreamEnd:true}}));
          }catch(_){}
          attempt.socket.close(1000,reason.slice(0,80));
        }
      }catch(_){}
    }

    await this._cleanupMedia();

    this.running=false;
    this.ready=false;
    this.stopping=false;
  };

  LiveSession.prototype._terminal=function(state,error,status){
    if(!this.running&&state!=="error")return;
    var self=this;
    this._state(state);
    if(status)this._status(status);
    if(error)this._error(error);

    this._shutdown({
      reason:state==="error"?"terminal-error":"server-complete"
    }).then(function(){
      if(self.options.onTerminal)self.options.onTerminal({
        state:state,
        error:error||null,
        status:status||""
      });
    });
  };

  LiveSession.prototype.start=async function(){
    if(this.running)return this;
    var key=this._deps.getKey();
    if(!key)throw new Error("尚未設定 Gemini API key");

    this.running=true;
    this.ready=false;
    this.stopping=false;
    this.recovering=false;
    this.attemptsUsed=0;
    this.completedTurns=0;
    this.validOutputSeen=false;
    this.currentTurnHadAudio=false;
    this.currentTurnHadValidOutput=false;
    this.inputTurn="";
    this.outputTurn="";

    try{
      await this._openMedia();
      await this._connectFrom(0);
      return this;
    }catch(error){
      await this._shutdown({reason:"start-failed"});
      this._state("error");
      throw error;
    }
  };

  LiveSession.prototype.stop=async function(options){
    options=options||{};
    var reason=options.reason||"user-stop";
    await this._shutdown({reason:reason});
    if(options.emitState!==false)this._state("stopped");
    if(!options.silentStatus)this._status(reason==="test-complete"?"Live 測試已完成":"已結束 Live 對話");
    if(this.options.onTerminal&&options.emitTerminal!==false){
      this.options.onTerminal({state:"stopped",error:null,status:reason});
    }
  };

  return {
    Session:LiveSession,
    models:DEFAULT_MODELS.slice(),
    sanitizeDetail:sanitizeDetail,
    __test:{
      mergeTranscript:mergeTranscript,
      safeApiError:safeApiError,
      decodeWsData:decodeWsData
    }
  };
});
