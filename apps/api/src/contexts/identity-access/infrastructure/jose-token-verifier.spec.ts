import { describe, it, expect } from 'vitest';
import { SignJWT } from 'jose';
import { JoseTokenVerifier } from './jose-token-verifier';
import { InvalidTokenError } from '../domain/auth.errors';

// Verificación del modo SIMÉTRICO (HS256), el que usa el despliegue self-hosted.
// El modo JWKS asimétrico lo cubren los tests de integración con el Supabase local.

const SECRET = 'un-secreto-jwt-compartido-de-al-menos-32-caracteres';
const ISSUER = 'https://cosasdecasa.example/auth/v1';
const AUDIENCE = 'authenticated';

function fakeConfig(values: Record<string, string | undefined>) {
  return {
    get: (key: string) => values[key],
  } as unknown as Parameters<typeof JoseTokenVerifier.fromConfig>[0];
}

function signHs256(
  claims: Record<string, unknown>,
  opts: { secret?: string; issuer?: string; audience?: string } = {},
): Promise<string> {
  const secret = new TextEncoder().encode(opts.secret ?? SECRET);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(opts.issuer ?? ISSUER)
    .setAudience(opts.audience ?? AUDIENCE)
    .setExpirationTime('1h')
    .sign(secret);
}

describe('JoseTokenVerifier — modo HS256 (Supabase self-hosted)', () => {
  const verifier = JoseTokenVerifier.fromConfig(
    fakeConfig({ SUPABASE_JWT_SECRET: SECRET, JWT_ISSUER: ISSUER, JWT_AUDIENCE: AUDIENCE }),
  );

  it('verifica un token HS256 válido y extrae sub + email', async () => {
    const token = await signHs256({ sub: 'user-1', email: 'a@b.com' });
    await expect(verifier.verify(token)).resolves.toEqual({ sub: 'user-1', email: 'a@b.com' });
  });

  it('rechaza un token firmado con OTRO secreto', async () => {
    const token = await signHs256(
      { sub: 'user-1', email: 'a@b.com' },
      { secret: 'otro-secreto-distinto-de-treinta-y-dos-caracteres' },
    );
    await expect(verifier.verify(token)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('rechaza un token con issuer incorrecto', async () => {
    const token = await signHs256({ sub: 'user-1', email: 'a@b.com' }, { issuer: 'https://malicioso/auth' });
    await expect(verifier.verify(token)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('rechaza un token sin sub o sin email', async () => {
    const token = await signHs256({ sub: 'user-1' });
    await expect(verifier.verify(token)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('fromConfig sin secreto ni JWKS lanza error de configuración', () => {
    expect(() =>
      JoseTokenVerifier.fromConfig(fakeConfig({ JWT_ISSUER: ISSUER, JWT_AUDIENCE: AUDIENCE })),
    ).toThrow();
  });
});
