import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { Providers } from './core/providers';
import { router } from './core/router';
import './shared/theme/tokens.base.css';
import { applyTheme } from './shared/theme/theme-bootstrap';

// Apply theme before first render to avoid flash
applyTheme();

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
