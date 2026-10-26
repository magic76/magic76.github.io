export const BIOMES={
 sky:{ground:"#A7D889",side:"#796B91",roof:"#A86AC0",tree:"#559A7B",detail:"#F2DDA6",sky:"#9AD4F4"},
 forest:{ground:"#8FCA84",side:"#63778A",roof:"#D78C67",tree:"#3A886B",detail:"#EED69B",sky:"#A9DCD1"},
 candy:{ground:"#F0CAAF",side:"#9D789B",roof:"#D770A9",tree:"#AD78A4",detail:"#FFF1BB",sky:"#E9C6ED"},
} as const;
export type MagicPalette=(typeof BIOMES)[keyof typeof BIOMES];
export const MAGIC_MATERIALS={
 grass:{roughness:.94,metalness:0},
 stone:{roughness:.93,metalness:0,flatShading:true},
 foliage:{roughness:.85,metalness:0,flatShading:true},
 architecture:{roughness:.78,metalness:0},
} as const;
export const MAGIC_LIGHTING={
 day:{hemisphereSky:"#FFF4DD",hemisphereGround:"#7B8E8A",hemisphereIntensity:1.0,ambientColor:"#FFF6EA",ambientIntensity:.2,sunColor:"#FFE2B5",sunIntensity:2.1,magicColor:"#F3C8FF",magicIntensity:.35},
 night:{hemisphereSky:"#778ABA",hemisphereGround:"#313F64",hemisphereIntensity:.57,ambientColor:"#8695C3",ambientIntensity:.16,sunColor:"#B8C9FF",sunIntensity:1.05,magicColor:"#EBC5FF",magicIntensity:1.35},
} as const;
export const MAGIC_NIGHT_SKY="#25385C";
