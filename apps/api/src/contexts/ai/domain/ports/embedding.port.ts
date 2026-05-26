/**
 * Puerto de dominio para generación de embeddings.
 *
 * El dominio NO conoce fastembed ni ningún modelo concreto.
 * Devuelve null si el adaptador no puede generar el embedding
 * (modelo no descargado, fallo de red, etc.): en ese caso el
 * dedup cae a «solo normalización».
 */
export interface EmbeddingPort {
  embed(text: string): Promise<number[] | null>;
}

export const EMBEDDING_PORT = Symbol('EmbeddingPort');
