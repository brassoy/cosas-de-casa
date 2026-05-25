import '@testing-library/jest-dom';

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
