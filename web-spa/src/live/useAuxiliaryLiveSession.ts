import {useEffect} from "react";
import {geminiKey} from "../lib/runtime";
import {startAuxiliarySession,stopAuxiliarySession} from "./secondLiveProvider";
export function useAuxiliaryLiveSession(active:boolean,textMode:boolean){
 useEffect(()=>{if(!active||textMode||!geminiKey())return;startAuxiliarySession();return stopAuxiliarySession},[active,textMode]);
}
