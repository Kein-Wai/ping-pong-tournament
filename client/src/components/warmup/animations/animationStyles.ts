/**
 * Keyframes de las animaciones de calentamiento. Van en un <style> dentro de
 * cada SVG para que la pieza sea autocontenida: sin hojas de estilo ni
 * dependencias, y con los colores del tema de Mantine.
 *
 * Los orígenes de giro se dan en unidades del viewBox (px) y `transform-box:
 * view-box` los ancla al dibujo, no al elemento, que es lo que Safari/iOS espera.
 */
export const WARMUP_ANIMATION_CSS = `
.wu-anim { transform-box: view-box; }

@keyframes wu-sway { from { transform: rotate(-14deg); } to { transform: rotate(14deg); } }
@keyframes wu-swing { from { transform: rotate(-45deg); } to { transform: rotate(45deg); } }
@keyframes wu-bob { from { transform: translateY(0); } to { transform: translateY(-3px); } }
@keyframes wu-tilt { from { transform: rotate(-6deg); } to { transform: rotate(6deg); } }
@keyframes wu-wobble { from { transform: rotate(-14deg); } to { transform: rotate(14deg); } }
@keyframes wu-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

@keyframes wu-travel {
  from { transform: translate(0, 0); }
  to { transform: translate(var(--dx), var(--dy)); }
}

@keyframes wu-bounce {
  0% { transform: translateY(0); animation-timing-function: cubic-bezier(0.2, 0.6, 0.4, 1); }
  50% { transform: translateY(-52px); animation-timing-function: cubic-bezier(0.6, 0, 0.8, 0.4); }
  100% { transform: translateY(0); }
}

@keyframes wu-topspin {
  0%, 30% { transform: rotate(var(--a0)); }
  60% { transform: rotate(var(--a1)); }
  75% { transform: rotate(var(--a2)); }
  100% { transform: rotate(var(--a0)); }
}

@keyframes wu-topspin-ball {
  0%, 58% { transform: translate(0, 0); opacity: 1; }
  80% { transform: translate(var(--dx), var(--dy)); opacity: 1; }
  92% { transform: translate(var(--dx), var(--dy)); opacity: 0; }
  100% { transform: translate(0, 0); opacity: 0; }
}

@keyframes wu-serve-ball {
  0% { transform: translate(0, 0); opacity: 1; animation-timing-function: ease-out; }
  25% { transform: translate(0, -52px); animation-timing-function: ease-in; }
  42% { transform: translate(0, -6px); animation-timing-function: linear; }
  52% { transform: translate(35px, 13px); }
  64% { transform: translate(65px, -16px); }
  76% { transform: translate(100px, 13px); }
  90% { transform: translate(135px, -14px); opacity: 1; }
  96% { transform: translate(145px, -4px); opacity: 0; }
  100% { transform: translate(0, 0); opacity: 0; }
}

@keyframes wu-serve-paddle {
  0%, 30% { transform: translate(-14px, 6px); animation-timing-function: ease-in; }
  42% { transform: translate(0, 0); animation-timing-function: ease-out; }
  52% { transform: translate(10px, -6px); }
  100% { transform: translate(-14px, 6px); }
}

@media (prefers-reduced-motion: reduce) {
  .wu-anim { animation: none !important; }
}
`;
