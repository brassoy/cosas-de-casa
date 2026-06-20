# Guion del vídeo de explicación — Cosas de Casa

> **TFM · Máster de Desarrollo con IA · Pablo Ruiz**
> Vídeo de explicación (punto 5 del TFM): Pablo graba su pantalla mientras presenta y recorre el proyecto.
> **Duración objetivo:** ~8–10 minutos · **Idioma:** español de España · **Tono:** cercano, claro, sin prisa.

---

## 🎬 Preparación antes de grabar

Ten esto listo **antes** de pulsar el botón de grabar, así el recorrido sale fluido y sin sustos:

- [ ] **Resolución y formato:** graba a 1080p (1920×1080). Si vas a mostrar el móvil/PWA, usa la vista responsive del navegador o un emulador, no muevas el teléfono delante de la webcam.
- [ ] **Servicios arriba:** `pnpm db:start` (Supabase local) y `pnpm dev` (API + web). Comprueba que la web carga en `http://localhost:5173` y la API responde en `http://localhost:3000/api/v1`.
- [ ] **Cuenta de demo lista:** ten a mano las credenciales y **haz login una vez antes** para precargar datos:
  - Email: `paseo1781858100612@test.local`
  - Contraseña: `qwertyui`
  - Familia: **"Casa Paseo"** (ya tiene lista de la compra, tareas y nevera con datos).
- [ ] **Pestañas/ventanas abiertas y ordenadas:** (1) la web ya logueada, (2) el editor con el repo abierto en `apps/api/src/contexts/` y `packages/contracts/`, (3) Swagger en `http://localhost:3000/api/docs` por si quieres enseñarlo, (4) el `README.md` por si te pierdes.
- [ ] **Micro y audio:** prueba el micrófono 10 segundos antes. Silencia notificaciones del sistema (Slack, correo, móvil).
- [ ] **Limpieza visual:** cierra pestañas y apps de fondo; oculta marcadores personales del navegador; pon el editor en un tema legible y con buen tamaño de fuente.
- [ ] **Permisos del navegador:** acepta antes el permiso de **micrófono** (para la lista por voz) y, si vas a enseñar planes, ten cargado el mapa de **Google Maps** una vez para que no tarde en directo.
- [ ] **Plan B:** si algo falla en directo (IA, mapa…), no pasa nada: lo cuentas con naturalidad y sigues. El guion ya prevé degradación.

> **Ritmo:** lee en voz alta, marca pausas tras cada idea. No leas palabra por palabra como un robot: usa el texto como apoyo y habla. Si te trabas, repites la frase y luego cortas en edición.

---

## 🗂️ Estructura y tiempos

| Bloque | Contenido | Tiempo aprox. | Acumulado |
|---|---|---|---|
| 1 | Intro: quién soy y qué es | 0:45 | 0:45 |
| 2 | El problema que resuelve | 1:00 | 1:45 |
| 3 | Recorrido por la app en vivo | 4:30 | 6:15 |
| 4 | Bajo el capó (arquitectura) | 2:15 | 8:30 |
| 5 | Cierre | 0:45 | 9:15 |

> Total estimado **~9 minutos**. Si vas justo, el bloque 3 es el que más se puede recortar (acorta planes, rincón o peñas).

---

## 🎙️ Bloque 1 — Intro (≈ 0:45)

| Tiempo | [EN PANTALLA] | Narración (lo que dices) |
|---|---|---|
| 0:00 | Portada de las slides o la **landing** de la app (`/landing`, estética Hommer). | «Hola, soy Pablo Ruiz y este es mi Trabajo de Fin de Máster del Máster de Desarrollo con IA. Te presento **Cosas de Casa**: una aplicación para organizar el día a día de un hogar en familia.» |
| 0:20 | El **home** de la app ya logueado (`sf-home.png` en vivo). | «Es una PWA real, instalable como una app, que funciona **incluso sin conexión** y con un toque de **inteligencia artificial** en varias partes. En los próximos minutos te enseño qué hace y cómo está construida por dentro.» |

---

