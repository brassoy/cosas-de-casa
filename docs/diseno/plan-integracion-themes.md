# Plan de integración de themes — Cosas de Casa (apps/web)

> Objetivo: llevar **4 themes funcionales** (`base`, `cozy`, `cozysitcom`, `springfield`) a `apps/web`,
> sustituyendo el modelo actual `data-aesthetic(pixel|ios|okuda)`. Cada pantalla tendrá **un container**
> que cablea la lógica real una sola vez y **N vistas presentacionales** (una por theme) elegidas por un
> **registry**. Se mantiene la dimensión `light/dark`. Selector de theme = preferencia **personal** persistida
> en `localStorage`. NO migramos a TanStack Start: portamos las vistas del kit de Lovable a la app actual.

Stack real verificado en repo: Vite 6 + `@vitejs/plugin-react` + TanStack Router **code-based** (`src/core/router.tsx`)
+ Zustand 5 + Dexie 4 + Supabase. **No hay Tailwind.** El theming actual vive en `src/shared/theme/`
(`theme-bootstrap.ts`, `tokens.base.css`, `tokens.themes.css`) y se aplica en `src/main.tsx` con `applyTheme()`
antes del primer render. Alias `@ -> ./src` en `vite.config.ts` y `tsconfig.json`.

---

## 1. Adopción de Tailwind v4 + shadcn en apps/web

El kit de Lovable usa **Tailwind v4** (`@theme inline`) + **shadcn (new-york)**. Lo adoptamos sin tocar el
sistema de tokens actual: Tailwind se monta **encima** de las CSS vars existentes, no las reemplaza. Esto nos
da las primitivas shadcn que el `base` espera (`Button`, `Input`, `Dialog`, `Sheet`, `Select`, `Card`, `Badge`,
`Switch`, `Checkbox`, `Alert`, `Label`, `Textarea`) sin reescribirlas a mano.

### 1.1 Dependencias a instalar

```bash
# Tailwind v4 (plugin oficial de Vite, no PostCSS)
pnpm --filter @cosasdecasa/web add -D tailwindcss @tailwindcss/vite

# shadcn / Radix runtime + utilidades
pnpm --filter @cosasdecasa/web add class-variance-authority clsx tailwind-merge tailwind-variants
pnpm --filter @cosasdecasa/web add lucide-react
pnpm --filter @cosasdecasa/web add @radix-ui/react-dialog @radix-ui/react-slot \
  @radix-ui/react-checkbox @radix-ui/react-select @radix-ui/react-switch \
  @radix-ui/react-label tailwindcss-animate
# (Sheet usa @radix-ui/react-dialog; Alert/Card/Badge/Input/Textarea/Button son CSS, sin Radix.)
```

> No instalamos `tailwindcss-cli` ni PostCSS: con `@tailwindcss/vite` el procesado es por el plugin.
> `lucide-react` cubre los iconos de los componentes del kit (Lightning, Donut, etc.).

### 1.2 Cambios en `vite.config.ts`

Añadir el plugin de Tailwind **antes** de `react()` no es obligatorio, pero el plugin debe estar en la lista.
Mantener PWA y proxy intactos.

```ts
import tailwindcss from '@tailwindcss/vite';
// ...
plugins: [
  tailwindcss(),   // <-- nuevo
  react(),
  VitePWA({ /* ...sin cambios... */ }),
],
```

### 1.3 `src/shared/theme/styles.css` (entrada Tailwind + `@theme inline`)

Archivo **nuevo**. Importa Tailwind y declara el `@theme inline` mapeando las utilidades de Tailwind/shadcn a
**nuestras CSS vars semánticas existentes** (las de `tokens.base.css`). Así `bg-background`, `text-foreground`,
`border-border`, `rounded-card`, etc. resuelven a los tokens que cada theme ya define vía `data-theme`.

```css
@import 'tailwindcss';
@plugin 'tailwindcss-animate';

/* Habilita la variante dark por atributo en <html data-mode="dark"> */
@custom-variant dark (&:where([data-mode='dark'], [data-mode='dark'] *));

@theme inline {
  /* Colores -> CSS vars semánticas (resueltas por theme activo) */
  --color-background: var(--color-surface);
  --color-foreground: var(--color-text);
  --color-card: var(--color-surface-raised);
  --color-muted: var(--color-surface-overlay);
  --color-muted-foreground: var(--color-text-muted);
  --color-primary: var(--color-accent);
  --color-primary-foreground: var(--color-text-inverse);
  --color-destructive: var(--color-error);
  --color-border: var(--color-border);
  --color-ring: var(--color-accent);

  /* Radios y tipografía -> tokens existentes */
  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --radius-card: var(--radius-card);
  --font-sans: var(--font-body);
  --font-heading: var(--font-heading);
  --font-mono: var(--font-mono);
}
```

> **Clave del puente Tailwind ↔ tokens:** las utilidades de Tailwind apuntan a `var(--color-*)` semánticas.
> Cuando el theme `cozy` sobrescribe `--color-accent`, `bg-primary` cambia solo. **No** hardcodeamos colores de
> theme en `@theme`. Las paletas crudas de cada theme (p. ej. `cozy.blue #2d4a8a`, `springfield.yellow #FFD90F`)
> se definen como **tokens propios del theme** (ver §3) y se mapean a las vars semánticas dentro del bloque
> `[data-theme='...']`.

### 1.4 `components.json` (shadcn, estilo new-york)

