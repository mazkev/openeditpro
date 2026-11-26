import {
  ALL_FORMATS,
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Input,
  Mp4OutputFormat,
  Output,
  UrlSource,
  VideoSampleSink,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
  type VideoSample,
} from 'mediabunny';
import type {
  AspectRatio,
  BackgroundMusic,
  ExportResolution,
  SharpenLevel,
  Subtitle,
  VideoClip,
  Voiceover,
  Watermark,
} from '../types/editor';
import { getActiveKaraokeWordIndex } from '../types/editor';
import {
  drawCanvasTransition,
  drawSingleFrameToCanvas,
  getActiveTransitionInfo,
  type DrawableVideoFrame,
} from './transition';
import { Scene3DRenderer, ensureStickmanLoaded, ensureStoryImageLoaded } from './scene3d';
import { ensureVoiceoverEnvelope, getVoiceoverMouthOpenAt } from './audioEnvelope';

export interface ExportProgress {
  progress: number; // 0 to 100
  status: string;
}

export interface ExportOptions {
  resolution?: ExportResolution; // '720p' | '1080p'
  sharpen?: boolean; // sharpen filter enabled
  sharpenLevel?: SharpenLevel; // 'subtle' | 'high'
}

interface ClipRange {
  clip: VideoClip;
  start: number;
  end: number;
}

/**
 * Helper to auto-wrap text so sentences NEVER get cut off on vertical (9:16) or narrow screens.
 */
function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxAllowedWidth: number
): string[] {
  const paragraphs = text.split('\n');
  const wrappedLines: string[] = [];

  for (const para of paragraphs) {
    const cleanPara = para.trim();
    if (!cleanPara) continue;

    const words = cleanPara.split(/\s+/);
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const testLine = `${currentLine} ${word}`;
      const metrics = context.measureText(testLine);

      if (metrics.width <= maxAllowedWidth) {
        currentLine = testLine;
      } else {
        wrappedLines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) {
      wrappedLines.push(currentLine);
    }
  }

  return wrappedLines.length > 0 ? wrappedLines : [text];
}

/**
 * Shared overlay renderer (Watermark + Subtitles) used by both Mediabunny and MediaRecorder pipelines.
 */
