import {createContext,useContext,type ReactNode} from "react";
import type {BriefingDay,BriefingIndex,BriefingItem} from "./types";

/** Only published research is embedded into generated HTML. No local user data. */
export type RelatedResearch={date:string;id:string;title:string;topic:string;path:string;reason:string};
export type PublicResearchSeed={
 index?:BriefingIndex;
 day?:BriefingDay;
 article?:BriefingItem;
 related?:RelatedResearch[];
};
const Context=createContext<PublicResearchSeed|null>(null);
export function PublicResearchProvider({seed,children}:{seed:PublicResearchSeed|null;children:ReactNode}){
 return <Context.Provider value={seed}>{children}</Context.Provider>;
}
export function usePublicResearchSeed(){return useContext(Context)}
