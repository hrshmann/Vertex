/**
 * Turns decorative motion on before first paint, unless the visitor asked for reduced motion.
 * Styles that hide content until it animates in are scoped to <html data-motion="on">, so
 * without this script (or with reduced motion) everything is simply visible.
 */
export const MOTION_INIT_SCRIPT = `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.dataset.motion="on"}catch(e){}`;

/** True when decorative motion should run (the page set data-motion="on"). */
export function motionEnabled(): boolean {
  return typeof document !== "undefined" && document.documentElement.dataset.motion === "on";
}
