import React, { useRef, useEffect } from 'react';
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
} from 'lucide-react';
import type { VideoClip, Subtitle, Watermark, Voiceover, AspectRatio, BackgroundMusic } from '../types/editor';
import { formatTime } from '../utils/time';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const voiceoverAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const [masterVolume, setMasterVolume] = React.useState(1);
  const [isMuted, setIsMuted] = React.useState(false);

  // Compute which clip is active at currentTime
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

  // Sync video element with activeClip and currentTime
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeClip) return;

    const targetClipTime = activeClip.trimStart + activeClipOffset;

    if (video.src !== activeClip.url) {
      video.src = activeClip.url;
      video.currentTime = targetClipTime;
    } else {
      // When paused or scrubbing backward/forward, sync video frame immediately!
      // When playing, sync only if drift is noticeable (> 0.25s) to avoid stutter
      const drift = Math.abs(video.currentTime - targetClipTime);
      if (!isPlaying || drift > 0.25) {
        video.currentTime = targetClipTime;
      }
    }

    video.volume = isMuted ? 0 : (activeClip.volume ?? 1) * masterVolume;

    if (isPlaying) {
      if (video.paused) {
        video.play().catch(() => {});
      }
    } else {
      if (!video.paused) {
        video.pause();
      }
    }
  }, [activeClip, activeClipOffset, currentTime, isPlaying, masterVolume, isMuted]);

  // Sync voiceovers
  useEffect(() => {
    voiceovers.forEach((vo) => {
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
        }
        audio.currentTime = 0;
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
      if (targetTime < (bgm.duration || Infinity)) {
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

  // Active Subtitles for current time
  const activeSubtitles = subtitles.filter(
    (s) => currentTime >= s.startTime && currentTime <= s.endTime && s.text.trim().length > 0
  );

  // Aspect ratio styles
  let aspectClass = 'aspect-video w-full max-w-[850px] max-h-[460px]';
  if (aspectRatio === '9:16') {
    aspectClass = 'aspect-[9/16] h-[460px] max-w-[300px]';
  } else if (aspectRatio === '1:1') {
    aspectClass = 'aspect-square h-[440px] max-w-[440px]';
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
            <video
              ref={videoRef}
              playsInline
              className="w-full h-full object-contain pointer-events-none"
            />
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
              if (videoRef.current && clips[0]) {
                videoRef.current.currentTime = clips[0].trimStart;
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
                if (videoRef.current && clips[0]) {
                  videoRef.current.currentTime = clips[0].trimStart;
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

        {/* Right: Volume & Fullscreen */}
        <div className="flex items-center space-x-4">
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
