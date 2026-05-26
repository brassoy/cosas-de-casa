import { CoupleNoteBodyEmptyError } from './romantic.errors';

export interface CoupleNoteProps {
  id: string;
  coupleId: string;
  authorId: string;
  body: string;
  createdAt: Date;
}

/** Entidad de nota de pareja (mensaje corto entre los dos miembros). */
export class CoupleNote {
  readonly id: string;
  readonly coupleId: string;
  readonly authorId: string;
  readonly body: string;
  readonly createdAt: Date;

  constructor(props: CoupleNoteProps) {
    this.id = props.id;
    this.coupleId = props.coupleId;
    this.authorId = props.authorId;
    this.body = props.body;
    this.createdAt = props.createdAt;
  }

  static create(params: { id: string; coupleId: string; authorId: string; body: string; now: Date }): CoupleNote {
    const trimmed = params.body.trim();
    if (!trimmed) throw new CoupleNoteBodyEmptyError();
    return new CoupleNote({
      id: params.id,
      coupleId: params.coupleId,
      authorId: params.authorId,
      body: trimmed,
      createdAt: params.now,
    });
  }
}
