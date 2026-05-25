import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { Env } from '../../../config/env.config';
import { InvalidTokenError } from '../domain/auth.errors';
import type { TokenVerifier, VerifiedClaims } from '../domain/ports/token-verifier';

export const JWKS_PROVIDER = Symbol('JWKS_PROVIDER');

interface JoseTokenVerifierConfig {
  jwks: JWTVerifyGetKey;
  issuer: string;
  audience: string;
}

/**
 * Adaptador de {@link TokenVerifier} con jose. Verifica la firma ES256 contra
 * el JWKS remoto de Supabase (claves asimétricas; la API nunca conoce el
 * secreto de firma) y valida issuer + audience. `createRemoteJWKSet` cachea las
 * claves y refresca ante un `kid` desconocido.
 */
@Injectable()
export class JoseTokenVerifier implements TokenVerifier {
  private readonly jwks: JWTVerifyGetKey;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(@Inject(JWKS_PROVIDER) config: JoseTokenVerifierConfig) {
    this.jwks = config.jwks;
    this.issuer = config.issuer;
    this.audience = config.audience;
  }

  /** Factory para DI: construye el JWKS remoto desde la configuración validada. */
  static fromConfig(config: ConfigService<Env, true>): JoseTokenVerifier {
    const jwksUrl = config.get('JWT_JWKS_URL', { infer: true });
    const issuer = config.get('JWT_ISSUER', { infer: true });
    const audience = config.get('JWT_AUDIENCE', { infer: true });
    if (!jwksUrl || !issuer || !audience) {
      throw new Error('Faltan JWT_JWKS_URL / JWT_ISSUER / JWT_AUDIENCE para verificar tokens.');
    }
    return new JoseTokenVerifier({
      jwks: createRemoteJWKSet(new URL(jwksUrl)),
      issuer,
      audience,
    });
  }

  async verify(token: string): Promise<VerifiedClaims> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.audience,
      });
      const sub = payload.sub;
      const email = typeof payload.email === 'string' ? payload.email : undefined;
      if (!sub || !email) {
        throw new InvalidTokenError();
      }
      return { sub, email };
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        throw error;
      }
      // Firma inválida, token caducado, issuer/audience incorrectos, etc.
      throw new InvalidTokenError();
    }
  }
}
