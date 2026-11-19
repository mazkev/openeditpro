import { processAudioFile } from './media';
import type { Subtitle } from '../types/editor';

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

/**
 * Generate audio blob using Google TTS endpoint with local proxy or direct audio streaming
 */
export async function generateTTSAudio(
  text: string,
  lang: string = 'id',
  onProgress?: (msg: string) => void
): Promise<{ url: string; duration: number }> {
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
    const finalBlob = new Blob(audioBlobs, { type: 'audio/mpeg' });
    const { url, duration } = await processAudioFile(finalBlob);
    return { url, duration };
  }

  // If direct fetch was restricted by CORS, use the direct streaming Google TTS URL directly!
  // <audio src="..."> in modern browsers streams and plays Google TTS directly without CORS error!
  onProgress?.('Menyiapkan streaming audio suara alami...');
  const encodedFull = encodeURIComponent(sentences[0]);
  const streamUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodedFull}`;

  // Estimate or detect duration
  const wordCount = text.trim().split(/\s+/).length;
  const estimatedDur = Math.max(2, Math.round((wordCount / 2.3) * 10) / 10);

  const duration = await new Promise<number>((resolve) => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.src = streamUrl;

    const timer = setTimeout(() => resolve(estimatedDur), 2000);

    audio.onloadedmetadata = () => {
      clearTimeout(timer);
      resolve(audio.duration && !isNaN(audio.duration) ? audio.duration : estimatedDur);
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