function createOverlayRenderers(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  aspectRatio: AspectRatio,
  watermark: Watermark,
  watermarkImg: HTMLImageElement | null,
  subtitles: Subtitle[]
) {
  const refPreviewHeight = aspectRatio === '9:16' ? 460 : aspectRatio === '1:1' ? 440 : 450;
  const scale = height / refPreviewHeight;

  const drawWatermark = () => {
    if (!watermark.enabled) return;
    ctx.save();
    ctx.globalAlpha = watermark.opacity;

    const padding = Math.round(24 * scale);
    let x = padding;
    let y = padding;

    if (watermark.type === 'text' && watermark.text) {
      const fontSize = Math.round(24 * watermark.scale * scale);
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = watermark.color || '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = Math.round(4 * scale);

      const metrics = ctx.measureText(watermark.text);
      const textWidth = metrics.width;
      const textHeight = fontSize;

      if (watermark.position === 'top-left') {
        x = padding;
        y = padding + textHeight;
      } else if (watermark.position === 'top-right') {
        x = width - textWidth - padding;
        y = padding + textHeight;
      } else if (watermark.position === 'bottom-left') {
        x = padding;
        y = height - padding;
      } else if (watermark.position === 'bottom-right') {
        x = width - textWidth - padding;
        y = height - padding;
      } else if (watermark.position === 'center') {
        x = (width - textWidth) / 2;
        y = height / 2;
      }

      ctx.fillText(watermark.text, x, y);
    } else if (watermark.type === 'image' && watermarkImg) {
      const imgW = 120 * watermark.scale * scale;
      const imgH = (watermarkImg.naturalHeight / watermarkImg.naturalWidth) * imgW;

      if (watermark.position === 'top-left') {
        x = padding;
        y = padding;
      } else if (watermark.position === 'top-right') {
        x = width - imgW - padding;
        y = padding;
      } else if (watermark.position === 'bottom-left') {
        x = padding;
        y = height - imgH - padding;
      } else if (watermark.position === 'bottom-right') {
        x = width - imgW - padding;
        y = height - imgH - padding;
      } else if (watermark.position === 'center') {
        x = (width - imgW) / 2;
        y = (height - imgH) / 2;
      }

      ctx.drawImage(watermarkImg, x, y, imgW, imgH);
    }

    ctx.restore();
  };

  const drawSubtitles = (currentTime: number) => {
    const activeSubs = subtitles.filter(
      (s) => currentTime >= s.startTime && currentTime <= s.endTime && s.text.trim().length > 0
    );

    for (const sub of activeSubs) {
      ctx.save();
      const baseFontSize = Math.max(14, sub.fontSize || 24);
      let fontSize = Math.round(baseFontSize * scale);

      if (width < height) {
        fontSize = Math.min(fontSize, Math.round(width * 0.072));
      }

      let fontFamilyName = 'sans-serif';
      if (sub.fontFamily === 'impact') fontFamilyName = 'Impact, "Arial Black", sans-serif';
      else if (sub.fontFamily === 'serif') fontFamilyName = 'Georgia, "Times New Roman", serif';
      else if (sub.fontFamily === 'mono') fontFamilyName = 'ui-monospace, Consolas, monospace';
      else if (sub.fontFamily === 'cursive') fontFamilyName = '"Comic Sans MS", cursive';

      ctx.font = `bold ${fontSize}px ${fontFamilyName}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const rawText = sub.isUppercase ? sub.text.toUpperCase() : sub.text;
      const maxLineWidth = Math.round(width * 0.84);
      let lines = wrapCanvasText(ctx, rawText, maxLineWidth);

      if (lines.length > 3 && width < height) {
        fontSize = Math.round(fontSize * 0.88);
        ctx.font = `bold ${fontSize}px ${fontFamilyName}`;
        lines = wrapCanvasText(ctx, rawText, maxLineWidth);
      }

      const lineHeight = fontSize * 1.3;
      const totalTextHeight = lines.length * lineHeight;

      const marginY = Math.round(20 * scale);
      const rawTargetY = ((sub.positionY ?? 80) / 100) * height;
      const targetY = Math.min(
        height - totalTextHeight / 2 - marginY,
        Math.max(totalTextHeight / 2 + marginY, rawTargetY)
      );

      const allWords = rawText.trim().split(/\s+/);
      const subDur = Math.max(0.1, sub.endTime - sub.startTime);
      const subProg = Math.max(0, Math.min(1, (currentTime - sub.startTime) / subDur));
      const activeWordIdx = sub.karaokeHighlight ? getActiveKaraokeWordIndex(allWords, subProg) : -1;
      const hlColor = sub.karaokeColor || '#facc15';
      let globalWordCursor = 0;

      lines.forEach((line, index) => {
        const lineY = targetY - totalTextHeight / 2 + index * lineHeight + lineHeight / 2;
        const metrics = ctx.measureText(line);
        const bgPaddingX = Math.round(18 * scale);
        const bgPaddingY = Math.round(8 * scale);
        const bgRadius = Math.round(10 * scale);

        if (sub.bgColor && sub.bgColor !== 'transparent') {
          ctx.fillStyle = sub.bgColor;
          const bgWidth = Math.min(width - 24, metrics.width + bgPaddingX * 2);
          const bgHeight = fontSize + bgPaddingY * 2;
          ctx.beginPath();
          ctx.roundRect(
            width / 2 - bgWidth / 2,
            lineY - bgHeight / 2,
            bgWidth,
            bgHeight,
            bgRadius
          );
          ctx.fill();
        }

        if (sub.glowColor) {
          ctx.shadowColor = sub.glowColor;
          ctx.shadowBlur = Math.round(14 * scale);
        } else {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
          ctx.shadowBlur = Math.round(4 * scale);
          ctx.shadowOffsetY = Math.round(2 * scale);
        }

        const rawStroke = (sub.strokeWidth ?? 1.5) * scale;
        const effectiveStroke = Math.min(rawStroke, Math.max(1.0 * scale, fontSize * 0.08));

        if (sub.karaokeHighlight) {
          const lineWords = line.trim().split(/\s+/).filter(Boolean);
          const spaceW = ctx.measureText(' ').width;
          const wordWidths = lineWords.map((w) => ctx.measureText(w).width);
          const totalLineW =
            wordWidths.reduce((a, b) => a + b, 0) + Math.max(0, lineWords.length - 1) * spaceW;

          let cursorX = width / 2 - totalLineW / 2;
          ctx.textAlign = 'left';

          lineWords.forEach((word, wIdx) => {
            const wGlobalIdx = globalWordCursor++;
            const isActive = wGlobalIdx === activeWordIdx;
            const isFuture = wGlobalIdx > activeWordIdx;
            const wordW = wordWidths[wIdx];

            ctx.save();
            ctx.globalAlpha = isFuture ? 0.72 : 1;
            if (isActive) {
              ctx.translate(cursorX + wordW / 2, lineY);
              ctx.scale(1.08, 1.08);
              ctx.translate(-(cursorX + wordW / 2), -lineY);
              ctx.shadowColor = hlColor;
              ctx.shadowBlur = Math.round(12 * scale);
            }
            if (effectiveStroke > 0) {
              ctx.lineWidth = effectiveStroke * 2;
              ctx.strokeStyle = sub.strokeColor || 'rgba(0, 0, 0, 0.9)';
              ctx.strokeText(word, cursorX, lineY);
            }
            ctx.fillStyle = isActive ? hlColor : sub.color || '#ffffff';
            ctx.fillText(word, cursorX, lineY);
            ctx.restore();

            cursorX += wordW + spaceW;
          });
          ctx.textAlign = 'center';
        } else {
          if (effectiveStroke > 0) {
            ctx.lineWidth = effectiveStroke * 2;
            ctx.strokeStyle = sub.strokeColor || 'rgba(0, 0, 0, 0.9)';
            ctx.strokeText(line, width / 2, lineY);
          }

          ctx.fillStyle = sub.color || '#ffffff';
          ctx.fillText(line, width / 2, lineY);
        }
      });

      ctx.restore();
    }
  };

  return { drawWatermark, drawSubtitles };
}

/**
 * Sequential video frame reader backed by Mediabunny VideoSampleSink.
 * Decodes frames in-order without re-seeking, keeping memory low by closing consumed samples.
 */
class ClipFrameReader {
  private input: Input;
  private sink: VideoSampleSink;
  private iterator: AsyncGenerator<VideoSample, void, unknown> | null = null;
  private currentSample: VideoSample | null = null;
  private nextSample: VideoSample | null = null;
  private done = false;
  private trimStart: number;
  private trimEnd: number;

  constructor(url: string, trimStart: number, trimEnd: number) {
    this.input = new Input({
      formats: ALL_FORMATS,
      source: new UrlSource(url),
    });
    this.trimStart = trimStart;
    this.trimEnd = trimEnd;
    this.sink = null as unknown as VideoSampleSink;
  }

  async init(): Promise<void> {
    const videoTrack = await this.input.getPrimaryVideoTrack();
    if (!videoTrack) {
      throw new Error('Track video tidak ditemukan pada klip');
    }
    this.sink = new VideoSampleSink(videoTrack);
  }

  async getFrameAt(clipTime: number): Promise<VideoSample | null> {
    if (!this.iterator && !this.done) {
      const start = Math.max(0, this.trimStart - 0.05);
      const end = this.trimEnd + 0.5;
      this.iterator = this.sink.samples(start, end);
      const first = await this.iterator.next();
      if (first.done) {
        this.done = true;
      } else {
        this.currentSample = first.value;
        const second = await this.iterator.next();
        if (second.done) {
          this.done = true;
        } else {
          this.nextSample = second.value;
        }
      }
    }

    while (!this.done && this.nextSample && this.nextSample.timestamp <= clipTime) {
      this.currentSample?.close();
      this.currentSample = this.nextSample;
      this.nextSample = null;
      if (this.iterator) {
        const res = await this.iterator.next();
        if (res.done) {
          this.done = true;
        } else {
          this.nextSample = res.value;
        }
      } else {
        this.done = true;
      }
    }

    return this.currentSample || this.nextSample;
  }

  async dispose(): Promise<void> {
    this.currentSample?.close();
    this.currentSample = null;
    this.nextSample?.close();
    this.nextSample = null;
    if (this.iterator) {
      try {
        await this.iterator.return();
      } catch {
        // ignore
      }
      this.iterator = null;
    }
    if (!this.input.disposed) {
      this.input.dispose();
    }
  }
}

/**
 * Mixes all clip audio, voiceovers, and background music faster-than-realtime using OfflineAudioContext.
 */
async function mixTimelineAudioBuffer(
  clipRanges: ClipRange[],
  voiceovers: Voiceover[],
  bgm: BackgroundMusic | null | undefined,
  totalDuration: number
): Promise<AudioBuffer> {
  const sampleRate = 48000;
  const length = Math.max(1, Math.ceil(totalDuration * sampleRate));
  const offlineCtx = new OfflineAudioContext(2, length, sampleRate);
  const decodedCache = new Map<string, AudioBuffer | null>();

  const decodeUrl = async (url: string): Promise<AudioBuffer | null> => {
    if (decodedCache.has(url)) {
      return decodedCache.get(url) ?? null;
    }
    try {
      const resp = await fetch(url);
      const buf = await resp.arrayBuffer();
      const decoded = await offlineCtx.decodeAudioData(buf);
      decodedCache.set(url, decoded);
      return decoded;
    } catch {
      decodedCache.set(url, null);
      return null;
    }
  };

  for (const range of clipRanges) {
    if (range.clip.clipType === '3d' || !range.clip.url) continue;
    const vol = range.clip.volume ?? 1;
    if (vol <= 0) continue;
    const decoded = await decodeUrl(range.clip.url);
    if (!decoded) continue;

    const dur = Math.max(0, range.end - range.start);
    const src = offlineCtx.createBufferSource();
    src.buffer = decoded;
    const gain = offlineCtx.createGain();
    gain.gain.value = vol;
    src.connect(gain);
    gain.connect(offlineCtx.destination);
    src.start(range.start, range.clip.trimStart, dur);
  }

  for (const vo of voiceovers) {
    const vol = vo.volume ?? 1;
    if (vol <= 0) continue;
    const decoded = await decodeUrl(vo.url);
    if (!decoded) continue;

    const src = offlineCtx.createBufferSource();
    src.buffer = decoded;
    const gain = offlineCtx.createGain();
    gain.gain.value = vol;
    src.connect(gain);
    gain.connect(offlineCtx.destination);
    src.start(vo.startTime, vo.trimStart || 0, vo.duration);
  }

  if (bgm && bgm.url && (bgm.volume ?? 0.2) > 0) {
    const decoded = await decodeUrl(bgm.url);
    if (decoded) {
      const bgmVol = bgm.volume ?? 0.2;
      const shouldLoop = bgm.loop ?? true;
      const segDur = decoded.duration;
      if (segDur > 0) {
        if (shouldLoop) {
          let t = 0;
          while (t < totalDuration) {
            const playDur = Math.min(segDur, totalDuration - t);
            const src = offlineCtx.createBufferSource();
            src.buffer = decoded;
            const gain = offlineCtx.createGain();
            gain.gain.value = bgmVol;
            src.connect(gain);
            gain.connect(offlineCtx.destination);
            src.start(t, 0, playDur);
            t += segDur;
          }
        } else {
          const playDur = Math.min(segDur, totalDuration);
          const src = offlineCtx.createBufferSource();
          src.buffer = decoded;
          const gain = offlineCtx.createGain();
          gain.gain.value = bgmVol;
          src.connect(gain);
          gain.connect(offlineCtx.destination);
          src.start(0, 0, playDur);
        }
      }
    }
  }

  return offlineCtx.startRendering();
}

/**
 * High-speed faster-than-realtime MP4 export powered by Mediabunny + WebCodecs.
 */
async function exportWithMediabunny(
  clips: VideoClip[],
  clipRanges: ClipRange[],
  totalDuration: number,
  width: number,
  height: number,
  videoBitsPerSecond: number,
  sharpen: boolean,
  sharpenLevel: SharpenLevel,
  subtitles: Subtitle[],
  watermark: Watermark,
  watermarkImg: HTMLImageElement | null,
  voiceovers: Voiceover[],
  aspectRatio: AspectRatio,
  bgm: BackgroundMusic | null | undefined,
  onProgress: (p: ExportProgress) => void
): Promise<Blob> {
  const fps = 30;
  const frameDuration = 1 / fps;
  const totalFrames = Math.max(1, Math.ceil(totalDuration * fps));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const { drawWatermark, drawSubtitles } = createOverlayRenderers(
    ctx,
    width,
    height,
    aspectRatio,
    watermark,
    watermarkImg,
    subtitles
  );

  onProgress({ progress: 8, status: 'Menyiapkan encoder MP4 (Mediabunny WebCodecs)...' });

  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target,
  });

  const videoCodec = await getFirstEncodableVideoCodec(
    output.format.getSupportedVideoCodecs(),
    { width, height, bitrate: videoBitsPerSecond, frameRate: fps }
  );
  if (!videoCodec) {
    throw new Error('Browser tidak mendukung hardware video encoding WebCodecs');
  }

  const audioCodec = await getFirstEncodableAudioCodec(
    output.format.getSupportedAudioCodecs(),
    { sampleRate: 48000, numberOfChannels: 2, bitrate: 128_000 }
  );

  const videoSource = new CanvasSource(canvas, {
    codec: videoCodec,
    bitrate: videoBitsPerSecond,
  });
  output.addVideoTrack(videoSource, { frameRate: fps });

  let audioSource: AudioBufferSource | null = null;
  if (audioCodec) {
    audioSource = new AudioBufferSource({
      codec: audioCodec,
      bitrate: 128_000,
    });
    output.addAudioTrack(audioSource);
  }

  const readers = clips.map((c) =>
    c.clipType === '3d' || !c.url ? null : new ClipFrameReader(c.url, c.trimStart, c.trimEnd)
  );
  const has3DClips = clips.some((c) => c.clipType === '3d' && c.scene3d);
  if (has3DClips) {
    await ensureStickmanLoaded();
    const storyUrls = clips
      .flatMap((c) => [c.scene3d?.customPropImageUrl, c.scene3d?.customBackdropImageUrl])
      .filter((u): u is string => Boolean(u));
    if (storyUrls.length > 0) {
      await Promise.all(storyUrls.map((u) => ensureStoryImageLoaded(u)));
    }
    if (voiceovers.length > 0) {
      await Promise.all(voiceovers.map((v) => ensureVoiceoverEnvelope(v.url)));
    }
  }
  const scene3dA = has3DClips ? new Scene3DRenderer(width, height) : null;
  const scene3dB = has3DClips ? new Scene3DRenderer(width, height) : null;

  const getDrawableFrame = async (
    clipIdx: number,
    clipTime: number,
    slot: 'A' | 'B',
    globalTime?: number
  ): Promise<DrawableVideoFrame | null> => {
    const clip = clips[clipIdx];
    if (clip.clipType === '3d' && clip.scene3d) {
      const r = slot === 'A' ? scene3dA : scene3dB;
      if (!r) return null;
      if (clip.scene3d.mode === 'glb' && clip.scene3d.glbUrl) {
        await r.ensureGlbLoaded(clip.scene3d.glbUrl);
      }
      const dur = Math.max(0.1, clip.trimEnd - clip.trimStart);
      const mouthOpen =
        globalTime !== undefined ? getVoiceoverMouthOpenAt(voiceovers, globalTime) : null;
      r.renderAt(Math.max(0, clipTime - clip.trimStart), dur, clip.scene3d, { mouthOpen });
      return r.getCanvas();
    }
    const reader = readers[clipIdx];
    return reader ? reader.getFrameAt(clipTime) : null;
  };

  try {
    onProgress({ progress: 14, status: 'Membuka stream video & mencampur audio...' });
    await Promise.all(readers.map((r) => (r ? r.init() : Promise.resolve())));

    await output.start();

    if (audioSource) {
      const mixedAudio = await mixTimelineAudioBuffer(
        clipRanges,
        voiceovers,
        bgm,
        totalDuration
      );
      await audioSource.add(mixedAudio);
      audioSource.close();
    }

    onProgress({ progress: 22, status: 'Merender MP4 berkecepatan tinggi...' });

    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      const t = frameIdx * frameDuration;

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      const activeTrans = getActiveTransitionInfo(clips, t);

      if (activeTrans) {
        const idxA = activeTrans.cutIndex;
        const idxB = activeTrans.cutIndex + 1;
        const rangeA = clipRanges[idxA];
        const rangeB = clipRanges[idxB];

        const durA = Math.max(0, rangeA.clip.trimEnd - rangeA.clip.trimStart);
        const timeA =
          rangeA.clip.trimStart + Math.min(durA, Math.max(0, t - rangeA.start));
        const timeB =
          rangeB.clip.trimStart + Math.max(0, t - rangeB.start);

        const [sampleA, sampleB] = await Promise.all([
          getDrawableFrame(idxA, timeA, 'A', t),
          getDrawableFrame(idxB, timeB, 'B', t),
        ]);

        if (sampleA && sampleB) {
          drawCanvasTransition(
            ctx,
            sampleA,
            sampleB,
            activeTrans.type,
            activeTrans.progress,
            width,
            height,
            sharpen,
            sharpenLevel
          );
        } else if (sampleA || sampleB) {
          drawSingleFrameToCanvas(ctx, (sampleA || sampleB)!, width, height);
        }
      } else {
        const activeIdx = clipRanges.findIndex((r) => t >= r.start && t < r.end);
        const safeIdx = activeIdx !== -1 ? activeIdx : clipRanges.length - 1;
        const range = clipRanges[safeIdx];
        const clipTime = range.clip.trimStart + Math.max(0, t - range.start);
        const sample = await getDrawableFrame(safeIdx, clipTime, 'A', t);

        if (sample) {
          const is3D = clips[safeIdx].clipType === '3d';
          if (sharpen && !is3D) {
            ctx.filter =
              sharpenLevel === 'high'
                ? 'contrast(1.16) saturate(1.08) brightness(1.02)'
                : 'contrast(1.09) saturate(1.04) brightness(1.01)';
          } else {
            ctx.filter = 'none';
          }
          drawSingleFrameToCanvas(ctx, sample, width, height);
          ctx.filter = 'none';
        }
      }

      drawWatermark();
      drawSubtitles(t);

      await videoSource.add(t, frameDuration);

      if (frameIdx % 5 === 0 || frameIdx === totalFrames - 1) {
        const pct = Math.min(98, Math.round((frameIdx / totalFrames) * 76) + 22);
        onProgress({
          progress: pct,
          status: `Merender MP4 cepat (${t.toFixed(1)}s / ${totalDuration.toFixed(1)}s)...`,
        });
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    onProgress({ progress: 99, status: 'Menyelesaikan kontainer MP4...' });
    videoSource.close();
    await output.finalize();

    if (!target.buffer) {
      throw new Error('Buffer output MP4 kosong');
    }

    onProgress({ progress: 100, status: 'Selesai! Video MP4 siap diunduh.' });
    return new Blob([target.buffer], { type: 'video/mp4' });
  } finally {
    scene3dA?.dispose();
    scene3dB?.dispose();
    await Promise.all(readers.map((r) => (r ? r.dispose() : Promise.resolve())));
  }
}

/**
 * Fallback real-time exporter via MediaRecorder for browsers without WebCodecs support.
 */
async function exportWithMediaRecorder(
  clips: VideoClip[],
  clipRanges: ClipRange[],
  totalDuration: number,
  width: number,
  height: number,
  videoBitsPerSecond: number,
  sharpen: boolean,
  sharpenLevel: SharpenLevel,
  subtitles: Subtitle[],
  watermark: Watermark,
  watermarkImg: HTMLImageElement | null,
  voiceovers: Voiceover[],
  aspectRatio: AspectRatio,
  bgm: BackgroundMusic | null | undefined,
  onProgress: (p: ExportProgress) => void
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const { drawWatermark, drawSubtitles } = createOverlayRenderers(
    ctx,
    width,
    height,
    aspectRatio,
    watermark,
    watermarkImg,
    subtitles
  );

  const exportMount = document.createElement('div');
  exportMount.id = 'openedit-export-gpu-mount';
  exportMount.style.cssText =
    'position:fixed;left:-9999px;top:-9999px;width:320px;height:180px;opacity:0.01;pointer-events:none;z-index:-9999;';
  document.body.appendChild(exportMount);
  exportMount.appendChild(canvas);

  onProgress({ progress: 5, status: 'Menyiapkan audio engine...' });

  const AudioCtxClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtxClass();
  const dest = audioCtx.createMediaStreamDestination();

  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch {
      // ignore
    }
  }

  onProgress({ progress: 12, status: 'Memuat dan menyinkronkan video...' });
  const videoElements: (HTMLVideoElement | null)[] = [];
  const has3DClips = clips.some((c) => c.clipType === '3d' && c.scene3d);
  if (has3DClips) {
    await ensureStickmanLoaded();
    const storyUrls = clips
      .flatMap((c) => [c.scene3d?.customPropImageUrl, c.scene3d?.customBackdropImageUrl])
      .filter((u): u is string => Boolean(u));
    if (storyUrls.length > 0) {
      await Promise.all(storyUrls.map((u) => ensureStoryImageLoaded(u)));
    }
  }
  const scene3dA = has3DClips ? new Scene3DRenderer(width, height) : null;
  const scene3dB = has3DClips ? new Scene3DRenderer(width, height) : null;

  for (let i = 0; i < clips.length; i++) {
    if (clips[i].clipType === '3d' || !clips[i].url) {
      if (clips[i].scene3d?.mode === 'glb' && clips[i].scene3d?.glbUrl) {
        await scene3dA?.ensureGlbLoaded(clips[i].scene3d!.glbUrl!);
        await scene3dB?.ensureGlbLoaded(clips[i].scene3d!.glbUrl!);
      }
      videoElements.push(null);
      continue;
    }

    const v = document.createElement('video');
    v.crossOrigin = 'anonymous';
    v.playsInline = true;
    v.preload = 'auto';
    v.src = clips[i].url;
    v.muted = false;
    v.volume = clips[i].volume ?? 1;
    exportMount.appendChild(v);

    await new Promise<void>((resolve) => {
      v.currentTime = clips[i].trimStart;
      if (v.readyState >= 2) {
        resolve();
        return;
      }
      const onReady = () => {
        v.removeEventListener('loadeddata', onReady);
        v.removeEventListener('canplay', onReady);
        resolve();
      };
      v.addEventListener('loadeddata', onReady);
      v.addEventListener('canplay', onReady);
      setTimeout(resolve, 2500);
    });

    try {
      const source = audioCtx.createMediaElementSource(v);
      const gain = audioCtx.createGain();
      gain.gain.value = clips[i].volume ?? 1;
      source.connect(gain);
      gain.connect(dest);
    } catch {
      // ignore
    }

    videoElements.push(v);
  }

  const voiceoverElements: { el: HTMLAudioElement; vo: Voiceover }[] = [];
  for (const vo of voiceovers) {
    const a = document.createElement('audio');
    a.crossOrigin = 'anonymous';
    a.preload = 'auto';
    a.src = vo.url;
    exportMount.appendChild(a);

    try {
      const source = audioCtx.createMediaElementSource(a);
      const gain = audioCtx.createGain();
      gain.gain.value = vo.volume ?? 1;
      source.connect(gain);
      gain.connect(dest);
    } catch {
      // ignore
    }
    voiceoverElements.push({ el: a, vo });
  }

  let bgmAudio: HTMLAudioElement | null = null;
  if (bgm && bgm.url) {
    bgmAudio = document.createElement('audio');
    bgmAudio.crossOrigin = 'anonymous';
    bgmAudio.preload = 'auto';
    bgmAudio.src = bgm.url;
    exportMount.appendChild(bgmAudio);

    try {
      const source = audioCtx.createMediaElementSource(bgmAudio);
      const gain = audioCtx.createGain();
      gain.gain.value = bgm.volume ?? 0.2;
      source.connect(gain);
      gain.connect(dest);
    } catch {
      // ignore
    }
  }

  const canvasStream = canvas.captureStream(30);
  const audioTracks = dest.stream.getAudioTracks();
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioTracks,
  ]);

  let chosenMime = 'video/mp4;codecs=avc1';
  const candidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1,opus',
    'video/mp4;codecs=avc1',
    'video/mp4;codecs=h264,aac',
    'video/mp4;codecs=h264',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm',
  ];

  for (const m of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) {
      chosenMime = m;
      break;
    }
  }

  const mediaRecorder = new MediaRecorder(combinedStream, {
    mimeType: chosenMime,
    videoBitsPerSecond,
  });

  const recordedChunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  const cleanupAll = () => {
    try {
      scene3dA?.dispose();
      scene3dB?.dispose();
      videoElements.forEach((v) => {
        if (!v) return;
        v.pause();
        v.src = '';
        v.load();
      });
      voiceoverElements.forEach(({ el }) => {
        el.pause();
        el.src = '';
      });
      if (bgmAudio) {
        bgmAudio.pause();
        bgmAudio.src = '';
      }
      if (exportMount.parentNode) {
        exportMount.parentNode.removeChild(exportMount);
      }
      if (audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
    } catch {
      // ignore
    }
  };

  return new Promise((resolve, reject) => {
    let animId: number | null = null;

    mediaRecorder.onerror = (err) => {
      if (animId) cancelAnimationFrame(animId);
      cleanupAll();
      reject(err);
    };

    mediaRecorder.onstop = () => {
      if (animId) cancelAnimationFrame(animId);
      cleanupAll();
      resolve(new Blob(recordedChunks, { type: 'video/mp4' }));
    };

    mediaRecorder.start(1000);
    const exportStartTime = performance.now();
    let currentClipIndex = -1;
    let isFinished = false;

    const renderLoop = () => {
      if (isFinished) return;
      const elapsed = (performance.now() - exportStartTime) / 1000;

      if (elapsed >= totalDuration) {
        isFinished = true;
        onProgress({ progress: 100, status: 'Menyelesaikan file ekspor...' });
        videoElements.forEach((v) => v?.pause());
        voiceoverElements.forEach(({ el }) => el.pause());
        if (bgmAudio) bgmAudio.pause();
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
        return;
      }

      const progressPercent = Math.min(99, Math.round((elapsed / totalDuration) * 88) + 12);
      onProgress({
        progress: progressPercent,
        status: `Merender frame (${elapsed.toFixed(1)}s / ${totalDuration.toFixed(1)}s)...`,
      });

      const activeTrans = getActiveTransitionInfo(clips, elapsed);
      const activeIdx = clipRanges.findIndex((r) => elapsed >= r.start && elapsed < r.end);

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      const getMrDrawable = (
        clipIdx: number,
        expectedTime: number,
        slot: 'A' | 'B'
      ): DrawableVideoFrame | null => {
        const clip = clips[clipIdx];
        if (clip.clipType === '3d' && clip.scene3d) {
          const r = slot === 'A' ? scene3dA : scene3dB;
          if (!r) return null;
          const dur = Math.max(0.1, clip.trimEnd - clip.trimStart);
          r.renderAt(Math.max(0, expectedTime - clip.trimStart), dur, clip.scene3d);
          return r.getCanvas();
        }
        const vEl = videoElements[clipIdx];
        if (!vEl) return null;
        if (vEl.paused && elapsed < clipRanges[clipIdx].end) {
          vEl.play().catch(() => {});
        }
        if (Math.abs(vEl.currentTime - expectedTime) > 0.12) {
          vEl.currentTime = expectedTime;
        }
        return vEl;
      };

      if (activeTrans) {
        const idxA = activeTrans.cutIndex;
        const idxB = activeTrans.cutIndex + 1;
        const rangeA = clipRanges[idxA];
        const rangeB = clipRanges[idxB];

        const durA = Math.max(0, rangeA.clip.trimEnd - rangeA.clip.trimStart);
        const expectedTimeA =
          rangeA.clip.trimStart + Math.min(durA, Math.max(0, elapsed - rangeA.start));
        const expectedTimeB =
          rangeB.clip.trimStart + Math.max(0, elapsed - rangeB.start);

        const frameA = getMrDrawable(idxA, expectedTimeA, 'A');
        const frameB = getMrDrawable(idxB, expectedTimeB, 'B');

        if (frameA && frameB) {
          drawCanvasTransition(
            ctx,
            frameA,
            frameB,
            activeTrans.type,
            activeTrans.progress,
            width,
            height,
            sharpen,
            sharpenLevel
          );
        } else if (frameA || frameB) {
          drawSingleFrameToCanvas(ctx, (frameA || frameB)!, width, height);
        }
        currentClipIndex = idxB;
      } else if (activeIdx !== -1) {
        const range = clipRanges[activeIdx];
        const expectedClipTime = range.clip.trimStart + (elapsed - range.start);

        if (activeIdx !== currentClipIndex) {
          if (currentClipIndex >= 0) {
            videoElements[currentClipIndex]?.pause();
          }
          currentClipIndex = activeIdx;
          const vEl = videoElements[activeIdx];
          if (vEl) {
            vEl.currentTime = range.clip.trimStart;
            vEl.play().catch(() => {});
          }
        }

        const frame = getMrDrawable(activeIdx, expectedClipTime, 'A');
        if (frame) {
          const is3D = clips[activeIdx].clipType === '3d';
          if (sharpen && !is3D) {
            ctx.filter =
              sharpenLevel === 'high'
                ? 'contrast(1.16) saturate(1.08) brightness(1.02)'
                : 'contrast(1.09) saturate(1.04) brightness(1.01)';
          } else {
            ctx.filter = 'none';
          }
          drawSingleFrameToCanvas(ctx, frame, width, height);
          ctx.filter = 'none';
        }
      }

      voiceoverElements.forEach(({ el, vo }) => {
        const voStart = vo.startTime;
        const voEnd = vo.startTime + vo.duration;
        if (elapsed >= voStart && elapsed <= voEnd) {
          const expectedAudioTime = (vo.trimStart || 0) + (elapsed - voStart);
          if (el.paused) {
            el.currentTime = expectedAudioTime;
            el.play().catch(() => {});
          } else if (Math.abs(el.currentTime - expectedAudioTime) > 0.15) {
            el.currentTime = expectedAudioTime;
          }
        } else if (!el.paused) {
          el.pause();
        }
      });

      if (bgmAudio && bgm && elapsed < totalDuration) {
        const expectedBgmTime =
          bgm.loop && bgm.duration > 0 ? elapsed % bgm.duration : elapsed;
        if (expectedBgmTime < (bgm.duration || Infinity)) {
          if (bgmAudio.paused) {
            bgmAudio.currentTime = expectedBgmTime;
            bgmAudio.play().catch(() => {});
          } else if (Math.abs(bgmAudio.currentTime - expectedBgmTime) > 0.25) {
            bgmAudio.currentTime = expectedBgmTime;
          }
        } else if (!bgmAudio.paused) {
          bgmAudio.pause();
        }
      }

      drawWatermark();
      drawSubtitles(elapsed);

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
  });
}

/**
 * Main video export entry point.
 * Uses Mediabunny + WebCodecs for faster-than-realtime native MP4 rendering,
 * with automatic MediaRecorder fallback for older browsers.
 */
export async function exportVideo(
  clips: VideoClip[],
  subtitles: Subtitle[],
  watermark: Watermark,
  voiceovers: Voiceover[],
  aspectRatio: AspectRatio,
  onProgress: (p: ExportProgress) => void,
  bgm?: BackgroundMusic | null,
  options?: ExportOptions
): Promise<Blob> {
  if (clips.length === 0) {
    throw new Error('Tidak ada video clip untuk diekspor');
  }

  let runningTime = 0;
  const clipRanges: ClipRange[] = clips.map((c) => {
    const start = runningTime;
    const effectiveDur = Math.max(0, c.trimEnd - c.trimStart);
    runningTime += effectiveDur;
    return { clip: c, start, end: runningTime };
  });
  const totalDuration = runningTime;

  if (totalDuration <= 0) {
    throw new Error('Durasi video tidak valid');
  }

  const resolution = options?.resolution || '1080p';
  const sharpen = options?.sharpen ?? true;
  const sharpenLevel = options?.sharpenLevel || 'high';

  let width = 1920;
  let height = 1080;

  if (resolution === '1080p') {
    if (aspectRatio === '9:16') {
      width = 1080;
      height = 1920;
    } else if (aspectRatio === '1:1') {
      width = 1080;
      height = 1080;
    } else {
      width = 1920;
      height = 1080;
    }
  } else if (aspectRatio === '9:16') {
    width = 720;
    height = 1280;
  } else if (aspectRatio === '1:1') {
    width = 720;
    height = 720;
  } else {
    width = 1280;
    height = 720;
  }

  const videoBitsPerSecond = resolution === '1080p' ? 9_000_000 : 4_500_000;

  let watermarkImg: HTMLImageElement | null = null;
  if (watermark.enabled && watermark.type === 'image' && watermark.imageUrl) {
    watermarkImg = new Image();
    watermarkImg.crossOrigin = 'anonymous';
    watermarkImg.src = watermark.imageUrl;
    await new Promise((resolve) => {
      if (!watermarkImg) return resolve(null);
      watermarkImg.onload = resolve;
      watermarkImg.onerror = resolve;
    });
  }

  const supportsWebCodecs =
    typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined';

  if (supportsWebCodecs) {
    try {
      return await exportWithMediabunny(
        clips,
        clipRanges,
        totalDuration,
        width,
        height,
        videoBitsPerSecond,
        sharpen,
        sharpenLevel,
        subtitles,
        watermark,
        watermarkImg,
        voiceovers,
        aspectRatio,
        bgm,
        onProgress
      );
    } catch (err) {
      console.warn(
        '[OpenEdit] Mediabunny WebCodecs export fallback to MediaRecorder:',
        err
      );
      onProgress({
        progress: 5,
        status: 'Beralih ke mode kompatibilitas browser...',
      });
    }
  }

  return exportWithMediaRecorder(
    clips,
    clipRanges,
    totalDuration,
    width,
    height,
    videoBitsPerSecond,
    sharpen,
    sharpenLevel,
    subtitles,
    watermark,
    watermarkImg,
    voiceovers,
    aspectRatio,
    bgm,
    onProgress
  );
}
