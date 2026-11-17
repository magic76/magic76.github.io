export type TextCourseMessage={role:"user"|"assistant";text:string};
export type TextCourseMission={keywords:string[]};
export function textCourseTasksDone(missions:TextCourseMission[],messages:TextCourseMessage[]):boolean;
