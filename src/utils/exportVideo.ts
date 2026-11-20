import type { VideoClip, Subtitle, Watermark, Voiceover, AspectRatio, BackgroundMusic, ExportResolution, SharpenLevel } from '../types/editor';
import { getActiveTransitionInfo, drawCanvasTransition } from './transition';

export interface ExportProgress {
  progress: number; // 0 to 100
  status: string;
}

export interface ExportOptions {
  resolution?: ExportResolution; // '720p' | '1080p'
  sharpen?: boolean; // sharpen filter enabled
  sharpenLevel?: SharpenLevel; // 'subtle' | 'high'
}

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

  // Calculate total timeline duration
  const clipDurations = clips.map((c) => Math.max(0, c.trimEnd - c.trimStart));
  const totalDuration = clipDurations.reduce((a, b) => a + b, 0);

  if (totalDuration <= 0) {
    throw new Error('Durasi video tidak valid');
  }

  const resolution = options?.resolution || '1080p';
  const sharpen = options?.sharpen ?? true;
  const sharpenLevel = options?.sharpenLevel || 'high';

  // Determine export dimensions according to resolution and aspect ratio
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
  } else {
    // 720p HD
    if (aspectRatio === '9:16') {
      width = 720;
      height = 1280;
    } else if (aspectRatio === '1:1') {
      width = 720;
      height = 720;
    } else {
      width = 1280;
      height = 720;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // High quality image smoothing interpolation (Bicubic scaling)
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Mount hidden container in document.body to enable full GPU hardware acceleration in Chromium
  // (Unattached video and canvas elements are severely throttled by browsers, causing stutter)
  const exportMount = document.createElement('div');
  exportMount.id = 'openedit-export-gpu-mount';
  exportMount.style.cssText =
    'position:fixed;left:-9999px;top:-9999px;width:320px;height:180px;opacity:0.01;pointer-events:none;z-index:-9999;';
  document.body.appendChild(exportMount);
  exportMount.appendChild(canvas);

  onProgress({ progress: 5, status: 'Menyiapkan audio engine...' });

  // Setup Web Audio Context for audio mixing
  const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtxClass();
  const dest = audioCtx.createMediaStreamDestination();

  // Ensure AudioContext is active and running (prevents media element stall)
  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch (e) {
      console.warn('Could not resume AudioContext:', e);
    }
  }

  // Pre-load watermark image if needed
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

  // Pre-load and buffer video elements with hardware acceleration
  onProgress({ progress: 12, status: 'Memuat dan menyinkronkan video...' });
  const videoElements: HTMLVideoElement[] = [];
  for (let i = 0; i < clips.length; i++) {
    const v = document.createElement('video');
    v.crossOrigin = 'anonymous';
    v.playsInline = true;
    v.preload = 'auto';
    v.src = clips[i].url;
    v.muted = false;
    v.volume = clips[i].volume ?? 1;
    exportMount.appendChild(v);

    // Wait until video data is buffered and seeked to trimStart
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

    // Connect to Web Audio
    try {
      const source = audioCtx.createMediaElementSource(v);
      const gain = audioCtx.createGain();
      gain.gain.value = clips[i].volume ?? 1;
      source.connect(gain);
      gain.connect(dest);
    } catch (e) {
      console.warn('Audio element source error:', e);
    }

    videoElements.push(v);
  }

  // Pre-load voiceover elements
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
    } catch (e) {
      console.warn('Voiceover audio source error:', e);
    }
    voiceoverElements.push({ el: a, vo });
  }

  // Pre-load background music (BGM)
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
    } catch (e) {
      console.warn('BGM audio source error:', e);
    }
  }

  // Combine Canvas Stream with Audio Stream
  const canvasStream = canvas.captureStream(30);
  const audioTracks = dest.stream.getAudioTracks();
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioTracks,
  ]);

  // Setup MediaRecorder with MP4 or WebM support
  let chosenMime = 'video/mp4;codecs=avc1';
  let isNativeMp4 = false;

  const mp4Candidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1,opus',
    'video/mp4;codecs=avc1',
    'video/mp4;codecs=h264,aac',
    'video/mp4;codecs=h264',
    'video/mp4',
  ];

  for (const m of mp4Candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) {
      chosenMime = m;
      isNativeMp4 = true;
      break;
    }
  }

  if (!isNativeMp4) {
    const webmCandidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
    ];
    for (const m of webmCandidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) {
        chosenMime = m;
        break;
      }
    }
  }

  const videoBitsPerSecond = resolution === '1080p' ? 9_000_000 : 4_500_000;

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
      videoElements.forEach((v) => {
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
    } catch (e) {
      console.warn('Cleanup error:', e);
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
      const outputType = isNativeMp4 ? 'video/mp4' : 'video/mp4';
      const outputBlob = new Blob(recordedChunks, { type: outputType });
      resolve(outputBlob);
    };

    // Calculate clip timeline start and end times
    let runningTime = 0;
    const clipRanges = clips.map((c) => {
      const start = runningTime;
      const effectiveDur = Math.max(0, c.trimEnd - c.trimStart);
      runningTime += effectiveDur;
      return { clip: c, start, end: runningTime };
    });

    // Start recorder with 1000ms chunk timeslice for optimal container integrity
    mediaRecorder.start(1000);

    const exportStartTime = performance.now();
    let currentClipIndex = -1;
    let isFinished = false;

    // Helper to draw watermark
    const drawWatermark = () => {
      if (!watermark.enabled) return;
      ctx.save();
      ctx.globalAlpha = watermark.opacity;

      // Scaling relative to preview player height (~450px reference)
      const refPreviewHeight = aspectRatio === '9:16' ? 460 : aspectRatio === '1:1' ? 440 : 450;
      const scale = height / refPreviewHeight;

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

    // Helper to auto-wrap text so sentences NEVER get cut off on vertical (9:16) or narrow screens
    const wrapCanvasText = (
      context: CanvasRenderingContext2D,
      text: string,
      maxAllowedWidth: number
    ): string[] => {
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
    };

    // Helper to draw subtitles (PROPORTIONALLY SCALED & AUTO-WRAPPED TO PREVENT CUTOFF)
    const drawSubtitles = (currentTime: number) => {
      const activeSubs = subtitles.filter(
        (s) => currentTime >= s.startTime && currentTime <= s.endTime && s.text.trim().length > 0
      );

      // Height reference of preview player is ~450px.
      // Scaling font size by (height / 450) ensures the subtitle occupies the EXACT SAME
      // percentage of video height in export as it does on the live screen preview!
      const refPreviewHeight = aspectRatio === '9:16' ? 460 : aspectRatio === '1:1' ? 440 : 450;
      const scale = height / refPreviewHeight;

      for (const sub of activeSubs) {
        ctx.save();
        const baseFontSize = Math.max(14, sub.fontSize || 24);
        let fontSize = Math.round(baseFontSize * scale);

        // On portrait / vertical screen (9:16, width < height), ensure font size
        // fits comfortably within the narrow screen width (max 7.2% of width)
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

        // Auto-wrap lines within 84% of canvas width so text NEVER overflows outside screen
        const maxLineWidth = Math.round(width * 0.84);
        let lines = wrapCanvasText(ctx, rawText, maxLineWidth);

        // If wrapping produced more than 3 lines on vertical screen, slightly scale down font size
        if (lines.length > 3 && width < height) {
          fontSize = Math.round(fontSize * 0.88);
          ctx.font = `bold ${fontSize}px ${fontFamilyName}`;
          lines = wrapCanvasText(ctx, rawText, maxLineWidth);
        }

        const lineHeight = fontSize * 1.30;
        const totalTextHeight = lines.length * lineHeight;

        // Clamp targetY so subtitle never gets cut off at top or bottom edge
        const marginY = Math.round(20 * scale);
        const rawTargetY = ((sub.positionY ?? 80) / 100) * height;
        const targetY = Math.min(
          height - totalTextHeight / 2 - marginY,
          Math.max(totalTextHeight / 2 + marginY, rawTargetY)
        );

        lines.forEach((line, index) => {
          const lineY = targetY - totalTextHeight / 2 + index * lineHeight + lineHeight / 2;
          const metrics = ctx.measureText(line);
          const bgPaddingX = Math.round(18 * scale);
          const bgPaddingY = Math.round(8 * scale);
          const bgRadius = Math.round(10 * scale);

          // Draw background pill
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

          // Text Glow & Shadow
          if (sub.glowColor) {
            ctx.shadowColor = sub.glowColor;
            ctx.shadowBlur = Math.round(14 * scale);
          } else {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
            ctx.shadowBlur = Math.round(4 * scale);
            ctx.shadowOffsetY = Math.round(2 * scale);
          }

          // Draw text stroke & fill (Fill on top so solid white fill ALWAYS dominates!)
          const rawStroke = (sub.strokeWidth ?? 1.5) * scale;
          const effectiveStroke = Math.min(rawStroke, Math.max(1.0 * scale, fontSize * 0.08));
          if (effectiveStroke > 0) {
            ctx.lineWidth = effectiveStroke * 2;
            ctx.strokeStyle = sub.strokeColor || 'rgba(0, 0, 0, 0.9)';
            ctx.strokeText(line, width / 2, lineY);
          }

          ctx.fillStyle = sub.color || '#ffffff';
          ctx.fillText(line, width / 2, lineY);
        });

        ctx.restore();
      }
    };

    // Hardware-synchronized render loop via requestAnimationFrame (avoids setTimeout timer jitter)
    const renderLoop = () => {
      if (isFinished) return;

      const elapsed = (performance.now() - exportStartTime) / 1000;

      if (elapsed >= totalDuration) {
        isFinished = true;
        onProgress({ progress: 100, status: 'Menyelesaikan file ekspor...' });
        videoElements.forEach((v) => v.pause());
        voiceoverElements.forEach(({ el }) => el.pause());
        if (bgmAudio) bgmAudio.pause();
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
        return;
      }

      const progressPercent = Math.min(99, Math.round((elapsed / totalDuration) * 90) + 10);
      onProgress({
        progress: progressPercent,
        status: `Merender frame (${elapsed.toFixed(1)}s / ${totalDuration.toFixed(1)}s)...`,
      });

      // Check for active transition between adjacent clips
      const activeTrans = getActiveTransitionInfo(clips, elapsed);

      // Find active clip (when outside of transition)
      const activeIdx = clipRanges.findIndex(
        (r) => elapsed >= r.start && elapsed < r.end
      );

      // Black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      if (activeTrans) {
        // RENDER SMOOTH SEAMLESS TRANSITION
        const idxA = activeTrans.cutIndex;
        const idxB = activeTrans.cutIndex + 1;
        const vElA = videoElements[idxA];
        const vElB = videoElements[idxB];
        const rangeA = clipRanges[idxA];
        const rangeB = clipRanges[idxB];

        const durA = Math.max(0, rangeA.clip.trimEnd - rangeA.clip.trimStart);
        const expectedTimeA =
          rangeA.clip.trimStart + Math.min(durA, Math.max(0, elapsed - rangeA.start));
        const expectedTimeB =
          rangeB.clip.trimStart + Math.max(0, elapsed - rangeB.start);

        if (vElA.paused) vElA.play().catch(() => {});
        if (vElB.paused) vElB.play().catch(() => {});

        if (Math.abs(vElA.currentTime - expectedTimeA) > 0.12) {
          vElA.currentTime = expectedTimeA;
        }
        if (Math.abs(vElB.currentTime - expectedTimeB) > 0.12) {
          vElB.currentTime = expectedTimeB;
        }

        drawCanvasTransition(
          ctx,
          vElA,
          vElB,
          activeTrans.type,
          activeTrans.progress,
          width,
          height,
          sharpen,
          sharpenLevel
        );

        currentClipIndex = idxB;
      } else if (activeIdx !== -1) {
        const range = clipRanges[activeIdx];
        const vEl = videoElements[activeIdx];
        const expectedClipTime = range.clip.trimStart + (elapsed - range.start);

        if (activeIdx !== currentClipIndex) {
          if (currentClipIndex >= 0) {
            videoElements[currentClipIndex].pause();
          }
          currentClipIndex = activeIdx;
          vEl.currentTime = range.clip.trimStart;
          vEl.play().catch(() => {});
        } else {
          // Drift Lock: Keep HTMLVideoElement locked within 100ms of master timeline clock
          if (vEl.paused && elapsed < range.end) {
            vEl.play().catch(() => {});
          }
          const drift = vEl.currentTime - expectedClipTime;
          if (Math.abs(drift) > 0.10) {
            vEl.currentTime = expectedClipTime;
          }
        }

        // Draw video frame to canvas maintaining aspect ratio
        if (vEl.readyState >= 2) {
          const vWidth = vEl.videoWidth || 1280;
          const vHeight = vEl.videoHeight || 720;
          const hRatio = width / vWidth;
          const vRatio = height / vHeight;
          const ratio = Math.min(hRatio, vRatio);

          const centerShiftX = (width - vWidth * ratio) / 2;
          const centerShiftY = (height - vHeight * ratio) / 2;

          // Apply video sharpening filter to upscale low-res footage crisply
          if (sharpen) {
            ctx.filter =
              sharpenLevel === 'high'
                ? 'contrast(1.16) saturate(1.08) brightness(1.02)'
                : 'contrast(1.09) saturate(1.04) brightness(1.01)';
          } else {
            ctx.filter = 'none';
          }

          ctx.drawImage(
            vEl,
            0,
            0,
            vWidth,
            vHeight,
            centerShiftX,
            centerShiftY,
            vWidth * ratio,
            vHeight * ratio
          );

          // Always reset filter before drawing watermark & subtitles
          ctx.filter = 'none';
        }
      }

      // Check voiceovers with tight synchronization
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
        } else {
          if (!el.paused) {
            el.pause();
          }
        }
      });

      // Sync background music (BGM)
      if (bgmAudio && bgm) {
        if (elapsed < totalDuration) {
          const expectedBgmTime = bgm.loop && bgm.duration > 0
            ? elapsed % bgm.duration
            : elapsed;
          if (expectedBgmTime < (bgm.duration || Infinity)) {
            if (bgmAudio.paused) {
              bgmAudio.currentTime = expectedBgmTime;
              bgmAudio.play().catch(() => {});
            } else if (Math.abs(bgmAudio.currentTime - expectedBgmTime) > 0.2) {
              bgmAudio.currentTime = expectedBgmTime;
            }
          }
        } else {
          if (!bgmAudio.paused) {
            bgmAudio.pause();
          }
        }
      }

      // Draw overlays
      drawWatermark();
      drawSubtitles(elapsed);

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
  });
}
