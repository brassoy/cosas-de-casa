/**
 * Tipos de la feature de notificaciones push.
 *
 * Los contratos de entrada/salida vienen de @cosasdecasa/contracts:
 *   - PushSubscriptionInput  → body del POST subscribe
 *   - PushSubscriptionDto    → respuesta 201 del POST subscribe
 *
 * Endpoint real del backend:
 *   POST /families/:familyId/notifications/subscribe
 *     body: PushSubscriptionInput { endpoint, keys: { p256dh, auth } }
 *     → 201 { id }   (PushSubscriptionDto)
 *   DELETE /families/:familyId/notifications/subscribe
 *     body: { endpoint }
 *     → 204
 */

export type { PushSubscriptionInput, PushSubscriptionDto } from '@cosasdecasa/contracts';

export type NotificationPermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported';
