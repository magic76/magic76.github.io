/** A microphone retry must reuse a verified challenge when it is still available. */
export function canRetryGuestMicrophone(phase:string,micUnavailable:boolean,challenge:string):boolean{
 return phase==="error"&&micUnavailable&&Boolean(challenge);
}

/** The voice token endpoint has legacy error strings rather than error codes. */
export function isGuestVoiceVerificationExpired(status:number,body:{code?:string;error?:string}):boolean{
 return body.code==="VERIFY_FAILED"||body.code==="VERIFY_REQUIRED"
  ||(status===403&&body.error==="Verification failed")
  ||(status===400&&body.error==="Verification required");
}

/** Bound startup waits; getUserMedia itself cannot be aborted on every browser. */
export function guestStartDeadline<T>(pending:Promise<T>,ms:number,stage:string,onLateValue?:(value:T)=>void,onTimeout?:()=>void):Promise<T>{
 return new Promise((resolve,reject)=>{
  let expired=false;
  const timer=setTimeout(()=>{
   expired=true;
   const error=new Error("Guest startup timed out: "+stage);
   error.name=stage==="microphone"?"MicrophoneTimeoutError":"GuestStartTimeoutError";
   reject(error);
   onTimeout?.();
  },ms);
  pending.then(value=>{
   clearTimeout(timer);
   if(expired){onLateValue?.(value);return}
   resolve(value);
  },error=>{clearTimeout(timer);if(!expired)reject(error)});
 });
}
export function guestStartRequest<T>(request:(signal:AbortSignal)=>Promise<T>,stage:string):Promise<T>{
 const controller=new AbortController();
 return guestStartDeadline(request(controller.signal),20_000,stage,undefined,()=>controller.abort());
}
