export type HomeTab="chat"|"learn"|"fortune"|"play";
export type HomeGame="1a2b"|"connect4"|"reversi";
export type HomeDeepLink={tab:HomeTab|null;friend:string|null;game:HomeGame|null;short:string|null};
export declare const HOME_FRIEND_IDS:readonly string[];
export declare const HOME_FRIEND_NAMES:Readonly<Record<string,string>>;
export declare function readHomeDeepLink(search:string):HomeDeepLink;
