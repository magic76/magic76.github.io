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
