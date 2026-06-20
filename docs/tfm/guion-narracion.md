# Guion de narración — vídeo de explicación (TFM)

> Narración por diapositiva, sintetizada con **Piper** (voz `es_ES-davefx-medium`, castellano) y montada sobre las slides. Español de España, tuteo.

## Diapositiva 1

Hola. Soy Pablo Ruiz, y esto es Cosas de Casa, mi Trabajo Fin de Máster del Máster de Desarrollo con Inteligencia Artificial. Es una aplicación para organizar tu hogar en familia: en tiempo real, sin conexión, y con un toque de inteligencia artificial. Te la presento.

## Diapositiva 2

Empecemos por el problema. Organizar una casa entre varias personas es un caos: cada uno apunta la compra donde puede, las tareas nunca están claras y siempre las hace el mismo, nadie sabe qué hay en la nevera y se compra dos veces lo mismo, y el plan del finde acaba repartido en cinco chats distintos. Falta un único sitio compartido que, además, funcione aunque te quedes sin cobertura.

## Diapositiva 3

Cosas de Casa reúne todo el hogar en una sola aplicación. Es multifamilia, con invitaciones por pin, roles y gestión de miembros. Funciona en tiempo real: lo que apunta uno, lo ve el resto al instante. Es una aplicación web progresiva, instalable y funcional sin conexión. Aplica inteligencia artificial donde de verdad aporta. Y trae cuatro estéticas intercambiables, con modo claro y oscuro. Está pensada como un producto real, no como una demostración de juguete.

## Diapositiva 4

Estas son sus funcionalidades. La lista de la compra por voz: la dictas, y la inteligencia artificial extrae los productos y evita duplicados. Las tareas del hogar, que puedes crear, asignar, y a las que adjuntar fotos. El control de la nevera, el congelador y la despensa. Un calendario familiar, con asistentes y en tiempo real. Los planes, donde eliges el sitio con Google Maps, con chat y confirmación de asistencia. Y los tickets, con reconocimiento óptico, para controlar el presupuesto por categorías.

## Diapositiva 5

Hay más. El menú de la nevera, donde la inteligencia artificial te sugiere qué cocinar con lo que ya tienes. El rincón de pareja, con notas y retos privados para dos. Peñas y familias amigas, para conectar unos hogares con otros. Estadísticas, con un ranking de quién colabora más en casa. La gestión completa de tu cuenta y tu familia. Y los cuatro themes, con modo claro y oscuro.

## Diapositiva 6

Aquí tienes la aplicación en funcionamiento: el inicio y la lista de la compra, que es el corazón de la app. Dictas la compra con la voz, y la inteligencia artificial la entiende, separa los productos, y no duplica lo que ya tenías apuntado.

## Diapositiva 7

Más pantallas reales: las tareas con fotos, la nevera, y los planes con mapa y chat. Todo lo comparte la familia, y se actualiza en tiempo real entre todos los miembros.

## Diapositiva 8

Una de las partes que más disfruté: los cuatro themes. Clásico, Cuaderno, Sitcom de los setenta, y Hommer, de estilo cómic pop. Cada uno con su modo claro y oscuro. Y lo importante: es una sola base de código. Cada pantalla tiene una celda de presentación por theme, sin duplicar la lógica.

## Diapositiva 9

Vamos por dentro. El backend es Nest J S, con arquitectura hexagonal por contexto: quince contextos acotados. Cada uno tiene cuatro capas, con la dependencia siempre hacia dentro: dominio, con los agregados y los puertos; aplicación, con un caso de uso por archivo; infraestructura, con los repositorios; e interfaz, con los controladores y los guardas de seguridad. Los puertos se inyectan por token, nunca por clase concreta, así que el dominio no conoce el framework.

## Diapositiva 10

El pegamento entre el backend y el frontend son los contratos con Zod: una única fuente de verdad. El mismo esquema lo usan la API y la web, así que no hay tipos duplicados, y lo que valida el backend es exactamente lo que espera el frontend. El frontend es offline first: la interfaz siempre lee de una base de datos local en el navegador, por eso es instantánea; y las escrituras van a una cola que se reproduce contra la API cuando vuelve la conexión.

## Diapositiva 11

Este es el stack completo. En el backend: Nest J S, Drizzle, Postgres, Zod y autenticación por token. En el frontend: React diecinueve, Vite, TanStack, Zustand, Dexie, y aplicación web progresiva. La plataforma es Supabase, con base de datos, autenticación, almacenamiento y tiempo real, más Google Maps. La inteligencia artificial cubre voz, reconocimiento de tickets, menús y embeddings. Y la calidad se cuida con Vitest, Playwright e integración continua. Todo en un monorepo, con pnpm y Turborepo.

## Diapositiva 12

Sobre la inteligencia artificial, la apliqué con cabeza, no por moda. La voz se convierte en productos. La deduplicación semántica entiende que leche y dos litros de leche son lo mismo. El reconocimiento óptico lee el gasto desde la foto de un recibo. Y el menú se sugiere con lo que hay en la nevera. Además, la inteligencia artificial está controlada: si un servicio no responde, la aplicación degrada con elegancia en vez de romperse. La experiencia nunca depende de que la inteligencia artificial esté disponible.

## Diapositiva 13

La calidad y el proceso también importan. Hay tests unitarios y de integración con Vitest, tests de extremo a extremo con Playwright, e integración continua que, en cada cambio, comprueba el build, el linter, los tipos y los tests. La validación es de extremo a extremo con Zod. La seguridad combina autenticación por token, guardas de alcance por recurso, y seguridad a nivel de fila en la base de datos. Y el porqué de cada decisión está documentado.

## Diapositiva 14

Como conclusiones y aprendizajes: una arquitectura limpia, hexagonal y con contratos compartidos, escala y se entiende. El offline first, de verdad, cambia la experiencia: la hace rápida y resistente a la red. La inteligencia artificial aporta cuando resuelve un problema real. Un monorepo bien organizado mantiene la API, la web y los tipos en sintonía. Y separar la lógica de la presentación permite tener cuatro themes sin duplicar la lógica. El verdadero reto no fue una tecnología en concreto, sino integrarlas todas, con criterio, en un producto coherente.

## Diapositiva 15

Y hasta aquí. Gracias por tu atención. En el repositorio encontrarás todo el código, la documentación, la demo en vivo y este vídeo. Soy Pablo Ruiz, y esto ha sido Cosas de Casa. Muchas gracias.

