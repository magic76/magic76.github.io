import {createContext,useContext,type ReactNode} from "react";
import type {BriefingDay,BriefingIndex,BriefingItem} from "./types";

/** Only published research is embedded into generated HTML. No local user data. */
export type PublicResearchSeed={
 index?:BriefingIndex;
 day?:BriefingDay;
 article?:BriefingItem;
};
const Context=createContext<PublicResearchSeed|null>(null);
export function PublicResearchProvider({seed,children}:{seed:PublicResearchSeed|null;children:ReactNode}){
 return <Context.Provider value={seed}>{children}</Context.Provider>;
}
export function usePublicResearchSeed(){return useContext(Context)}
