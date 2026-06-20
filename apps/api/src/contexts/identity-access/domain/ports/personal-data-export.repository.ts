export const PERSONAL_DATA_EXPORT_REPOSITORY = Symbol('PERSONAL_DATA_EXPORT_REPOSITORY');

/**
 * Volcado de TODOS los datos personales del usuario, para el derecho de acceso y
 * portabilidad (GDPR art. 15 y 20). Estructura domain-level (no expone el schema):
 * el adaptador de infraestructura rellena cada sección consultando sus tablas.
 *
 * NO incluye secretos (hashes de PINs, claves de notificaciones push, tokens): de
 * las suscripciones push solo se informa el número, no su contenido.
 */
export interface PersonalDataExport {
  profile: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    createdAt: string | null;
  };
  /** Familias a las que pertenece, con su rol. */
  families: ReadonlyArray<{ familyId: string; name: string; role: string }>;
  /** Peñas (grupos) a las que pertenece, con su rol. */
  groups: ReadonlyArray<{ groupId: string; name: string; role: string }>;
  /** Contenido creado o aportado por el usuario en cualquier familia/peña/plan. */
  shoppingItems: ReadonlyArray<Record<string, unknown>>;
  comments: ReadonlyArray<Record<string, unknown>>;
  tasks: ReadonlyArray<Record<string, unknown>>;
  fridgeItems: ReadonlyArray<Record<string, unknown>>;
  calendarEvents: ReadonlyArray<Record<string, unknown>>;
  savedPlaces: ReadonlyArray<Record<string, unknown>>;
  plans: ReadonlyArray<Record<string, unknown>>;
  planMessages: ReadonlyArray<Record<string, unknown>>;
  receipts: ReadonlyArray<Record<string, unknown>>;
  /** Solo el número de suscripciones push (su contenido es secreto). */
  pushSubscriptionsCount: number;
}

/**
 * Puerto de lectura para el EXPORT de datos personales del usuario autenticado.
 * Vive en `identity-access` (lo dispara este contexto) pero lee tablas de otros
 * contextos a nivel de INFRAESTRUCTURA; el dominio no menciona SQL.
 */
export interface PersonalDataExportRepository {
  /** Recopila todos los datos personales del usuario en una estructura serializable. */
  exportFor(userId: string): Promise<PersonalDataExport>;
}