## 🎙️ Bloque 2 — El problema (≈ 1:00)

| Tiempo | [EN PANTALLA] | Narración |
|---|---|---|
| 0:45 | Slide del "problema" o el home en reposo. | «Organizar una casa entre varias personas es un caos: uno apunta la compra en una nota del móvil, otro en un papel; las tareas no están claras y siempre las hace el mismo; nadie sabe qué hay en la nevera y acabas comprando dos veces lo mismo; y para colmo, ¿qué plan hay el finde?» |
| 1:05 | Pasas el ratón por el menú de secciones (compra, tareas, nevera, calendario, planes…). | «**Cosas de Casa** reúne todo eso en un único sitio compartido y en tiempo real. Lo que apunta uno lo ve el resto al instante. Y como es offline-first, **funciona aunque te quedes sin cobertura** en el supermercado.» |
| 1:30 | Cierras la idea mirando a cámara / al home. | «Está pensada como un producto de verdad: multi-familia, con invitaciones, roles, gestión de cuenta y hasta cuatro estéticas distintas. Vamos a verla.» |

---

## 🎙️ Bloque 3 — Recorrido por la app en vivo (≈ 4:30)

> **Importante:** ya estás logueado con la cuenta demo. Si quieres mostrar el login, hazlo rápido; si no, empieza dentro y lo comentas. **Sé honesto:** enseña solo lo que existe y funciona.

### 3.1 · Acceso y familia (≈ 0:30)

| Tiempo | [EN PANTALLA] | Narración |
|---|---|---|
| 1:45 | Pantalla de **login** (o ya dentro). Señalas el avatar/nombre de la familia "Casa Paseo". | «Entro con la cuenta de demo. La app tiene registro, login y recuperación de contraseña. Una vez dentro, todo gira en torno a una **familia**: aquí estoy en *Casa Paseo*. Puedes crear tu familia o **unirte a otra con un PIN de invitación**, y cada miembro tiene su rol.» |

### 3.2 · Lista de la compra por voz + IA (≈ 0:50) — *la joya*

| Tiempo | [EN PANTALLA] | Narración |
|---|---|---|
| 2:15 | Abres **Lista de la compra** (`sf-lists.png` en vivo). | «Esta es la lista de la compra, y es donde más se nota la IA. En vez de teclear, **pulso el micrófono y la dicto**.» |
| 2:30 | Pulsas el micro y dices en voz alta, p. ej.: *"añade dos litros de leche, pan, tomates y papel de cocina"*. | «Hablo con naturalidad… *"dos litros de leche, pan, tomates y papel de cocina"*… y la IA **extrae los productos** de lo que he dicho y los añade a la lista, ya separados.» |
| 2:50 | Muestras los artículos añadidos. Intentas añadir un duplicado ("leche") para enseñar la deduplicación. | «Lo interesante es que si alguien añade *"leche"* y yo ya tenía *"dos litros de leche"*, **no lo duplica**: usa deduplicación semántica por *embeddings* para entender que es lo mismo. También puedo añadir un comentario por artículo, marcarlo como comprado, etc.» |

> Si la IA de voz no estuviera disponible en directo, dilo con naturalidad: «la parte de IA está *gated*: si el servicio no responde, la app degrada con elegancia y te avisa, así que puedo añadir el producto a mano». Y lo añades escribiendo.

### 3.3 · Tareas del hogar (≈ 0:25)

| Tiempo | [EN PANTALLA] | Narración |
|---|---|---|
| 3:05 | Abres **Tareas** (`sf-tasks.png`). Creas o mueves una tarea de estado y la asignas. | «Las tareas del hogar: creo una, la **asigno a alguien**, cambio su estado y puedo **adjuntar una foto** —por ejemplo, para dejar claro qué hay que arreglar. Así se reparte de verdad quién hace qué en casa.» |

### 3.4 · Nevera, congelador y despensa (≈ 0:25)

