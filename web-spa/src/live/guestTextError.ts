/** Classify guest Worker / transport failures without confusing them with Turnstile. */
export type GuestTextFailureKind="verification"|"dailyLimit"|"tooFast"|"capacity"|"backend"|"network"|"badRequest";
export type GuestTextFailure={kind:GuestTextFailureKind;messageKey:string;reverify:boolean;retry:boolean};

type WorkerFailure=Error&{status?:number;guestTextStage?:"start"};

export function guestTextWorkerError(code:string|undefined,status:number):Error{
 const error=new Error(code||"GUEST_FAILED") as WorkerFailure;
 error.status=status;
 return error;
}

/** A start error means no usable grant was issued; a send error does not erase a grant. */
export function markGuestTextStartError(reason:unknown):Error{
 const error=(reason instanceof Error?reason:new Error("GUEST_START_FAILED")) as WorkerFailure;
 error.guestTextStage="start";
 return error;
}

export function isGuestTextStartError(reason:unknown):boolean{
 return Boolean(reason&&typeof reason==="object"&&(reason as WorkerFailure).guestTextStage==="start");
}

export function classifyGuestTextFailure(reason:unknown):GuestTextFailure{
 const message=reason instanceof Error?reason.message:typeof reason==="string"?reason:"";
 const status=reason&&typeof reason==="object"?Number((reason as WorkerFailure).status)||0:0;
 const code=message.trim().toUpperCase();
 const failure=(kind:GuestTextFailureKind,messageKey:string,retry=true):GuestTextFailure=>({
  kind,messageKey,reverify:kind==="verification",retry
 });
 switch(code){
  case "VERIFY_REQUIRED":return failure("verification","guestText.verifyRequired",false);
  case "VERIFY_FAILED":return failure("verification","guestText.verifyFailed",false);
  case "SESSION_EXPIRED":return failure("verification","guestText.sessionExpired",false);
  case "DAILY_LIMIT":return failure("dailyLimit","guestText.dailyLimit",false);
  case "TOO_FAST":return failure("tooFast","guestText.tooFast");
  case "CAPACITY":return failure("capacity","guestText.capacity",false);
  case "BAD_REQUEST":return failure("badRequest","guestText.badRequest");
  case "TEMP_UNAVAILABLE":return failure("backend","guestText.backend");
 }
 // Fetch rejection and invalid/non-JSON responses are transport failures.
 if(reason instanceof TypeError||reason instanceof SyntaxError||
  /failed to fetch|networkerror|network request failed|load failed|invalid json|unexpected token|unexpected end of json/i.test(message))
  return failure("network","guestText.network");
 // The backend may return an unrecognized code, non-JSON 5xx or no reply.
 // In particular, 429 alone does not prove the visitor spent their 12 turns.
 if(status===400||status===413||status===415)return failure("badRequest","guestText.badRequest");
 return failure("backend","guestText.backend");
}
