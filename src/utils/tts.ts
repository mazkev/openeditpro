import { processAudioFile } from './media';
import type { Subtitle } from '../types/editor';

export interface TTSVoiceOption {
  id: string;
  name: string;
  lang: string;
  gender: 'female' | 'male';
  category: 'id' | 'en' | 'intl';
  description?: string;
  flag?: string;
  defaultPitch?: number;
  defaultSpeed?: number;
}

export interface VoiceEffectPreset {
  id: string;
  name: string;
  icon: string;
  pitch: number;
  speed: number;
  description: string;
}

export const VOICE_EFFECTS: VoiceEffectPreset[] = [
  {
    id: 'normal',
    name: 'Standar Alami',
    icon: '🎙️',
    pitch: 1.0,
    speed: 1.0,
    description: 'Suara asli jernih & profesional',
  },
  {
    id: 'cute',
    name: 'Ceria / Anime',
    icon: '🌸',
    pitch: 1.30,
    speed: 1.05,
    description: 'Nada tinggi, ceria & manis ala karakter anime/vlog',
  },
  {
    id: 'deep',
    name: 'Deep Movie / Wibawa',
    icon: '🎬',
    pitch: 0.82,
    speed: 0.95,
    description: 'Suara berat, berwibawa & sinematik ala trailer film',
  },
  {
    id: 'chipmunk',
    name: 'Kartun / Lucu',
    icon: '🐿️',
    pitch: 1.55,
    speed: 1.15,
    description: 'Efek suara kartun tupai jenaka & menghibur',
  },
  {
    id: 'monster',
    name: 'Raksasa / Monster',
    icon: '👾',
    pitch: 0.68,
    speed: 0.88,
    description: 'Suara bass rendah menggelegar & misterius',
  },
  {
    id: 'hype',
    name: 'Hype & Semangat',
    icon: '⚡',
    pitch: 1.08,
    speed: 1.25,
    description: 'Tempo cepat berenergi untuk video promo & TikTok',
  },
  {
    id: 'calm',
    name: 'Santai & Storytelling',
    icon: '🌙',
    pitch: 0.95,
    speed: 0.88,
    description: 'Tempo tenang & syahdu untuk kisah dongeng & puisi',
  },
];

