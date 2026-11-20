/**
 * Background Music (BGM) Generator & Preset Library
 * Procedural, 100% royalty-free, zero-copyright background music synthesized via Web Audio API.
 */

export interface BgmPreset {
  id: string;
  name: string;
  description: string;
  category: 'chill' | 'vlog' | 'cinematic' | 'acoustic' | 'energy';
  icon: string;
  vibe: string;
  bpm: number;
  duration: number; // in seconds
}

export const BGM_PRESETS: BgmPreset[] = [
  {
    id: 'lofi-chill',
    name: '☕ Lo-Fi Warm Beats',
    description: 'Santai, hangat, dan rileks. Sangat cocok untuk vlog santai, podcast & konten edukasi.',
    category: 'chill',
    icon: '☕',
    vibe: 'Santai & Fokus',
    bpm: 78,
    duration: 16,
  },
  {
    id: 'acoustic-sun',
    name: '✨ Acoustic Sunlight',
    description: 'Akustik ceria, segar, dan membangkitkan semangat. Pas untuk tutorial, unboxing & lifestyle.',
    category: 'acoustic',
    icon: '✨',
    vibe: 'Ceria & Inspiratif',
    bpm: 96,
    duration: 16,
  },
  {
    id: 'cinematic-hope',
    name: '🎬 Cinematic Wonder',
    description: 'Pad string megah & piano emosional. Pas untuk video dramatis, traveling & storytelling.',
    category: 'cinematic',
    icon: '🎬',
    vibe: 'Megah & Emosional',
    bpm: 68,
    duration: 16,
  },
  {
    id: 'modern-groove',
    name: '⚡ Upbeat Modern Pop',
    description: 'Irama elektronik modern, dinamis, dan energik. Bagus untuk Reels, TikTok & Shorts.',
    category: 'energy',
    icon: '⚡',
    vibe: 'Energik & Trendy',
    bpm: 120,
    duration: 16,
  },
  {
    id: 'peaceful-zen',
    name: '🌙 Deep Zen Meditation',
    description: 'Suasana hening menyejukkan dengan resonansi hangat. Pas untuk video alam & relaksasi.',
    category: 'chill',
    icon: '🌙',
    vibe: 'Tenang & Damai',
    bpm: 60,
    duration: 16,
  },
  {
    id: 'playful-fun',
    name: '🎉 Fun & Cheerful Vibe',
    description: 'Ketukan marimba lincah dan gembira. Cocok untuk kuliner, unboxing seru & hiburan.',
    category: 'vlog',
    icon: '🎉',
    vibe: 'Gembira & Lucu',
    bpm: 110,
    duration: 16,
  },
];

// Cache generated preset URLs to avoid re-synthesizing
const bgmCache = new Map<string, { blob: Blob; url: string; duration: number }>();

// Preview audio singleton
let currentPreviewAudio: HTMLAudioElement | null = null;

export function stopBgmPreview(): void {
  if (currentPreviewAudio) {
    currentPreviewAudio.pause();
    currentPreviewAudio.currentTime = 0;
    currentPreviewAudio = null;
  }
}

export function playBgmPreview(url: string, onEnded?: () => void): HTMLAudioElement {
  stopBgmPreview();
  const audio = new Audio(url);
  audio.volume = 0.6;
  audio.onended = () => {
    if (onEnded) onEnded();
    if (currentPreviewAudio === audio) currentPreviewAudio = null;
  };
  audio.play().catch((err) => console.warn('Preview play prevented:', err));
  currentPreviewAudio = audio;
  return audio;
}

export function isBgmPreviewing(url: string): boolean {
  return !!currentPreviewAudio && !currentPreviewAudio.paused && currentPreviewAudio.src === url;
}

/**
 * Procedurally synthesize high quality royalty-free background music loop into a WAV Blob
 */
