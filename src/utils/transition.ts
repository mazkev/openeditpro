import type { VideoSample } from 'mediabunny';
import type { VideoClip, TransitionType, SharpenLevel } from '../types/editor';

export type DrawableVideoFrame = HTMLVideoElement | VideoSample | HTMLCanvasElement;

export interface ActiveTransitionInfo {
  cutIndex: number; // Index of clipA in clips array
  clipA: VideoClip;
  clipB: VideoClip;
  type: TransitionType;
  duration: number;
  progress: number; // 0.0 to 1.0
  cutTime: number;
}

/**
 * Calculates whether currentTime is within a transition window between two adjacent clips.
 */
export function getActiveTransitionInfo(
  clips: VideoClip[],
  currentTime: number
): ActiveTransitionInfo | null {
  if (clips.length < 2) return null;

  let runningTime = 0;
  for (let i = 0; i < clips.length - 1; i++) {
    const clipA = clips[i];
    const clipB = clips[i + 1];

    const durA = Math.max(0, clipA.trimEnd - clipA.trimStart);
    const durB = Math.max(0, clipB.trimEnd - clipB.trimStart);
    const cutTime = runningTime + durA;

    const trans = clipA.transition;
    if (trans && trans.type && trans.type !== 'none' && durA > 0.4 && durB > 0.4) {
      // Clamp transition duration to not exceed 45% of either clip
      const maxAllowed = Math.min(durA * 0.45, durB * 0.45, 1.8);
      const effectiveDuration = Math.min(trans.duration || 0.5, maxAllowed);
      const halfDur = effectiveDuration / 2;

      const tStart = cutTime - halfDur;
      const tEnd = cutTime + halfDur;

      if (currentTime >= tStart && currentTime <= tEnd) {
        const rawProgress = (currentTime - tStart) / effectiveDuration;
        const progress = Math.max(0, Math.min(1, rawProgress));

        return {
          cutIndex: i,
          clipA,
          clipB,
          type: trans.type,
          duration: effectiveDuration,
          progress,
          cutTime,
        };
      }
    }

    runningTime += durA;
  }

  return null;
}

/**
 * Calculates CSS transformation and opacity properties for PreviewPlayer dual-video rendering.
 */
export function getCssTransitionStyles(
  type: TransitionType,
  progress: number
): {
  styleA: React.CSSProperties;
  styleB: React.CSSProperties;
  flashOpacity: number;
} {
  const p = Math.max(0, Math.min(1, progress));

  switch (type) {
    case 'fade':
      return {
        styleA: { opacity: 1 - p },
        styleB: { opacity: p },
        flashOpacity: 0,
      };

    case 'fade-black':
      return {
        styleA: { opacity: Math.max(0, 1 - p * 2) },
        styleB: { opacity: Math.max(0, (p - 0.5) * 2) },
        flashOpacity: 0,
      };

    case 'fade-white':
      return {
        styleA: { opacity: p < 0.5 ? 1 : 0 },
        styleB: { opacity: p >= 0.5 ? 1 : 0 },
        flashOpacity: Math.max(0, 1 - Math.abs(p - 0.5) * 2),
      };

    case 'slide-left':
      return {
        styleA: {
          transform: `translateX(-${(p * 100).toFixed(2)}%)`,
          opacity: 1,
        },
        styleB: {
          transform: `translateX(${((1 - p) * 100).toFixed(2)}%)`,
          opacity: 1,
        },
        flashOpacity: 0,
      };

    case 'slide-right':
      return {
        styleA: {
          transform: `translateX(${(p * 100).toFixed(2)}%)`,
          opacity: 1,
        },
        styleB: {
          transform: `translateX(-${((1 - p) * 100).toFixed(2)}%)`,
          opacity: 1,
        },
        flashOpacity: 0,
      };

    case 'slide-up':
      return {
        styleA: {
          transform: `translateY(-${(p * 100).toFixed(2)}%)`,
          opacity: 1,
        },
        styleB: {
          transform: `translateY(${((1 - p) * 100).toFixed(2)}%)`,
          opacity: 1,
        },
        flashOpacity: 0,
      };

    case 'slide-down':
      return {
        styleA: {
          transform: `translateY(${(p * 100).toFixed(2)}%)`,
          opacity: 1,
        },
        styleB: {
          transform: `translateY(-${((1 - p) * 100).toFixed(2)}%)`,
          opacity: 1,
        },
        flashOpacity: 0,
      };

    case 'zoom-in':
      return {
        styleA: {
          transform: `scale(${(1 + 0.35 * p).toFixed(3)})`,
          opacity: 1 - p,
        },
        styleB: {
          transform: `scale(${(0.7 + 0.3 * p).toFixed(3)})`,
          opacity: p,
        },
        flashOpacity: 0,
      };

    case 'zoom-out':
      return {
        styleA: {
          transform: `scale(${(1 - 0.3 * p).toFixed(3)})`,
          opacity: 1 - p,
        },
        styleB: {
          transform: `scale(${(1.35 - 0.35 * p).toFixed(3)})`,
          opacity: p,
        },
        flashOpacity: 0,
      };

    case 'wipe-left':
      return {
        styleA: { opacity: 1 },
        styleB: {
          opacity: 1,
          clipPath: `inset(0 0 0 ${((1 - p) * 100).toFixed(2)}%)`,
        },
        flashOpacity: 0,
      };

    case 'wipe-right':
      return {
        styleA: { opacity: 1 },
        styleB: {
          opacity: 1,
          clipPath: `inset(0 ${((1 - p) * 100).toFixed(2)}% 0 0)`,
        },
        flashOpacity: 0,
      };

    default:
      return {
        styleA: { opacity: 1 },
        styleB: { opacity: 0 },
        flashOpacity: 0,
      };
  }
}

