import { useEffect } from 'react';

/**
 * Fuerza la estética "Hommer" (springfield, modo claro) mientras la landing está
 * montada y restaura los atributos previos del <html> al desmontar.
 *
 * La landing es marketing: debe verse SIEMPRE con el theme cómic pop, sin importar
 * la preferencia guardada del usuario. No usamos `setTheme` del bootstrap a
 * propósito —eso persistiría la preferencia en localStorage—; aquí sólo tocamos
 * los atributos del DOM de forma efímera.
 */
export function useForceHommerTheme(): void {
  useEffect(() => {
    const html = document.documentElement;
    const prevTheme = html.getAttribute('data-theme');
    const prevMode = html.getAttribute('data-mode');

    html.setAttribute('data-theme', 'springfield');
    html.setAttribute('data-mode', 'light');

    return () => {
      // Restauramos lo que hubiera antes (o limpiamos si no había nada).
      if (prevTheme === null) html.removeAttribute('data-theme');
      else html.setAttribute('data-theme', prevTheme);
      if (prevMode === null) html.removeAttribute('data-mode');
      else html.setAttribute('data-mode', prevMode);
    };
  }, []);
}

/**
 * Anima la entrada de los elementos `.ld-reveal` al entrar en el viewport
 * (añade la clase `is-in`). Un único IntersectionObserver para toda la página.
 * Idempotente y seguro si `IntersectionObserver` no existe (jsdom/SSR): en ese
 * caso revela todo de inmediato para no dejar contenido invisible.
 */
export function useScrollReveal(rootRef: React.RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>('.ld-reveal'));

    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach((el) => el.classList.add('is-in'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            observer.unobserve(entry.target);
          }
        }
      },
      { root, rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [rootRef]);
}

/**
 * Parallax sutil: desplaza los elementos `.ld-parallax` según el scroll del
 * contenedor, usando el atributo data-speed (px de desplazamiento por cada
 * fracción de scroll). Respeta prefers-reduced-motion y usa rAF para no
 * machacar el hilo principal.
 */
export function useParallax(rootRef: React.RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (typeof window === 'undefined') return;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduce) return;

    const layers = Array.from(root.querySelectorAll<HTMLElement>('.ld-parallax'));
    if (layers.length === 0) return;

    let ticking = false;

    const update = () => {
      ticking = false;
      const scroll = root.scrollTop;
      for (const layer of layers) {
        const speed = Number(layer.dataset.speed ?? '0.12');
        layer.style.setProperty('--ld-parallax', `${-(scroll * speed)}px`);
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    root.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => root.removeEventListener('scroll', onScroll);
  }, [rootRef]);
}
