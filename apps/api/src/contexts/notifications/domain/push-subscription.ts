/**
 * Entidad de dominio: suscripción Web Push de un dispositivo.
 */
export class PushSubscription {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly familyId: string,
    readonly endpoint: string,
    readonly keys: { p256dh: string; auth: string },
    readonly createdAt: Date,
  ) {}
}
