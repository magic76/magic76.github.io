/** Compatibility boundary for the published @mediapipe/tasks-vision ESM entry.
 * The package index exports InteractiveSegmenter, but not its nested BrushMode.
 * See mediapipe/tasks/web/vision/index.ts and
 * interactive_segmenter/interactive_segmenter_options.ts.
 */
export const POSITIVE_BRUSH_MODE=1 as const;
export type CutoutMask={width:number;height:number;getAsFloat32Array:()=>Float32Array;close?:()=>void};
export type CutoutSegmenter={
 setImage:(source:HTMLImageElement)=>void;
 segment:(strokes:ReadonlyArray<{brushMode:number;point:ReadonlyArray<{x:number;y:number}>;isCompleted:boolean}>)=>CutoutMask;
 close?:()=>void;
};
type VisionExports={
 FilesetResolver?:{forVisionTasks:(url:string)=>Promise<unknown>};
 InteractiveSegmenter?:{createFromOptions:(fileset:unknown,opts:{baseOptions:{modelAssetPath:string;delegate:"CPU"}})=>Promise<CutoutSegmenter>};
};
/** Never require mod.BrushMode: it is not exported from the package entry. */
export function resolveCutoutApi(mod:unknown){
 const sdk=mod as VisionExports|null;
 if(typeof sdk?.FilesetResolver?.forVisionTasks!=="function"||
    typeof sdk.InteractiveSegmenter?.createFromOptions!=="function")
  throw new Error("MediaPipe InteractiveSegmenter API missing from loaded bundle");
 return {FilesetResolver:sdk.FilesetResolver,InteractiveSegmenter:sdk.InteractiveSegmenter,positive:POSITIVE_BRUSH_MODE};
}