Archivo **nuevo** en `apps/web/`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/shared/theme/styles.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/shared/ui",
    "ui": "@/shared/ui",
    "utils": "@/shared/lib/cn",
    "hooks": "@/shared/hooks",
    "lib": "@/shared/lib"
  }
}
```

Los componentes shadcn van a `src/shared/ui/` (`button.tsx`, `input.tsx`, `dialog.tsx`, `sheet.tsx`,
`select.tsx`, `card.tsx`, `badge.tsx`, `switch.tsx`, `checkbox.tsx`, `alert.tsx`, `label.tsx`, `textarea.tsx`).
`@/shared/lib/cn` exporta el helper `cn = (…inputs) => twMerge(clsx(inputs))`.

### 1.5 Alias `tsconfig`

Ya existe `@/* -> ./src/*` en `tsconfig.json` y `vite.config.ts`. **No hace falta tocar nada** para shadcn,
porque los alias finos (`@/shared/ui`, etc.) son subrutas de `@`. Verificar que `components.json` use rutas
coherentes con ese alias raíz.

### 1.6 Fuentes

- **Globales (base + dark/light):** `Inter` (body/heading) + `JetBrains Mono`. Ya referenciadas en `tokens.base.css`.
- **Por theme:** cargar **solo cuando el theme está activo** para no penalizar el arranque.
  - `cozy`: `Patrick Hand`, `Caveat` (500/700).
  - `cozysitcom`: `Bree Serif`, `Nunito` (500/700/800).
  - `springfield`: `Nunito` (500/700/900), `Bangers`, `Fredoka` (700).

Estrategia: un `<link>` por familia en `index.html` con `media` no aplica bien aquí; mejor **carga diferida por
JS** desde `theme-bootstrap.ts` (§3): al aplicar un theme, inyectar el `<link rel="stylesheet">` de Google Fonts
correspondiente (idempotente, marcado con `data-theme-font`). Alternativa offline-first: `@fontsource/*` importado
de forma dinámica (`import('@fontsource/caveat')`) dentro de la función de carga del theme, preferible por el PWA.

### 1.7 Convivencia con el CSS de tokens actual

Orden de import en `main.tsx`:

```ts
import './shared/theme/styles.css';        // 1) Tailwind + @theme inline (define utilidades)
import './shared/theme/tokens.base.css';   // 2) tokens semánticos por defecto (light/dark)
import './shared/theme/tokens.themes.css';  // 3) tokens por theme (base/cozy/cozysitcom/springfield)
```

`tokens.base.css` y `tokens.themes.css` **siguen siendo la fuente de verdad** de las CSS vars. Tailwind solo
añade utilidades que las consumen. Todo el código actual que usa `var(--color-*)` inline **sigue funcionando**.

> **GAP de modelo a resolver ya (bug latente actual):** `tokens.base.css` define los tokens bajo
> `[data-theme='light'|'dark']`, pero `theme-bootstrap.ts` escribe `data-aesthetic` + `data-mode`, **nunca**
> `data-theme`. Hoy los selectores `[data-theme=...]` de `tokens.base.css` casi no aplican (salvo `:root`). El
> nuevo modelo lo unifica: pasamos a **`data-theme` (base|cozy|cozysitcom|springfield) + `data-mode`
> (light|dark)** y reescribimos `tokens.themes.css` con selectores `[data-theme='X'][data-mode='Y']`.

---

## 2. Arquitectura del sistema de themes

### 2.1 Estructura de carpetas propuesta

```
src/
  features/<feature>/
    pages/<Screen>.tsx          # CONTAINER (se queda donde está hoy; el router lo importa igual)
    views/
      types.ts                  # contrato de props de las pantallas de la feature
      base/<Screen>.tsx         # vista presentacional theme=base (= componente Lovable base)
      cozy/<Screen>.tsx         # vista presentacional theme=cozy
      cozysitcom/<Screen>.tsx
      springfield/<Screen>.tsx
  shared/
    theme/
      theme-bootstrap.ts        # (modificado) base|cozy|cozysitcom|springfield + fuentes por theme
      styles.css                # (nuevo) Tailwind + @theme inline
      tokens.base.css           # (modificado) tokens semánticos por defecto + dark
      tokens.themes.css         # (reescrito) [data-theme][data-mode]
      registry.ts               # REGISTRY central: themeRegistry[theme][screenId]
      ThemeView.tsx             # helper que resuelve la vista activa por screenId
    ui/                         # componentes shadcn (button, input, dialog, sheet, ...)
    lib/cn.ts                   # cn() = twMerge(clsx())
```

### 2.2 El theme registry

`registry.ts` es un mapa `theme -> screenId -> Componente`. Cada vista recibe **exactamente** las props del
contrato de su pantalla. El registry se puede **code-split por theme** con `React.lazy` para que solo se cargue
el bundle del theme activo.

```ts
// src/shared/theme/registry.ts
import type { ComponentType } from 'react';
import type { ThemeName } from './theme-bootstrap';

export type ScreenId =
  | 'auth_login' | 'auth_signup' | 'onboarding' | 'family_create' | 'family_join' | 'family_home'
  | 'shopping_lists' | 'shopping_list_detail'
  | 'tasks_list' | 'tasks_detail'
  | 'fridge_list' | 'calendar' | 'menu' | 'romantic' | 'stats'
  | 'budget_receipts' | 'budget_receipt_detail' | 'budget_spend'
  | 'plans' | 'plan_create' | 'plan_detail'
  | 'groups' | 'group_create' | 'group_join' | 'group_home'
  | 'friends' | 'friends_redeem';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyView = ComponentType<any>;

export const themeRegistry: Record<ThemeName, Partial<Record<ScreenId, AnyView>>> = {
  base: { /* ...lazy(() => import('@/features/auth/views/base/LoginView')) */ },
  cozy: {},
  cozysitcom: {},
  springfield: {},
};
```

> Patrón **fallback a `base`**: si un theme aún no tiene una pantalla convertida, `ThemeView` cae a `base`.
> Esto permite entregar themes pantalla a pantalla sin romper la app (clave para el fan-out por fases).

```tsx
// src/shared/theme/ThemeView.tsx
export function ThemeView<P>({ screen, props }: { screen: ScreenId; props: P }) {
  const theme = useThemeName();                 // hook que lee data-theme reactivo
  const View = themeRegistry[theme][screen] ?? themeRegistry.base[screen];
  if (!View) return null;                        // base SIEMPRE debe existir
  return <Suspense fallback={<ScreenSkeleton/>}><View {...props} /></Suspense>;
}
```

### 2.3 Patrón container / presentational

El **container es la page actual** (`features/<f>/pages/<Screen>.tsx`). Hoy ya hacen casi esto (ver
`LoginPage.tsx`: cablea `useAuthStore` y renderiza). El cambio: en vez de renderizar JSX inline, **construyen el
objeto de props del contrato y delegan en `ThemeView`**.

```tsx
// features/auth/pages/LoginPage.tsx (container, tras refactor)
export function LoginPage() {
  const { signIn, signInWithGoogle, loading } = useAuthStore();
  const navigate = useNavigate();
  const [error, setError] = useState<string|null>(null);

  const props: AuthViewProps = {
    mode: 'login',
    isSubmitting: loading,
    error,
    onSubmit: async ({ email, password }) => { try { await signIn(email, password); await navigate({to:'/'});} catch(e){ setError(toMsg(e)); } },
    onGoogle: signInWithGoogle,
    onSwitchMode: () => navigate({ to: '/signup' }),
  };
  return <ThemeView screen="auth_login" props={props} />;
}
```

El router (`src/core/router.tsx`) **no cambia**: sigue importando las pages. La lógica (hooks, mutaciones,
guards, Dexie, realtime) vive **una sola vez** en el container; las 4 vistas son tontas.

### 2.4 Contrato de props compartido por pantalla

Un **único** `interface` por pantalla en `features/<f>/views/types.ts`, **idéntico para los 4 themes**. Es el
contrato que define el componente `base` de Lovable (las `propsInterface` del mapeo). Reglas:

- Las 4 vistas implementan `ComponentType<XxxViewProps>`. TypeScript garantiza que cozy/cozysitcom/springfield
  no inventen props ni omitan callbacks.
- El contrato es **el del base**. Si la lógica real necesita algo extra (p. ej. `voiceState`, `isOffline`,
  `aiUnavailable`), se añade al contrato y el base ya lo soporta (lo trae el mapeo); los themes alternativos lo
  reciben aunque al principio lo ignoren.
- Tipos de datos (`ShoppingItem`, `Task`, etc.) se derivan de `@cosasdecasa/contracts` cuando existan; si el
  base usó tipos locales del kit, se reconcilian con los DTOs reales en `types.ts` (ver GAPS en §4).

---

## 3. Selector de theme

### 3.1 `theme-bootstrap.ts` (modificado)

De `Aesthetic = pixel|ios|okuda` a `ThemeName = base|cozy|cozysitcom|springfield`. Se conserva `Mode` y toda la
mecánica de persistencia/`prefers-color-scheme`.

```ts
export type ThemeName = 'base' | 'cozy' | 'cozysitcom' | 'springfield';
export type Mode = 'light' | 'dark';
export interface ThemePrefs { theme: ThemeName; mode: Mode; }