export async function generateBgmAudio(presetId: string): Promise<{ blob: Blob; url: string; duration: number }> {
  const cached = bgmCache.get(presetId);
  if (cached) {
    return cached;
  }

  const preset = BGM_PRESETS.find((p) => p.id === presetId) || BGM_PRESETS[0];
  const sampleRate = 44100;
  const duration = preset.duration;
  const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

  // Master bus
  const masterGain = offlineCtx.createGain();
  masterGain.gain.value = 0.85;

  const masterCompressor = offlineCtx.createDynamicsCompressor();
  masterCompressor.threshold.setValueAtTime(-18, 0);
  masterCompressor.knee.setValueAtTime(30, 0);
  masterCompressor.ratio.setValueAtTime(4, 0);
  masterCompressor.attack.setValueAtTime(0.005, 0);
  masterCompressor.release.setValueAtTime(0.1, 0);

  masterGain.connect(masterCompressor);
  masterCompressor.connect(offlineCtx.destination);

  // Synthesize musical layers according to preset style
  switch (preset.id) {
    case 'lofi-chill':
      synthesizeLoFiTrack(offlineCtx, masterGain, duration, preset.bpm);
      break;
    case 'acoustic-sun':
      synthesizeAcousticTrack(offlineCtx, masterGain, duration, preset.bpm);
      break;
    case 'cinematic-hope':
      synthesizeCinematicTrack(offlineCtx, masterGain, duration, preset.bpm);
      break;
    case 'modern-groove':
      synthesizeModernGrooveTrack(offlineCtx, masterGain, duration, preset.bpm);
      break;
    case 'peaceful-zen':
      synthesizeZenTrack(offlineCtx, masterGain, duration, preset.bpm);
      break;
    case 'playful-fun':
      synthesizePlayfulTrack(offlineCtx, masterGain, duration, preset.bpm);
      break;
    default:
      synthesizeLoFiTrack(offlineCtx, masterGain, duration, preset.bpm);
      break;
  }

  const renderedBuffer = await offlineCtx.startRendering();
  const blob = audioBufferToWav(renderedBuffer);
  const url = URL.createObjectURL(blob);

  const result = { blob, url, duration };
  bgmCache.set(presetId, result);
  return result;
}

// ==========================================
// MUSICAL SYNTHESIS ENGINES
// ==========================================

// Note frequencies
const NOTE = {
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.0, A2: 110.0, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, B5: 987.77,
};

function playSynthNote(
  ctx: OfflineAudioContext,
  dest: AudioNode,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType = 'triangle',
  gainLevel = 0.2,
  filterFreq = 2000
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFreq, startTime);

  // Smooth ADSR envelope
  const attack = Math.min(0.04, duration * 0.2);
  const release = Math.min(0.15, duration * 0.4);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainLevel, startTime + attack);
  gain.gain.setValueAtTime(gainLevel * 0.7, startTime + duration - release);
  gain.gain.linearRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dest);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function playKick(ctx: OfflineAudioContext, dest: AudioNode, time: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.frequency.setValueAtTime(140, time);
  osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);

  gain.gain.setValueAtTime(0.8, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

  osc.connect(gain);
  gain.connect(dest);

  osc.start(time);
  osc.stop(time + 0.25);
}

function playSnare(ctx: OfflineAudioContext, dest: AudioNode, time: number, soft = false) {
  // Noise component
  const bufferSize = ctx.sampleRate * 0.18;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  const whiteNoise = ctx.createBufferSource();
  whiteNoise.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(1200, time);

  const gain = ctx.createGain();
  const maxGain = soft ? 0.25 : 0.45;
  gain.gain.setValueAtTime(maxGain, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + (soft ? 0.1 : 0.18));

  whiteNoise.connect(filter);
  filter.connect(gain);
  gain.connect(dest);

  whiteNoise.start(time);
  whiteNoise.stop(time + 0.2);

  // Tone component
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(180, time);
  osc.frequency.exponentialRampToValueAtTime(80, time + 0.08);

  oscGain.gain.setValueAtTime(0.3, time);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

  osc.connect(oscGain);
  oscGain.connect(dest);

  osc.start(time);
  osc.stop(time + 0.1);
}

