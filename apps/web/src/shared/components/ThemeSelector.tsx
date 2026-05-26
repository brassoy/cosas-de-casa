import { useState, useEffect, useRef } from 'react';
import { setAesthetic, setMode, getTheme } from '../theme/theme-bootstrap';
import type { Aesthetic, Mode } from '../theme/theme-bootstrap';

// ── Metadata de estéticas ─────────────────────────────────────────────────────

const AESTHETICS: { value: Aesthetic; label: string; emoji: string; description: string }[] = [
  {
    value: 'ios',
    label: 'Moderno',
    emoji: '◉',
    description: 'Limpio, redondeado, estilo iOS',
  },
  {
    value: 'pixel',
    label: 'Pixel',
    emoji: '▪',
    description: 'Retro 8-bit, monospace, cuadrado',
  },
  {
    value: 'okuda',
    label: 'Okuda',
    emoji: '◆',
    description: 'Pop-art geométrico, colores vivos',
  },
];

// ── Componente ────────────────────────────────────────────────────────────────

export function ThemeSelector() {
  const [open, setOpen] = useState(false);
  // Inicializar desde el DOM directamente (no useEffect para evitar re-render en cascada)
  const [aesthetic, setLocalAesthetic] = useState<Aesthetic>(() => getTheme().aesthetic);
  const [mode, setLocalMode] = useState<Mode>(() => getTheme().mode);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Cerrar con Escape o clic fuera
  useEffect(() => {
    if (!open) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    }

    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open]);

  function handleAesthetic(a: Aesthetic) {
    setAesthetic(a);
    setLocalAesthetic(a);
  }

  function handleMode(m: Mode) {
    setMode(m);
    setLocalMode(m);
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Cambiar tema"
        aria-expanded={open}
        aria-haspopup="dialog"
        style={btnStyle}
      >
        {mode === 'dark' ? '◑' : '○'}&nbsp;Tema
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Selector de tema"
          style={panelStyle}
        >
          {/* Modo claro / oscuro */}
          <p style={sectionLabelStyle}>Modo</p>
          <div style={toggleRowStyle}>
            <button
              type="button"
              onClick={() => handleMode('light')}
              aria-pressed={mode === 'light'}
              style={{
                ...modeTabStyle,
                ...(mode === 'light' ? modeTabActiveStyle : {}),
              }}
            >
              ○ Claro
            </button>
            <button
              type="button"
              onClick={() => handleMode('dark')}
              aria-pressed={mode === 'dark'}
              style={{
                ...modeTabStyle,
                ...(mode === 'dark' ? modeTabActiveStyle : {}),
              }}
            >
              ◑ Oscuro
            </button>
          </div>

          {/* Estéticas */}
          <p style={{ ...sectionLabelStyle, marginTop: '12px' }}>Estética</p>
          <div style={aestheticListStyle}>
            {AESTHETICS.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => handleAesthetic(a.value)}
                aria-pressed={aesthetic === a.value}
                style={{
                  ...aestheticBtnStyle,
                  ...(aesthetic === a.value ? aestheticBtnActiveStyle : {}),
                }}
              >
                <span style={aestheticEmojiStyle}>{a.emoji}</span>
                <span>
                  <strong style={{ display: 'block', fontSize: '0.875rem' }}>{a.label}</strong>
                  <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{a.description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────────

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-2) var(--space-3)',
  cursor: 'pointer',
  color: 'var(--color-text-muted)',
  fontSize: 'var(--font-size-sm)',
  fontFamily: 'var(--font-body)',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  transition: 'var(--transition-fast)',
};

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 8px)',
  right: 0,
  zIndex: 'var(--z-dropdown)' as React.CSSProperties['zIndex'],
  backgroundColor: 'var(--color-surface-raised)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  padding: '16px',
  minWidth: '220px',
  boxShadow: 'var(--shadow-lg)',
  fontFamily: 'var(--font-body)',
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '0.6875rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--color-text-muted)',
  marginBottom: '8px',
};

const toggleRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '6px',
};

const modeTabStyle: React.CSSProperties = {
  flex: 1,
  padding: '6px 0',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'none',
  cursor: 'pointer',
  color: 'var(--color-text-muted)',
  fontSize: '0.8125rem',
  fontFamily: 'var(--font-body)',
  transition: 'var(--transition-fast)',
};

const modeTabActiveStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-accent)',
  borderColor: 'var(--color-accent)',
  color: 'var(--color-text-inverse)',
  fontWeight: 600,
};

const aestheticListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const aestheticBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 10px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'none',
  cursor: 'pointer',
  color: 'var(--color-text)',
  textAlign: 'left',
  fontFamily: 'var(--font-body)',
  transition: 'var(--transition-fast)',
  width: '100%',
};

const aestheticBtnActiveStyle: React.CSSProperties = {
  borderColor: 'var(--color-accent)',
  backgroundColor: 'var(--color-accent-subtle)',
  color: 'var(--color-text)',
};

const aestheticEmojiStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  lineHeight: 1,
  color: 'var(--color-accent)',
  flexShrink: 0,
};
