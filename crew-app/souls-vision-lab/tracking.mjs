/** Pure camera-frame association. MediaPipe Object Detector has no persistent Tracking ID.
 * A continuous geometric match is a provisional session-local target, not Soul identity.
 */
export const LOST_AFTER_MS = 1400;
export const LOST_AFTER_FRAMES = 3;
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function normalizeDetection(detection, width, height) {
  if (!detection || !detection.boundingBox || !(width > 0) || !(height > 0)) return null;
  const bb = detection.boundingBox;
  const x = clamp(Number(bb.originX || 0), 0, width);
  const y = clamp(Number(bb.originY || 0), 0, height);
  const right = clamp(Number(bb.originX || 0) + Number(bb.width || 0), 0, width);
  const bottom = clamp(Number(bb.originY || 0) + Number(bb.height || 0), 0, height);
  if (![x,y,right,bottom].every(Number.isFinite) || right <= x || bottom <= y) return null;
  const category = detection.categories && detection.categories[0];
  return {
    label: String(category && (category.categoryName || category.displayName) || "object"),
    score: clamp(Number(category && category.score || 0), 0, 1),
    box: { x, y, width: right - x, height: bottom - y }
  };
}

export function intersectionOverUnion(a, b) {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  const r = Math.min(a.x+a.width, b.x+b.width), bot = Math.min(a.y+a.height, b.y+b.height);
  const area = Math.max(0,r-x)*Math.max(0,bot-y);
  const union = a.width*a.height+b.width*b.height-area;
  return union > 0 ? area/union : 0;
}

export function matchTarget(target, detections, width, height) {
  if (!target || !Array.isArray(detections)) return null;
  const diag = Math.hypot(width,height) || 1;
  const scored = [];
  for (const item of detections) {
    if (!item || item.label !== target.label) continue;
    const iou = intersectionOverUnion(target.box,item.box);
    const a = target.box, b = item.box;
    const dx = a.x + a.width/2 - b.x - b.width/2;
    const dy = a.y + a.height/2 - b.y - b.height/2;
    const travel = Math.hypot(dx,dy)/diag;
    const areaRatio = Math.max(a.width*a.height,b.width*b.height) /
      Math.max(1,Math.min(a.width*a.height,b.width*b.height));
    // No arbitrary re-acquisition after disappearance: stay near last position.
    if ((iou < .12 && travel > .12) || areaRatio > 3.2) continue;
    const score = iou*.7 + (1 - Math.min(1,travel/.20))*.3;
    scored.push({item,score});
  }
  scored.sort((a,b)=>b.score-a.score);
  // If two same-class objects look geometrically equally plausible, stop instead of swapping Souls.
  if (scored.length>1 && scored[0].score-scored[1].score < .075) return null;
  return scored.length ? scored[0].item : null;
}

export function newTracker() {
  return { target:null, state:"searching", lastSeen:0, missed:0, lossCount:0, seen:0 };
}
export function lockTarget(tracker, detected, timestamp) {
  if (!detected) return tracker;
  return { target:{label:detected.label, box:{...detected.box}},
    state:"tracking", lastSeen:timestamp, missed:0, lossCount:0, seen:1 };
}
export function updateTracker(tracker, detections, timestamp, width, height) {
  if (!tracker.target) return tracker;
  const matched = matchTarget(tracker.target,detections,width,height);
  if (matched) return {...tracker, target:{label:matched.label,box:{...matched.box}},
    state:"tracking",lastSeen:timestamp,missed:0,seen:tracker.seen+1};
  const missed = tracker.missed+1;
  const lost = missed>=LOST_AFTER_FRAMES && timestamp-tracker.lastSeen>=LOST_AFTER_MS;
  return {...tracker, missed, state:lost?"lost":"occluded",
    lossCount:lost && tracker.state!=="lost"?tracker.lossCount+1:tracker.lossCount};
}

/** Convert native video pixels into the exact CSS object-fit:cover rectangle. */
export function coverRect(box, videoW, videoH, surfaceW, surfaceH) {
  const scale = Math.max(surfaceW/videoW,surfaceH/videoH);
  const dx = (surfaceW-videoW*scale)/2;
  const dy = (surfaceH-videoH*scale)/2;
  return {x:box.x*scale+dx,y:box.y*scale+dy,width:box.width*scale,height:box.height*scale};
}
export function hitRect(rect,x,y) {
  return x>=rect.x && y>=rect.y && x<=rect.x+rect.width && y<=rect.y+rect.height;
}