const STORAGE_KEY = 'cosasdecasa:theme';     // se mantiene la misma key
const DEFAULT_THEME: ThemeName = 'base';
const VALID = ['base','cozy','cozysitcom','springfield'] as const;

export function applyTheme(prefs?: Partial<ThemePrefs>) {
  const saved = loadPrefs();
  const theme = prefs?.theme ?? saved?.theme ?? DEFAULT_THEME;
  const mode  = prefs?.mode  ?? saved?.mode  ?? getSystemMode();
  const html = document.documentElement;
  html.setAttribute('data-theme', theme);    // <-- antes data-aesthetic
  html.setAttribute('data-mode', mode);
  ensureThemeFonts(theme);                    // <-- carga diferida de fuentes del theme
}
```

```ts
// Carga idempotente de fuentes por theme (Google Fonts o @fontsource dinámico)
const FONT_HREFS: Record<ThemeName, string | null> = {
  base: null, // Inter/JetBrains ya globales
  cozy: 'https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Patrick+Hand&display=swap',
  cozysitcom: 'https://fonts.googleapis.com/css2?family=Bree+Serif&family=Nunito:wght@500;700;800&display=swap',
  springfield: 'https://fonts.googleapis.com/css2?family=Bangers&family=Fredoka:wght@700&family=Nunito:wght@500;700;900&display=swap',
};
function ensureThemeFonts(theme: ThemeName) {
  const href = FONT_HREFS[theme];
  if (!href || document.querySelector(`link[data-theme-font="${theme}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = href; link.setAttribute('data-theme-font', theme);
  document.head.appendChild(link);
}
```

`loadPrefs()` valida contra `VALID`. **Migración suave:** si `localStorage` trae el formato viejo
(`{aesthetic, mode}`), se descarta (no valida) y cae a `DEFAULT_THEME` — sin crash. Renombrar `setAesthetic` ->
`setTheme({theme})` y exportar `setTheme(name)`; mantener `toggleMode/setMode` igual.

### 3.2 `ThemeSelector.tsx` (modificado)

Cambiar el array `AESTHETICS` por `THEMES` con los 4 nuevos, llamar a `setTheme(name)` en vez de `setAesthetic`.
La sección **Modo (claro/oscuro)** se mantiene tal cual. El componente ya usa solo CSS vars semánticas, así que
estiliza correcto en cualquier theme.

```ts
const THEMES = [
  { value:'base',        label:'Clásico',    emoji:'◉', description:'Limpio y neutro (shadcn)' },
  { value:'cozy',        label:'Cuaderno',   emoji:'✎', description:'Papel pautado, manuscrito' },
  { value:'cozysitcom',  label:'Sitcom 70s', emoji:'📺', description:'Retro cálido, madera y mostaza' },
  { value:'springfield', label:'Cómic',      emoji:'🍩', description:'Bordes gruesos, pop comic' },
];
```

Actualizar `ThemeSelector.test.tsx`: los asserts pasan de `data-aesthetic === 'pixel'` a `data-theme === 'cozy'`,
etc., y de `setAesthetic` a `setTheme`.

### 3.3 Cómo se aplica

- `<html data-theme="cozy" data-mode="dark">` → `tokens.themes.css` resuelve las CSS vars semánticas para esa
  combinación → Tailwind/shadcn + estilos del theme leen esas vars → el registry monta la vista del theme.
- Persistencia: `localStorage['cosasdecasa:theme'] = {theme, mode}` (preferencia **personal**, sin backend).
- Sin flash: `applyTheme()` se llama en `main.tsx` **antes** de `createRoot().render()`. Las fuentes del theme se
  inyectan en ese mismo tick (con `display=swap`, sin bloquear render).

---

## 4. Tabla de integración por pantalla (27)

Leyenda GAPS: ❗ requiere trabajo de cableado/tipos; ✅ encaje directo. Tipos = DTOs de `@cosasdecasa/contracts`.

| # | screenId | Container / page actual | Hooks / datos que la alimentan | Props del componente base (Lovable) | GAPS (props que faltan / sobran) | Cableado especial |
|---|----------|-------------------------|--------------------------------|-------------------------------------|----------------------------------|-------------------|
| 1 | `auth_login` | `auth/pages/LoginPage.tsx` | `useAuthStore` (signIn, signInWithGoogle, loading) | `AuthPageProps {mode,isSubmitting,error,signupSuccess,onSubmit,onGoogle,onSwitchMode}` | ❗ `error` no se expone hoy en container (capturarlo en try/catch). `signupSuccess` no aplica a login | — |
| 2 | `auth_signup` | `auth/pages/SignupPage.tsx` | `useAuthStore` (signUp, signInWithGoogle, loading) | mismo `AuthPageProps` | ❗ `signupSuccess` → setear tras `signUp` (email confirmation) y mostrar aviso antes de redirigir a /login | Email confirmation Supabase |
| 3 | `onboarding` | `family/pages/OnboardingPage.tsx` | sin hooks (navegación) | `OnboardingPageProps {onCreateFamily,onJoinFamily}` | ✅ encaje directo | Loader raíz decide si se renderiza |
| 4 | `family_create` | `family/pages/CreateFamilyPage.tsx` | `useCreateFamily` + `setActiveFamily` | `CreateFamilyPageProps {isSubmitting,error,onSubmit({name,description})}` | ✅ map `isPending→isSubmitting`, `ApiRequestError.body.message→error` | invalidate `['families']` |
| 5 | `family_join` | `family/pages/JoinFamilyPage.tsx` | `useJoinFamily` + `setActiveFamily` | `JoinFamilyPageProps {isSubmitting,error,onSubmit(code)}` | ❗ sanitización PIN (uppercase/filtro/slice 8) + regex Crockford vive en container; base solo emite `onSubmit(code)`. `friendlyJoinError` 404/410/409 → `error` | PIN base32 Crockford |
| 6 | `family_home` | `family/pages/FamilyHomePage.tsx` | `useFamilyStore`, `useAuthStore`, `useFamilyMembers`, `useGenerateJoinPin`, `NotificationToggle` | `FamilyHomePageProps {familyId,familyName,isOwner,members,membersLoading,membersError,generatedPin,pinLoading,notificationsEnabled,onToggleNotifications,onGeneratePin,onCopyPin,onShare,onOpen}` | ❗ `notificationsEnabled/onToggleNotifications`: hoy es `NotificationToggle` (feature notifications) — el container debe exponer su estado como props, o el base envuelve el componente real. `onOpen(section)` → mapear a 10+ rutas. `FamilyMember` tipo del kit vs `FamilyMemberDto` | Owner detection, PIN share WhatsApp/Telegram, clipboard |
| 7 | `shopping_lists` | `shopping/pages/ListsPage.tsx` | `useShoppingLists` (Dexie liveQuery), `useCreateList` (outbox), `seedFromApi` | `ListsPageProps {lists,isLoading,error,onOpenList,onCreateList(name)}` | ❗ `ShoppingListSummary` (kit) vs `LocalList` (Dexie): mapear `type MAIN/CUSTOM`. Sin `error` real (Dexie no falla) — opcional | **Offline-first Dexie + outbox**, seed transparente |
| 8 | `shopping_list_detail` | `shopping/pages/ListDetailPage.tsx` | `useShoppingListDetail`, `useToggleItem`, `useDeleteItem`, `useAddItemWithDedup`, `useFrequentItems`, `useRealtimeItems`, `useShoppingStore` | `ListDetailPageProps {listName,items,frequentItems,isLoading,error,isOffline,voiceSupported,voiceState,onBack,onAddItem,onToggle,onDelete,onQuickAdd,onVoice,onOpenItem}` + `DedupConfirmDialog`, `ItemSheet`, `AddSuccessOverlay` | ❗❗ El más denso. `voiceState/voiceSupported/isOffline` los provee el container (Web Speech, `navigator.onLine`). `DedupConfirmDialog` (SUGGEST→forceAdd), `AddSuccessOverlay` (key forcing), `AUTO_MERGE` toast: el contrato del base ya los contempla pero hay que cablear callbacks de confirmación. `ShoppingItem` vs `LocalItem` | **Dexie+outbox, dedup SUGGEST/AUTO_MERGE, realtime LWW, voz, prefers-reduced-motion, success overlay** |
|   | (sub) `ItemSheet` | `shopping/components/ItemSheet.tsx` | `useItemComments` (Dexie), `useAddComment` (outbox) | `ItemSheetProps {item,comments,onClose,onAddComment(body)}` | ✅ map `LocalComment→ItemComment`. authorId/name del `useAuthStore` los pone el container | Comentarios offline-first |
| 9 | `tasks_list` | `tasks/pages/TasksPage.tsx` | `useFamilyTasks`, `useFamilyMembers`, `useTasksStore` (filtros), `useCreateTask` | `TasksPageProps {tasks,members,isLoading,error,statusFilter,assigneeFilter,onChangeStatusFilter,onChangeAssigneeFilter,onOpen,onCreate}` + `CreateTaskDialog` | ❗ filtros en Zustand (no URL) → mapear a props. `Task/TaskAssignee` (kit) vs `TaskDto/FamilyMemberDto`. `TASK_STATUS_LABELS` | invalidate `['tasks','family',id]` |
| 10 | `tasks_detail` | `tasks/pages/TaskDetailPage.tsx` | `useTaskDetail`, `useFamilyMembers`, `useUpdateTask`, `useUpdateTaskAssignees`, `useUploadTaskPhoto`, `useGenerateShoppingList` | `TaskDetailPageProps {task,isEditing,members,isLoading,uploadingPhoto,onBack,onToggleEdit,onSave,onSetAssignees,onSetStatus,onUploadPhoto,onGenerateShoppingList}` | ❗ formularios uncontrolled con `key={taskId}` en el actual → el base es controlado; reconciliar. `PhotoGallery` usa `getPhotoPublicUrl` (el base recibe URLs ya resueltas) | **Compresión imagen, Supabase Storage bucket task-photos**, generate-list→navigate |
| 11 | `fridge_list` | `fridge/pages/FridgePage.tsx` | `useFamilyFridge`, `useFridgeStore` (filtro), `useCreate/Update/Eat/Throw/Freeze/DeleteFridgeItem` | `FridgePageProps {items,isLoading,error,locationFilter,onChangeFilter,onAdd,onEdit,onDelete,onEat,onThrow,onFreeze}` | ❗ `getExpiryUrgency` (urgencia/colores) hoy en container — decidir si base recibe `item.urgency` precomputado (recomendado) o lo recalcula. Sección "urgentes" cuando filter=ALL | Optimistic delete + revert, eat dual `{deleted}`, freeze relocation |
| 12 | `calendar` | `calendar/pages/CalendarPage.tsx` (+ `CalendarGrid`, `AgendaView`, `DayEventsPanel`, `CalendarEventModal`) | `useCalendarEvents`, `useFamilyMembers`, `useCalendarStore`, `useCreate/Update/SetAttendees/DeleteCalendarEvent` | `CalendarPageProps {events,members,view,currentMonth,selectedDay,isLoading,error,onChangeView,onPrevMonth,onNextMonth,onToday,onSelectDay,onOpenEvent,onCreate,onUpdate,onSetAttendees,onDelete}` + `CalendarEventModal` | ❗ ocurrencias `_occ_N` **read-only** (RRULE): base debe pasar `isRecurringOccurrence`. `CalendarEvent` (kit) vs `CalendarEventDto`. allDay/tz helpers en container | **RRULE recurrence, timezone UTC↔local, month range 6 semanas, query por mes** |
| 13 | `menu` | `menu/pages/MenuPage.tsx` | `useSuggestMenu`, `useMenuToList` (local state) | `MenuPageProps {suggestion,isLoading,aiUnavailable,error,addedOk,selected,onToggleIngredient,onSuggest,onAddToList}` | ✅ encaje muy limpio. `Dish` mapea a `MenuSuggestionDto.dishes` | **IA 503 → aiUnavailable**, dedup ingredientes, sticky bar |
| 14 | `romantic` | `romantic/pages/RomanticPage.tsx` (+ `PairUpScreen`, `ChallengesList`, `NotesThread`) | `useCouple`, `useFamilyMembers`, `useRomanticStore`, `useSendMischief`, `useCreateCouple`, `useChallenges`, `useMarkChallengeDone`, `useCoupleNotes`, `useAddNote` | `RomanticPageProps {couple,members,challenges,notes,currentUserId,isLoading,error,tab,mischiefFeedback,onChangeTab,onPairUp,onToggleChallenge,onAddNote,onMischief}` | ❗ `couple=null` (404) → render PairUp; el base ya lo contempla. `currentUserId` del `useAuthStore`. Auto-scroll notas en el base (no es lógica) | Mischief 204 + feedback 4s, optimistic challenge/note |
| 15 | `stats` | `stats/pages/StatsPage.tsx` | `useFamilyLeaderboard`, `useFamilyStats` | `StatsPageProps {leaderboard,stats,leaderboardLoading,statsLoading,error}` | ✅ read-model puro. `LeaderboardEntry/FamilyStats` vs DTOs. Barras relativas se calculan en la vista | Sin mutaciones |
| 16 | `budget_receipts` | `budget/pages/ReceiptsPage.tsx` | `useFamilyReceipts`, `useExtractReceipt`, `useCreateReceipt`, `useDeleteReceipt`, `compressImageToBase64` | `ReceiptsPageProps {receipts,isLoading,error,capture('idle'|'extracting'|'ai-unavailable'),onCapture(file),onManualEntry,onCancelCapture,onOpen,onDelete,onGoSpend}` | ❗❗ el `ReceiptDraftEditor` a pantalla completa **no** está en el contrato del base (capture solo expone 3 fases). Hay que **ampliar el contrato** para el draft/manual o mantener el editor como componente compartido controlado por el container | **OCR IA 503 → fallback manual, compresión base64**, draft editor stateful |
| 17 | `budget_receipt_detail` | `budget/pages/ReceiptDetailPage.tsx` | `useReceiptDetail`, `useUpdateReceipt`, `useDeleteReceipt` | `ReceiptDetailPageProps {receipt,isEditing,isLoading,onBack,onToggleEdit,onSave(lines),onDelete}` | ❗ `onSave(lines)` solo cubre líneas; el container también edita merchant/date. Ampliar a `onSave(input)` | `SPEND_CATEGORY_LABELS`, Intl es-ES |
| 18 | `budget_spend` | `budget/pages/SpendPage.tsx` | `useSpendSummary` | `SpendPageProps {summary,isLoading,error,onBack}` | ✅ encaje directo. Colores por categoría en la vista | `monthFilter` store no usado (futuro) |
| 19 | `plans` | `plans/pages/PlansPage.tsx` | `useFamilyStore`, `useFamilyPlans` | `PlansPageProps {plans,isLoading,error,onCreate,onOpen}` | ✅ `PlanSummary` vs `PlanSummaryDto` | — |
| 20 | `plan_create` | `plans/pages/CreatePlanPage.tsx` | `useSavedPlaces`, `useCreatePlan` | `CreatePlanPageProps {savedPlaces,isSubmitting,error,onSubmit({title,description,scheduledAt,place,savePlace}),onCancel}` | ❗ toggle saved/manual + `selectedSavedPlaceId` + `resolvePlace()` viven en container; el base emite `place {name,address}` y `savePlace`. Reconciliar selección de saved place | savePlace flag |
| 21 | `plan_detail` | `plans/pages/PlanDetailPage.tsx` | `usePlan`, `useFriendFamilies`, `useSetRsvp`, `useSharePlan`, `useDeletePlan`, `usePlanChat`, `buildParticipantNames` | `PlanDetailPageProps {plan,messages,currentUserId,isOwner,friendFamilies,isLoading,error,onBack,onRsvp,onShare,onSendMessage,onDelete}` | ❗ chat realtime con dedup + resolución de nombres en container; el base solo pinta `messages` y emite `onSendMessage`. `friendFamilies` filtrado por `sharedWithFamilyIds` | **Realtime chat dedup, RSVP, share owner-only** |
| 22 | `groups` | `groups/pages/GroupsPage.tsx` | `useMyGroups`, `useGroupsStore` | (kit `groups`) `Groups` estático — base equivale a `PlansPage`-like: `{groups,isLoading,error,onSelect,onCreate,onJoin}` | ❗ **el kit base no listó componente shadcn para Groups** explícitamente; usar contrato análogo y `GroupSummaryDto` | setActiveGroup antes de navigate |
| 23 | `group_create` | `groups/pages/CreateGroupPage.tsx` | `useCreateGroup` | contrato análogo a `CreateGroupPage {isSubmitting,error,onSubmit({name,description})}` | ❗ definir contrato (no estaba en mapeo base; sí en themes alternativos) | invalidate `['groups']` |
| 24 | `group_join` | `groups/pages/JoinGroupPage.tsx` | `useJoinGroup` | contrato análogo `{isSubmitting,error,onSubmit(code)}` | ❗ PIN Crockford igual que family_join. `friendlyJoinError` | PIN base32 |
| 25 | `group_home` | `groups/pages/GroupHomePage.tsx` | `useGroupMembers`, `useGenerateGroupPin`, `useLeaveGroup`, `useGroupsStore`, `useAuthStore` | contrato análogo a `family_home` reducido `{groupName,isOwner,members,generatedPin,...,onGeneratePin,onLeave,onCopyPin,onShare}` | ❗ leave 2-tap confirm en container; definir contrato | PIN share, leave confirm |
| 26 | `friends` | `friends/pages/FriendsPage.tsx` | `useFriendFamilies`, `useGenerateFriendInvite`, `useRemoveFriend`, `useFamilyStore` | (kit `friends` estático) contrato `{friends,isLoading,error,generatedCode,onGenerateInvite,onRemove,onCopy,onAddFriend}` | ❗ definir contrato (themes alternativos lo muestran). familyId del store, no URL | invalidate global `['friends']` |
| 27 | `friends_redeem` | `friends/pages/RedeemFriendPage.tsx` | `useRedeemFriendInvite`, `useFamilyStore` | contrato `{code,familyName,error,onSubmit(code)}` | ❗ definir contrato | redeem invalida `['friends']` global |

> **Observación transversal de GAPS:** el kit base de Lovable mapea **explícitamente 21 pantallas**; las de
> **groups (4) y friends (2)** y el `ReceiptDraftEditor` no tienen contrato base detallado — sí aparecen en los
> 3 themes alternativos como vistas estáticas. Para esas, **el contrato lo definimos nosotros** a partir de los
> hooks reales (columnas 4-5) y lo materializamos primero en `base` para que sea la referencia.

---

## 5. Conversión de los 3 themes alternativos (estático → presentacional)

Punto de partida: cada theme es un set de pantallas **estáticas** con mock data inline y estructura HTML/clases
propias. Convertir = **(a)** reemplazar mocks por las props del contrato, **(b)** cablear callbacks, **(c)** mover
estilos a CSS por theme que use las CSS vars semánticas, **(d)** cubrir estados (loading/error/empty) que los
mocks no tienen.

Pasos genéricos por pantalla (los 3 themes comparten el procedimiento):

1. Copiar el JSX estático a `features/<f>/views/<theme>/<Screen>.tsx`.
2. Cambiar la firma a `({ ...props }: XxxViewProps) => …` (mismo contrato que `base`).
3. Sustituir cada `mockX` por la prop equivalente (`mockLists → lists`, `mockTasks → tasks`, …).
4. Cablear interacciones a callbacks (`onClick navigate → onOpen(id)`, `submit → onSubmit(v)`, checkbox → `onToggle`).
5. Añadir branches `isLoading / error / empty` (skeletons del theme).
6. Migrar clases visuales del theme a su propia hoja (`views/<theme>/theme.css` o utilidades Tailwind con vars).

### 5.1 `cozy` (cuaderno de papel)

- **Qué hacer:** tokens crudos (ink/blue/red/green/yellow/paper/PINS) → definir en `[data-theme='cozy']` y mapear
  a semánticas (`--color-accent: cozy.blue`, `--color-error: cozy.red`, `--color-success: cozy.green`,
  `--color-surface: cozy.paper`). Fuentes `Patrick Hand`/`Caveat`. Efectos (tape, pins, fondo pautado, rotaciones,
  border-bottom punteado, checkbox/stamp custom) van a `cozy/theme.css` como clases reutilizables.
- **Esfuerzo:** **Alto.** 27 pantallas, mucho detalle decorativo (tape/pins/doodles SVG) por elemento.
- **Riesgos:** los adornos (tape rotado, pins, papel pautado) son por-item; mantener accesibilidad y `reduced-motion`.
  El `success overlay` y `voiceState` de shopping no existen en el estático → hay que crearlos en el theme.

### 5.2 `cozysitcom` (retro sitcom 70/80)

- **Qué hacer:** ya viene con **clases CSS nombradas** (`.cz-frame`, `.cz-btn-*`, `.cz-input`, `.cz-tag`,
  `.cz-stamp`, `.cz-check`, `.cz-wallpaper`, `.cz-wood`) → portarlas a `cozysitcom/theme.css`. Paleta
  denim/mustard/garnet/retro/wood/beige/cream/ink → `[data-theme='cozysitcom']` mapeada a semánticas. Fuentes
  `Bree Serif`/`Nunito`. La estructura ya está bien factorizada (frames, badges, avatares con AC colors).
- **Esfuerzo:** **Medio.** Es el más “componentizado” del lote; las clases ya existen y el contrato encaja bien.
- **Riesgos:** `wallpaper`/`wood` con gradientes pueden chocar con dark mode (definir variante dark de cada token).
  Avatares con AC color array: derivar color determinista del `userId`.

### 5.3 `springfield` (cómic)

- **Qué hacer:** clases `.sf-*` (`.sf-card`, `.sf-btn*`, `.sf-input`, `.sf-sticker`, `.sf-tag`, `.sf-check`,
  patrones `.sf-zig/.sf-dot`, animaciones `.sf-float/.sf-wob/.sf-pop`) → `springfield/theme.css`. Paleta
  yellow/sky/red/green/pink/ink/cream/white → `[data-theme='springfield']`. Fuentes `Nunito`/`Bangers`/`Fredoka`.
  Bordes 3px + sombra 6px offset (hard-edge) y border-radius por componente.
- **Esfuerzo:** **Medio-alto.** Muy vistoso, muchas animaciones; algunos textos están **hardcodeados** en el
  estático (títulos `'SPRINGFIELD'`, subtítulos, contadores) → sustituir por props/datos reales.
- **Riesgos:** animaciones (`float/wobble/pop`) deben respetar `prefers-reduced-motion`. Hard shadows + bordes
  gruesos chocan con dark mode (definir tokens dark). Cabeceras hardcodeadas pueden ocultar GAPS de datos.

> **Riesgo común a los 3:** las pantallas densas (`shopping_list_detail`, `budget_receipts`, `calendar`,
> `plan_detail`) tienen sub-flujos (dedup dialog, draft editor, event modal, chat) que **no existen** en los
> estáticos. Para esos, primero estabilizar el contrato en `base`, luego portar el sub-componente a cada theme o
> dejar fallback a `base` por sub-componente hasta convertirlo.

---

## 6. Plan de archivos y orden de implementación (fan-out)

### Fase 0 — Setup Tailwind/shadcn (secuencial, bloqueante)
- Instalar deps (§1.1), `vite.config.ts` plugin (§1.2), `styles.css` (§1.3), `components.json` (§1.4),
  `cn.ts`, generar componentes shadcn en `shared/ui/`.
- **No paralelizable** (todo lo demás depende de esto). 1 PR.

### Fase 1 — Shell de theming + selector (secuencial, bloqueante)
- Reescribir `theme-bootstrap.ts` (base|cozy|cozysitcom|springfield + fuentes), `tokens.themes.css`
  (`[data-theme][data-mode]` con los 4 themes y sus mapeos semánticos), `tokens.base.css` (resolver el GAP
  `data-theme` vs `data-mode`), `ThemeSelector.tsx` + test.
- Crear `registry.ts`, `ThemeView.tsx`, `useThemeName`, `ScreenId`.
- **No paralelizable.** 1 PR. Al cerrar esta fase, la app arranca con `base` (fallback) en todas las pantallas.

### Fase 2 — Base por dominios (PARALELIZABLE por feature)
Cada feature es un work-unit independiente: definir `views/types.ts`, portar la vista `base/` del kit, refactor
del container a `ThemeView`, registrar en `themeRegistry.base`. **Fan-out por estos grupos** (sin dependencias
cruzadas, tocan archivos distintos):

- **W2.1 auth** (login, signup) — fácil.
- **W2.2 family** (onboarding, create, join, home) — home es media.
- **W2.3 shopping** (lists, list_detail + ItemSheet) — **la más cara**; aislar.
- **W2.4 tasks** (list, detail + CreateTaskDialog, PhotoGallery).
- **W2.5 fridge** (list + add/edit dialogs).
- **W2.6 calendar** (page + grid/agenda/day/modal).
- **W2.7 menu** — fácil.
- **W2.8 romantic** (page + pairup/challenges/notes).
- **W2.9 stats** — fácil.
- **W2.10 budget** (receipts + draft editor, detail, spend) — ampliar contratos.
- **W2.11 plans** (list, create, detail + chat).
- **W2.12 groups** (4) + **W2.13 friends** (2) — **definir contratos nuevos primero**.

> Recomendado: arrancar el fan-out con **W2.1/W2.7/W2.9** (triviales, validan el pipeline registry+ThemeView)
> y en paralelo W2.12/W2.13 (definición de contrato). Dejar W2.3/W2.10/W2.6/W2.11 para cuando el patrón esté
> probado. Cada work-unit = 1 PR ≤ 400 líneas (trocear shopping/calendar/budget si hace falta → chained PRs).

### Fase 3 — Themes alternativos (PARALELIZABLE por theme × dominio)
Matriz `theme × feature` = celdas independientes (`cozy/shopping`, `springfield/tasks`, …). Cada celda:
- Solo se puede empezar cuando **su contrato base existe** (depende de la celda base equivalente de Fase 2).
- Fan-out natural: 3 themes × 12 dominios. Empezar por **`cozysitcom`** (más componentizado, menor riesgo) como
  banco de pruebas del procedimiento §5, luego `springfield` y `cozy`.
- Por dominio denso, permitir fallback a `base` en sub-componentes hasta convertirlos.

### Fase 4 — Cierre
- Borrar restos pixel/ios/okuda (tokens y referencias), QA visual de los 4 themes en light/dark, smoke de los
  flujos especiales (offline shopping, OCR 503, voz, realtime chat, RRULE).

**Resumen de paralelización:** Fase 0 y 1 secuenciales; Fase 2 = fan-out de 12-13 work-units; Fase 3 = fan-out de
~36 celdas (theme×feature) condicionadas a su base.

---

## 7. Riesgos y decisiones abiertas

**Riesgos**
1. **Pantallas densas (shopping_list_detail, calendar, budget_receipts, plan_detail).** Sub-flujos (dedup,
   RRULE/event modal, draft OCR editor, chat realtime) no existen en los themes estáticos. Riesgo de subestimar:
   mitigar con contrato estable en base + fallback por sub-componente.
2. **Bug de modelo actual (`data-theme` vs `data-aesthetic`/`data-mode`).** Hay que unificarlo en Fase 1 o los
   tokens semánticos no resolverán bien. Si se deja a medias, themes “a medio pintar”.
3. **Dark mode en los themes alternativos.** Los estáticos son light-only (papel, wallpaper, hard shadows). Cada
   theme necesita su variante `[data-theme][data-mode='dark']` o el toggle quedará incoherente. Decisión: ¿dark
   real por theme o forzar light en cozy/springfield?
4. **Drift de tipos kit ↔ contracts.** El kit usa tipos locales (`ShoppingItem`, `Task`, `CalendarEvent`) que no
   son los DTOs reales. Reconciliar en `views/types.ts`; riesgo de props sutilmente distintas (fechas, enums).
5. **Tamaño de bundle.** 4 themes × 27 vistas + 3 familias de fuentes. Mitigar con `React.lazy` por theme en el
   registry y carga diferida de fuentes (§3.1).

**Decisiones abiertas**
- **A.** ¿Contrato único ampliado (con `voiceState`, `isOffline`, `aiUnavailable`, `urgency` precomputado) o
  contrato mínimo + helpers en cada vista? Recomendación: **contrato ampliado**, computar en el container.
- **B.** `ReceiptDraftEditor`, `DedupConfirmDialog`, `CalendarEventModal`, chat de `plan_detail`: ¿componentes
  por theme o compartidos (un solo componente shadcn) inyectado por el container? Recomendación: **compartidos**
  para los más lógicos (draft editor, event modal), **por theme** los puramente visuales.
- **C.** Fuentes: ¿Google Fonts (`<link>`) o `@fontsource` dinámico (mejor offline/PWA)? Recomendación:
  `@fontsource` por el service worker.
- **D.** Groups/Friends: el contrato lo definimos nosotros (no hay base de Lovable). ¿Lo materializamos primero
  en `base` (recomendado) o copiamos el estilo de family/plans?
- **E.** ¿Mantener `NotificationToggle` como componente real envuelto por todas las vistas, o exponer
  `notificationsEnabled/onToggle` como props puras? Recomendación: **props puras** para coherencia del contrato.
