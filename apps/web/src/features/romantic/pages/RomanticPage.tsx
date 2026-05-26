/**
 * RomanticPage — ruta /family/$familyId/romantic
 *
 * Flujo:
 *  1. Si el usuario no tiene pareja → PairUpScreen
 *  2. Si tiene pareja → rincón con:
 *     - Pestañas: Retos | Notas
 *     - Botón "Hacer maldad" 😈
 */

import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useFamilyStore } from '@/features/family/store/family.store';
import { useFamilyMembers } from '@/features/family/hooks/useFamily';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useCouple, useSendMischief } from '../hooks/useRomantic';
import { useRomanticStore } from '../store/romantic.store';
import { PairUpScreen } from '../components/PairUpScreen';
import { ChallengesList } from '../components/ChallengesList';
import { NotesThread } from '../components/NotesThread';

export function RomanticPage() {
  const { familyId } = useParams({ strict: false }) as { familyId?: string };
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const resolvedFamilyId = familyId ?? activeFamily?.id;

  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id ?? '';

  const activeTab = useRomanticStore((s) => s.activeTab);
  const setActiveTab = useRomanticStore((s) => s.setActiveTab);

  const { data: couple, isLoading: coupleLoading, error: coupleError } = useCouple(resolvedFamilyId);
  const { data: members = [] } = useFamilyMembers(resolvedFamilyId);

  // ── Maldad ────────────────────────────────────────────────────────────────────
  const sendMischief = useSendMischief(couple?.id ?? '');
  const [mischiefFeedback, setMischiefFeedback] = useState<string | null>(null);

  function handleMischief() {
    if (!couple) return;
    setMischiefFeedback(null);
    sendMischief.mutate(undefined, {
      onSuccess: () => {
        setMischiefFeedback('¡Maldad enviada! 😈');
        // Borra el feedback tras 4 s
        setTimeout(() => setMischiefFeedback(null), 4000);
      },
      onError: () => setMischiefFeedback('Algo ha salido mal con la maldad… inténtalo de nuevo.'),
    });
  }

  // ── Guards ────────────────────────────────────────────────────────────────────

  if (!resolvedFamilyId) {
    return (
      <div style={styles.center}>
        <p style={{ color: 'var(--color-text-muted)' }}>No hay ninguna familia activa.</p>
      </div>
    );
  }

  if (coupleLoading) {
    return (
      <div style={styles.center}>
        <p style={{ color: 'var(--color-text-muted)' }}>Cargando tu rincón…</p>
      </div>
    );
  }

  if (coupleError) {
    return (
      <div style={styles.center}>
        <p role="alert" style={styles.errorBanner}>
          No se ha podido cargar la información de pareja.
        </p>
      </div>
    );
  }

  // Sin pareja → pantalla de emparejamiento
  // couple === null: 404 del backend (sin pareja)
  // couple === undefined: aún cargando (ya lo capturamos arriba con coupleLoading)
  if (!couple) {
    return (
      <PairUpScreen
        familyId={resolvedFamilyId}
        currentUserId={currentUserId}
        members={members}
      />
    );
  }

  // ── Rincón de pareja ──────────────────────────────────────────────────────────

  return (
    <div style={styles.page}>
      {/* ── Cabecera ── */}
      <header style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>💕 Rincón de pareja</h1>

        {/* Botón Hacer maldad */}
        <button
          type="button"
          onClick={handleMischief}
          disabled={sendMischief.isPending}
          style={{
            ...styles.mischiefBtn,
            ...(sendMischief.isPending ? styles.mischiefBtnPending : {}),
          }}
          aria-label="Hacer maldad a tu pareja"
        >
          😈 Hacer maldad
        </button>
      </header>

      {/* Feedback de maldad */}
      {mischiefFeedback && (
        <div
          role="status"
          aria-live="polite"
          style={styles.mischiefFeedback}
        >
          <span style={styles.mischiefFeedbackEmoji}>✨</span>
          {mischiefFeedback}
        </div>
      )}

      {/* ── Pestañas ── */}
      <div style={styles.tabs} role="tablist" aria-label="Secciones del rincón de pareja">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'challenges'}
          id="tab-challenges"
          aria-controls="panel-challenges"
          onClick={() => setActiveTab('challenges')}
          style={{
            ...styles.tab,
            ...(activeTab === 'challenges' ? styles.tabActive : {}),
          }}
        >
          🎯 Retos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'notes'}
          id="tab-notes"
          aria-controls="panel-notes"
          onClick={() => setActiveTab('notes')}
          style={{
            ...styles.tab,
            ...(activeTab === 'notes' ? styles.tabActive : {}),
          }}
        >
          💌 Notas
        </button>
      </div>

      {/* ── Contenido de la pestaña activa ── */}
      <div
        role="tabpanel"
        id={activeTab === 'challenges' ? 'panel-challenges' : 'panel-notes'}
        aria-labelledby={activeTab === 'challenges' ? 'tab-challenges' : 'tab-notes'}
        style={styles.tabPanel}
      >
        {activeTab === 'challenges' && (
          <ChallengesList coupleId={couple.id} />
        )}
        {activeTab === 'notes' && (
          <NotesThread coupleId={couple.id} currentUserId={currentUserId} />
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: '640px',
    margin: '0 auto',
    padding: 'var(--space-6)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-6)',
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 'var(--space-4)',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: 'var(--space-4)',
  },
  pageTitle: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
  },
  mischiefBtn: {
    padding: 'var(--space-2) var(--space-5)',
    borderRadius: 'var(--radius-md)',
    border: '2px solid var(--color-accent)',
    backgroundColor: 'transparent',
    color: 'var(--color-accent)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  mischiefBtnPending: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  mischiefFeedback: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-3) var(--space-4)',
    backgroundColor: 'var(--color-accent-subtle)',
    border: '1px solid var(--color-accent)',
    borderRadius: 'var(--radius-card)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    animation: 'fadeIn 0.3s ease',
  },
  mischiefFeedbackEmoji: {
    fontSize: '1.2rem',
  },
  tabs: {
    display: 'flex',
    gap: 0,
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    padding: 'var(--space-3)',
    border: 'none',
    borderRight: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  tabActive: {
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    fontWeight: 'var(--font-weight-semibold)',
  },
  tabPanel: {
    minHeight: '300px',
  },
  errorBanner: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    border: '1px solid var(--color-error)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3)',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-sm)',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60dvh',
  },
};
