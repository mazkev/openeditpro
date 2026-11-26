import React, { useRef, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Film,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { VideoClip, Subtitle, Watermark, Voiceover, AspectRatio, BackgroundMusic } from '../types/editor';
import { formatTime } from '../utils/time';
import { getActiveTransitionInfo, getCssTransitionStyles } from '../utils/transition';
import { Scene3DRenderer } from '../utils/scene3d';
import { ensureVoiceoverEnvelope, getVoiceoverMouthOpenAt } from '../utils/audioEnvelope';

interface PreviewPlayerProps {
  clips: VideoClip[];
  subtitles: Subtitle[];
  watermark: Watermark;
  voiceovers: Voiceover[];
  aspectRatio: AspectRatio;
  currentTime: number;
  setCurrentTime: (t: number | ((prev: number) => number)) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  totalDuration: number;
  bgm?: BackgroundMusic | null;
}

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({
  clips,
  subtitles,
  watermark,
  voiceovers,
  aspectRatio,
  currentTime,
  setCurrentTime,
  isPlaying,
  setIsPlaying,
  totalDuration,
  bgm,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefA = useRef<HTMLVideoElement>(null);
  const videoRefB = useRef<HTMLVideoElement>(null);
  const canvas3dARef = useRef<HTMLCanvasElement>(null);
  const canvas3dBRef = useRef<HTMLCanvasElement>(null);
  const renderer3dARef = useRef<Scene3DRenderer | null>(null);
  const renderer3dBRef = useRef<Scene3DRenderer | null>(null);
  const flashOverlayRef = useRef<HTMLDivElement>(null);
  const voiceoverAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const [masterVolume, setMasterVolume] = React.useState(1);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isSharpenPreview, setIsSharpenPreview] = React.useState(true);

  // Compute active transition (if currentTime is within transition boundary)
  const activeTransition = useMemo(
    () => getActiveTransitionInfo(clips, currentTime),
    [clips, currentTime]
  );

  const transitionStyles = useMemo(() => {
    if (!activeTransition) {
      return {
        styleA: { opacity: 1 },
        styleB: { opacity: 0, display: 'none' as const },
        flashOpacity: 0,
      };
    }
    return getCssTransitionStyles(activeTransition.type, activeTransition.progress);
  }, [activeTransition]);

  // Compute which clip is active at currentTime (when outside transition)
  let activeClipIndex = -1;
  let activeClipOffset = 0; // seconds into the active clip's trimmed window
  let runningTime = 0;

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const effectiveDur = Math.max(0, clip.trimEnd - clip.trimStart);
    if (currentTime >= runningTime && currentTime < runningTime + effectiveDur) {
      activeClipIndex = i;
      activeClipOffset = currentTime - runningTime;
      break;
    }
    runningTime += effectiveDur;
  }

  // Handle edge case: if at the end of total duration, pick last clip
  if (activeClipIndex === -1 && clips.length > 0 && currentTime >= totalDuration) {
    activeClipIndex = clips.length - 1;
    activeClipOffset = Math.max(0, clips[activeClipIndex].trimEnd - clips[activeClipIndex].trimStart);
  }

  const activeClip = activeClipIndex !== -1 ? clips[activeClipIndex] : null;
  const slotAIs3D = activeTransition
    ? activeTransition.clipA.clipType === '3d' && Boolean(activeTransition.clipA.scene3d)
    : activeClip?.clipType === '3d' && Boolean(activeClip?.scene3d);
  const slotBIs3D = activeTransition
    ? activeTransition.clipB.clipType === '3d' && Boolean(activeTransition.clipB.scene3d)
    : false;

  // Cleanup 3D renderers on unmount
  useEffect(() => {
    return () => {
      renderer3dARef.current?.dispose();
      renderer3dARef.current = null;
      renderer3dBRef.current?.dispose();
      renderer3dBRef.current = null;
    };
  }, []);

  // Sync video elements & 3D Stickman canvases with clips, transitions, and currentTime
  useEffect(() => {
    const videoA = videoRefA.current;
    const videoB = videoRefB.current;
    const previewW = aspectRatio === '9:16' ? 540 : aspectRatio === '1:1' ? 600 : 800;
    const previewH = aspectRatio === '9:16' ? 960 : aspectRatio === '1:1' ? 600 : 450;

    const render3DSlot = (
      rendererRef: React.MutableRefObject<Scene3DRenderer | null>,
      canvasRef: React.RefObject<HTMLCanvasElement | null>,
      clip: VideoClip,
      timeInClip: number
    ) => {
      if (!clip.scene3d || !canvasRef.current) return;
      if (!rendererRef.current) {
        rendererRef.current = new Scene3DRenderer(previewW, previewH);
      } else {
        rendererRef.current.resize(previewW, previewH);
      }
      const r = rendererRef.current;
      const dur = Math.max(0.1, clip.trimEnd - clip.trimStart);
      if (clip.scene3d.mode === 'glb' && clip.scene3d.glbUrl) {
        r.ensureGlbLoaded(clip.scene3d.glbUrl).catch(() => {});
      }
      const mouthOpen = getVoiceoverMouthOpenAt(voiceovers, currentTime);
      r.renderAt(timeInClip, dur, clip.scene3d, { mouthOpen });

      const targetCanvas = canvasRef.current;
      if (targetCanvas.width !== previewW || targetCanvas.height !== previewH) {
        targetCanvas.width = previewW;
        targetCanvas.height = previewH;
      }
      const ctx = targetCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(r.getCanvas(), 0, 0, previewW, previewH);
      }
    };

    if (activeTransition) {
      const clipA = activeTransition.clipA;
      const clipB = activeTransition.clipB;

      const durA = Math.max(0, clipA.trimEnd - clipA.trimStart);
      const cutTime = activeTransition.cutTime;
      const timeInClipA = clipA.trimStart + Math.min(durA, Math.max(0, currentTime - (cutTime - durA)));
      const timeInClipB = clipB.trimStart + Math.max(0, currentTime - cutTime);

      // Slot A
      if (clipA.clipType === '3d' && clipA.scene3d) {
        if (videoA && !videoA.paused) videoA.pause();
        render3DSlot(renderer3dARef, canvas3dARef, clipA, timeInClipA - clipA.trimStart);
      } else if (videoA) {
        if (videoA.src !== clipA.url) {
          videoA.src = clipA.url;
          videoA.currentTime = timeInClipA;
        } else {
          const driftA = Math.abs(videoA.currentTime - timeInClipA);
          if (!isPlaying || driftA > 0.25) {
            videoA.currentTime = timeInClipA;
          }
        }
        videoA.volume = isMuted
          ? 0
          : (clipA.volume ?? 1) * masterVolume * Math.max(0, 1 - activeTransition.progress);
        if (isPlaying && videoA.paused) videoA.play().catch(() => {});
        else if (!isPlaying && !videoA.paused) videoA.pause();
      }

      // Slot B
      if (clipB.clipType === '3d' && clipB.scene3d) {
        if (videoB && !videoB.paused) videoB.pause();
        render3DSlot(renderer3dBRef, canvas3dBRef, clipB, timeInClipB - clipB.trimStart);
      } else if (videoB) {
        if (videoB.src !== clipB.url) {
          videoB.src = clipB.url;
          videoB.currentTime = timeInClipB;
        } else {
          const driftB = Math.abs(videoB.currentTime - timeInClipB);
          if (!isPlaying || driftB > 0.25) {
            videoB.currentTime = timeInClipB;
          }
        }
        videoB.volume = isMuted
          ? 0
          : (clipB.volume ?? 1) * masterVolume * Math.min(1, activeTransition.progress);
        if (isPlaying && videoB.paused) videoB.play().catch(() => {});
        else if (!isPlaying && !videoB.paused) videoB.pause();
      }
    } else {
      if (videoB && !videoB.paused) {
        videoB.pause();
      }
      if (!activeClip) return;

      if (activeClip.clipType === '3d' && activeClip.scene3d) {
        if (videoA && !videoA.paused) videoA.pause();
        render3DSlot(renderer3dARef, canvas3dARef, activeClip, activeClipOffset);
      } else if (videoA) {
        const targetClipTime = activeClip.trimStart + activeClipOffset;

        if (videoA.src !== activeClip.url) {
          videoA.src = activeClip.url;
          videoA.currentTime = targetClipTime;
        } else {
          const drift = Math.abs(videoA.currentTime - targetClipTime);
          if (!isPlaying || drift > 0.25) {
            videoA.currentTime = targetClipTime;
          }
        }

        videoA.volume = isMuted ? 0 : (activeClip.volume ?? 1) * masterVolume;

        if (isPlaying) {
          if (videoA.paused) videoA.play().catch(() => {});
        } else if (!videoA.paused) {
          videoA.pause();
        }
      }
    }
  }, [activeTransition, activeClip, activeClipOffset, currentTime, isPlaying, masterVolume, isMuted, aspectRatio, voiceovers]);

  // Sync voiceovers
  useEffect(() => {
    voiceovers.forEach((vo) => {
      void ensureVoiceoverEnvelope(vo.url);
      let audio = voiceoverAudioRefs.current.get(vo.id);
      if (!audio) {
        audio = new Audio(vo.url);
        voiceoverAudioRefs.current.set(vo.id, audio);
      }
      audio.volume = isMuted ? 0 : (vo.volume ?? 1) * masterVolume;

      const voStart = vo.startTime;
      const voEnd = vo.startTime + vo.duration;

      if (currentTime >= voStart && currentTime <= voEnd) {
        const targetAudioTime = (vo.trimStart || 0) + (currentTime - voStart);
        if (!isPlaying || Math.abs(audio.currentTime - targetAudioTime) > 0.3) {
          audio.currentTime = targetAudioTime;
        }
        if (isPlaying && audio.paused) {
          audio.play().catch(() => {});
        } else if (!isPlaying && !audio.paused) {
          audio.pause();
        }
      } else {
        if (!audio.paused) {
          audio.pause();
          audio.currentTime = 0;
        }
      }
    });

    // Cleanup removed voiceovers
    voiceoverAudioRefs.current.forEach((audio, id) => {
      if (!voiceovers.some((v) => v.id === id)) {
        audio.pause();
        voiceoverAudioRefs.current.delete(id);
      }
    });
  }, [voiceovers, isPlaying, currentTime, masterVolume, isMuted]);

  // Sync background music (BGM)
  useEffect(() => {
    if (!bgm || !bgm.url) {
      if (bgmAudioRef.current) {
        bgmAudioRef.current.pause();
        bgmAudioRef.current = null;
      }
      return;
    }

    if (!bgmAudioRef.current || bgmAudioRef.current.src !== bgm.url) {
      if (bgmAudioRef.current) {
        bgmAudioRef.current.pause();
      }
      bgmAudioRef.current = new Audio(bgm.url);
    }

    const audio = bgmAudioRef.current;
    audio.volume = isMuted ? 0 : (bgm.volume ?? 0.2) * masterVolume;
    audio.loop = bgm.loop ?? true;

    if (isPlaying) {
      const targetTime = bgm.loop && bgm.duration > 0
        ? currentTime % bgm.duration
        : currentTime;

      if (targetTime < (bgm.duration || Infinity)) {
        if (Math.abs(audio.currentTime - targetTime) > 0.35) {
          audio.currentTime = targetTime;
        }
        if (audio.paused) {
          audio.play().catch(() => {});
        }
      } else {
        if (!audio.paused) audio.pause();
      }
    } else {
      if (!audio.paused) {
        audio.pause();
      }
      const targetTime = bgm.loop && bgm.duration > 0
        ? currentTime % bgm.duration
        : currentTime;
      if (targetTime < (bgm.duration || Infinity) && Math.abs(audio.currentTime - targetTime) > 0.15) {
        audio.currentTime = targetTime;
      }
    }
  }, [bgm, isPlaying, currentTime, masterVolume, isMuted]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (bgmAudioRef.current) {
        bgmAudioRef.current.pause();
        bgmAudioRef.current = null;
      }
    };
  }, []);

  // Main playback tick interval
  useEffect(() => {
    if (!isPlaying) return;

    let lastTimestamp = performance.now();
    let animId: number;

    const loop = (now: number) => {
      const delta = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      setCurrentTime((prev) => {
        const nextTime = prev + delta;
        if (nextTime >= totalDuration) {
          setIsPlaying(false);
          return totalDuration;
        }
        return nextTime;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, totalDuration, setCurrentTime, setIsPlaying]);

  // Active Subtitles for current time (Memoized to prevent array re-allocation on every frame)
  const activeSubtitles = useMemo(
    () => subtitles.filter(
      (s) => currentTime >= s.startTime && currentTime <= s.endTime && s.text.trim().length > 0
    ),
    [subtitles, currentTime]
  );

  // Aspect ratio styles
  let aspectClass = 'aspect-video w-full max-w-[850px] max-h-full';
  if (aspectRatio === '9:16') {
    aspectClass = 'aspect-[9/16] h-full max-h-[520px] w-auto max-w-full';
  } else if (aspectRatio === '1:1') {
    aspectClass = 'aspect-square h-full max-h-[480px] w-auto max-w-full';
  }

  // Watermark position styling
  const getWatermarkPositionClass = () => {
    switch (watermark.position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'center':
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      default:
        return 'top-4 right-4';
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d0e12] overflow-hidden select-none">
      {/* Player Screen Canvas Viewport */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-4 min-h-0 relative bg-radial from-[#181922] to-[#0a0b0e]"
      >
        <div
          className={`relative bg-black rounded-xl overflow-hidden shadow-2xl border border-[#232530] flex items-center justify-center ${aspectClass}`}
        >
          {clips.length > 0 ? (
            <>
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                <video
                  ref={videoRefA}
                  playsInline
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-[filter] duration-200"
                  style={{
                    filter: isSharpenPreview
                      ? 'contrast(1.16) saturate(1.08) brightness(1.02)'
                      : 'none',
                    ...transitionStyles.styleA,
                    display: slotAIs3D ? 'none' : 'block',
                  }}
                />
                <canvas
                  ref={canvas3dARef}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  style={{
                    ...transitionStyles.styleA,
                    display: slotAIs3D ? 'block' : 'none',
                  }}
                />
                <video
                  ref={videoRefB}
                  playsInline
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-[filter] duration-200"
                  style={{
                    filter: isSharpenPreview
                      ? 'contrast(1.16) saturate(1.08) brightness(1.02)'
                      : 'none',
                    ...transitionStyles.styleB,
                    display: activeTransition && !slotBIs3D ? 'block' : 'none',
                  }}
                />
                <canvas
                  ref={canvas3dBRef}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  style={{
                    ...transitionStyles.styleB,
                    display: activeTransition && slotBIs3D ? 'block' : 'none',
                  }}
                />
                {/* White Flash Overlay for Flash / Dip-to-White transition */}
                <div
                  ref={flashOverlayRef}
                  className="absolute inset-0 bg-white pointer-events-none z-10 transition-opacity duration-75"
                  style={{
                    opacity: transitionStyles.flashOpacity,
                    display: transitionStyles.flashOpacity > 0.01 ? 'block' : 'none',
                  }}
                />
              </div>

              {isSharpenPreview && (
                <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none flex items-center space-x-1 px-2 py-0.5 rounded-full bg-teal-950/70 border border-teal-500/40 text-[10px] text-teal-300 font-semibold shadow-sm backdrop-blur-xs">
                  <Sparkles className="w-3 h-3 text-teal-400" />
                  <span>HD Sharpen Aktif</span>
                </div>
              )}

              {activeTransition && (
                <div className="absolute top-2.5 right-2.5 z-20 pointer-events-none flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/50 text-[10px] text-purple-200 font-bold shadow-lg backdrop-blur-xs animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Transisi: {activeTransition.type}</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-500 p-6 text-center space-y-2">
              <Film className="w-12 h-12 text-gray-600 mb-1 animate-pulse" />
              <p className="text-sm font-semibold text-gray-400">Belum Ada Video di Timeline</p>
              <p className="text-xs text-gray-600 max-w-xs">
                Upload video di panel kiri atau klik "Muat Sampel Demo" di atas untuk mencoba.
              </p>
            </div>
          )}

          {/* WATERMARK OVERLAY */}
          {watermark.enabled && (
            <div
              className={`absolute pointer-events-none transition-all z-20 ${getWatermarkPositionClass()}`}
              style={{
                opacity: watermark.opacity,
                transform: `${watermark.position === 'center' ? 'translate(-50%, -50%) ' : ''}scale(${watermark.scale})`,
              }}
            >
              {watermark.type === 'text' ? (
                <span
                  className="font-bold text-lg select-none px-2 py-0.5 rounded drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                  style={{ color: watermark.color }}
                >
                  {watermark.text || 'Watermark'}
                </span>
              ) : watermark.imageUrl ? (
                <img
                  src={watermark.imageUrl}
                  alt="Watermark"
                  className="max-w-[120px] max-h-[60px] object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                />
              ) : null}
            </div>
          )}

          {/* SUBTITLE OVERLAY */}
          {activeSubtitles.map((sub) => {
            let fontFamilyStyle = 'system-ui, -apple-system, sans-serif';
            if (sub.fontFamily === 'impact') fontFamilyStyle = 'Impact, "Arial Black", sans-serif';
            else if (sub.fontFamily === 'serif') fontFamilyStyle = 'Georgia, "Times New Roman", serif';
            else if (sub.fontFamily === 'mono') fontFamilyStyle = 'ui-monospace, Consolas, monospace';
            else if (sub.fontFamily === 'cursive') fontFamilyStyle = '"Comic Sans MS", "Segoe Print", cursive';

            const baseFontSize =
              aspectRatio === '9:16'
                ? Math.min(22, Math.max(13, sub.fontSize || 20))
                : Math.max(14, sub.fontSize || 24);
            // Proportional stroke: dynamically scaled with font size so stroke NEVER swallows white text!
            const rawStroke = sub.strokeWidth ?? 1.5;
            const effectiveStroke = Math.min(rawStroke, Math.max(0.8, baseFontSize * 0.08));

            const strokeStyle =
              effectiveStroke > 0
                ? `${effectiveStroke.toFixed(1)}px ${sub.strokeColor || '#000000'}`
                : undefined;

            return (
              <div
                key={sub.id}
                className={`absolute left-0 right-0 flex justify-center pointer-events-none z-30 transition-all ${
                  aspectRatio === '9:16' ? 'px-2' : 'px-6'
                }`}
                style={{
                  top: `${Math.min(92, Math.max(8, sub.positionY ?? 80))}%`,
                  transform: 'translateY(-50%)',
                }}
              >
                <div
                  className="max-w-[94%] px-3 py-1.5 rounded-xl text-center font-black tracking-wide transition-all select-none break-words whitespace-pre-wrap overflow-hidden"
                  style={{
                    color: sub.color || '#ffffff',
                    backgroundColor: sub.bgColor || 'transparent',
                    fontSize: `${baseFontSize}px`,
                    fontFamily: fontFamilyStyle,
                    textTransform: sub.isUppercase ? 'uppercase' : 'none',
                    paintOrder: 'stroke fill',
                    WebkitTextStroke: strokeStyle,
                    lineHeight: 1.28,
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    textShadow: sub.glowColor
                      ? `0 0 14px ${sub.glowColor}, 0 2px 4px rgba(0,0,0,0.8)`
                      : '0 2px 4px rgba(0, 0, 0, 0.85)',
                    border:
                      sub.bgColor && sub.bgColor !== 'transparent'
                        ? '1px solid rgba(255, 255, 255, 0.2)'
                        : 'none',
                  }}
                >
                  {sub.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Control Transport Toolbar */}
      <div className="h-12 bg-[#121319] border-t border-[#232530] px-6 flex items-center justify-between z-20">
        {/* Left: Timecode */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-teal-400 font-bold">{formatTime(currentTime, true)}</span>
          <span className="text-gray-500">/</span>
          <span className="text-gray-400">{formatTime(totalDuration, true)}</span>
        </div>

        {/* Center: Playback Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setCurrentTime(0);
              if (videoRefA.current && clips[0]) {
                videoRefA.current.currentTime = clips[0].trimStart;
              }
            }}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-[#1f212b] rounded-lg transition-colors"
            title="Putar Ulang dari Awal (Rewind to 0:00)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setCurrentTime((t) => Math.max(0, t - 1))}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-[#1f212b] rounded-lg transition-colors"
            title="Mundur 1 detik"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (clips.length === 0) return;
              if (totalDuration > 0 && currentTime >= totalDuration - 0.05) {
                // Replay from start
                setCurrentTime(0);
                if (videoRefA.current && clips[0]) {
                  videoRefA.current.currentTime = clips[0].trimStart;
                }
                setIsPlaying(true);
                return;
              }
              setIsPlaying(!isPlaying);
            }}
            disabled={clips.length === 0}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md ${
              clips.length === 0
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : 'bg-teal-500 hover:bg-teal-400 text-black font-bold active:scale-95'
            }`}
            title={
              totalDuration > 0 && currentTime >= totalDuration - 0.05
                ? 'Putar Ulang (Replay)'
                : isPlaying
                ? 'Jeda (Space)'
                : 'Putar (Space)'
            }
          >
            {totalDuration > 0 && currentTime >= totalDuration - 0.05 ? (
              <RotateCcw className="w-4 h-4 text-black" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={() => setCurrentTime((t) => Math.min(totalDuration, t + 1))}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-[#1f212b] rounded-lg transition-colors"
            title="Maju 1 detik"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Sharpen HD Toggle, Volume & Fullscreen */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsSharpenPreview(!isSharpenPreview)}
            className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
              isSharpenPreview
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#1f212b] border border-transparent'
            }`}
            title="Klik untuk menghidupkan/mematikan penajam video (HD Enhancer) pada layar preview"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">{isSharpenPreview ? '✨ Tajam: ON' : 'Pertajam'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-gray-400 hover:text-gray-200"
            >
              {isMuted || masterVolume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : masterVolume}
              onChange={(e) => {
                setMasterVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-16 accent-teal-400 h-1"
            />
          </div>

          <button
            onClick={toggleFullscreen}
            className="text-gray-400 hover:text-gray-200 p-1 hover:bg-[#1f212b] rounded"
            title="Layar Penuh"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
