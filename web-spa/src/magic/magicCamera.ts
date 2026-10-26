import { Vector3 } from "three";

const ISLAND_LINEAR_SCALE = Math.sqrt(10);

export const MAGIC_CAMERA_TARGET = new Vector3(0, 1.05, 0);

export const MAGIC_OVERVIEW_POSITION = new Vector3(
  12.5 * ISLAND_LINEAR_SCALE,
  11.4 * ISLAND_LINEAR_SCALE,
  18.7 * ISLAND_LINEAR_SCALE
).multiplyScalar(0.82);

export function getMagicOverviewPosition(
  aspect: number
): Vector3 {
  // Give narrow screens a little more breathing room.
  // Avoid changing the world or object coordinates.
  const safeAspect = Number.isFinite(aspect)
    ? Math.max(0.5, aspect)
    : 1;

  const distanceScale = safeAspect < 0.8 ? 1.08 : 1;

  return MAGIC_CAMERA_TARGET.clone().add(
    MAGIC_OVERVIEW_POSITION
      .clone()
      .sub(MAGIC_CAMERA_TARGET)
      .multiplyScalar(distanceScale)
  );
}

