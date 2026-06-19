import { type ReactNode } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Toaster } from '@/shared/ui/sonner';
import {
  createIdbPersister,
  PERSIST_BUSTER,
  PERSIST_MAX_AGE,
} from '@/shared/lib/query-persister';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      // gcTime debe ser >= maxAge de la persistencia: si una query se recolecta
      // antes, no se persiste y no hidrata tras un refresh (ADR 0006).
      gcTime: PERSIST_MAX_AGE,
      retry: 1,
    },
  },
});

// Persister asíncrono que vuelca la caché de Query a IndexedDB. Se construye
// una sola vez a nivel de módulo (igual que el queryClient).
const persister = createIdbPersister();

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: PERSIST_MAX_AGE,
        // Al cambiar el buster se descarta toda la caché persistida previa.
        buster: PERSIST_BUSTER,
      }}
    >
      {children}
      {/* Toaster global: monta <Toaster> una única vez para que toast() de
          'sonner' funcione en toda la app. */}
      <Toaster position="top-center" richColors />
    </PersistQueryClientProvider>
  );
}
