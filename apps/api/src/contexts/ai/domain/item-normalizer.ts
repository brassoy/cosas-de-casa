/**
 * Normalización de nombres de artículos en español de España.
 *
 * Reglas (por prioridad):
 * 1. Lowercase + NFC (normalización unicode).
 * 2. Eliminar ruido de packaging (caja de, bote de, paquete de, …).
 * 3. Singularizar plurales regulares con -s / -es.
 * 4. Conservar modificadores con significado semántico
 *    (entera, desnatada, semidesnatada, sin lactosa, bio, integral,
 *     fresco, congelado, light, extra virgen, artesano, …).
 * 5. Extraer atributos estructurados (grasa, estado, etc.).
 *
 * Retorna el nombre normalizado y los atributos extraídos.
 */

export interface NormalizationResult {
  /** Nombre normalizado: sin ruido, singular, lowercase. */
  normalized: string;
  /** Atributos semánticos extraídos del nombre. */
  attributes: Record<string, string>;
}

// ── Ruido de packaging a eliminar ────────────────────────────────────────────

const PACKAGING_NOISE = [
  'litro y medio de',
  'caja de',
  'cajas de',
  'bote de',
  'botes de',
  'paquete de',
  'paquetes de',
  'bolsa de',
  'bolsas de',
  'lata de',
  'latas de',
  'tarro de',
  'tarros de',
  'botella de',
  'botellas de',
  'litro de',
  'litros de',
  'kg de',
  'kilo de',
  'kilos de',
  'gramo de',
  'gramos de',
  'docena de',
  'docenas de',
  'pieza de',
  'piezas de',
  'unidad de',
  'unidades de',
  'sobre de',
  'sobres de',
  'pack de',
  'packs de',
  'rollo de',
  'rollos de',
  'cartón de',
  'cartones de',
];

// ── Modificadores de grasa ───────────────────────────────────────────────────

const FAT_ATTRS: Record<string, string> = {
  entera: 'entera',
  'semi-desnatada': 'semidesnatada',
  semidesnatada: 'semidesnatada',
  semi: 'semidesnatada',
  desnatada: 'desnatada',
  'sin grasa': 'desnatada',
};

/** Atributo de estado / procesado. */
const STATE_ATTRS: Record<string, string> = {
  fresco: 'fresco',
  fresca: 'fresco',
  frescos: 'fresco',
  frescas: 'fresco',
  congelado: 'congelado',
  congelada: 'congelado',
  congelados: 'congelado',
  congeladas: 'congelado',
  'sin lactosa': 'sin_lactosa',
  'sin gluten': 'sin_gluten',
  bio: 'bio',
  ecológico: 'bio',
  ecologico: 'bio',
  ecológica: 'bio',
  ecologica: 'bio',
  orgánico: 'bio',
  organico: 'bio',
  integral: 'integral',
  light: 'light',
};

// ── Plurales irregulares comunes ──────────────────────────────────────────────

const IRREGULAR_PLURALS: Record<string, string> = {
  tomates: 'tomate',
  patatas: 'patata',
  cebollas: 'cebolla',
  zanahorias: 'zanahoria',
  lechugas: 'lechuga',
  manzanas: 'manzana',
  naranjas: 'naranja',
  limones: 'limón',
  pimientos: 'pimiento',
  pepinos: 'pepino',
  peras: 'pera',
  fresas: 'fresa',
  uvas: 'uva',
  melocotones: 'melocotón',
  platanos: 'plátano',
  plátanos: 'plátano',
  yogures: 'yogur',
  huevos: 'huevo',
  filetes: 'filete',
  chuletas: 'chuleta',
  galletas: 'galleta',
  bizcochos: 'bizcocho',
  panes: 'pan',
  quesos: 'queso',
  jamones: 'jamón',
  embutidos: 'embutido',
  aceites: 'aceite',
  vinagres: 'vinagre',
  salsas: 'salsa',
  conservas: 'conserva',
  sopas: 'sopa',
  pastas: 'pasta',
  arroces: 'arroz',
  legumbres: 'legumbre',
  garbanzos: 'garbanzo',
  lentejas: 'lenteja',
  alubias: 'alubia',
  macarrones: 'macarrón',
  espaguetis: 'espagueti',
  boquerones: 'boquerón',
  sardinas: 'sardina',
  anchoas: 'anchoa',
  mejillones: 'mejillón',
  gambas: 'gamba',
  calamares: 'calamar',
  detergentes: 'detergente',
  suavizantes: 'suavizante',
  champús: 'champú',
  jabones: 'jabón',
  pañales: 'pañal',
};