export const AVAILABLE_VOICES: TTSVoiceOption[] = [
  // INDONESIA
  {
    id: 'id-female',
    name: 'Gadis (Ramah & Alami)',
    lang: 'id',
    gender: 'female',
    category: 'id',
    flag: '🇮🇩',
    description: 'Suara wanita ramah, cocok untuk tutorial, vlog & presentasi',
  },
  {
    id: 'id-male',
    name: 'Budi (Formal & Berita)',
    lang: 'id',
    gender: 'male',
    category: 'id',
    flag: '🇮🇩',
    description: 'Suara pria formal, cocok untuk narasi berita, edukasi & dokumenter',
  },
  {
    id: 'id-female-2',
    name: 'Siti (Lembut & Storyteller)',
    lang: 'id',
    gender: 'female',
    category: 'id',
    flag: '🇮🇩',
    description: 'Suara wanita halus & hangat untuk puisi, kisah dongeng & meditasi',
    defaultPitch: 0.96,
    defaultSpeed: 0.92,
  },
  {
    id: 'id-male-2',
    name: 'Bayu (Santai & Podcast)',
    lang: 'id',
    gender: 'male',
    category: 'id',
    flag: '🇮🇩',
    description: 'Suara santai & akrab untuk podcast, obrolan santai & unboxing',
    defaultPitch: 0.94,
    defaultSpeed: 1.02,
  },
  {
    id: 'id-female-3',
    name: 'Rina (Ceria & Konten Kreator)',
    lang: 'id',
    gender: 'female',
    category: 'id',
    flag: '🇮🇩',
    description: 'Suara energik & ceria untuk video reels & TikTok',
    defaultPitch: 1.15,
    defaultSpeed: 1.08,
  },
  {
    id: 'id-male-3',
    name: 'Dimas (Wibawa & Sinematik)',
    lang: 'id',
    gender: 'male',
    category: 'id',
    flag: '🇮🇩',
    description: 'Suara berat berkarisma untuk pengantar video sinematik',
    defaultPitch: 0.84,
    defaultSpeed: 0.95,
  },

  // ENGLISH
  {
    id: 'en-female',
    name: 'Jenny (US Casual / Vlog)',
    lang: 'en',
    gender: 'female',
    category: 'en',
    flag: '🇺🇸',
    description: 'Natural American female creator voice for vlogs & tutorials',
  },
  {
    id: 'en-male',
    name: 'Guy (US Podcast Host)',
    lang: 'en-US',
    gender: 'male',
    category: 'en',
    flag: '🇺🇸',
    description: 'Dynamic & confident American male voice for gaming & tech',
  },
  {
    id: 'en-female-2',
    name: 'Aria (US Commercial & Clear)',
    lang: 'en',
    gender: 'female',
    category: 'en',
    flag: '🇺🇸',
    description: 'Crisp & persuasive American female voice for promos',
    defaultPitch: 1.08,
    defaultSpeed: 1.05,
  },
  {
    id: 'en-male-2',
    name: 'Christopher (US Deep Narrator)',
    lang: 'en-US',
    gender: 'male',
    category: 'en',
    flag: '🇺🇸',
    description: 'Deep resonant American baritone for dramatic voiceovers',
    defaultPitch: 0.86,
    defaultSpeed: 0.95,
  },
  {
    id: 'en-female-uk',
    name: 'Sonia (British Elegant)',
    lang: 'en-GB',
    gender: 'female',
    category: 'en',
    flag: '🇬🇧',
    description: 'Sophisticated British RP female accent for luxury & explainers',
  },
  {
    id: 'en-male-uk',
    name: 'Oliver (British Classic Narrator)',
    lang: 'en-GB',
    gender: 'male',
    category: 'en',
    flag: '🇬🇧',
    description: 'Classic British documentary style voice',
  },
  {
    id: 'en-female-au',
    name: 'Chloe (Australian Casual)',
    lang: 'en-AU',
    gender: 'female',
    category: 'en',
    flag: '🇦🇺',
    description: 'Friendly & upbeat Australian accent',
  },

  // INTERNATIONAL & ASIA
  {
    id: 'ja-female',
    name: 'Nanami (Anime / Kawaii)',
    lang: 'ja',
    gender: 'female',
    category: 'intl',
    flag: '🇯🇵',
    description: 'Japanese female voice ideal for anime & aesthetic clips',
    defaultPitch: 1.25,
    defaultSpeed: 1.05,
  },
  {
    id: 'ja-male',
    name: 'Keita (Anime Action / Dynamic)',
    lang: 'ja',
    gender: 'male',
    category: 'intl',
    flag: '🇯🇵',
    description: 'Japanese male voice for gaming & dramatic clips',
  },
  {
    id: 'ko-female',
    name: 'Sun-Hi (K-Drama / Soft)',
    lang: 'ko',
    gender: 'female',
    category: 'intl',
    flag: '🇰🇷',
    description: 'Korean melodramatic female voice for romance & beauty vlogs',
  },
  {
    id: 'ko-male',
    name: 'Min-Ho (K-Oppa Narrator)',
    lang: 'ko',
    gender: 'male',
    category: 'intl',
    flag: '🇰🇷',
    description: 'Korean calm male voice for storytelling & lifestyle',
  },
  {
    id: 'ar-male',
    name: 'Zayd (Arabic / Fasih)',
    lang: 'ar',
    gender: 'male',
    category: 'intl',
    flag: '🇸🇦',
    description: 'Clear, eloquent Arabic voice for quotes & recitations',
  },
  {
    id: 'zh-female',
    name: 'Mei-Ling (Mandarin Clear)',
    lang: 'zh-CN',
    gender: 'female',
    category: 'intl',
    flag: '🇨🇳',
    description: 'Standard Mandarin Chinese, clear & melodious',
  },
  {
    id: 'fr-female',
    name: 'Camille (French Elegance)',
    lang: 'fr',
    gender: 'female',
    category: 'intl',
    flag: '🇫🇷',
    description: 'Chic, romantic French voice for fashion & art',
  },
  {
    id: 'de-male',
    name: 'Hans (German Professional)',
    lang: 'de',
    gender: 'male',
    category: 'intl',
    flag: '🇩🇪',
    description: 'Strong, authoritative German male voice',
  },
  {
    id: 'es-female',
    name: 'Sofia (Spanish Expressive)',
    lang: 'es',
    gender: 'female',
    category: 'intl',
    flag: '🇪🇸',
    description: 'Warm & vibrant Spanish / Latin American voice',
  },
  {
    id: 'th-female',
    name: 'Mali (Thai Melodic)',
    lang: 'th',
    gender: 'female',
    category: 'intl',
    flag: '🇹🇭',
    description: 'Melodic & gentle Thai voice for travel & culture',
  },
  {
    id: 'ru-male',
    name: 'Dimitri (Russian Deep)',
    lang: 'ru',
    gender: 'male',
    category: 'intl',
    flag: '🇷🇺',
    description: 'Deep cinematic Russian male voice',
  },
];

