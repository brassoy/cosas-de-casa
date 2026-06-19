import '@testing-library/jest-dom';

// jsdom no implementa `scrollIntoView`. El componente ChatThread lo usa para
// auto-scroll; lo polirrellenamos para que los tests no lancen errores.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}

// jsdom tampoco implementa `Element.prototype.scrollTo`. El ItemSheet de shopping
// lo usa para auto-scrollear el hilo de comentarios al final; lo polirrellenamos
// con un no-op para que los tests no lancen errores al montar.
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = function () {};
}

// jsdom no implementa `ResizeObserver`. Algunas primitivas de Radix (Checkbox,
// Switch, etc., vía `@radix-ui/react-use-size`) lo usan al montar para medir el
// indicador, así que lo polirrellenamos con un stub no-op para los tests.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// jsdom no implementa `matchMedia`. Varios módulos lo usan al importarse
// (p. ej. el bootstrap de theming), así que lo polirrellenamos para los tests.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList,
});
