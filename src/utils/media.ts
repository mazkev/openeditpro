/**
 * Get video duration and generate a thumbnail
 */
export async function processVideoFile(file: File): Promise<{
  url: string;
  duration: number;
  thumbnailUrl: string;
}> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      // Seek slightly into video to get representative frame
      video.currentTime = Math.min(0.5, video.duration / 2);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 90;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve({
            url,
            duration: video.duration,
            thumbnailUrl,
          });
        } else {
          resolve({
            url,
            duration: video.duration,
            thumbnailUrl: '',
          });
        }
      } catch (err) {
        console.warn('Could not extract thumbnail:', err);
        resolve({
          url,
          duration: video.duration,
          thumbnailUrl: '',
        });
      }
    };

    video.onerror = () => {
      reject(new Error('Gagal memuat video'));
    };
  });
}

/**
 * Get audio file duration
 */
export async function processAudioFile(file: File | Blob): Promise<{
  url: string;
  duration: number;
}> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.src = url;

    audio.onloadedmetadata = () => {
      resolve({
        url,
        duration: audio.duration,
      });
    };

    audio.onerror = () => {
      reject(new Error('Gagal memuat audio'));
    };
  });
}

/**
 * Helper to generate a colorful animated sample video clip using Canvas + MediaRecorder
 */
export async function createSampleVideo(
  title: string,
  gradientColor1: string,
  gradientColor2: string,
  durationSec = 5
): Promise<{ file: File; duration: number; thumbnailUrl: string; url: string }> {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d')!;

  const stream = canvas.captureStream(30);
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm',
  });

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve) => {
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const file = new File([blob], `${title.toLowerCase().replace(/\s+/g, '_')}.webm`, {
        type: 'video/webm',
      });
      const url = URL.createObjectURL(blob);

      // Create thumbnail
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 160;
      thumbCanvas.height = 90;
      const tCtx = thumbCanvas.getContext('2d')!;
      tCtx.drawImage(canvas, 0, 0, 160, 90);

      resolve({
        file,
        duration: durationSec,
        thumbnailUrl: thumbCanvas.toDataURL('image/jpeg', 0.8),
        url,
      });
    };

    mediaRecorder.start();

    const startTime = performance.now();

    const render = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      
      // Draw gradient background
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, gradientColor1);
      grad.addColorStop(1, gradientColor2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw animated circle or shape
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      const circleX = (Math.sin(elapsed * 2) * 0.3 + 0.5) * canvas.width;
      const circleY = (Math.cos(elapsed * 1.5) * 0.3 + 0.5) * canvas.height;
      ctx.beginPath();
      ctx.arc(circleX, circleY, 120, 0, Math.PI * 2);
      ctx.fill();

      // Text Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 56px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 10;
      ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 20);

      // Subtext
      ctx.font = '28px system-ui, sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.shadowBlur = 4;
      ctx.fillText(`Sample Clip • ${durationSec}s [${elapsed.toFixed(1)}s]`, canvas.width / 2, canvas.height / 2 + 50);

      if (elapsed < durationSec) {
        requestAnimationFrame(render);
      } else {
        mediaRecorder.stop();
      }
    };

    requestAnimationFrame(render);
  });
}
