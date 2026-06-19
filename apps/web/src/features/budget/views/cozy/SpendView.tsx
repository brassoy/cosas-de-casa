/**
 * SpendView — vista presentacional `cozy` (cuaderno manuscrito) del resumen de
 * gasto.
 *
 * Misma funcionalidad y mismo contrato (`SpendViewProps`) que la vista base:
 * total registrado, barras por categoría y barras (verticales) por mes. Solo
 * cambia la estética: cabecera manuscrita Caveat, hojas `ck-card` con cinta
 * `ck-tape`, barras coloreadas con la paleta de chinchetas del kit cozy. Barras
 * en CSS puro (sin librerías de charts).
 *
 * Presentacional puro: solo props in / callbacks out. La query del resumen vive
 * en el container. Dinero numérico, formateado con `Intl.NumberFormat('es-ES')`.
 */

import { ScreenState } from '@/shared/components/ScreenState';
import { SPEND_CATEGORY_LABELS } from '../../contracts';
import type { SpendCategory } from '../../contracts';
import type { SpendViewProps } from '../types';

const fmtEUR = (n: number, currency = 'EUR') => {
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(n);
  } catch {
    return `${n} ${currency}`;
  }
};

function formatMonth(ym: string): string {
  const [year, month] = ym.split('-');
  if (!year || !month) return ym;
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

function shortMonth(ym: string): string {
  const [year, month] = ym.split('-');
  if (!year || !month) return ym;
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('es-ES', { month: 'short' });
}

/** Paleta de chinchetas (rotación por índice). Tomada del kit estático cozy. */
const PINS = ['#c0392b', '#2d4a8a', '#5b8a3a', '#e3a51a', '#8e44ad'] as const;

/** Color por categoría (matices del kit cozy, sin var semántica de barra). */
const CATEGORY_COLORS: Record<SpendCategory, string> = {
  groceries: '#5b8a3a',
  household: '#2d4a8a',
  dining_out: '#e3a51a',
  leisure: '#8e44ad',
  other: '#c0392b',
};

interface CatBarProps {
  label: string;
  amount: number;
  currency: string;
  pct: number; // 0–100
  color: string;
}

function CatBar({ label, amount, currency, pct, color }: CatBarProps) {
  return (
    <li className="space-y-1">
      <div className="flex items-baseline justify-between text-base">
        <span className="capitalize">{label}</span>
        <span className="ck-marker text-lg">{fmtEUR(amount, currency)}</span>
      </div>
      <div
        className="h-3 overflow-hidden rounded-full"
        style={{ background: '#e8d9b8' }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </li>
  );
}

export default function SpendView(props: SpendViewProps) {
  const { summary, isLoading, error, onBack } = props;

  const maxCat = Math.max(1, ...summary.byCategory.map((c) => c.total));
  const maxMon = Math.max(1, ...summary.byMonth.map((m) => m.total));
  const noData = summary.byCategory.length === 0 && summary.byMonth.length === 0;

  return (
    <div className="ck ck-page min-h-[80dvh] space-y-4 px-5 py-8">
      {/* ── Cabecera manuscrita ── */}
      <header className="text-center relative mb-2">
        <button
          type="button"
          onClick={onBack}
          className="ck-marker text-xl text-accent absolute left-0 top-1"
        >
          ← volver
        </button>
        <p className="ck-marker text-base opacity-70">— diario de la casa —</p>
        <h1 className="ck-marker text-5xl leading-none mt-1 text-accent">gasto</h1>
        <p className="text-base mt-1 opacity-80">por categoría y mes</p>
      </header>

      <ScreenState isLoading={isLoading} error={error}>
        {/* ── Total ── */}
        <div className="ck-card p-4 text-center">
          <span className="ck-tape" aria-hidden="true" />
          <p className="ck-marker text-xl opacity-70">total registrado</p>
          <p className="ck-marker text-5xl text-error">
            {fmtEUR(summary.total, summary.currency)}
          </p>
        </div>

        {/* ── Por categoría ── */}
        {summary.byCategory.length > 0 && (
          <section className="space-y-2 mt-4">
            <h2 className="ck-marker text-2xl text-accent">por categoría</h2>
            <div className="ck-card p-4">
              <ul className="space-y-3 list-none p-0 m-0">
                {summary.byCategory.map((c) => (
                  <CatBar
                    key={c.category}
                    label={SPEND_CATEGORY_LABELS[c.category]}
                    amount={c.total}
                    currency={summary.currency}
                    pct={Math.round((c.total / maxCat) * 100)}
                    color={CATEGORY_COLORS[c.category]}
                  />
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ── Por mes (barras verticales) ── */}
        {summary.byMonth.length > 0 && (
          <section className="space-y-2 mt-4">
            <h2 className="ck-marker text-2xl text-accent">por mes</h2>
            <div className="ck-card p-4">
              <ul
                className="flex items-end gap-3 h-40 list-none p-0 m-0"
                aria-label="Gasto por mes"
              >
                {summary.byMonth.map((m, i) => {
                  const pct = Math.round((m.total / maxMon) * 100);
                  return (
                    <li
                      key={m.month}
                      className="flex-1 flex flex-col items-center gap-1 h-full justify-end"
                    >
                      <span className="ck-marker text-base">
                        {fmtEUR(m.total, summary.currency)}
                      </span>
                      <div
                        className="w-full rounded-t"
                        style={{ height: `${pct}%`, background: PINS[i % PINS.length]! }}
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={formatMonth(m.month)}
                      />
                      <span className="text-xs opacity-70">{shortMonth(m.month)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        )}

        {noData && (
          <p className="text-base opacity-70 mt-4">
            Aún no hay datos de gasto. Añade tickets para ver el resumen.
          </p>
        )}
      </ScreenState>
    </div>
  );
}
