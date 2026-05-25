export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');

/** Claims que nos interesan de un JWT verificado. */
export interface VerifiedClaims {
  sub: string;
  email: string;
}

/**
 * Puerto que verifica un token de acceso y devuelve sus claims. La
 * implementación (jose + JWKS de Supabase) vive en infraestructura. Lanza
 * {@link import('../auth.errors').InvalidTokenError} si el token no es válido.
 */
export interface TokenVerifier {
  verify(token: string): Promise<VerifiedClaims>;
}
