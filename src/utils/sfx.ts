export type CartoonSfxId = 'pop' | 'ding' | 'whoosh' | 'shock' | 'sparkle' | 'bloop';

export interface CartoonSfxPreset {
  id: CartoonSfxId;
  name: string;
  icon: string;
  description: string;
  durationSec: number;
}

export const CARTOON_SFX_PRESETS: CartoonSfxPreset[] = [
  {
    id: 'pop',
    name: 'Pop! Kartun',
    icon: '🫧',
    description: 'Suara gelembung pop saat karakter atau balon kata muncul',
    durationSec: 0.22,
  },
  {
    id: 'ding',
    name: 'Ding! Ide',
    icon: '💡',
    description: 'Lonceng cerah saat bohlam ide atau fakta muncul',
    durationSec: 0.65,
  },
  {
    id: 'whoosh',
    name: 'Whoosh! Geser',
    icon: '💨',
    description: 'Desiran angin cepat untuk transisi antar adegan',
    durationSec: 0.35,
  },
  {
    id: 'shock',
    name: 'Boom! Kaget',
    icon: '⚡',
    description: 'Dentuman komik dramatis untuk adegan plot twist / kaget',
    durationSec: 0.7,
  },
  {
    id: 'sparkle',
    name: 'Kilau Ajaib',
    icon: '✨',
    description: 'Nada arpeggio berkilau untuk perayaan & konfeti',
    durationSec: 0.65,
  },
  {
    id: 'bloop',
    name: 'Bloop! Tanya',
    icon: '❓',
    description: 'Nada naik imut untuk adegan berpikir ("Kok bisa?!")',
    durationSec: 0.28,
  },
];

const sfxUrlCache = new Map<CartoonSfxId, { url: string; duration: number }>();

function encodeWavFromFloat32(samples: Float32Array, sampleRate: number): Blob {
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Synthesizes crisp cartoon sound effects as a cached WAV Blob URL
 * compatible with both PreviewPlayer and Mediabunny MP4 Export.
 */
export function getCartoonSfxAudio(id: CartoonSfxId): { url: string; duration: number } {
  const cached = sfxUrlCache.get(id);
  if (cached) return cached;

  const sampleRate = 44100;
  const preset = CARTOON_SFX_PRESETS.find((p) => p.id === id) || CARTOON_SFX_PRESETS[0];
  const duration = preset.durationSec;
  const length = Math.floor(sampleRate * duration);
  const samples = new Float32Array(length);

  let phase = 0;
  let noiseState = 0;

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const progress = t / duration;
    let val = 0;

    switch (id) {
      case 'pop': {
        // Fast upward sine sweep 320Hz -> 950Hz with crisp decay
        const freq = 320 + Math.pow(progress, 0.7) * 630;
        phase += (2 * Math.PI * freq) / sampleRate;
        const env = Math.sin(Math.min(1, progress * 6) * (Math.PI / 2)) * Math.pow(1 - progress, 2.2);
        val = Math.sin(phase) * env * 0.75;
        break;
      }
      case 'bloop': {
        // Cute rising cartoon pitch 280Hz -> 720Hz
        const freq = 280 + progress * 440;
        phase += (2 * Math.PI * freq) / sampleRate;
        const env = Math.sin(Math.min(1, progress * 8) * (Math.PI / 2)) * Math.pow(1 - progress, 1.5);
        val = Math.sin(phase) * env * 0.65;
        break;
      }
      case 'ding': {
        // Bright bell chime (1046.5Hz C6 + 2093Hz C7)
        const env1 = Math.exp(-t * 6.5);
        const env2 = Math.exp(-t * 11.0);
        const attack = Math.min(1, t / 0.008);
        val =
          attack *
          (Math.sin(2 * Math.PI * 1046.5 * t) * env1 * 0.5 +
            Math.sin(2 * Math.PI * 2093 * t) * env2 * 0.25);
        break;
      }
      case 'whoosh': {
        // Smooth low-passed white noise sweep
        const white = Math.random() * 2 - 1;
        const cutoff = 0.04 + Math.sin(progress * Math.PI) * 0.28;
        noiseState = noiseState + cutoff * (white - noiseState);
        const env = Math.sin(progress * Math.PI);
        val = noiseState * env * 1.1;
        break;
      }
      case 'shock': {
        // Punchy low bass drop + high metallic sting
        const bassFreq = 160 * Math.exp(-t * 4.5) + 45;
        phase += (2 * Math.PI * bassFreq) / sampleRate;
        const bassEnv = Math.exp(-t * 4.2);
        const stingEnv = Math.exp(-t * 9.0);
        const sting = Math.sin(2 * Math.PI * 740 * t) * 0.22 * stingEnv;
        val = (Math.sin(phase) * bassEnv * 0.8 + sting) * Math.min(1, t / 0.006);
        break;
      }
      case 'sparkle': {
        // Ascending C6 - E6 - G6 - C7 chime arpeggio
        const notes = [1046.5, 1318.5, 1567.98, 2093.0];
        const stepDur = duration / notes.length;
        const noteIdx = Math.min(notes.length - 1, Math.floor(t / stepDur));
        const localT = t - noteIdx * stepDur;
        const env = Math.min(1, localT / 0.006) * Math.exp(-localT * 9.0);
        val = Math.sin(2 * Math.PI * notes[noteIdx] * t) * env * 0.55;
        break;
      }
    }

    samples[i] = val;
  }

  const blob = encodeWavFromFloat32(samples, sampleRate);
  const url = URL.createObjectURL(blob);
  const result = { url, duration };
  sfxUrlCache.set(id, result);
  return result;
}

export function previewCartoonSfx(id: CartoonSfxId): void {
  const { url } = getCartoonSfxAudio(id);
  const audio = new Audio(url);
  audio.volume = 0.85;
  void audio.play().catch(() => {});
}
