import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useFamilyStore } from '@/features/family/store/family.store';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useFriendFamilies } from '@/features/friends/hooks/useFriends';
import { usePlan, useSetRsvp, useSharePlan, useDeletePlan } from '../hooks/usePlans';
import { usePlanChat, buildParticipantNames } from '../hooks/usePlanChat';
import type { PlanRsvpStatus, PlanStatus, PlanParticipantDto } from '../contracts';
import { ApiRequestError } from '@/shared/lib/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusLabel(status: PlanStatus): string {
  const labels: Record<PlanStatus, string> = {
    proposed: 'Propuesto',
    confirmed: 'Confirmado',
    cancelled: 'Cancelado',
  };
  return labels[status];
}

function rsvpLabel(status: PlanRsvpStatus): string {
  const labels: Record<PlanRsvpStatus, string> = {
    going: 'Voy',
    maybe: 'Quizá',
    declined: 'No voy',
  };
  return labels[status];
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function RsvpButtons({
  current,
  onSelect,
  disabled,
}: {
  current?: PlanRsvpStatus;
  onSelect: (status: PlanRsvpStatus) => void;
  disabled: boolean;
}) {
  const options: PlanRsvpStatus[] = ['going', 'maybe', 'declined'];

  return (
    <div style={styles.rsvpRow}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onSelect(opt)}
          disabled={disabled}
          style={{
            ...styles.rsvpBtn,
            ...(current === opt ? styles.rsvpBtnActive : {}),
          }}
        >
          {rsvpLabel(opt)}
        </button>
      ))}
    </div>
  );
}

// ── ChatThread ────────────────────────────────────────────────────────────────

