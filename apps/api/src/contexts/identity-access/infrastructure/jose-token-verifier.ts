import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { Env } from '../../../config/env.config';
import { InvalidTokenError } from '../domain/auth.errors';
import type { TokenVerifier, VerifiedClaims } from '../domain/ports/token-verifier';

interface JoseTokenVerifierConfig {
  /** Clave de verificación: un getter de JWKS (asimétrico) o un secreto (HS256). */
  key: JWTVerifyGetKey | Uint8Array;
  /** Algoritmos permitidos (evita ataques de confusión de algoritmo). */
  algorithms: string[];
  issuer: string;
  audience: string;
}

/**
 * Adaptador de {@link TokenVerifier} con jose. Soporta DOS modos según el entorno:
 *
 *   - **Asimétrico (JWKS)** — Supabase Cloud y el CLI local. Verifica la firma
 *     ES256/RS256 contra el JWKS remoto; la API nunca conoce el secreto de firma.
 *   - **Simétrico (HS256)** — Supabase self-hosted clásico (GoTrue firma con un
 *     secreto compartido). Se activa cuando está definido `SUPABASE_JWT_SECRET`.
 *
 * En ambos modos valida issuer + audience y RESTRINGE los algoritmos aceptados.
 */
@Injectable()
export class JoseTokenVerifier implements TokenVerifier {
  private readonly key: JWTVerifyGetKey | Uint8Array;
  private readonly algorithms: string[];
  private readonly issuer: string;
  private readonly audience: string;

  constructor(config: JoseTokenVerifierConfig) {
    this.key = config.key;
    this.algorithms = config.algorithms;
    this.issuer = config.issuer;
    this.audience = config.audience;
  }

  /**
   * Factory para DI: elige el modo según el entorno validado. Si hay
   * `SUPABASE_JWT_SECRET` → HS256 con ese secreto; si no → JWKS asimétrico desde
   * `JWT_JWKS_URL`. Siempre exige issuer + audience.
   */
  static fromConfig(config: ConfigService<Env, true>): JoseTokenVerifier {
    const issuer = config.get('JWT_ISSUER', { infer: true });
    const audience = config.get('JWT_AUDIENCE', { infer: true });
    if (!issuer || !audience) {
      throw new Error('Faltan JWT_ISSUER / JWT_AUDIENCE para verificar tokens.');
    }

    const secret = config.get('SUPABASE_JWT_SECRET', { infer: true });
    if (secret) {
      // Modo simétrico (HS256): Supabase self-hosted firma con un secreto compartido.
      return new JoseTokenVerifier({
        key: new TextEncoder().encode(secret),
        algorithms: ['HS256'],
        issuer,
        audience,
      });
    }

    // Modo asimétrico (JWKS): Supabase Cloud / CLI con claves asimétricas.
    const jwksUrl = config.get('JWT_JWKS_URL', { infer: true });
    if (!jwksUrl) {
      throw new Error(
        'Faltan credenciales de verificación: define SUPABASE_JWT_SECRET (HS256) o JWT_JWKS_URL (JWKS).',
      );
    }
    return new JoseTokenVerifier({
      key: createRemoteJWKSet(new URL(jwksUrl)),
      algorithms: ['ES256', 'RS256'],
      issuer,
      audience,
    });
  }

  async verify(token: string): Promise<VerifiedClaims> {
    try {
      const options = {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: this.algorithms,
      };
      // El `instanceof` estrecha el tipo a cada overload de jose (clave vs getter).
      const { payload } =
        this.key instanceof Uint8Array
          ? await jwtVerify(token, this.key, options)
          : await jwtVerify(token, this.key, options);
      const sub = typeof payload.sub === 'string' ? payload.sub : undefined;
      const email = typeof payload.email === 'string' ? payload.email : undefined;
      if (!sub || !email) {
        throw new InvalidTokenError();
      }
      return { sub, email };
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        throw error;
      }
      // Firma inválida, token caducado, issuer/audience/algoritmo incorrectos, etc.
      throw new InvalidTokenError();
    }
  }
}
