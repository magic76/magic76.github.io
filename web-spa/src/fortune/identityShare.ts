import type {FortuneIdentity} from "./identity";
import type {FortuneMode} from "./types";
import {buildFortuneCardModel} from "./fortuneCardModel";
import {renderCollectibleCard,collectiblePngFile,nativeCollectibleShare} from "./fortuneCardCanvas";
import {fortuneInviteUrl} from "./fortuneInvite";
import {fortuneInvitation} from "./fortuneJourneyI18n";

/** Compatibility renderer; both reading and identity cards use one shared Canvas implementation. */
export function renderIdentityShareCard(identity:FortuneIdentity,locale:string,art?:HTMLImageElement|null):HTMLCanvasElement{
 const model=buildFortuneCardModel(identity.mode,{},locale,"",identity);
 return renderCollectibleCard(model,art,new Date(),locale);
}
export async function shareIdentityCard(identity:FortuneIdentity,locale:string,art?:HTMLImageElement|null):Promise<"shared"|"cancelled"|"unsupported">{
 const canvas=renderIdentityShareCard(identity,locale,art),file=collectiblePngFile(canvas,"crew-fortune-identity.png");
 const url=fortuneInviteUrl(identity.mode,identity.id,locale);
 return nativeCollectibleShare(file,fortuneInvitation(locale,identity.title,url),url);
}
export function identityInviteUrl(mode:FortuneMode,id:string|null=null,locale="zh-TW"):string{
 return fortuneInviteUrl(mode,id,locale);
}
