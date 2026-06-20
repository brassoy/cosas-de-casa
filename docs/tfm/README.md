# 📁 Documentación del TFM

Entregables de marketing y documentación del Trabajo Fin de Máster de **Cosas de Casa**.

| Archivo | Qué es |
|---|---|
| [`slides.md`](slides.md) | Presentación del proyecto en **Marp** (markdown → PDF/HTML/PPTX). |
| [`slides.pdf`](slides.pdf) | La presentación ya **exportada a PDF**. |
| [`guion-video.md`](guion-video.md) | Guion de rodaje (~9 min) por si grabas el vídeo **tú mismo** con captura de pantalla. |
| [`guion-narracion.md`](guion-narracion.md) | **Locución por diapositiva** (la que narra el vídeo automático). |
| [`video-explicacion.mp4`](video-explicacion.mp4) | **Vídeo de explicación** ya montado: slides + narración (~5,5 min). |
| [`build-video.mjs`](build-video.mjs) | Script que **reconstruye** el vídeo (slides + audio). |
| `audio/` | Carpeta para **tu audio** por diapositiva (ver abajo). |

> El vídeo **demo del producto** (animado, estética Hommer) está aparte, en `apps/web/public/landing/demo.mp4`, embebido en la landing (`/landing`).

---

## 🎬 Cómo está hecho el vídeo de explicación

Sigue la técnica de los *onboarding courses*: **slideshow narrado**. Las diapositivas de `slides.md` se exportan a PNG (Marp) y se montan con la locución de `guion-narracion.md`, una pista por diapositiva, usando **ffmpeg**. La voz por defecto se sintetiza con **Piper** (`es_ES-davefx-medium`, castellano peninsular).

```bash
node docs/tfm/build-video.mjs        # → docs/tfm/video-explicacion.mp4
```

## 🔁 Rehacerlo con una voz mejor (sin tocar código)

El audio es **intercambiable**. Si quieres una locución de más calidad (ElevenLabs, OpenAI TTS, una grabación tuya…):

1. **Genera una pista por diapositiva** usando el texto de [`guion-narracion.md`](guion-narracion.md) (hay 15 diapositivas → 15 pistas).
2. **Guárdalas** en `docs/tfm/audio/` con este nombre exacto:
   ```
   slide-01.mp3   slide-02.mp3   …   slide-15.mp3
   ```
   *(También valen `.m4a`, `.wav` u `.ogg`.)*
3. **Reconstruye**:
   ```bash
   node docs/tfm/build-video.mjs
   ```

El script detecta tu audio (tiene prioridad sobre Piper), mide su duración, mantiene cada diapositiva en pantalla durante su locución y vuelve a generar `video-explicacion.mp4`. Si falta el audio de alguna diapositiva, esa la sintetiza con Piper.

> **Requisitos** del script: `ffmpeg`, `npx @marp-team/marp-cli` (usa Chrome para exportar las slides) y —solo para el fallback de voz— el contenedor Piper `pyj_piper`.

---

## 📤 Entrega del TFM (recordatorio)

Sube a un sitio público (YouTube/Drive) el **vídeo de explicación** y las **slides**, y pega sus URLs en el [`README.md`](../../README.md) raíz (sección *Entregables*) y en el formulario de entrega. Fecha de referencia: **20/07/2026**.
