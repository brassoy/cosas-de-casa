/**
 * RoutineStatsPage — CONTAINER de las estadísticas globales de rutinas.
 *
 * El rango from/to vive en estado local y forma parte de la query key (patrón
 * budget): cambiarlo refetchea las estadísticas agregadas de la API.
 */

import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useFamilyStore } from '@/features/family/store/family.store';
import { ThemeView } from '@/shared/theme/ThemeView';
import { addDaysYMD } from '../types';
import { useRoutineStats } from '../hooks/useRoutines';
import type { RoutineStatsViewProps } from '../views/types';

export function RoutineStatsPage() {
  const { familyId } = useParams({ strict: false }) as { familyId?: string };
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const resolvedFamilyId = familyId ?? activeFamily?.id;
  const navigate = useNavigate();

  // Rango por defecto: últimos 90 días.
  const todayYMD = new Date().toLocaleDateString('sv-SE');
  const [from, setFrom] = useState(addDaysYMD(todayYMD, -90));
  const [to, setTo] = useState(todayYMD);

  const { data: stats = null, isLoading, error } = useRoutineStats(
    resolvedFamilyId,
    from,
    to,
  );

  const props: RoutineStatsViewProps = {
    stats,
    isLoading,
    error: error ? 'No se han podido cargar las estadísticas.' : null,
    from,
    to,
    onChangeRange: (nextFrom, nextTo) => {
      setFrom(nextFrom);
      setTo(nextTo);
    },
    onBack: () =>
      void navigate({
        to: '/family/$familyId/routines',
        params: { familyId: resolvedFamilyId ?? '' },
      }),
  };

  if (!resolvedFamilyId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60dvh' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>No hay ninguna familia activa.</p>
      </div>
    );
  }

  return <ThemeView screen="routine_stats" props={props} />;
}
