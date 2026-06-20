/* ─── Landing de marketing — Cosas de Casa ────────────────────────────────────
 *
 * Página ÚNICA (scroll, sin routing interno) que presenta la PWA "Cosas de Casa".
 * Full-screen propia: NO usa el shell del app (sin AppHeader/BottomNav). Fuerza la
 * estética "Hommer" (theme springfield, modo claro) mientras está montada.
 *
 * Estética: cómic pop (amarillo + tinta negra, bordes gruesos, hard shadows). Reusa
 * las clases del theme (.sf-*) y añade interactividad propia (.ld-* en landing.css):
 * reveal al hacer scroll, parallax sutil, hover pop, elementos flotantes.
 *
 * Capturas reales en /landing/shots/*.png (móvil vertical, dentro de "marco de móvil").
 * El vídeo /landing/demo.mp4 lo aporta otra persona; si no existe, no rompe.
 *
 * Texto en español de España (tuteo). Sin mención a precio/gratis a propósito.
 * ─────────────────────────────────────────────────────────────────────────── */

import { useRef, type SVGProps } from 'react';
import { Link } from '@tanstack/react-router';
import './landing.css';
import {
  useForceHommerTheme,
  useScrollReveal,
  useParallax,
} from './useLandingChrome';

/* ─── SVG decorativos (presentacionales, sin lógica) ───────────────────────── */

function Lightning(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 32" aria-hidden="true" {...props}>
      <path
        d="M14 0 L2 18 H10 L8 32 L22 12 H14 Z"
        fill="#FFD90F"
        stroke="#1A1A1A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Star(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
      <path
        d="M24 2 30 18 47 18 33 28 38 45 24 35 10 45 15 28 1 18 18 18Z"
        fill="#70C5FF"
        stroke="#1A1A1A"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Donut(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
      <circle cx="24" cy="24" r="20" fill="#F48FB1" stroke="#1A1A1A" strokeWidth="3" />
      <circle cx="24" cy="24" r="7" fill="#FFF3C4" stroke="#1A1A1A" strokeWidth="3" />
    </svg>
  );
}

function Heart(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 44" aria-hidden="true" {...props}>
      <path
        d="M24 42 4 22C-3 14 6 0 17 5c4 2 6 5 7 7 1-2 3-5 7-7 11-5 20 9 13 17Z"
        fill="#E53935"
        stroke="#1A1A1A"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Marco de móvil (recorta una captura vertical como app real) ──────────── */

function PhoneFrame({
  src,
  alt,
  large = false,
  children,
}: {
  src?: string;
  alt?: string;
  large?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`ld-phone ld-phone-pop${large ? ' ld-phone-lg' : ''}`}>
      {children ??
        (src ? (
          <img src={src} alt={alt ?? ''} loading="lazy" decoding="async" />
        ) : null)}
    </div>
  );
}

/* Marco de móvil con MOCKUP REAL: muestra una captura estática (poster) y, al
 * pasar el ratón, reproduce un vídeo del scroll REAL de la app. El menú inferior
 * (fijo) permanece y el contenido se desplaza por debajo, como en la app. */
function FeaturePhone({ shot, alt }: { shot: string; alt: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const play = () => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = 0;
    void v.play().catch(() => {});
  };
  const stop = () => {
    const v = ref.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  };
  return (
    <div className="ld-phone ld-phone-pop" onMouseEnter={play} onMouseLeave={stop}>
      <video
        ref={ref}
        src={`/landing/scroll/${shot.replace('.png', '.mp4')}`}
        poster={`${SHOTS}/${shot}`}
        muted
        loop
        playsInline
        preload="none"
        aria-label={alt}
      />
    </div>
  );
}

/* ─── Datos de las features (rejilla) ──────────────────────────────────────── */

