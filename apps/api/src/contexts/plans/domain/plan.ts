export type PlanStatus = 'proposed' | 'confirmed' | 'cancelled';
export type PlanRsvpStatus = 'going' | 'maybe' | 'declined';

export interface PlaceData {
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
}

export interface PlanParticipant {
  userId: string;
  status: PlanRsvpStatus;
}

export interface PlanProps {
  id: string;
  ownerFamilyId: string;
  title: string;
  description: string | null;
  place: PlaceData | null;
  scheduledAt: Date | null;
  status: PlanStatus;
  createdBy: string;
  participants: PlanParticipant[];
  sharedWithFamilyIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlanParams {
  id: string;
  ownerFamilyId: string;
  title: string;
  description?: string | null;
  place?: PlaceData | null;
  scheduledAt?: Date | null;
  createdBy: string;
  now: Date;
}

export interface UpdatePlanParams {
  title?: string;
  description?: string | null;
  place?: PlaceData | null;
  scheduledAt?: Date | null;
  status?: PlanStatus;
  now: Date;
}

/**
 * Entidad: plan de actividad de una familia.
 */
export class Plan {
  readonly id: string;
  readonly ownerFamilyId: string;
  private _title: string;
  private _description: string | null;
  private _place: PlaceData | null;
  private _scheduledAt: Date | null;
  private _status: PlanStatus;
  readonly createdBy: string;
  private _participants: PlanParticipant[];
  private _sharedWithFamilyIds: string[];
  readonly createdAt: Date;
  private _updatedAt: Date;

  constructor(props: PlanProps) {
    this.id = props.id;
    this.ownerFamilyId = props.ownerFamilyId;
    this._title = props.title;
    this._description = props.description;
    this._place = props.place;
    this._scheduledAt = props.scheduledAt;
    this._status = props.status;
    this.createdBy = props.createdBy;
    this._participants = [...props.participants];
    this._sharedWithFamilyIds = [...props.sharedWithFamilyIds];
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(params: CreatePlanParams): Plan {
    return new Plan({
      id: params.id,
      ownerFamilyId: params.ownerFamilyId,
      title: params.title,
      description: params.description ?? null,
      place: params.place ?? null,
      scheduledAt: params.scheduledAt ?? null,
      status: 'proposed',
      createdBy: params.createdBy,
      participants: [{ userId: params.createdBy, status: 'going' }],
      sharedWithFamilyIds: [],
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  get title(): string { return this._title; }
  get description(): string | null { return this._description; }
  get place(): PlaceData | null { return this._place; }
  get scheduledAt(): Date | null { return this._scheduledAt; }
  get status(): PlanStatus { return this._status; }
  get participants(): readonly PlanParticipant[] { return this._participants; }
  get sharedWithFamilyIds(): readonly string[] { return this._sharedWithFamilyIds; }
  get updatedAt(): Date { return this._updatedAt; }

  update(params: UpdatePlanParams): void {
    if (params.title !== undefined) this._title = params.title;
    if ('description' in params) this._description = params.description ?? null;
    if ('place' in params) this._place = params.place ?? null;
    if ('scheduledAt' in params) this._scheduledAt = params.scheduledAt ?? null;
    if (params.status !== undefined) this._status = params.status;
    this._updatedAt = params.now;
  }

  setRsvp(userId: string, status: PlanRsvpStatus, now: Date): void {
    const existing = this._participants.find((p) => p.userId === userId);
    if (existing) {
      existing.status = status;
    } else {
      this._participants.push({ userId, status });
    }
    this._updatedAt = now;
  }

  addShare(familyId: string, now: Date): void {
    if (!this._sharedWithFamilyIds.includes(familyId)) {
      this._sharedWithFamilyIds.push(familyId);
      this._updatedAt = now;
    }
  }

  /** Devuelve true si la familia tiene acceso al plan (owner o shared). */
  isAccessibleByFamily(familyId: string): boolean {
    return this.ownerFamilyId === familyId || this._sharedWithFamilyIds.includes(familyId);
  }

  participantCount(): number {
    return this._participants.length;
  }
}
