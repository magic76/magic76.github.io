export interface PortraitAsset {path:string;width:number;height:number;sizeBytes:number;sha256:string}
export function approvedPortrait(manifest:unknown,characterId:string,age:number,kind:'fullbody'|'avatar'):PortraitAsset|null;
export function webpDimensions(bytes:ArrayBuffer):{width:number;height:number};
export function verifiedPortraitBlob(asset:PortraitAsset|null,fetcher?:typeof fetch,subtle?:SubtleCrypto):Promise<Blob|null>;