const FEATURES: ReadonlyArray<{
  shot: string;
  emoji: string;
  tag: string;
  title: string;
  desc: string;
  card: string;
}> = [
  {
    shot: 'sf-lists.png',
    emoji: '🛒',
    tag: 'Voz + IA',
    title: 'La compra, por voz e IA',
    desc: 'Dicta la compra mientras cocinas y la IA la entiende: separa los productos y evita que metas dos veces lo mismo. Todos en casa añaden lo que falta y se sincroniza al instante.',
    card: 'sf-card-y',
  },
  {
    shot: 'sf-tasks.png',
    emoji: '✅',
    tag: 'En familia',
    title: 'Tareas repartidas',
    desc: 'Reparte las tareas de casa para que cada uno sepa lo que le toca, sin discutir. Asígnalas, márcalas como hechas y adjunta una foto cuando estén listas.',
    card: 'sf-card-s',
  },
  {
    shot: 'sf-fridge.png',
    emoji: '🧊',
    tag: 'Stock al día',
    title: 'Tu nevera bajo control',
    desc: 'Lleva al día la nevera, el congelador y la despensa. Sabes qué te queda antes de salir a comprar y dejas de tirar comida olvidada.',
    card: 'sf-card-p',
  },
  {
    shot: 'sf-calendar.png',
    emoji: '📅',
    tag: 'En tiempo real',
    title: 'El calendario de la familia',
    desc: 'Los eventos de toda la familia en un mismo calendario compartido. Cada uno ve lo que hay y nadie se pierde un cumple ni una cita.',
    card: 'sf-card-g',
  },
  {
    shot: 'sf-plans.png',
    emoji: '🗺️',
    tag: 'Con mapa',
    title: 'Planes con mapa',
    desc: 'Propón un plan, elige el sitio en el mapa y que tu gente confirme si se apunta. Con su chat propio para cuadrarlo todo sin salir de la app.',
    card: 'sf-card-y',
  },
  {
    shot: 'sf-budget.png',
    emoji: '🧾',
    tag: 'Escanea y listo',
    title: 'Tickets y gasto',
    desc: 'Escanea el ticket de la compra y la app saca el gasto por ti. Mira en qué se va el dinero de casa, mes a mes y por categorías.',
    card: 'sf-card-s',
  },
  {
    shot: 'sf-menu.png',
    emoji: '🍳',
    tag: 'Menos desperdicio',
    title: 'Qué cocino hoy',
    desc: 'Pídele ideas de menú con lo que ya tienes en la nevera. Cocinas con lo que hay, das menos vueltas y tiras menos comida.',
    card: 'sf-card-p',
  },
  {
    shot: 'sf-rincon.png',
    emoji: '💕',
    tag: 'Solo para dos',
    title: 'Vuestro rincón',
    desc: 'Un espacio privado solo para la pareja, dentro de casa: notas, detalles y pequeños retos para cuidaros también en el día a día.',
    card: 'sf-card-g',
  },
  {
    shot: 'sf-stats.png',
    emoji: '📊',
    tag: 'Quién colabora',
    title: 'Estadísticas',
    desc: 'De un vistazo, quién está echando una mano en casa y quién menos. Datos claros en lugar de reproches.',
    card: 'sf-card',
  },
];

/* Fila de feature con diseño VARIADO: alterna el lado del móvil, su inclinación y
 * rota entre 3 tratamientos de la descripción (grande en negrita / panel blanco /
 * con barra de acento), más una etiqueta y un emoji de marca. Así la sección no
 * resulta monótona y la descripción gana protagonismo. */