/**
 * Draws a single video element or Mediabunny VideoSample scaled proportionally to fill canvas container.
 */
export function drawSingleFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  frame: DrawableVideoFrame,
  width: number,
  height: number,
  offsetX = 0,
  offsetY = 0,
  scale = 1.0,
  opacity = 1.0
) {
  if (opacity <= 0.005) return;

  const isVideoSample = 'displayWidth' in frame;
  const isCanvas = typeof HTMLCanvasElement !== 'undefined' && frame instanceof HTMLCanvasElement;
  if (!isVideoSample && !isCanvas && (frame as HTMLVideoElement).readyState < 2) return;

  const vWidth = isVideoSample
    ? frame.displayWidth || 1280
    : isCanvas
      ? frame.width || 1280
      : (frame as HTMLVideoElement).videoWidth || 1280;
  const vHeight = isVideoSample
    ? frame.displayHeight || 720
    : isCanvas
      ? frame.height || 720
      : (frame as HTMLVideoElement).videoHeight || 720;
  const hRatio = width / vWidth;
  const vRatio = height / vHeight;
  const fitRatio = Math.min(hRatio, vRatio) * scale;

  const destW = vWidth * fitRatio;
  const destH = vHeight * fitRatio;
  const destX = (width - destW) / 2 + offsetX;
  const destY = (height - destH) / 2 + offsetY;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
  if (isVideoSample) {
    frame.draw(ctx, destX, destY, destW, destH);
  } else {
    ctx.drawImage(frame, 0, 0, vWidth, vHeight, destX, destY, destW, destH);
  }
  ctx.restore();
}

const drawSingleFrame = drawSingleFrameToCanvas;

/**
 * Renders two video frames onto the Canvas during an active transition for export.
 */
