/**
 * Adaptador de embeddings basado en fastembed (v2.1.0).
 *
 * Modelo: BGESmallENV15 (fast-bge-small-en-v1.5, 384 dims).
 * Nota: fastembed 2.1.0 no incluye el modelo multilingual-e5-small
 * (solo existe MLE5Large con 1024 dims). Usamos BGESmallENV15 para
 * mantener 384 dims como indica el esquema de BD.
 *
 * El modelo se descarga la primera vez (~30 MB) y se cachea en
 * local_cache/. La inicialización es lazy (singleton): el primer
 * embed puede tardar varios segundos.
 *
 * Si el modelo no puede inicializarse (sin red, sin disco, etc.)
 * se activa el modo fallback: embed() devuelve null y el dedup
 * funciona solo por normalización de texto.
 */

import { Logger } from '@nestjs/common';
import type { EmbeddingPort } from '../domain/ports/embedding.port';

const FASTEMBED_MODULE = 'fastembed';
const MODEL_NAME = 'BGESmallENV15'; // fast-bge-small-en-v1.5 — 384 dims

export class FastEmbedEmbeddingAdapter implements EmbeddingPort {
  private static instance: FastEmbedEmbeddingAdapter | null = null;
  private readonly logger = new Logger(FastEmbedEmbeddingAdapter.name);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private flagEmbedding: any = null;
  private fallbackMode = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  /** Singleton perezoso: se reutiliza entre solicitudes. */
  static getInstance(): FastEmbedEmbeddingAdapter {
    if (!FastEmbedEmbeddingAdapter.instance) {
      FastEmbedEmbeddingAdapter.instance = new FastEmbedEmbeddingAdapter();
    }
    return FastEmbedEmbeddingAdapter.instance;
  }

  /** Solo para tests: resetea la instancia singleton. */
  static resetInstance(): void {
    FastEmbedEmbeddingAdapter.instance = null;
  }

  private async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        // Importación dinámica para evitar que un fallo de carga
        // rompa el arranque del servidor.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fastembed = require(FASTEMBED_MODULE) as {
          FlagEmbedding: {
            init(opts: { model: string; showDownloadProgress?: boolean }): Promise<unknown>;
          };
          EmbeddingModel: Record<string, string>;
        };

        const model = fastembed.EmbeddingModel[MODEL_NAME];
        if (!model) {
          throw new Error(`Modelo ${MODEL_NAME} no encontrado en fastembed`);
        }

        this.flagEmbedding = await fastembed.FlagEmbedding.init({
          model,
          showDownloadProgress: false,
        });

        this.logger.log(
          `FastEmbed inicializado con modelo ${MODEL_NAME} (384 dims). ` +
          'El dedup semántico está activo.',
        );
      } catch (err) {
        this.fallbackMode = true;
        this.logger.warn(
          `FastEmbed no pudo inicializarse (${(err as Error).message}). ` +
          'El dedup caerá a «solo normalización».',
        );
      }
    })();

    return this.initPromise;
  }

  async embed(text: string): Promise<number[] | null> {
    await this.initialize();

    if (this.fallbackMode || !this.flagEmbedding) {
      return null;
    }

    try {
      // FlagEmbedding.embed() devuelve un generador async de Float32Array[]
      const generator = await this.flagEmbedding.embed([text], 1);
      for await (const batch of generator) {
        // batch es Float32Array[] con un solo elemento (1 texto)
        const vector = batch[0];
        if (!vector) return null;
        return Array.from(vector as Float32Array);
      }
      return null;
    } catch (err) {
      this.logger.warn(`Error generando embedding: ${(err as Error).message}`);
      return null;
    }
  }
}
