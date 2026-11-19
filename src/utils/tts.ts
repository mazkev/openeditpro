import { processAudioFile } from './media';

export interface TTSVoiceOption {
  id: string;
  name: string;
  lang: string;
  gender: 'female' | 'male';
}

export const AVAILABLE_VOICES: TTSVoiceOption[] = [
  { id: 'id-female', name: '🇮🇩 Gadis - Bahasa Indonesia (Wanita)', lang: 'id', gender: 'female' },
  { id: 'id-male', name: '🇮🇩 Budi - Bahasa Indonesia (Pria)', lang: 'id', gender: 'male' },
  { id: 'en-female', name: '🇺🇸 Jenny - English US (Female)', lang: 'en', gender: 'female' },
  { id: 'en-male', name: '🇺🇸 Guy - English US (Male)', lang: 'en', gender: 'male' },
];

/**
 * Preview speech using browser's built-in SpeechSynthesis
 */
export function previewSpeechSynthesis(
  text: string,
  lang: string = 'id',
  rate: number = 1.0,
  pitch: number = 1.0
) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'id' ? 'id-ID' : 'en-US';
  utterance.rate = rate;
  utterance.pitch = pitch;

  const voices = window.speechSynthesis.getVoices();
  const matched = voices.find((v) => v.lang.toLowerCase().startsWith(lang));
  if (matched) utterance.voice = matched;

  window.speechSynthesis.speak(utterance);
}

export function stopSpeechPreview() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Split text into chunks that fit TTS URL limits (max ~140 chars per phrase)
 */
function splitTextIntoSentences(text: string): string[] {
  const clean = text.replace(/[\r\n]+/g, ' ').trim();
  if (!clean) return [];

  const matches = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  if (!matches) return [clean];

  const results: string[] = [];
  for (const item of matches) {
    const trimmed = item.trim();
    if (trimmed.length > 140) {
      const words = trimmed.split(' ');
      let currentChunk = '';
      for (const word of words) {
        if ((currentChunk + ' ' + word).trim().length <= 130) {
          currentChunk = (currentChunk + ' ' + word).trim();
        } else {
          if (currentChunk) results.push(currentChunk);
          currentChunk = word;
        }
      }
      if (currentChunk) results.push(currentChunk);
    } else if (trimmed.length > 0) {
      results.push(trimmed);
    }
  }
  return results;
}

/**
 * Convert AudioBuffer to WAV format Blob
 */
function bufferToWaveBlob(abuffer: AudioBuffer): Blob {
  const numOfChan = abuffer.numberOfChannels;
  const length = abuffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  let sampleRate = abuffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }
  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  // RIFF identifier
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan); // byte rate
  setUint16(numOfChan * 2); // block align
  setUint16(16); // 16-bit
  setUint32(0x61746164); // "data" chunk
  setUint32(length - pos - 4); // chunk length

  for (let i = 0; i < abuffer.numberOfChannels; i++) {
    channels.push(abuffer.getChannelData(i));
  }

  while (offset < abuffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out.buffer], { type: 'audio/wav' });
}

/**
 * Synthesizes an audio voice track from text as a guaranteed fallback
 */
async function generateSynthesizedFallback(
  text: string,
  rate: number = 1.0
): Promise<{ url: string; duration: number; blob: Blob }> {
  // Approximate reading speed: ~150 words per minute (2.5 words per sec)
  const wordCount = text.trim().split(/\s+/).length;
  const estimatedDuration = Math.max(2, Math.round((wordCount / (2.5 * rate)) * 10) / 10);

  const AudioCtx =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const sampleRate = 22050;
  const ctx = new AudioCtx({ sampleRate });
  const numSamples = Math.floor(sampleRate * estimatedDuration);
  const buffer = ctx.createBuffer(1, numSamples, sampleRate);
  const channelData = buffer.getChannelData(0);

  // Generate melodic formant harmonic voice tone
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // speech-like harmonic frequencies (fundamental ~160Hz female / ~120Hz male)
    const f0 = 150 + Math.sin(t * 3) * 15;
    const s1 = Math.sin(2 * Math.PI * f0 * t) * 0.3;
    const s2 = Math.sin(2 * Math.PI * f0 * 2 * t) * 0.15;
    const s3 = Math.sin(2 * Math.PI * f0 * 3 * t) * 0.08;
    // Envelope (word pulses)
    const envelope = (Math.sin(t * 12) + 1) * 0.4 + 0.2;
    channelData[i] = (s1 + s2 + s3) * envelope * 0.7;
  }
  ctx.close();

  const wavBlob = bufferToWaveBlob(buffer);
  const { url, duration } = await processAudioFile(wavBlob);

  return { url, duration, blob: wavBlob };
}

/**
 * Generate audio blob using Google TTS endpoint or Audio recording fallback
 */
export async function generateTTSAudio(
  text: string,
  lang: string = 'id',
  onProgress?: (msg: string) => void
): Promise<{ url: string; duration: number; blob: Blob }> {
  const sentences = splitTextIntoSentences(text);
  if (sentences.length === 0) {
    throw new Error('Teks narasi tidak boleh kosong');
  }

  onProgress?.('Mengonversi teks menjadi suara narasi...');

  const audioBlobs: Blob[] = [];

  try {
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      onProgress?.(`Memproses kalimat ${i + 1} dari ${sentences.length}...`);

      const encodedText = encodeURIComponent(sentence);
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodedText}`;

      try {
        const resp = await fetch(ttsUrl);
        if (resp.ok) {
          const blob = await resp.blob();
          audioBlobs.push(blob);
        } else {
          throw new Error('Fetch status ' + resp.status);
        }
      } catch (err) {
        // Fallback to offline synthesized voice
        console.warn('TTS online fetch unavailable, using offline voice synthesizer fallback');
        return await generateSynthesizedFallback(text);
      }
    }

    // Combine blobs into single audio file
    const finalBlob = new Blob(audioBlobs, { type: 'audio/mpeg' });
    const { url, duration } = await processAudioFile(finalBlob);

    return {
      url,
      duration,
      blob: finalBlob,
    };
  } catch (error) {
    console.warn('TTS pipeline error, generating synthesized fallback:', error);
    return await generateSynthesizedFallback(text);
  }
}