function FeatureRow({ feat, i }: { feat: (typeof FEATURES)[number]; i: number }) {
  const reverse = i % 2 === 1;
  const look = i % 3;
  const tilt = reverse ? 2 : -2;
  return (
    <article
      className={`${feat.card} ${look === 1 ? 'sf-dot' : ''} ld-reveal ${
        reverse ? 'ld-reveal-right' : 'ld-reveal-left'
      } relative overflow-hidden p-6 sm:p-10 flex flex-col items-center gap-7 sm:gap-12 text-center sm:text-left ${
        reverse ? 'sm:flex-row-reverse' : 'sm:flex-row'
      }`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -right-4 select-none text-[11rem] leading-none opacity-10"
      >
        {feat.emoji}
      </span>

      <div className="shrink-0" style={{ transform: `rotate(${tilt}deg)` }}>
        <FeaturePhone shot={feat.shot} alt={feat.title} />
      </div>

      <div className="relative flex-1">
        <span className="sf-tag mb-3 inline-block">
          {feat.emoji} {feat.tag}
        </span>
        <h3 className="sf-bangers text-4xl leading-[0.95] sm:text-5xl">{feat.title}</h3>
        {look === 1 ? (
          <p className="sf-fredoka mx-auto mt-5 max-w-xl rounded-2xl border-[3px] border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 text-lg font-medium text-[var(--color-text)] sm:mx-0 sm:text-xl">
            {feat.desc}
          </p>
        ) : look === 2 ? (
          <p className="sf-fredoka mx-auto mt-5 max-w-xl text-xl font-semibold sm:mx-0 sm:border-l-[6px] sm:border-[var(--color-border)] sm:pl-5 sm:text-2xl">
            {feat.desc}
          </p>
        ) : (
          <p className="sf-fredoka mx-auto mt-5 max-w-xl text-xl font-bold sm:mx-0 sm:text-2xl">
            {feat.desc}
          </p>
        )}
      </div>
    </article>
  );
}

const STEPS: ReadonlyArray<{ emoji: string; title: string; desc: string }> = [
  {
    emoji: '🏠',
    title: 'Crea tu casa',
    desc: 'Date de alta y monta tu hogar en menos de un minuto.',
  },
  {
    emoji: '👋',
    title: 'Invita a los tuyos',
    desc: 'Comparte un enlace y que se unan tu pareja, tus hijos o quien viva contigo.',
  },
  {
    emoji: '🤝',
    title: 'Organizadlo todo juntos',
    desc: 'Compra, tareas, nevera, calendario y planes: todo a la vez, en tiempo real.',
  },
  {
    emoji: '🎉',
    title: 'Disfruta de la casa',
    desc: 'Menos caos y más tiempo para lo que importa. Esa es la idea.',
  },
];

const THEMES: ReadonlyArray<{ shot: string; name: string; tag: string }> = [
  { shot: 'theme-base.png', name: 'Clásico', tag: 'Limpio y directo' },
  { shot: 'theme-cozy.png', name: 'Cuaderno', tag: 'Hecho a mano' },
  { shot: 'theme-cozysitcom.png', name: 'Sitcom 70s', tag: 'Cálido retro' },
  { shot: 'theme-springfield.png', name: 'Hommer', tag: 'Cómic pop' },
];

const SHOTS = '/landing/shots';

/* ─── Página ───────────────────────────────────────────────────────────────── */

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);

  useForceHommerTheme();
  useScrollReveal(rootRef);
  useParallax(rootRef);

  return (
    <div ref={rootRef} className="sf ld-root" data-testid="landing-root">
      {/* ── Barra superior pegajosa con marca + CTAs ───────────────────────── */}
      <div className="ld-topbar">
        <div className="ld-wrap flex items-center justify-between py-3 gap-3">
          <span className="sf-bangers text-2xl sm:text-3xl flex items-center gap-2">
            <Lightning className="w-4" />
            Cosas de Casa
          </span>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="sf-fredoka text-sm underline hidden sm:inline">
              Iniciar sesión
            </Link>
            <Link to="/signup" className="sf-btn sf-btn-r text-sm">
              Empieza ahora
            </Link>
          </div>
        </div>
      </div>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="sf-dot relative overflow-hidden">
        {/* Decorados flotantes con parallax. */}
        <Star
          className="ld-parallax ld-float absolute w-12 top-10 left-6 opacity-90 hidden sm:block"
          data-speed="0.18"
        />
        <Donut
          className="ld-parallax ld-float-slow absolute w-14 top-24 right-10 opacity-90 hidden sm:block"
          data-speed="0.26"
        />
        <Heart
          className="ld-parallax ld-float absolute w-10 bottom-16 left-16 opacity-80 hidden md:block"
          data-speed="0.32"
        />

        <div className="ld-wrap grid md:grid-cols-2 gap-10 items-center py-14 sm:py-20">
          <div className="ld-reveal ld-reveal-left">
            <span className="ld-badge sf-wob inline-flex items-center gap-1 -rotate-2">
              <Lightning className="w-3" /> Tu hogar, en orden
            </span>
            <h1 className="ld-display text-5xl sm:text-7xl mt-4 mb-4">
              Toda tu casa,
              <br />
              <span style={{ color: 'var(--color-error)' }}>en una sola app</span>
            </h1>
            <p className="sf-fredoka text-lg sm:text-xl max-w-md mb-7">
              La compra, las tareas, la nevera, el calendario y los planes de la
              familia. Todo en un mismo sitio, en tiempo real y para todos.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/signup" className="sf-btn text-lg">
                Empieza ahora
              </Link>
              <Link to="/login" className="sf-fredoka underline text-base">
                Ya tengo cuenta
              </Link>
            </div>
          </div>

          <div className="ld-reveal ld-reveal-pop relative">
            <span className="sf-sticker absolute -top-2 left-2 z-10 sf-wob">
              ¡Toma ya!
            </span>
            <PhoneFrame src={`${SHOTS}/sf-home.png`} alt="Pantalla de inicio de Cosas de Casa" large />
          </div>
        </div>

        <div className="sf-zig" />
      </section>

      {/* ── VÍDEO DEMO ─────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20" style={{ background: 'var(--color-info)' }}>
        <div className="ld-wrap text-center">
          <h2 className="ld-display text-4xl sm:text-6xl mb-3 ld-reveal">
            Mira cómo funciona
          </h2>
          <p className="sf-fredoka text-lg mb-10 ld-reveal">
            30 segundos para ver de qué va. Dale al play.
          </p>
          <div className="ld-reveal ld-reveal-pop relative inline-block">
            <span className="sf-sticker absolute -top-3 -right-3 z-10 sf-wob">▶ Demo</span>
            <div className="ld-video-frame">
              {/* El vídeo demo es apaisado (1920×1080) y YA lleva su propio móvil
                  dentro: va en un marco 16:9, no en un marco de móvil vertical. */}
              <video
                src="/landing/demo.mp4"
                autoPlay
                loop
                muted
                playsInline
                controls
                aria-label="Vídeo demostración de Cosas de Casa"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ──────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 sf-dot">
        <div className="ld-wrap">
          <div className="text-center mb-12 ld-reveal">
            <span className="ld-badge -rotate-1">Así de fácil</span>
            <h2 className="ld-display text-4xl sm:text-6xl mt-3">Empieza en 4 pasos</h2>
          </div>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="sf-card ld-pop-hover ld-reveal p-5 flex flex-col gap-3"
                style={{ ['--ld-i' as string]: String(i) }}
              >
                <div className="flex items-center gap-3">
                  <span className="ld-step-num">{i + 1}</span>
                  <span className="text-3xl" aria-hidden="true">
                    {step.emoji}
                  </span>
                </div>
                <h3 className="sf-bangers text-2xl">{step.title}</h3>
                <p className="sf-fredoka text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {step.desc}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── FEATURES (rejilla con capturas reales) ─────────────────────────── */}
      <section className="py-16 sm:py-20" style={{ background: 'var(--color-accent)' }}>
        <div className="ld-wrap">
          <div className="text-center mb-12 ld-reveal">
            <span className="ld-badge rotate-2">Todo lo que hace</span>
            <h2 className="ld-display text-4xl sm:text-6xl mt-3">Una app, mil cosas de casa</h2>
            <p className="sf-fredoka text-lg mt-3 max-w-2xl mx-auto">
              Cada rincón de tu hogar tiene su sitio. Y todo se sincroniza solo,
              para toda la familia.
            </p>
          </div>

          <div className="flex flex-col gap-6 sm:gap-8">
            {FEATURES.map((feat, i) => (
              <FeatureRow key={feat.shot} feat={feat} i={i} />
            ))}
          </div>

          {/* Lo social: peñas y familias amigas. */}
          <div className="sf-card-s ld-reveal ld-pop-hover mt-8 p-6 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <span className="text-5xl" aria-hidden="true">
              🎈
            </span>
            <div>
              <h3 className="sf-bangers text-2xl">Peñas y familias amigas</h3>
              <p className="sf-fredoka text-sm mt-1">
                Conecta con otras familias, montad una peña y organizad planes
                juntos. La casa no acaba en tu puerta.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── THEMES ─────────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 sf-dot">
        <div className="ld-wrap">
          <div className="text-center mb-12 ld-reveal">
            <span className="ld-badge -rotate-2">A tu gusto</span>
            <h2 className="ld-display text-4xl sm:text-6xl mt-3">Elige tu estilo</h2>
            <p className="sf-fredoka text-lg mt-3">
              La misma app, cuatro personalidades. Cámbiala cuando te apetezca.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {THEMES.map((theme, i) => (
              <figure
                key={theme.shot}
                className="ld-reveal flex flex-col items-center gap-3"
                style={{ ['--ld-i' as string]: String(i) }}
              >
                <PhoneFrame src={`${SHOTS}/${theme.shot}`} alt={`Theme ${theme.name}`} />
                <figcaption className="text-center">
                  <span className="sf-bangers text-2xl block">{theme.name}</span>
                  <span className="sf-tag mt-1 inline-block">{theme.tag}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── PWA / OFFLINE ──────────────────────────────────────────────────── */}
      <section className="py-14" style={{ background: 'var(--color-info)' }}>
        <div className="ld-wrap">
          <div className="sf-card-y ld-reveal ld-pop-hover p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <span className="text-6xl ld-float" aria-hidden="true">
              📲
            </span>
            <div>
              <h2 className="sf-bangers text-3xl sm:text-4xl">Funciona sin conexión</h2>
              <p className="sf-fredoka text-base sm:text-lg mt-2">
                Instálala como app en tu móvil y úsala aunque te quedes sin
                cobertura. Cuando vuelves, se sincroniza todo solo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ──────────────────────────────────────────────────────── */}
      <section className="py-20 sf-dot text-center relative overflow-hidden">
        <Lightning className="ld-parallax ld-float absolute w-16 top-8 left-10 hidden sm:block" data-speed="0.2" />
        <Star className="ld-parallax ld-float-slow absolute w-12 bottom-10 right-12 hidden sm:block" data-speed="0.28" />
        <div className="ld-wrap">
          <div className="ld-reveal ld-reveal-pop sf-card-y inline-block max-w-2xl p-8 sm:p-12">
            <h2 className="ld-display text-4xl sm:text-6xl mb-4">
              Pon tu casa en orden hoy
            </h2>
            <p className="sf-fredoka text-lg mb-8">
              Date de alta, invita a los tuyos y empieza a organizarlo todo
              juntos. Tu hogar te lo va a agradecer.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/signup" className="sf-btn sf-btn-r text-xl">
                Empieza ahora
              </Link>
              <Link to="/login" className="sf-fredoka underline text-base">
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer style={{ background: 'var(--color-border)', color: 'var(--color-text-inverse)' }}>
        <div className="ld-wrap py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="sf-bangers text-2xl flex items-center gap-2">
            <Lightning className="w-4" />
            Cosas de Casa
          </span>
          <div className="sf-fredoka text-sm flex items-center gap-4">
            <Link to="/login" className="underline">
              Iniciar sesión
            </Link>
            <Link to="/signup" className="underline">
              Crear cuenta
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
