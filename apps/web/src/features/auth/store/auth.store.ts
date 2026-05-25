import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/shared/lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** Se resuelve cuando ya se conoce el estado inicial de sesión (INITIAL_SESSION). */
  ready: Promise<void>;
  /** Inicia sesión con email y contraseña */
  signIn: (email: string, password: string) => Promise<void>;
  /** Registra un nuevo usuario */
  signUp: (email: string, password: string) => Promise<void>;
  /** Autenticación OAuth (Google, etc.) */
  signInWithGoogle: () => Promise<void>;
  /** Cierra la sesión actual */
  signOut: () => Promise<void>;
}

let resolveReady: () => void = () => {};
const ready = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

export const useAuthStore = create<AuthState>((set) => {
  let settled = false;
  // Suscripción al ciclo de vida de la sesión Supabase. El primer evento
  // (INITIAL_SESSION) nos dice si hay sesión y resuelve `ready`.
  supabase.auth.onAuthStateChange((_event, session) => {
    set({
      session,
      user: session?.user ?? null,
      loading: false,
    });
    if (!settled) {
      settled = true;
      resolveReady();
    }
  });

  return {
    session: null,
    user: null,
    loading: true,
    ready,

    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },

    signUp: async (email, password) => {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    },

    signInWithGoogle: async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    },

    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  };
});