function playHiHat(ctx: OfflineAudioContext, dest: AudioNode, time: number, open = false) {
  const dur = open ? 0.12 : 0.04;
  const bufferSize = Math.floor(ctx.sampleRate * dur);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(7000, time);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.18, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(dest);

  noise.start(time);
  noise.stop(time + dur + 0.01);
}

// 1. LO-FI CHILL SYNTHESIS
function synthesizeLoFiTrack(ctx: OfflineAudioContext, dest: AudioNode, duration: number, bpm: number) {
  const beatSec = 60 / bpm; // ~0.769s per beat
  const barSec = beatSec * 4; // ~3.076s per bar
  const chords = [
    { bass: NOTE.D2, notes: [NOTE.F3, NOTE.A3, NOTE.C4, NOTE.E4] }, // Dm9
    { bass: NOTE.G2, notes: [NOTE.F3, NOTE.B3, NOTE.D4, NOTE.E4] }, // G13
    { bass: NOTE.C2, notes: [NOTE.E3, NOTE.G3, NOTE.B3, NOTE.D4] }, // Cmaj9
    { bass: NOTE.A2, notes: [NOTE.E3, NOTE.G3, NOTE.C4, NOTE.E4] }, // Am7
  ];

  const totalBars = Math.ceil(duration / barSec);
  for (let b = 0; b < totalBars; b++) {
    const chord = chords[b % chords.length];
    const barTime = b * barSec;
    if (barTime >= duration) break;

    // Bass note
    playSynthNote(ctx, dest, chord.bass, barTime, barSec * 0.9, 'sine', 0.35, 350);

    // Rhodes style chord strum
    chord.notes.forEach((freq, idx) => {
      const strumOffset = idx * 0.025;
      playSynthNote(ctx, dest, freq, barTime + strumOffset, barSec * 0.85, 'triangle', 0.16, 950);
      // Subtle secondary tap
      playSynthNote(ctx, dest, freq, barTime + beatSec * 2.5 + strumOffset, barSec * 0.35, 'triangle', 0.11, 850);
    });

    // Lo-Fi Beat
    playKick(ctx, dest, barTime);
    playKick(ctx, dest, barTime + beatSec * 2.25);
    playSnare(ctx, dest, barTime + beatSec * 1, true);
    playSnare(ctx, dest, barTime + beatSec * 3, true);

    // Hats
    for (let h = 0; h < 8; h++) {
      const hTime = barTime + h * (beatSec / 2);
      if (hTime < duration) {
        playHiHat(ctx, dest, hTime, h === 7);
      }
    }
  }
}

// 2. ACOUSTIC SUNLIGHT SYNTHESIS
function synthesizeAcousticTrack(ctx: OfflineAudioContext, dest: AudioNode, duration: number, bpm: number) {
  const beatSec = 60 / bpm;
  const barSec = beatSec * 4;
  const chords = [
    { bass: NOTE.C3, arps: [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5] }, // C
    { bass: NOTE.G2, arps: [NOTE.B3, NOTE.D4, NOTE.G4, NOTE.B4] }, // G
    { bass: NOTE.A2, arps: [NOTE.C4, NOTE.E4, NOTE.A4, NOTE.C5] }, // Am
    { bass: NOTE.F2, arps: [NOTE.A3, NOTE.C4, NOTE.F4, NOTE.A4] }, // F
  ];

  const totalBars = Math.ceil(duration / barSec);
  for (let b = 0; b < totalBars; b++) {
    const chord = chords[b % chords.length];
    const barTime = b * barSec;
    if (barTime >= duration) break;

    // Bass
    playSynthNote(ctx, dest, chord.bass, barTime, beatSec * 1.8, 'sine', 0.3, 400);
    playSynthNote(ctx, dest, chord.bass, barTime + beatSec * 2, beatSec * 1.8, 'sine', 0.25, 400);

    // Arpeggiated guitar-like plucks
    const pattern = [0, 1, 2, 3, 2, 1, 2, 3];
    pattern.forEach((noteIdx, step) => {
      const stepTime = barTime + step * (beatSec / 2);
      if (stepTime < duration) {
        const freq = chord.arps[noteIdx % chord.arps.length];
        playSynthNote(ctx, dest, freq, stepTime, 0.45, 'triangle', 0.18, 2800);
      }
    });

    // Light beat
    playKick(ctx, dest, barTime);
    playHiHat(ctx, dest, barTime + beatSec * 1);
    playKick(ctx, dest, barTime + beatSec * 2);
    playHiHat(ctx, dest, barTime + beatSec * 3);
  }
}

