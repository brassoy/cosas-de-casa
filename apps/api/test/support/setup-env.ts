// Carga el .env de la raíz del monorepo ANTES de que se importe cualquier
// módulo que lea process.env (ConfigModule de Nest, env.config, etc.).
// Se ejecuta como setupFile de Vitest, antes de los tests.
import { loadRootDotenv } from '../../src/config/load-dotenv';

loadRootDotenv();
