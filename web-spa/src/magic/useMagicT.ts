import {useCallback} from "react";
import {useTranslation} from "react-i18next";

// Magic catalogs use English sentences as keys, so "." and ":" must not be
// treated as nested-key or namespace separators.
const PLAIN_KEY={keySeparator:false,nsSeparator:false} as const;
export type MagicT=(key:string,options?:Record<string,unknown>)=>string;
export function useMagicT(){
 const {t,i18n}=useTranslation("magic");
 const tr=useCallback<MagicT>((key,options)=>String(t(key,{...options,...PLAIN_KEY})),[t]);
 return {t:tr,i18n};
}
