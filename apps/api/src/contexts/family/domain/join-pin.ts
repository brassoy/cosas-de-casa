import { InvalidJoinPinError } from './family.errors';

export type JoinPinStatus = 'ACTIVE' | 'CONSUMED' | 'REVOKED';

export const JoinPinStatus = {
  ACTIVE: 'ACTIVE',
  CONSUMED: 'CONSUMED',
  REVOKED: 'REVOKED',
} as const satisfies Record<string, JoinPinStatus>;

/** Validez por defecto de un PIN de invitación: 24 horas. */
export const DEFAULT_PIN_TTL_MS = 24 * 60 * 60 * 1000;

export interface JoinPinProps {
  id: string;
  familyId: string;
  codeHash: string;
  status: JoinPinStatus;
  expiresAt: Date;
  createdBy: string;
  consumedBy: string | null;
  createdAt: Date;
  consumedAt: Date | null;
}

export interface NewJoinPinParams {
  id: string;
  familyId: string;
  codeHash: string;
  createdBy: string;
  now: Date;
  ttlMs?: number;
}

/**
 * Entidad: PIN de invitación de un solo uso.
 *
 * Máquina de estados: ACTIVE → CONSUMED (al unirse) o ACTIVE → REVOKED (al
 * generar uno nuevo o revocar explícitamente). Una vez fuera de ACTIVE no
 * vuelve. La transición a CONSUMED en producción se hace de forma ATÓMICA en
 * el repositorio (UPDATE ... WHERE status='ACTIVE' RETURNING) para que dos
 * peticiones concurrentes no puedan consumir el mismo PIN; este modelo de
 * dominio centraliza las reglas para los tests unitarios y los flujos de
 * generación/revocación.
 */
export class JoinPin {
  readonly id: string;
  readonly familyId: string;
  readonly codeHash: string;
  private _status: JoinPinStatus;
  readonly expiresAt: Date;
  readonly createdBy: string;
  private _consumedBy: string | null;
  readonly createdAt: Date;
  private _consumedAt: Date | null;

  constructor(props: JoinPinProps) {
    this.id = props.id;
    this.familyId = props.familyId;
    this.codeHash = props.codeHash;
    this._status = props.status;
    this.expiresAt = props.expiresAt;
    this.createdBy = props.createdBy;
    this._consumedBy = props.consumedBy;
    this.createdAt = props.createdAt;
    this._consumedAt = props.consumedAt;
  }

  /** Emite un PIN nuevo en estado ACTIVE con caducidad `now + ttl`. */
  static issue(params: NewJoinPinParams): JoinPin {
    const ttl = params.ttlMs ?? DEFAULT_PIN_TTL_MS;
    return new JoinPin({
      id: params.id,
      familyId: params.familyId,
      codeHash: params.codeHash,
      status: JoinPinStatus.ACTIVE,
      expiresAt: new Date(params.now.getTime() + ttl),
      createdBy: params.createdBy,
      consumedBy: null,
      createdAt: params.now,
      consumedAt: null,
    });
  }

  get status(): JoinPinStatus {
    return this._status;
  }

  get consumedBy(): string | null {
    return this._consumedBy;
  }

  get consumedAt(): Date | null {
    return this._consumedAt;
  }

  isActive(): boolean {
    return this._status === JoinPinStatus.ACTIVE;
  }

  isExpired(now: Date): boolean {
    return this.expiresAt.getTime() <= now.getTime();
  }

  /** Un PIN es "canjeable" si está ACTIVE y no ha caducado. */
  isRedeemable(now: Date): boolean {
    return this.isActive() && !this.isExpired(now);
  }

  /**
   * Consume el PIN (ACTIVE → CONSUMED). Lanza {@link InvalidJoinPinError} si ya
   * no está activo o si ha caducado. Single-use: una segunda llamada falla.
   */
  consume(params: { userId: string; now: Date }): void {
    if (!this.isRedeemable(params.now)) {
      throw new InvalidJoinPinError();
    }
    this._status = JoinPinStatus.CONSUMED;
    this._consumedBy = params.userId;
    this._consumedAt = params.now;
  }

  /** Revoca el PIN (ACTIVE → REVOKED). Idempotente si ya no estaba activo. */
  revoke(): void {
    if (this._status === JoinPinStatus.ACTIVE) {
      this._status = JoinPinStatus.REVOKED;
    }
  }
}