export function drawCanvasTransition(
  ctx: CanvasRenderingContext2D,
  vElA: DrawableVideoFrame,
  vElB: DrawableVideoFrame,
  type: TransitionType,
  progress: number,
  width: number,
  height: number,
  sharpen: boolean,
  sharpenLevel: SharpenLevel
) {
  const p = Math.max(0, Math.min(1, progress));

  // Set sharpening filter if enabled
  if (sharpen) {
    ctx.filter =
      sharpenLevel === 'high'
        ? 'contrast(1.16) saturate(1.08) brightness(1.02)'
        : 'contrast(1.09) saturate(1.04) brightness(1.01)';
  } else {
    ctx.filter = 'none';
  }

  switch (type) {
    case 'fade':
      drawSingleFrame(ctx, vElA, width, height, 0, 0, 1.0, 1.0 - p);
      drawSingleFrame(ctx, vElB, width, height, 0, 0, 1.0, p);
      break;

    case 'fade-black': {
      const alphaA = Math.max(0, 1.0 - p * 2);
      const alphaB = Math.max(0, (p - 0.5) * 2);
      if (alphaA > 0) drawSingleFrame(ctx, vElA, width, height, 0, 0, 1.0, alphaA);
      if (alphaB > 0) drawSingleFrame(ctx, vElB, width, height, 0, 0, 1.0, alphaB);
      break;
    }

    case 'fade-white': {
      if (p < 0.5) {
        drawSingleFrame(ctx, vElA, width, height, 0, 0, 1.0, 1.0);
      } else {
        drawSingleFrame(ctx, vElB, width, height, 0, 0, 1.0, 1.0);
      }
      const flashAlpha = Math.max(0, 1.0 - Math.abs(p - 0.5) * 2);
      if (flashAlpha > 0.01) {
        ctx.save();
        ctx.filter = 'none';
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = flashAlpha;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
      break;
    }

    case 'slide-left':
      drawSingleFrame(ctx, vElA, width, height, -width * p, 0, 1.0, 1.0);
      drawSingleFrame(ctx, vElB, width, height, width * (1.0 - p), 0, 1.0, 1.0);
      break;

    case 'slide-right':
      drawSingleFrame(ctx, vElA, width, height, width * p, 0, 1.0, 1.0);
      drawSingleFrame(ctx, vElB, width, height, -width * (1.0 - p), 0, 1.0, 1.0);
      break;

    case 'slide-up':
      drawSingleFrame(ctx, vElA, width, height, 0, -height * p, 1.0, 1.0);
      drawSingleFrame(ctx, vElB, width, height, 0, height * (1.0 - p), 1.0, 1.0);
      break;

    case 'slide-down':
      drawSingleFrame(ctx, vElA, width, height, 0, height * p, 1.0, 1.0);
      drawSingleFrame(ctx, vElB, width, height, 0, -height * (1.0 - p), 1.0, 1.0);
      break;

    case 'zoom-in':
      drawSingleFrame(ctx, vElA, width, height, 0, 0, 1.0 + 0.35 * p, 1.0 - p);
      drawSingleFrame(ctx, vElB, width, height, 0, 0, 0.70 + 0.30 * p, p);
      break;

    case 'zoom-out':
      drawSingleFrame(ctx, vElA, width, height, 0, 0, 1.0 - 0.30 * p, 1.0 - p);
      drawSingleFrame(ctx, vElB, width, height, 0, 0, 1.35 - 0.35 * p, p);
      break;

    case 'wipe-left': {
      drawSingleFrame(ctx, vElA, width, height, 0, 0, 1.0, 1.0);
      ctx.save();
      ctx.beginPath();
      ctx.rect(width * (1.0 - p), 0, width * p, height);
      ctx.clip();
      drawSingleFrame(ctx, vElB, width, height, 0, 0, 1.0, 1.0);
      ctx.restore();
      break;
    }

    case 'wipe-right': {
      drawSingleFrame(ctx, vElA, width, height, 0, 0, 1.0, 1.0);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width * p, height);
      ctx.clip();
      drawSingleFrame(ctx, vElB, width, height, 0, 0, 1.0, 1.0);
      ctx.restore();
      break;
    }

    default:
      if (p < 0.5) {
        drawSingleFrame(ctx, vElA, width, height, 0, 0, 1.0, 1.0);
      } else {
        drawSingleFrame(ctx, vElB, width, height, 0, 0, 1.0, 1.0);
      }
      break;
  }

  ctx.filter = 'none';
}