/**
 * Get voices installed natively in the user's browser/operating system
 */
export function getSystemVoices(): { id: string; name: string; lang: string }[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices().map((v) => ({
    id: `sys-${v.name}`,
    name: `${v.name} (${v.lang})`,
    lang: v.lang,
  }));
}

/**
 * Preview speech using browser's built-in SpeechSynthesis with live pitch and rate
 */
export function previewSpeechSynthesis(
  text: string,
  lang: string = 'id',
  rate: number = 1.0,
  pitch: number = 1.0,
  voiceName?: string
) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = Math.max(0.5, Math.min(2.0, rate));
  utterance.pitch = Math.max(0.5, Math.min(2.0, pitch));

  const voices = window.speechSynthesis.getVoices();
  if (voiceName) {
    const matched = voices.find((v) => v.name === voiceName || v.voiceURI === voiceName);
    if (matched) {
      utterance.voice = matched;
      utterance.lang = matched.lang;
    }
  } else {
    utterance.lang = lang === 'id' ? 'id-ID' : lang.startsWith('en') ? 'en-US' : lang;
    const cleanLang = lang.toLowerCase().slice(0, 2);
    const matched = voices.find((v) => v.lang.toLowerCase().startsWith(cleanLang));
    if (matched) utterance.voice = matched;
  }

  window.speechSynthesis.speak(utterance);
}

/**
 * Encodes an AudioBuffer into standard 16-bit PCM WAV Blob
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const sampleRate = buffer.sampleRate;
  let pos = 0;

  function writeString(str: string) {
    for (let i = 0; i < str.length; i++) {
      out.setUint8(pos++, str.charCodeAt(i));
    }
  }

  // RIFF header
  writeString('RIFF');
  out.setUint32(pos, length - 8, true);
  pos += 4;
  writeString('WAVE');
  writeString('fmt ');
  out.setUint32(pos, 16, true); // Subchunk1Size
  pos += 4;
  out.setUint16(pos, 1, true); // PCM format
  pos += 2;
  out.setUint16(pos, numOfChan, true);
  pos += 2;
  out.setUint32(pos, sampleRate, true);
  pos += 4;
  out.setUint32(pos, sampleRate * 2 * numOfChan, true); // Byte rate
  pos += 4;
  out.setUint16(pos, numOfChan * 2, true); // Block align
  pos += 2;
  out.setUint16(pos, 16, true); // Bits per sample
  pos += 2;
  writeString('data');
  out.setUint32(pos, length - pos - 4, true);
  pos += 4;

  const channels: Float32Array[] = [];
  for (let i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 0;
  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      const sample = Math.max(-1, Math.min(1, channels[i][offset]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      out.setInt16(pos, intSample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out], { type: 'audio/wav' });
}

/**
 * Modulate audio pitch and speed using OfflineAudioContext playbackRate and export to WAV
 */
