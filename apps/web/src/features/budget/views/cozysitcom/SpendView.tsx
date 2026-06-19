/**
 * SpendView — vista presentacional `cozysitcom` (sitcom 70s) del resumen de
 * gasto.
 *
 * Misma funcionalidad y mismo contrato (`SpendViewProps`) que la vista base:
 * total registrado, reparto por categoría (barras horizontales con color por
 * categoría) y gasto por mes. Solo cambia la estética: cabecera de madera, cinta
 * mostaza, marcos `cz-frame` y un gráfico de barras verticales por mes (como la
 * maqueta del kit). Barras en CSS puro (sin librerías de charts).
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
  leisure: 'bg-accent',
  other: 'bg-text-muted',
};

interface BarProps {
  label: string;
  amount: number;
  currency: string;
  pct: number; // 0–100
  colorClass?: string;
}

function Bar({ label, amount, currency, pct, colorClass = 'bg-accent' }: BarProps) {
  return (
    <li className="space-y-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="cz-serif capitalize">{label}</span>
        <span className="font-bold">{fmtEUR(amount, currency)}</span>
      </div>
      <div
        className="h-3 overflow-hidden rounded-full bg-border"
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
    <div className="cz space-y-4 px-5">
      {/* ── Cabecera tipo cintillo de sitcom ── */}
      <header className="cz-pop">
        <button type="button" onClick={onBack} className="mb-2 text-xs font-bold opacity-70">
          ← Tickets
        </button>
        <div className="cz-wood inline-block mb-2">
          <p className="cz-serif text-base">Reparto del mes</p>
        </div>
        <h1 className="cz-serif text-4xl leading-none">Gasto</h1>
        <div className="cz-stripe mt-3" />
      </header>

      <ScreenState isLoading={isLoading} error={error}>
        {/* ── Total (placa denim) ── */}
        <div className="cz-frame cz-pop bg-accent text-center text-text-inverse">
          <p className="text-xs uppercase opacity-70">Total registrado</p>
          <p className="cz-serif mt-1 text-5xl">{fmtEUR(summary.total, summary.currency)}</p>
        </div>

        {/* ── Por categoría ── */}
        {summary.byCategory.length > 0 && (
          <section className="space-y-3">
            <h2 className="cz-serif text-xl">Por categoría</h2>
            <div className="cz-frame">
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
            <h2 className="cz-serif text-xl">Por mes</h2>
            <div className="cz-frame flex h-44 items-end gap-3">
              {summary.byMonth.map((m) => {
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
                      className="w-full rounded-t-md bg-warning"
                      style={{ height: `${pct}%` }}
                    />
                    <span className="cz-serif text-xs capitalize opacity-70">
                      {shortMonth(m.month)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {noData && (
          <p className="text-sm opacity-70">
            Aún no hay datos de gasto. Añade tickets para ver el resumen.
          </p>
        )}
      </ScreenState>
    </div>
  );
}
