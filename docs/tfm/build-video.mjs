#!/usr/bin/env node
/**
 * Construye el vídeo de explicación del TFM: slides (Marp → PNG) + narración por
 * diapositiva, ensamblados con ffmpeg.
 *
 * ── AUDIO INTERCAMBIABLE (lee esto) ──────────────────────────────────────────
 * El audio de cada diapositiva se toma, EN ESTE ORDEN DE PREFERENCIA, de:
 *   1) docs/tfm/audio/slide-NN.(mp3|m4a|wav|ogg)   ← TU AUDIO (mejor voz)
 *   2) Piper local (sidecar Docker)                ← fallback, voz por defecto
 *
 * Así puedes REHACER el vídeo con un audio mejor SIN tocar nada de código:
 *   1. Genera la locución de cada diapositiva (usa el texto de `guion-narracion.md`,
 *      una pista por diapositiva) con la app/voz que quieras (ElevenLabs, etc.).
 *   2. Guárdalas como  docs/tfm/audio/slide-01.mp3 , slide-02.mp3 , …  (01..15).
 *   3. Ejecuta:  node docs/tfm/build-video.mjs
 *   El script detecta tu audio, mide su duración y reconstruye el vídeo.
 *
 * Sin audio propio, sintetiza con Piper (necesita el contenedor `pyj_piper` en la
 * red `hadara_pyj`; se invoca vía `docker exec pyj_app`). Requiere ffmpeg y
 * `npx @marp-team/marp-cli` (Chrome para exportar las slides).
 *
 * Uso:  node docs/tfm/build-video.mjs
 * ─────────────────────────────────────────────────────────────────────────── */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));          // docs/tfm
const REPO = path.resolve(HERE, '../..');
const SLIDES_MD = path.join(HERE, 'slides.md');
const GUION = path.join(HERE, 'guion-narracion.md');
const AUDIO_DIR = path.join(HERE, 'audio');
const OUT = path.join(HERE, 'video-explicacion.mp4');
const WORK = '/tmp/tfm-video-work';
const sh = (c) => execSync(c, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
const tryAudioExt = ['mp3', 'm4a', 'wav', 'ogg'];

fs.mkdirSync(WORK, { recursive: true });
fs.mkdirSync(AUDIO_DIR, { recursive: true });

// 1) Narración por diapositiva, desde el guion (## Diapositiva N → texto)
const guion = fs.readFileSync(GUION, 'utf8');
const narr = [...guion.matchAll(/^##\s+Diapositiva\s+\d+\s*\n+([\s\S]*?)(?=\n##\s+Diapositiva|\n*$)/gm)]
  .map((m) => m[1].trim());
if (!narr.length) { console.error('No encuentro narraciones en', GUION); process.exit(1); }
console.log(`${narr.length} diapositivas con narración.`);

// 2) Exportar slides a PNG (Marp) si no están cacheadas
const PNG = path.join(WORK, 'slides');
fs.mkdirSync(PNG, { recursive: true });
if (!fs.existsSync(path.join(PNG, 'slide.001.png'))) {
  console.log('Exportando slides a PNG (Marp)…');
  const chrome = (() => { try { return sh('command -v google-chrome'); } catch { return ''; } })();
  sh(`${chrome ? `CHROME_PATH=${chrome} ` : ''}npx --yes @marp-team/marp-cli@latest "${SLIDES_MD}" --images png --allow-local-files -o "${PNG}/slide.png"`);
}

// helper: audio de una diapositiva (tu archivo o Piper)
function audioFor(i) {
  const nn = String(i + 1).padStart(2, '0');
  for (const ext of tryAudioExt) {
    const f = path.join(AUDIO_DIR, `slide-${nn}.${ext}`);
    if (fs.existsSync(f)) return { file: f, source: 'usuario' };
  }
  // Fallback Piper (vía pyj_app en la red de Docker)
  const idx = String(i + 1).padStart(3, '0');
  const json = path.join(WORK, `n-${idx}.json`);
  const wavHost = path.join(AUDIO_DIR, `slide-${nn}.piper.wav`);
  fs.writeFileSync(json, JSON.stringify({ text: narr[i], speed: 1.0 }));
  sh(`docker cp ${json} pyj_app:/tmp/n-${idx}.json`);
  sh(`docker exec pyj_app curl -s -X POST http://pyj_piper:5500/api/tts -H 'Content-Type: application/json' -d @/tmp/n-${idx}.json -o /tmp/n-${idx}.wav`);
  sh(`docker cp pyj_app:/tmp/n-${idx}.wav "${wavHost}"`);
  return { file: wavHost, source: 'piper' };
}

// 3) Un segmento por diapositiva (slide fija durante su locución + cola de 0.8s)
const segs = [];
for (let i = 0; i < narr.length; i++) {
  const idx = String(i + 1).padStart(3, '0');
  const png = path.join(PNG, `slide.${idx}.png`);
  if (!fs.existsSync(png)) { console.log(`(salto: falta ${png})`); continue; }
  const { file: audio, source } = audioFor(i);
  const dur = parseFloat(sh(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${audio}"`));
  const total = (dur + 0.8).toFixed(2);
  const seg = path.join(WORK, `seg-${idx}.mp4`);
  sh(`ffmpeg -y -loop 1 -i "${png}" -i "${audio}" -vf "scale=1920:1080:flags=lanczos,format=yuv420p" -c:v libx264 -r 25 -tune stillimage -af "apad=pad_dur=0.8" -t ${total} -c:a aac -b:a 192k "${seg}" 2>/dev/null`);
  segs.push(seg);
  console.log(`diapo ${i + 1}: ${dur.toFixed(1)}s (${source}) -> seg`);
}

// 4) Concatenar
const list = path.join(WORK, 'list.txt');
fs.writeFileSync(list, segs.map((s) => `file '${s}'`).join('\n'));
sh(`ffmpeg -y -f concat -safe 0 -i "${list}" -c copy "${OUT}" 2>/dev/null`);
const finalDur = sh(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${OUT}"`);
console.log(`\n✅ VÍDEO -> ${path.relative(REPO, OUT)}  (${Math.round(finalDur)}s)`);
