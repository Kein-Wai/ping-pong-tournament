import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// React Testing Library desmonta los componentes tras cada test para que el
// DOM no se acumule entre casos.
afterEach(() => {
  cleanup();
});

// jsdom no implementa matchMedia, que usa Mantine para los breakpoints.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

// Mantine y los graficos usan ResizeObserver, que tampoco existe en jsdom.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

// scrollTo no esta implementado en jsdom y lo usan los modales de Mantine.
window.scrollTo = vi.fn();

// scrollIntoView tampoco existe en jsdom y lo usan los Select/Combobox de
// Mantine al resaltar la opcion activa de su desplegable.
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// document.fonts no existe en jsdom y el Textarea autosize de Mantine se suscribe
// a su evento "loadingdone" para recalcular la altura cuando cargan las fuentes.
Object.defineProperty(document, 'fonts', {
  configurable: true,
  value: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
});
