export const BIOMES = {
  sky: {
    ground: "#9ACBA0",
    side: "#A69CB8",
    roof: "#AA83BE",
    tree: "#70AD91",
    detail: "#E9DAAC",
    sky: "#BDDCEE",
  },
  forest: {
    ground: "#82BB8E",
    side: "#8795A0",
    roof: "#D3A16F",
    tree: "#4F9B79",
    detail: "#F0DFB5",
    sky: "#B7D5C4",
  },
  candy: {
    ground: "#EBC5D4",
    side: "#B49BBD",
    roof: "#E991B4",
    tree: "#D98EBA",
    detail: "#FFF0C9",
    sky: "#F2DCEB",
  },
} as const;

export type MagicPalette =
  (typeof BIOMES)[keyof typeof BIOMES];

export const MAGIC_MATERIALS = {
  grass: {
    roughness: 0.92,
    metalness: 0,
  },
  stone: {
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  },
  foliage: {
    roughness: 0.88,
    metalness: 0,
    flatShading: true,
  },
  architecture: {
    roughness: 0.78,
    metalness: 0,
  },
} as const;

export const MAGIC_LIGHTING = {
  day: {
    hemisphereSky: "#FFF5E8",
    hemisphereGround: "#8FA9A0",
    hemisphereIntensity: 1.05,
    ambientColor: "#FFFFFF",
    ambientIntensity: 0.24,
    sunColor: "#FFE7BF",
    sunIntensity: 2.25,
    magicColor: "#E5CAFF",
    magicIntensity: 0.35,
  },
  night: {
    hemisphereSky: "#8A9CCC",
    hemisphereGround: "#535F80",
    hemisphereIntensity: 0.65,
    ambientColor: "#A5B2DB",
    ambientIntensity: 0.18,
    sunColor: "#C4D5FF",
    sunIntensity: 1.1,
    magicColor: "#E6CAFF",
    magicIntensity: 1.45,
  },
} as const;