// 3. CINEMATIC WONDER SYNTHESIS
function synthesizeCinematicTrack(ctx: OfflineAudioContext, dest: AudioNode, duration: number, bpm: number) {
  const beatSec = 60 / bpm;
  const barSec = beatSec * 4;
  const chords = [
    { bass: NOTE.A2, pad: [NOTE.C3, NOTE.E3, NOTE.A3, NOTE.C4, NOTE.E4] },
    { bass: NOTE.F2, pad: [NOTE.C3, NOTE.F3, NOTE.A3, NOTE.C4, NOTE.F4] },
    { bass: NOTE.C2, pad: [NOTE.C3, NOTE.G3, NOTE.C4, NOTE.E4, NOTE.G4] },
    { bass: NOTE.G2, pad: [NOTE.B2, NOTE.D3, NOTE.G3, NOTE.B3, NOTE.D4] },
  ];

  const totalBars = Math.ceil(duration / barSec);
  for (let b = 0; b < totalBars; b++) {
    const chord = chords[b % chords.length];
    const barTime = b * barSec;
    if (barTime >= duration) break;

    // Deep sub bass
    playSynthNote(ctx, dest, chord.bass, barTime, barSec * 0.98, 'sawtooth', 0.22, 280);

    // Warm string pad swell
    chord.pad.forEach((freq) => {
      playSynthNote(ctx, dest, freq, barTime, barSec * 0.95, 'sawtooth', 0.08, 1100);
      playSynthNote(ctx, dest, freq * 1.002, barTime, barSec * 0.95, 'sine', 0.1, 900); // Chorus detune
    });

    // High ambient piano melody note
    const melNotes = [NOTE.E5, NOTE.C5, NOTE.G4, NOTE.B4];
    const melFreq = melNotes[b % melNotes.length];
    playSynthNote(ctx, dest, melFreq, barTime + beatSec, 2.2, 'sine', 0.25, 2400);
    playSynthNote(ctx, dest, melFreq * 0.75, barTime + beatSec * 2.5, 1.8, 'sine', 0.18, 2000);
  }
}

// 4. MODERN GROOVE SYNTHESIS
function synthesizeModernGrooveTrack(ctx: OfflineAudioContext, dest: AudioNode, duration: number, bpm: number) {
  const beatSec = 60 / bpm; // 0.5s per beat
  const barSec = beatSec * 4; // 2.0s
  const bassNotes = [NOTE.C2, NOTE.C2, NOTE.E2, NOTE.G2, NOTE.F2, NOTE.F2, NOTE.A2, NOTE.G2];

  const totalBars = Math.ceil(duration / barSec);
  for (let b = 0; b < totalBars; b++) {
    const barTime = b * barSec;
    if (barTime >= duration) break;

    // Punchy electronic drums
    playKick(ctx, dest, barTime);
    playSnare(ctx, dest, barTime + beatSec);
    playKick(ctx, dest, barTime + beatSec * 2);
    playKick(ctx, dest, barTime + beatSec * 2.75);
    playSnare(ctx, dest, barTime + beatSec * 3);

    // Driving bassline (8th notes)
    for (let i = 0; i < 8; i++) {
      const stepTime = barTime + i * (beatSec / 2);
      if (stepTime < duration) {
        const note = bassNotes[(b * 8 + i) % bassNotes.length];
        playSynthNote(ctx, dest, note, stepTime, 0.2, 'sawtooth', 0.25, 750);
        playHiHat(ctx, dest, stepTime, i % 2 === 1);
      }
    }

    // Synth chord stab on beat 2 and 4
    [NOTE.G3, NOTE.C4, NOTE.E4].forEach((f) => {
      playSynthNote(ctx, dest, f, barTime + beatSec * 1, 0.35, 'square', 0.08, 1600);
      playSynthNote(ctx, dest, f, barTime + beatSec * 3, 0.35, 'square', 0.08, 1600);
    });
  }
}

