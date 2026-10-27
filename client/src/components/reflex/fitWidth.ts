// Altura que ocupan la cabecera, el título, el marcador y los márgenes alrededor del campo (medida
// en el navegador). Se descuenta de la ventana, junto a las áreas seguras de iOS (muesca arriba e indicador de inicio abajo), para que el campo
// entero se vea sin hacer scroll, en escritorio y en móvil apaisado.
const CHROME_HEIGHT_PX = 190;
const MIN_WIDTH_PX = 120;

/**
 * Ancho CSS de un campo de juego de proporción `ratio` (ancho / alto): nunca más ancho que su
 * contenedor, ni más alto que lo que queda de la ventana, ni más grande que `maxWidthPx`.
 */
export function fitWidth(ratio: number, maxWidthPx: number): string {
  return `min(100%, max(${MIN_WIDTH_PX}px, calc((100dvh - ${CHROME_HEIGHT_PX}px - env(safe-area-inset-top) - env(safe-area-inset-bottom)) * ${ratio})), ${maxWidthPx}px)`;
}
