import type { VideoClip, Subtitle, Watermark, Voiceover, AspectRatio } from '../types/editor';

export interface ExportProgress {
  progress: number; // 0 to 100
  status: string;
}

export async function exportVideo(
  clips: VideoClip[],
  subtitles: Subtitle[],
  watermark: Watermark,
  voiceovers: Voiceover[],
  aspectRatio: AspectRatio,
  onProgress: (p: ExportProgress) => void
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

  // Determine export dimensions
  let width = 1280;
  let height = 720;
  if (aspectRatio === '9:16') {
    width = 720;
    height = 1280;
  } else if (aspectRatio === '1:1') {
    width = 720;
    height = 720;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  onProgress({ progress: 5, status: 'Menyiapkan audio engine...' });

  // Setup Web Audio Context for audio mixing
  const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtxClass();
  const dest = audioCtx.createMediaStreamDestination();

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

  // Pre-load video elements
  onProgress({ progress: 15, status: 'Menyiapkan elemen video...' });
  const videoElements: HTMLVideoElement[] = [];
  for (let i = 0; i < clips.length; i++) {
    const v = document.createElement('video');
    v.crossOrigin = 'anonymous';
    v.src = clips[i].url;
    v.muted = false;
    v.playsInline = true;
    v.volume = clips[i].volume ?? 1;

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
    a.src = vo.url;
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

  // Combine Canvas Stream with Audio Stream
  const canvasStream = canvas.captureStream(30);
  const audioTracks = dest.stream.getAudioTracks();
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioTracks,
  ]);

  // Setup MediaRecorder
  let mimeType = 'video/webm;codecs=vp9,opus';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
  }

  const mediaRecorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 3_500_000,
  });

  const recordedChunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    mediaRecorder.onerror = (err) => {
      audioCtx.close();
      reject(err);
    };

    mediaRecorder.onstop = () => {
      audioCtx.close();
      const outputBlob = new Blob(recordedChunks, { type: 'video/webm' });
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

    mediaRecorder.start(200);

    const exportStartTime = performance.now();
    let currentClipIndex = -1;

    // Helper to draw watermark
    const drawWatermark = () => {
      if (!watermark.enabled) return;
      ctx.save();
      ctx.globalAlpha = watermark.opacity;

      const padding = 30;
      let x = padding;
      let y = padding;

      if (watermark.type === 'text' && watermark.text) {
        const fontSize = Math.round(28 * watermark.scale);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = watermark.color || '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 4;

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
        const imgW = 120 * watermark.scale;
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

    // Helper to draw subtitles
    const drawSubtitles = (currentTime: number) => {
      const activeSubs = subtitles.filter(
        (s) => currentTime >= s.startTime && currentTime <= s.endTime && s.text.trim().length > 0
      );

      for (const sub of activeSubs) {
        ctx.save();
        const fontSize = Math.round((sub.fontSize || 26) * (width / 1280));

        let fontFamilyName = 'sans-serif';
        if (sub.fontFamily === 'impact') fontFamilyName = 'Impact, sans-serif';
        else if (sub.fontFamily === 'serif') fontFamilyName = 'Georgia, serif';
        else if (sub.fontFamily === 'mono') fontFamilyName = 'Consolas, monospace';
        else if (sub.fontFamily === 'cursive') fontFamilyName = '"Comic Sans MS", cursive';

        ctx.font = `bold ${fontSize}px ${fontFamilyName}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const rawText = sub.isUppercase ? sub.text.toUpperCase() : sub.text;
        const lines = rawText.split('\n');
        const lineHeight = fontSize * 1.35;
        const totalTextHeight = lines.length * lineHeight;
        const targetY = ((sub.positionY ?? 80) / 100) * height;

        lines.forEach((line, index) => {
          const lineY = targetY - totalTextHeight / 2 + index * lineHeight + lineHeight / 2;
          const metrics = ctx.measureText(line);
          const bgPaddingX = 20;
          const bgPaddingY = 10;

          // Draw background pill
          if (sub.bgColor && sub.bgColor !== 'transparent') {
            ctx.fillStyle = sub.bgColor;
            const bgWidth = metrics.width + bgPaddingX * 2;
            const bgHeight = fontSize + bgPaddingY * 2;
            ctx.beginPath();
            ctx.roundRect(
              width / 2 - bgWidth / 2,
              lineY - bgHeight / 2,
              bgWidth,
              bgHeight,
              12
            );
            ctx.fill();
          }

          // Text Glow & Shadow
          if (sub.glowColor) {
            ctx.shadowColor = sub.glowColor;
            ctx.shadowBlur = 14;
          } else {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 4;
          }

          // Draw text stroke & fill
          const strokeWidth = sub.strokeWidth ?? 3;
          if (strokeWidth > 0) {
            ctx.lineWidth = strokeWidth;
            ctx.strokeStyle = sub.strokeColor || 'rgba(0, 0, 0, 0.9)';
            ctx.strokeText(line, width / 2, lineY);
          }

          ctx.fillStyle = sub.color || '#ffffff';
          ctx.fillText(line, width / 2, lineY);
        });

        ctx.restore();
      }
    };

    // Render loop
    const frameInterval = 1000 / 30; // 30 FPS

    const renderLoop = () => {
      const elapsed = (performance.now() - exportStartTime) / 1000;

      if (elapsed >= totalDuration) {
        // Finished!
        onProgress({ progress: 100, status: 'Menyelesaikan file ekspor...' });
        videoElements.forEach((v) => v.pause());
        voiceoverElements.forEach(({ el }) => el.pause());
        mediaRecorder.stop();
        return;
      }

      const progressPercent = Math.min(99, Math.round((elapsed / totalDuration) * 90) + 10);
      onProgress({
        progress: progressPercent,
        status: `Merender frame (${elapsed.toFixed(1)}s / ${totalDuration.toFixed(1)}s)...`,
      });

      // Find active clip
      const activeIdx = clipRanges.findIndex(
        (r) => elapsed >= r.start && elapsed < r.end
      );

      // Black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      if (activeIdx !== -1) {
        const range = clipRanges[activeIdx];
        const vEl = videoElements[activeIdx];

        if (activeIdx !== currentClipIndex) {
          if (currentClipIndex >= 0) {
            videoElements[currentClipIndex].pause();
          }
          currentClipIndex = activeIdx;
          vEl.currentTime = range.clip.trimStart;
          vEl.play().catch(() => {});
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
        }
      }

      // Check voiceovers
      voiceoverElements.forEach(({ el, vo }) => {
        const voStart = vo.startTime;
        const voEnd = vo.startTime + vo.duration;
        if (elapsed >= voStart && elapsed <= voEnd) {
          if (el.paused) {
            el.currentTime = elapsed - voStart;
            el.play().catch(() => {});
          }
        } else {
          if (!el.paused) {
            el.pause();
          }
        }
      });

      // Draw overlays
      drawWatermark();
      drawSubtitles(elapsed);

      window.setTimeout(renderLoop, frameInterval);
    };

    renderLoop();
  });
}
