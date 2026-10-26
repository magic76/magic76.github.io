// No imports. Keep scroll scheduling independent of the large MagicPage module.
export function scheduleMagicStageReveal(stage:HTMLElement|null,reducedMotion:boolean){
 if(!stage||typeof requestAnimationFrame!=="function")return;
 requestAnimationFrame(()=>stage.scrollIntoView({block:"nearest",behavior:reducedMotion?"auto":"smooth"}));
}