function ChatThread({
  planId,
  participants,
}: {
  planId: string;
  participants: PlanParticipantDto[];
}) {
  const user = useAuthStore((s) => s.user);
  const participantNames = buildParticipantNames(participants);
  const { messages, isLoading, sendMessage } = usePlanChat(planId, { participantNames });
  const [body, setBody] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final cuando llegan mensajes nuevos
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || sendMessage.isPending) return;

    setBody('');
    sendMessage.mutate({ body: trimmed });
  }

  return (
    <div style={styles.chatContainer}>
      <h3 style={styles.sectionTitle}>Chat del plan</h3>

      <div style={styles.messageList} aria-live="polite" aria-label="Hilo de mensajes del plan">
        {isLoading && <p style={styles.muted}>Cargando mensajes...</p>}

        {messages.length === 0 && !isLoading && (
          <p style={styles.muted}>Aún no hay mensajes. ¡Sé el primero en escribir!</p>
        )}

        {messages.map((msg) => {
          const isOwn = msg.userId === user?.id;
          return (
            <div
              key={msg.id}
              style={{
                ...styles.messageBubble,
                ...(isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther),
              }}
            >
              {!isOwn && <p style={styles.messageSender}>{msg.displayName}</p>}
              <p style={styles.messageBody}>{msg.body}</p>
              <p style={styles.messageTime}>
                {new Date(msg.createdAt).toLocaleTimeString('es-ES', { timeStyle: 'short' })}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} style={styles.composerForm}>
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escribe un mensaje..."
          style={styles.composerInput}
          disabled={sendMessage.isPending}
        />
        <button
          type="submit"
          style={styles.composerSend}
          disabled={sendMessage.isPending || !body.trim()}
        >
          Enviar
        </button>
      </form>
    </div>
  );
}

// ── PlanDetailPage ────────────────────────────────────────────────────────────

export function PlanDetailPage() {
  const navigate = useNavigate();
  const { planId } = useParams({ from: '/plans/$planId' });
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const user = useAuthStore((s) => s.user);

  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareFamilyId, setShareFamilyId] = useState('');

  const { data: plan, isLoading, error } = usePlan(planId);
  const { data: friendFamilies } = useFriendFamilies(activeFamily?.id);

  const setRsvp = useSetRsvp(planId);
  const sharePlan = useSharePlan(planId);
  const deletePlan = useDeletePlan(activeFamily?.id);

  const myParticipation = plan?.participants.find((p) => p.userId === user?.id);
  const isOwner = plan?.createdBy === user?.id;

  function handleRsvp(status: PlanRsvpStatus) {
    setRsvpError(null);
    setRsvp.mutate(
      { status },
      {
        onError: (err) => {
          const msg =
            err instanceof ApiRequestError
              ? err.body.message
              : 'No se ha podido guardar tu respuesta. Inténtalo de nuevo.';
          setRsvpError(msg);
        },
      },
    );
  }

  function handleShare() {
    if (!shareFamilyId) return;
    setShareError(null);
    sharePlan.mutate(
      { familyId: shareFamilyId },
      {
        onSuccess: () => setShareFamilyId(''),
        onError: (err) => {
          const msg =
            err instanceof ApiRequestError
              ? err.body.message
              : 'No se ha podido compartir el plan. Inténtalo de nuevo.';
          setShareError(msg);
        },
      },
    );
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleteError(null);
    deletePlan.mutate(planId, {
      onSuccess: () => {
        void navigate({ to: '/plans' });
      },
      onError: (err) => {
        setConfirmDelete(false);
        const msg =
          err instanceof ApiRequestError
            ? err.body.message
            : 'No se ha podido eliminar el plan.';
        setDeleteError(msg);
      },
    });
  }

  if (!planId) {
    return (
      <div style={styles.center}>
        <p style={{ color: 'var(--color-text-muted)' }}>Plan no encontrado.</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.pageHeader}>
        <button
          type="button"
          onClick={() => void navigate({ to: '/plans' })}
          style={styles.backBtn}
          aria-label="Volver a planes"
        >
          ← Planes
        </button>

        {isLoading && <p style={styles.muted}>Cargando plan...</p>}
        {error && (
          <p role="alert" style={styles.error}>
            No se ha podido cargar el plan.
          </p>
        )}

        {plan && (
          <>
            <div style={styles.planTitleRow}>
              <h2 style={styles.planTitle}>{plan.title}</h2>
              <span style={styles.planStatusBadge}>{statusLabel(plan.status)}</span>
            </div>

            {plan.description && <p style={styles.planDescription}>{plan.description}</p>}

            <div style={styles.metaList}>
              {plan.scheduledAt && (
                <p style={styles.metaItem}>
                  📅{' '}
                  {new Date(plan.scheduledAt).toLocaleDateString('es-ES', { dateStyle: 'long' })}{' '}
                  {new Date(plan.scheduledAt).toLocaleTimeString('es-ES', { timeStyle: 'short' })}
                </p>
              )}
              {plan.place && (
                <p style={styles.metaItem}>
                  📍 {plan.place.name}
                  {plan.place.address ? ` — ${plan.place.address}` : ''}
                  {/* TODO(maps): aquí iría el mapa embebido de Google Maps */}
                </p>
              )}
              <p style={styles.metaItem}>
                👥 {plan.participants.length}{' '}
                {plan.participants.length === 1 ? 'participante' : 'participantes'}
              </p>
            </div>
          </>
        )}
      </header>

      {plan && (
        <>
          {/* RSVP */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Tu respuesta</h3>
            <RsvpButtons
              current={myParticipation?.status}
              onSelect={handleRsvp}
              disabled={setRsvp.isPending}
            />
            {rsvpError && (
              <p role="alert" style={styles.error}>
                {rsvpError}
              </p>
            )}
          </section>

          {/* Participantes */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Participantes</h3>
            <ul style={styles.participantList}>
              {plan.participants.map((p) => (
                <li key={p.userId} style={styles.participantRow}>
                  <span style={styles.participantName}>{p.displayName}</span>
                  <span style={styles.participantStatus}>{rsvpLabel(p.status)}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Compartir con familia amiga */}
          {isOwner && friendFamilies && friendFamilies.length > 0 && (
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>Compartir con familia amiga</h3>
              <div style={styles.shareRow}>
                <select
                  value={shareFamilyId}
                  onChange={(e) => setShareFamilyId(e.target.value)}
                  style={styles.select}
                  aria-label="Selecciona una familia amiga"
                >
                  <option value="">Selecciona una familia...</option>
                  {friendFamilies
                    .filter((f) => !plan.sharedWithFamilyIds.includes(f.familyId))
                    .map((f) => (
                      <option key={f.linkId} value={f.familyId}>
                        {f.familyName}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={handleShare}
                  style={styles.btnPrimary}
                  disabled={!shareFamilyId || sharePlan.isPending}
                >
                  {sharePlan.isPending ? 'Compartiendo...' : 'Compartir'}
                </button>
              </div>
              {shareError && (
                <p role="alert" style={styles.error}>
                  {shareError}
                </p>
              )}
              {plan.sharedWithFamilyIds.length > 0 && (
                <p style={styles.muted}>
                  Ya compartido con {plan.sharedWithFamilyIds.length}{' '}
                  {plan.sharedWithFamilyIds.length === 1 ? 'familia' : 'familias'}.
                </p>
              )}
            </section>
          )}

          {/* Chat realtime */}
          <ChatThread planId={planId} participants={plan.participants} />

          {/* Borrar plan (solo owner) */}
          {isOwner && (
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>Eliminar plan</h3>
              {deleteError && (
                <p role="alert" style={styles.error}>
                  {deleteError}
                </p>
              )}
              {confirmDelete ? (
                <div style={styles.confirmRow}>
                  <p style={styles.muted}>¿Seguro que quieres eliminar este plan?</p>
                  <div style={styles.confirmActions}>
                    <button
                      type="button"
                      onClick={handleDelete}
                      style={styles.btnDanger}
                      disabled={deletePlan.isPending}
                    >
                      {deletePlan.isPending ? 'Eliminando...' : 'Confirmar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      style={styles.btnSecondary}
                      disabled={deletePlan.isPending}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={handleDelete} style={styles.btnDanger}>
                  Eliminar plan
                </button>
              )}
            </section>
          )}
        </>
      )}
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
    gap: 'var(--space-8)',
  },
  pageHeader: {
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: 'var(--space-4)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-accent)',
    fontSize: 'var(--font-size-sm)',
    padding: 0,
    textAlign: 'left',
  },
  planTitleRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 'var(--space-3)',
    flexWrap: 'wrap',
  },
  planTitle: {
    fontSize: 'var(--font-size-3xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text)',
  },
  planStatusBadge: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    padding: 'var(--space-1) var(--space-2)',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
    flexShrink: 0,
  },
  planDescription: {
    fontSize: 'var(--font-size-base)',
    color: 'var(--color-text-muted)',
    lineHeight: 1.6,
  },
  metaList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
  },
  metaItem: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  sectionTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text)',
  },
  rsvpRow: {
    display: 'flex',
    gap: 'var(--space-2)',
  },
  rsvpBtn: {
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'background-color 0.15s, color 0.15s',
  },
  rsvpBtnActive: {
    backgroundColor: 'var(--color-accent)',
    borderColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
  },
  participantList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  participantRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-3)',
    backgroundColor: 'var(--color-surface-raised)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
  },
  participantName: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text)',
  },
  participantStatus: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-muted)',
  },
  shareRow: {
    display: 'flex',
    gap: 'var(--space-3)',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  select: {
    flex: 1,
    minWidth: '180px',
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-sm)',
    outline: 'none',
  },
  btnPrimary: {
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-sm)',
    cursor: 'pointer',
  },
  btnDanger: {
    alignSelf: 'flex-start',
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-error)',
    backgroundColor: 'transparent',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
  },
  confirmRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  confirmActions: {
    display: 'flex',
    gap: 'var(--space-2)',
  },
  // Chat
  chatContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
    borderTop: '1px solid var(--color-border)',
    paddingTop: 'var(--space-6)',
  },
  messageList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
    maxHeight: '400px',
    overflowY: 'auto',
    padding: 'var(--space-2)',
    backgroundColor: 'var(--color-surface-raised)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
  },
  messageBubbleOwn: {
    alignSelf: 'flex-end',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
  },
  messageBubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
  },
  messageSender: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text-muted)',
  },
  messageBody: {
    fontSize: 'var(--font-size-sm)',
    lineHeight: 1.5,
  },
  messageTime: {
    fontSize: 'var(--font-size-xs)',
    opacity: 0.7,
    alignSelf: 'flex-end',
  },
  composerForm: {
    display: 'flex',
    gap: 'var(--space-2)',
  },
  composerInput: {
    flex: 1,
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: 'var(--font-size-base)',
    outline: 'none',
  },
  composerSend: {
    padding: 'var(--space-3) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    cursor: 'pointer',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60dvh',
  },
  muted: {
    color: 'var(--color-text-muted)',
    fontSize: 'var(--font-size-sm)',
  },
  error: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    border: '1px solid var(--color-error)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3)',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-sm)',
  },
};
