export type CourseMission={titleEn:string;titleZh:string;keywords:string[]};
export type CourseLesson={id:string;trackId:string;unitId:string;titleEn:string;titleZh:string;descEn:string;descZh:string;scene:string;rolePrompt:string;missions:CourseMission[]};
export type CourseUnit={id:string;trackId:string;titleEn:string;titleZh:string;descEn:string;descZh:string};
export type CourseTrack={id:string;emoji:string;titleEn:string;titleZh:string;descEn:string;descZh:string};
