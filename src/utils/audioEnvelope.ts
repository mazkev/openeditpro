import type { Voiceover } from '../types/editor';

interface CachedEnvelope {
  sampleRateHz: number;
  samples: Float32Array;
}

const SAMPLE_RATE_HZ = 24;
const envelopeCache = new Map<string, CachedEnvelope>();
const envelopePromises = new Map<string, Promise<CachedEnvelope | null>>();

/**
 * Decodes an audio URL and extracts a normalized 24Hz RMS amplitude envelope (0..1)
 * for deterministic lip-sync in both live PreviewPlayer and offline MP4 Export.
 */
export function ensureVoiceoverEnvelope(url: string): Promise<CachedEnvelope | null> {
  if (!url) return Promise.resolve(null);
  const cached = envelopeCache.get(url);
  if (cached) return Promise.resolve(cached);

  const existing = envelopePromises.get(url);
  if (existing) return existing;

  const promise = (async (): Promise<CachedEnvelope | null> => {
    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const arrayBuf = await resp.arrayBuffer();

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;

      const ctx = new AudioCtx();
      try {
        const audioBuffer = await ctx.decodeAudioData(arrayBuf);
        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const stepSamples = Math.max(1, Math.floor(sampleRate / SAMPLE_RATE_HZ));
        const bucketCount = Math.max(1, Math.ceil(channelData.length / stepSamples));
        const raw = new Float32Array(bucketCount);

        let peak = 0.001;
        for (let i = 0; i < bucketCount; i++) {
          const start = i * stepSamples;
          const end = Math.min(channelData.length, start + stepSamples);
          let sumSq = 0;
          for (let j = start; j < end; j++) {
            const v = channelData[j];
            sumSq += v * v;
          }
          const rms = Math.sqrt(sumSq / Math.max(1, end - start));
          raw[i] = rms;
          if (rms > peak) peak = rms;
        }

        // Normalize to 0..1 with slight noise-gate & smoothing for natural mouth motion
        const samples = new Float32Array(bucketCount);
        const invPeak = 1 / peak;
        for (let i = 0; i < bucketCount; i++) {
          const norm = Math.min(1, raw[i] * invPeak * 1.25);
          const gated = norm < 0.08 ? 0 : norm;
          const prev = i > 0 ? samples[i - 1] : gated;
          samples[i] = prev * 0.35 + gated * 0.65;
        }

        const result: CachedEnvelope = { sampleRateHz: SAMPLE_RATE_HZ, samples };
        envelopeCache.set(url, result);
        return result;
      } finally {
        await ctx.close().catch(() => {});
      }
    } catch {
      return null;
    }
  })();

  envelopePromises.set(url, promise);
  return promise;
}

/**
 * Returns normalized mouth openness (0..1) at `globalTimeSec` if voiceovers exist,
 * or `null` when no voiceovers are present in the project.
 */
export function getVoiceoverMouthOpenAt(
  voiceovers: Voiceover[],
  globalTimeSec: number
): number | null {
  const speechVoiceovers = voiceovers.filter((v) => !v.id.startsWith('vo-sfx-'));
  if (speechVoiceovers.length === 0) return null;

  for (const vo of speechVoiceovers) {
    const start = vo.startTime;
    const end = vo.startTime + vo.duration;
    if (globalTimeSec >= start && globalTimeSec <= end) {
      const env = envelopeCache.get(vo.url);
      if (!env) {
        void ensureVoiceoverEnvelope(vo.url);
        return null;
      }
      const localT = Math.max(0, globalTimeSec - start + (vo.trimStart || 0));
      const idx = Math.min(
        env.samples.length - 1,
        Math.max(0, Math.floor(localT * env.sampleRateHz))
      );
      return env.samples[idx];
    }
  }

  // Project has voiceovers, but current timestamp is in a silent pause between lines
  return 0;
}
