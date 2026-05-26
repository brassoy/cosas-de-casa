/**
 * Catálogo de retos de pareja (datos en código — no tabla).
 *
 * Decisión de diseño: mantenerlo como constante en código simplifica el despliegue
 * y los tests. El catálogo es pequeño y no requiere administración dinámica.
 * Las descripciones están en español de España (tuteo).
 */
export interface ChallengeDefinition {
  key: string;
  description: string;
}

export const CHALLENGE_CATALOG: ChallengeDefinition[] = [
  {
    key: 'COCINAMOS_JUNTOS',
    description: 'Preparad juntos una cena especial sin ayuda de recetas de internet.',
  },
  {
    key: 'CARTA_MANUSCRITA',
    description: 'Escríbele una carta a mano contando tres cosas que valoras de vuestra relación.',
  },
  {
    key: 'PASEO_SIN_MOVIL',
    description: 'Dad un paseo de al menos 30 minutos sin móvil ni auriculares.',
  },
  {
    key: 'MARATÓN_SERIE',
    description: 'Vedla juntos de principio a fin en un solo día una miniserie que ninguno haya visto.',
  },
  {
    key: 'FOTO_FAVORITA',
    description: 'Elegid cada uno vuestra foto favorita de los dos y contad por qué la habéis elegido.',
  },
  {
    key: 'CANCION_DEDICADA',
    description: 'Dedícale una canción que os recuerde a vuestra historia y explícale por qué.',
  },
  {
    key: 'DESAYUNO_SORPRESA',
    description: 'Prepara el desayuno favorito de tu pareja sin que lo sepa.',
  },
  {
    key: 'BAILAR_EN_CASA',
    description: 'Bailad juntos en el salón con vuestra lista de reproducción favorita.',
  },
  {
    key: 'DIA_SIN_QUEJAS',
    description: 'Pasad un día entero sin quejaros de nada y comentad cómo os habéis sentido.',
  },
  {
    key: 'NUEVO_HOBBY',
    description: 'Probad juntos una actividad nueva que ninguno de los dos haya hecho antes.',
  },
];

/** Mapa para búsqueda O(1) por clave. */
export const CHALLENGE_CATALOG_MAP = new Map<string, ChallengeDefinition>(
  CHALLENGE_CATALOG.map((c) => [c.key, c]),
);
