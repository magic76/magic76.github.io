import { useMemo } from "react";
import { Color } from "three";
import type { MagicWorld } from "./world";
import {
  MAGIC_LIGHTING,
  type MagicPalette,
} from "./magicPalette";

type Props = {
  world: MagicWorld;
  colors: MagicPalette;
};

export function MagicLighting3D({
  world,
  colors,
}: Props) {
  const night = world.time === "night";
  const lighting = night
    ? MAGIC_LIGHTING.night
    : MAGIC_LIGHTING.day;

  const skyColor = useMemo(
    () => new Color(colors.sky),
    [colors.sky]
  );

  return (
    <>
      <color
        attach="background"
        args={[skyColor]}
      />

      <fog
        attach="fog"
        args={[skyColor, 58, 140]}
      />

      <hemisphereLight
        args={[
          lighting.hemisphereSky,
          lighting.hemisphereGround,
          lighting.hemisphereIntensity,
        ]}
      />

      <ambientLight
        color={lighting.ambientColor}
        intensity={lighting.ambientIntensity}
      />

      <directionalLight
        position={[-8, 13, 10]}
        color={lighting.sunColor}
        intensity={lighting.sunIntensity}
        castShadow={false}
      />

      <pointLight
        position={[0, 4, 0]}
        color={lighting.magicColor}
        intensity={lighting.magicIntensity}
        distance={10}
        decay={2}
      />
    </>
  );
}