| Tiempo | [EN PANTALLA] | Narración |
|---|---|---|
| 3:30 | Abres **Nevera** (`sf-fridge.png`). Marcas algo como *comido* o *congelado*. | «Aquí controlo lo que tengo en **nevera, congelador y despensa**. Marco productos como *comido*, *tirado* o *congelado*, y así sé de un vistazo qué me queda… y qué me falta para la lista de la compra.» |

### 3.5 · Calendario (≈ 0:20)

| Tiempo | [EN PANTALLA] | Narración |
|---|---|---|
| 3:55 | Abres **Calendario** (`sf-calendar.png`). | «El calendario familiar: eventos con asistentes, compartidos por toda la familia y **en tiempo real**. Si tu pareja crea un evento, te aparece al momento sin recargar.» |

### 3.6 · Planes con mapa y chat (≈ 0:30)

| Tiempo | [EN PANTALLA] | Narración |
|---|---|---|
| 4:15 | Abres **Planes** (`sf-plans.png`). Muestras el mapa de Google Maps y el chat del plan. | «Los planes son lo social: organizo una salida, **elijo el sitio con Google Maps** —busca lugares con Places—, cada plan tiene su **chat** y la gente confirma si va o no. Todo en un mismo hilo.» |

### 3.7 · Tickets con OCR y presupuesto (≈ 0:30)

| Tiempo | [EN PANTALLA] | Narración |
|---|---|---|
| 4:45 | Abres **Tickets / Presupuesto** (`sf-budget.png`). | «Otra parte con IA: **escaneo un ticket de la compra y un OCR lo lee**, extrayendo el gasto. Con eso controlo el **presupuesto del hogar por categorías** y veo en qué se va el dinero.» |

### 3.8 · Menú de la nevera (IA) (≈ 0:20)

| Tiempo | [EN PANTALLA] | Narración |
|---|---|---|
| 5:15 | Abres **Menú** (`sf-menu.png`). | «El *menú de la nevera*: la IA me sugiere **qué cocinar con lo que ya tengo**, para no tirar comida. Y lo que me falte, lo paso directamente a la lista de la compra.» |

### 3.9 · Rincón de pareja, peñas y estadísticas (≈ 0:30)

| Tiempo | [EN PANTALLA] | Narración |
|---|---|---|
| 5:35 | Abres **Rincón** (`sf-rincon.png`). | «Hay un **rincón de pareja**: notas, retos y detalles privados para dos, separados del resto de la familia.» |
| 5:50 | Muestras peñas/familias amigas y luego **Estadísticas** (`sf-stats.png`). | «También están las **peñas y familias amigas** para conectar hogares, y unas **estadísticas** tipo *leaderboard* que muestran quién colabora más en casa. Sano piques familiares incluidos.» |

### 3.10 · Cuenta, avatar y themes (≈ 0:40)

| Tiempo | [EN PANTALLA] | Narración |
|---|---|---|
| 6:05 | Abres **Ajustes** (`sf-settings.png`). Cambias el avatar o el nombre. | «En ajustes gestiono mi **cuenta**: cambio el **avatar**, el nombre, la contraseña, el email… y también la **familia**: invitar miembros, roles, expulsar, salir o incluso borrar la cuenta del todo.» |
| 6:25 | Cambias de **theme** en vivo: Clásico → Cuaderno → Sitcom 70s → Hommer (`theme-base`, `theme-cozy`, `theme-cozysitcom`, `theme-springfield`). Luego activas **modo oscuro**. | «Y esto es de mis partes favoritas: la app tiene **cuatro estéticas intercambiables** —Clásico, Cuaderno, Sitcom de los 70 y Hommer, tipo cómic pop— cada una con **modo claro y oscuro**. Mira cómo cambia toda la interfaz al instante… es la misma app, con cuatro personalidades.» |

### 3.11 · Offline + PWA (≈ 0:30)

