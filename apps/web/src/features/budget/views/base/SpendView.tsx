/**
 * SpendView — vista presentacional `base` (shadcn) del resumen de gasto.
 *
 * Porta el JSX del componente base del kit (Lovable `SpendPage`) a las
 * primitivas shadcn de `@/shared/ui/*`, reconciliando los tipos con
 * `SpendSummaryDto` real. Muestra el total, barras por categoría (con color por
 * categoría) y barras por mes. Barras en CSS puro (sin librerías de charts).
 *
 * Presentacional puro: solo props in / callbacks out. La query del resumen vive
 * en el container. Dinero numérico, formateado con `Intl.NumberFormat('es-ES')`.
 */

import { Card } from '@/shared/ui/card';
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

/** Color por categoría (clases de utilidad sobre tokens semánticos). */
const CATEGORY_COLORS: Record<SpendCategory, string> = {
  groceries: 'bg-success',
  household: 'bg-info',
  dining_out: 'bg-warning',
  leisure: 'bg-primary',
  other: 'bg-muted-foreground',
};

interface BarProps {
  label: string;
  amount: number;
  currency: string;
  pct: number; // 0–100
  colorClass?: string;
}

function Bar({ label, amount, currency, pct, colorClass = 'bg-primary' }: BarProps) {
  return (
    <li className="space-y-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="capitalize">{label}</span>
        <span className="font-medium">{fmtEUR(amount, currency)}</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
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
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="flex items-center gap-4">
        <button type="button" onClick={onBack} className="text-sm text-muted-foreground">
          ‹ Tickets
        </button>
        <h1 className="text-2xl font-bold">Resumen de gasto</h1>
      </div>

      <ScreenState isLoading={isLoading} error={error}>
        {/* ── Total ── */}
        <Card className="p-5 text-center">
          <p className="text-sm text-muted-foreground">Total registrado</p>
          <p className="text-3xl font-bold">{fmtEUR(summary.total, summary.currency)}</p>
        </Card>

        {/* ── Por categoría ── */}
        {summary.byCategory.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-semibold">Por categoría</h2>
            <ul className="space-y-2 list-none p-0 m-0">
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
          </section>
        )}

        {/* ── Por mes ── */}
        {summary.byMonth.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-semibold">Por mes</h2>
            <ul className="space-y-2 list-none p-0 m-0">
              {summary.byMonth.map((m) => (
                <Bar
                  key={m.month}
                  label={formatMonth(m.month)}
                  amount={m.total}
                  currency={summary.currency}
                  pct={Math.round((m.total / maxMon) * 100)}
                />
              ))}
            </ul>
          </section>
        )}

        {noData && (
          <p className="text-sm text-muted-foreground">
            Aún no hay datos de gasto. Añade tickets para ver el resumen.
          </p>
        )}
      </ScreenState>
    </div>
  );
}
