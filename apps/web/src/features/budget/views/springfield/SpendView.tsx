/**
 * SpendView — vista presentacional `springfield` (cómic pop) del resumen de
 * gasto.
 *
 * Misma funcionalidad y mismo contrato (`SpendViewProps`) que la vista base:
 * total registrado, reparto por categoría (barras horizontales con color por
 * categoría) y gasto por mes (barras verticales, como la maqueta del kit). Solo
 * cambia la estética: cabecera celeste de cómic, viñetas `sf-card` con borde de
 * tinta y barras con borde grueso. Barras en CSS puro (sin librerías de charts).
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

/** Color por categoría (clases de utilidad sobre tokens semánticos). */
const CATEGORY_COLORS: Record<SpendCategory, string> = {
  groceries: 'bg-success',
  household: 'bg-info',
  dining_out: 'bg-warning',
  leisure: 'bg-primary',
  other: 'bg-text-muted',
};

/** Paleta de fondos para las barras verticales por mes (rotación por índice). */
const MONTH_BG = ['bg-accent', 'bg-info', 'bg-success', 'bg-primary'] as const;

interface BarProps {
  label: string;
  amount: number;
  currency: string;
  pct: number; // 0–100
  colorClass: string;
}

function Bar({ label, amount, currency, pct, colorClass }: BarProps) {
  return (
    <li className="space-y-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="sf-fredoka capitalize">{label}</span>
        <span className="sf-bangers text-lg">{fmtEUR(amount, currency)}</span>
      </div>
      <div
        className="h-4 overflow-hidden rounded-full border-[3px] border-border bg-surface-raised"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full ${colorClass}`} style={{ width: `${pct}%` }} />
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
    <div className="sf space-y-4">
      {/* ── Cabecera celeste de cómic ── */}
      <header className="sf-card-s p-4 relative sf-pop">
        <button type="button" onClick={onBack} className="sf-sticker" aria-label="Volver a tickets">
          ← Tickets
        </button>
        <h1 className="sf-bangers text-5xl leading-none mt-2">Gasto</h1>
        <p className="sf-fredoka text-sm mt-1">Reparto por categoría</p>
      </header>

      <ScreenState isLoading={isLoading} error={error}>
        {/* ── Total (placa amarilla) ── */}
        <div className="sf-card-y p-4 text-center sf-pop">
          <p className="sf-fredoka text-xs uppercase">Total registrado</p>
          <p className="sf-bangers text-5xl mt-1">{fmtEUR(summary.total, summary.currency)}</p>
        </div>

        {/* ── Por categoría ── */}
        {summary.byCategory.length > 0 && (
          <section className="space-y-3">
            <h2 className="sf-bangers text-2xl">Por categoría</h2>
            <div className="sf-card p-4">
              <ul className="space-y-3 list-none p-0 m-0">
                {summary.byCategory.map((c) => (
                  <Bar
                    key={c.category}
                    label={SPEND_CATEGORY_LABELS[c.category]}
                    amount={c.total}
                    currency={summary.currency}
                    pct={Math.round((c.total / maxCat) * 100)}
                    colorClass={CATEGORY_COLORS[c.category]}
                  />
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ── Por mes (barras verticales, como la maqueta) ── */}
        {summary.byMonth.length > 0 && (
          <section className="space-y-3">
            <h2 className="sf-bangers text-2xl">Por mes</h2>
            <div className="sf-card p-4 flex h-44 items-end gap-3">
              {summary.byMonth.map((m, i) => {
                const pct = Math.round((m.total / maxMon) * 100);
                return (
                  <div
                    key={m.month}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                    role="progressbar"
                    aria-label={formatMonth(m.month)}
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span className="text-xs font-bold">{fmtEUR(m.total, summary.currency)}</span>
                    <div
                      className={`w-full rounded-t-xl border-[3px] border-border ${MONTH_BG[i % MONTH_BG.length]!}`}
                      style={{ height: `${pct}%` }}
                    />
                    <span className="sf-fredoka text-xs capitalize opacity-70">
                      {shortMonth(m.month)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {noData && (
          <p className="sf-fredoka text-sm opacity-70">
            Aún no hay datos de gasto. Añade tickets para ver el resumen.
          </p>
        )}
      </ScreenState>
    </div>
  );
}