// 5. DEEP ZEN SYNTHESIS
function synthesizeZenTrack(ctx: OfflineAudioContext, dest: AudioNode, duration: number, bpm: number) {
  const barSec = (60 / bpm) * 4; // 4.0s
  const zenFrequencies = [
    [NOTE.D3, NOTE.A3, NOTE.D4, NOTE.F4],
    [NOTE.C3, NOTE.G3, NOTE.C4, NOTE.E4],
    [NOTE.A2, NOTE.E3, NOTE.A3, NOTE.C4],
    [NOTE.G2, NOTE.D3, NOTE.G3, NOTE.B3],
  ];

  const totalBars = Math.ceil(duration / barSec);
  for (let b = 0; b < totalBars; b++) {
    const barTime = b * barSec;
    if (barTime >= duration) break;

    const chord = zenFrequencies[b % zenFrequencies.length];
    chord.forEach((freq) => {
      // Soft breathing sine waves
      playSynthNote(ctx, dest, freq, barTime, barSec * 0.98, 'sine', 0.18, 1200);
    });

    // Singing bell chime
    const chimeFreq = (b % 2 === 0 ? NOTE.A4 : NOTE.D5) * 1.0;
    playSynthNote(ctx, dest, chimeFreq, barTime + 1.2, 3.5, 'sine', 0.22, 3500);
  }
}

// 6. PLAYFUL & CHEERFUL SYNTHESIS
function synthesizePlayfulTrack(ctx: OfflineAudioContext, dest: AudioNode, duration: number, bpm: number) {
  const beatSec = 60 / bpm;
  const barSec = beatSec * 4;
  const melodies = [
    [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5, NOTE.G4, NOTE.E4],
    [NOTE.D4, NOTE.F4, NOTE.A4, NOTE.D5, NOTE.A4, NOTE.F4],
    [NOTE.E4, NOTE.G4, NOTE.B4, NOTE.E5, NOTE.B4, NOTE.G4],
    [NOTE.F4, NOTE.A4, NOTE.C5, NOTE.F5, NOTE.C5, NOTE.A4],
  ];

  const totalBars = Math.ceil(duration / barSec);
  for (let b = 0; b < totalBars; b++) {
    const barTime = b * barSec;
    if (barTime >= duration) break;

    // Bass bounce
    playSynthNote(ctx, dest, NOTE.C3, barTime, 0.25, 'triangle', 0.3, 600);
    playSynthNote(ctx, dest, NOTE.G2, barTime + beatSec * 2, 0.25, 'triangle', 0.3, 600);

    // Playful Marimba notes
    const mel = melodies[b % melodies.length];
    mel.forEach((freq, idx) => {
      const stepTime = barTime + idx * (beatSec * 0.6);
      if (stepTime < duration) {
        playSynthNote(ctx, dest, freq, stepTime, 0.22, 'sine', 0.28, 4000);
      }
    });

    // Gentle claps / hi-hat
    playHiHat(ctx, dest, barTime + beatSec * 1);
    playHiHat(ctx, dest, barTime + beatSec * 3);
  }
}

// ==========================================
// AUDIO BUFFER TO WAV CONVERTER
// ==========================================

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const numSamples = buffer.length;
  const dataByteCount = numSamples * blockAlign;
  const bufferLength = 44 + dataByteCount;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataByteCount, true);
  writeString(view, 8, 'WAVE');

  // "fmt " sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat: PCM = 1
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // "data" sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataByteCount, true);

  // Write samples
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channels[c][i];
      sample = Math.max(-1, Math.min(1, sample));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
