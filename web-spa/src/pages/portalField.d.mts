export type PortalMode = 'chat' | 'play' | 'learn' | 'story';
export const PORTAL_MODES: readonly PortalMode[];
export function portalShape(mode: PortalMode, angle: number, band: number, time: number): [number, number, number];
export interface PortalFieldController {
 setMode(mode: PortalMode): void;
 setPaused(paused: boolean): void;
 setLaunching(launching: boolean): void;
 destroy(): void;
}
export function createPortalField(canvas: HTMLCanvasElement, host: HTMLElement, initialMode?: PortalMode): PortalFieldController | null;