// ── Singularización de plurales regulares ────────────────────────────────────

function singularize(word: string): string {
  const irregular = IRREGULAR_PLURALS[word];
  if (irregular) {
    return irregular;
  }
  // -iones → -ión
  if (word.endsWith('iones')) {
    return word.slice(0, -2) + 'ón';
  }
  // -ones → -ón (melón, jabón, etc.)
  if (word.endsWith('ones') && word.length > 5) {
    return word.slice(0, -2) + 'ón';
  }
  // -es (para palabras que terminan en consonante + es)
  if (word.endsWith('es') && word.length > 3) {
    const stem = word.slice(0, -2);
    // Solo singularizamos si la raíz termina en consonante (no en vocal)
    if (stem.length > 1) {
      const lastChar = stem[stem.length - 1];
      if (lastChar && !/[aeiouáéíóú]/.test(lastChar)) {
        return stem;
      }
    }
  }
  // -s final (caso más común: plural → singular)
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 2) {
    return word.slice(0, -1);
  }
  return word;
}

// ── Extracción de atributos ──────────────────────────────────────────────────

function extractAttributes(tokens: string[]): {
  remaining: string[];
  attributes: Record<string, string>;
} {
  const attributes: Record<string, string> = {};
  const remaining: string[] = [];

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (!token) { i++; continue; }

    const nextToken = tokens[i + 1];
    const twoToken = nextToken ? `${token} ${nextToken}` : '';

    if (twoToken && FAT_ATTRS[twoToken]) {
      attributes['grasa'] = FAT_ATTRS[twoToken] as string;
      remaining.push(token);
      if (nextToken) remaining.push(nextToken);
      i += 2;
      continue;
    }
    if (twoToken && STATE_ATTRS[twoToken]) {
      const stateVal = STATE_ATTRS[twoToken];
      if (stateVal) {
        const key = twoToken.startsWith('sin ') ? 'especial' : 'estado';
        attributes[key] = stateVal;
      }
      remaining.push(token);
      if (nextToken) remaining.push(nextToken);
      i += 2;
      continue;
    }

    const fatVal = FAT_ATTRS[token];
    if (fatVal) {
      attributes['grasa'] = fatVal;
      // Conservamos el modificador en el nombre para diferenciación semántica
      remaining.push(token);
      i++;
      continue;
    }

    const stateVal = STATE_ATTRS[token];
    if (stateVal) {
      const key = token.startsWith('sin') ? 'especial' : 'estado';
      attributes[key] = stateVal;
      remaining.push(token);
      i++;
      continue;
    }

    remaining.push(token);
    i++;
  }

  return { remaining, attributes };
}

// ── Función pública principal ─────────────────────────────────────────────────

export function normalizeItemName(raw: string): NormalizationResult {
  // 1. Lowercase + NFC
  let text = raw.toLowerCase().normalize('NFC').trim();

  // 2. Eliminar ruido de packaging (orden: del más largo al más corto)
  for (const noise of PACKAGING_NOISE) {
    if (text.startsWith(noise + ' ')) {
      text = text.slice(noise.length + 1).trim();
      break;
    }
    if (text.endsWith(' ' + noise)) {
      text = text.slice(0, -(noise.length + 1)).trim();
      break;
    }
  }

  // 3. Tokenizar y procesar token a token
  const rawTokens = text.split(/\s+/).filter(Boolean);

  // 4. Extraer atributos semánticos
  const { remaining: attributedTokens, attributes } = extractAttributes(rawTokens);

  // 5. Singularizar el primer token (nombre principal)
  const singularizedTokens = attributedTokens.map((token, idx) => {
    if (idx === 0) {
      return singularize(token);
    }
    return token;
  });

  const normalized = singularizedTokens.join(' ').trim();

  return { normalized, attributes };
}