| Tiempo | [EN PANTALLA] | Narración |
|---|---|---|
| 6:45 | Abres las DevTools → pestaña *Network* → activas **Offline**. Vuelves a la lista de la compra y añades un artículo a mano. | «Y ahora lo que hace especial a esta app. **Me pongo sin conexión**, desde aquí simulo que no hay internet… y fíjate: la app **sigue funcionando**. Puedo seguir añadiendo cosas a la lista.» |
| 7:05 | Desactivas *Offline* (vuelves a online). Muestras cómo el dato se sincroniza. | «Lo que escribo se guarda en una cola local —un *outbox*— y, en cuanto **vuelvo a tener conexión**, se sincroniza solo contra el servidor. Lee siempre de una base de datos local del navegador, por eso es instantánea. Puedo instalarla como app en el móvil o en el ordenador.» |

---

## 🎙️ Bloque 4 — Bajo el capó: arquitectura (≈ 2:15)

> Aquí pasas al **editor** y a un par de slides. No leas código línea a línea: muestra la *forma* del proyecto y explica las decisiones.

| Tiempo | [EN PANTALLA] | Narración |
|---|---|---|
| 7:35 | Editor: `apps/api/src/contexts/` con varias carpetas de contextos abiertas. | «Por dentro es un **monorepo con pnpm y Turborepo**, con tres paquetes: la API, la web y los contratos compartidos. El **backend está en NestJS con arquitectura hexagonal por contexto**: hay 15 *bounded contexts* y cada uno tiene cuatro capas —dominio, aplicación, infraestructura e interfaz— con la dependencia siempre hacia dentro. El dominio no sabe nada de NestJS ni de la base de datos: se comunica por **puertos** que se inyectan por token.» |
| 8:05 | Abres `packages/contracts/` y un schema Zod. | «Una decisión clave: los **contratos en Zod** son la **única fuente de verdad** de los tipos y la validación. El mismo schema lo usan la API y la web, así que **no hay tipos duplicados** y lo que valida el backend es exactamente lo que espera el frontend.» |
| 8:25 | Slide o diagrama del flujo offline (UI → Dexie → outbox → API). | «En el frontend, **React 19 con Vite**, *feature-sliced* y **offline-first**: la interfaz **siempre lee de una base de datos local** —Dexie, sobre IndexedDB— y las escrituras van a ese *outbox* que se reproduce al reconectar. Por eso va tan rápida y aguanta sin red. Encima, **realtime** con Supabase para que todo se actualice en vivo.» |
| 8:50 | Muestras la carpeta de IA / un port de IA, o lo comentas sobre el editor. | «La **IA está controlada**: voz para la lista, OCR para los tickets, sugerencia de menús y *embeddings* para la deduplicación. Y está *gated* —si un servicio de IA no responde, la app **degrada con elegancia** en vez de romperse.» |
| 9:05 | Abres `.github/workflows/` o mencionas los tests. | «Y sobre calidad: tiene **tests con Vitest** —unitarios e integración— y **Playwright** para end-to-end, con **integración continua en GitHub Actions** que corre build, lint, type-check y los unitarios en cada cambio.» |

---

## 🎙️ Bloque 5 — Cierre (≈ 0:45)

| Tiempo | [EN PANTALLA] | Narración |
|---|---|---|
| 9:15 | Vuelves al **home** de la app o a la slide de cierre con los enlaces. | «Y hasta aquí **Cosas de Casa**. Para mí ha sido el proyecto perfecto para juntar lo que más me gusta del desarrollo: una **arquitectura limpia y bien pensada**, una **experiencia offline-first** de verdad, y la **IA aplicada con cabeza**, resolviendo problemas reales del día a día.» |
| 9:35 | Slide final con repo / demo / contacto. | «Tienes el repositorio, la demo en vivo y la documentación en los enlaces. Gracias por ver el vídeo, soy Pablo Ruiz y esto ha sido mi TFM.» |

---

## ✅ Checklist post-grabación

- [ ] Revisa que **se oiga bien** y que no haya silencios largos ni notificaciones.
- [ ] Corta los momentos muertos (cargas, login lento).
- [ ] Si la IA o el mapa fallaron en directo, deja la explicación honesta o repite la toma.
- [ ] Comprueba la **duración** (objetivo 8–10 min).
- [ ] Exporta a 1080p y sube el vídeo; pega la URL en el `README.md` (sección *Entregables del TFM*) y en la slide final.
