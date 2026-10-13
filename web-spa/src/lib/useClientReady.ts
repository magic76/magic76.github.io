import {useEffect,useState} from "react";

/** Static HTML and the first hydration render must never contain private data. */
export function useClientReady(){
 const [ready,setReady]=useState(false);
 useEffect(()=>setReady(true),[]);
 return ready;
}
