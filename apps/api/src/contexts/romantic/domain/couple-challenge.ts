export interface CoupleChallengeProps {
  id: string;
  coupleId: string;
  challengeKey: string;
  done: boolean;
  doneAt: Date | null;
}

/** Entidad de estado de un reto para una pareja específica. */
export class CoupleChallenge {
  readonly id: string;
  readonly coupleId: string;
  readonly challengeKey: string;
  private _done: boolean;
  private _doneAt: Date | null;

  constructor(props: CoupleChallengeProps) {
    this.id = props.id;
    this.coupleId = props.coupleId;
    this.challengeKey = props.challengeKey;
    this._done = props.done;
    this._doneAt = props.doneAt;
  }

  get done(): boolean { return this._done; }
  get doneAt(): Date | null { return this._doneAt; }

  static create(params: { id: string; coupleId: string; challengeKey: string }): CoupleChallenge {
    return new CoupleChallenge({
      id: params.id,
      coupleId: params.coupleId,
      challengeKey: params.challengeKey,
      done: false,
      doneAt: null,
    });
  }

  markDone(now: Date): void {
    this._done = true;
    this._doneAt = now;
  }
}
