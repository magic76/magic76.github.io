export function createBoardDiagnostics(now?:()=>number):{record(kind:string,data?:Record<string,unknown>,detail?:unknown):void;exportReport(includeContent:boolean,context?:Record<string,unknown>):unknown};
export function boardViewport():Record<string,unknown>|null;