export async function applyAudioModulation(
  blob: Blob,
  playbackRate: number = 1.0
): Promise<Blob> {
  if (Math.abs(playbackRate - 1.0) < 0.02) {
    return blob;
  }
  const AudioCtxClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtxClass) return blob;

  const audioCtx = new AudioCtxClass();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);

    const targetLength = Math.max(1, Math.round(decoded.length / playbackRate));
    const offlineCtx = new OfflineAudioContext(
      decoded.numberOfChannels,
      targetLength,
      decoded.sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;
    source.playbackRate.value = playbackRate;
    source.connect(offlineCtx.destination);
    source.start(0);

    const rendered = await offlineCtx.startRendering();
    return audioBufferToWav(rendered);
  } finally {
    audioCtx.close();
  }
}

/**
 * Split text into chunks that fit TTS URL limits (max ~130 chars per phrase)
 */
function splitTextIntoSentences(text: string): string[] {
  const clean = text.replace(/[\r\n]+/g, ' ').trim();
  if (!clean) return [];

  const matches = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  if (!matches) return [clean];

  const results: string[] = [];
  for (const item of matches) {
    const trimmed = item.trim();
    if (trimmed.length > 130) {
      const words = trimmed.split(' ');
      let currentChunk = '';
      for (const word of words) {
        if ((currentChunk + ' ' + word).trim().length <= 120) {
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
 * Split text into synchronized subtitle blocks matching narration duration
 */
export function generateSyncedSubtitlesFromText(
  fullText: string,
  startTime: number,
  totalDuration: number
): Subtitle[] {
  const clean = fullText.replace(/[\r\n]+/g, ' ').trim();
  if (!clean) return [];

  // Match sentences by punctuation or comma clauses
  const rawSentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
  const phrases: string[] = [];

  for (const raw of rawSentences) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const words = trimmed.split(/\s+/);
    // If sentence is short (<= 6 words), keep as one phrase
    if (words.length <= 6) {
      phrases.push(trimmed);
    } else {
      // Split into 4-6 word chunks for natural CapCut / TikTok pacing
      let chunk: string[] = [];
      for (let i = 0; i < words.length; i++) {
        chunk.push(words[i]);
        if (chunk.length >= 5 || (chunk.length >= 3 && i === words.length - 1)) {
          phrases.push(chunk.join(' '));
          chunk = [];
        }
      }
      if (chunk.length > 0) {
        phrases.push(chunk.join(' '));
      }
    }
  }

  if (phrases.length === 0) return [];

  // Calculate proportional durations based on character length
  const totalChars = phrases.reduce((acc, p) => acc + p.length, 0);
  let currentStart = startTime;
  const subtitles: Subtitle[] = [];

  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    const ratio = phrase.length / totalChars;
    let phraseDur = Math.max(0.8, parseFloat((ratio * totalDuration).toFixed(2)));

    // Ensure the last phrase covers the remaining audio duration
    if (i === phrases.length - 1) {
      phraseDur = Math.max(1.0, parseFloat((startTime + totalDuration - currentStart).toFixed(2)));
    }

    const start = parseFloat(currentStart.toFixed(2));
    const end = parseFloat((currentStart + phraseDur).toFixed(2));

    subtitles.push({
      id: `sub-sync-${Date.now()}-${i}`,
      text: phrase,
      startTime: start,
      endTime: end,
      fontSize: 26,
      color: '#ffffff',
      bgColor: 'rgba(0, 0, 0, 0.75)',
      positionY: 80,
    });

    currentStart = end;
  }

  return subtitles;
}

export interface TTSGenerateOptions {
  pitch?: number;
  speed?: number;
  onProgress?: (msg: string) => void;
}

/**
 * Generate audio blob using Google TTS endpoint with local proxy or direct audio streaming,
 * with optional pitch and speed audio modulation.
 */
export async function generateTTSAudio(
  text: string,
  lang: string = 'id',
  optionsOrProgress?: TTSGenerateOptions | ((msg: string) => void)
): Promise<{ url: string; duration: number }> {
  const options: TTSGenerateOptions =
    typeof optionsOrProgress === 'function'
      ? { onProgress: optionsOrProgress }
      : optionsOrProgress || {};

  const { pitch = 1.0, speed = 1.0, onProgress } = options;

  const sentences = splitTextIntoSentences(text);
  if (sentences.length === 0) {
    throw new Error('Teks narasi tidak boleh kosong');
  }

  onProgress?.('Menghubungkan ke layanan suara manusia alami...');

  const audioBlobs: Blob[] = [];
  let useDirectUrls = false;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    onProgress?.(`Memproses kalimat ${i + 1} dari ${sentences.length}...`);

    const encoded = encodeURIComponent(sentence);
    // 1. Try local dev proxy first (/api/tts)
    const proxyUrl = `/api/tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encoded}`;
    // 2. Direct Google TTS url
    const directUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encoded}`;

    try {
      const resp = await fetch(proxyUrl);
      if (resp.ok) {
        const blob = await resp.blob();
        audioBlobs.push(blob);
      } else {
        throw new Error('Proxy status: ' + resp.status);
      }
    } catch {
      // If proxy not available, try direct fetch
      try {
        const resp2 = await fetch(directUrl);
        if (resp2.ok) {
          const blob2 = await resp2.blob();
          audioBlobs.push(blob2);
        } else {
          useDirectUrls = true;
          break;
        }
      } catch {
        useDirectUrls = true;
        break;
      }
    }
  }

  // If we collected actual audio blobs from proxy/fetch
  if (!useDirectUrls && audioBlobs.length > 0) {
    let finalBlob = new Blob(audioBlobs, { type: 'audio/mpeg' });

    // Apply pitch and speed audio modulation if changed
    const rateMultiplier = pitch * speed;
    if (Math.abs(rateMultiplier - 1.0) > 0.02) {
      onProgress?.('Menerapkan efek karakter nada (pitch & tempo)...');
      try {
        finalBlob = await applyAudioModulation(finalBlob, rateMultiplier);
      } catch (modErr) {
        console.warn('Gagal modulasi nada suara, menggunakan nada original:', modErr);
      }
    }

    const { url, duration } = await processAudioFile(finalBlob);
    return { url, duration };
  }

  // Fallback to direct streaming Google TTS URL
  onProgress?.('Menyiapkan streaming audio suara alami...');
  const encodedFull = encodeURIComponent(sentences[0]);
  const streamUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodedFull}`;

  // Estimate duration adjusted by speed & pitch
  const wordCount = text.trim().split(/\s+/).length;
  const baseDur = Math.max(2, Math.round((wordCount / 2.3) * 10) / 10);
  const estimatedDur = Math.max(1, Math.round((baseDur / (pitch * speed)) * 10) / 10);

  const duration = await new Promise<number>((resolve) => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.src = streamUrl;

    const timer = setTimeout(() => resolve(estimatedDur), 2000);

    audio.onloadedmetadata = () => {
      clearTimeout(timer);
      const measured = audio.duration && !isNaN(audio.duration) ? audio.duration : estimatedDur;
      resolve(Math.max(1, Math.round((measured / (pitch * speed)) * 10) / 10));
    };

    audio.onerror = () => {
      clearTimeout(timer);
      resolve(estimatedDur);
    };
  });

  return {
    url: streamUrl,
    duration,
  };
}
