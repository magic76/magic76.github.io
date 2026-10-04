export type FortuneMode="bazi"|"tarot"|"vedic";
export type FortuneProfile={birthDate:string;birthTime:string;gender:string;city:string;latitude:string;longitude:string;utcOffset:string;aiStyle:string};
export type FortuneReading={id:string;mode:FortuneMode;createdAt:string;profile:FortuneProfile;result:any;summary:string;ai?:string};
export type ResultTabProps={result:any;ai:string;onAsk:(prompt?:string)=>void};