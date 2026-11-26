import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Scissors,
  Trash2,
  Copy,
  ZoomIn,
  ZoomOut,
  Film,
  Type,
  Mic,
  Music,
  Plus,
  GripVertical,
  Volume2,
  VolumeX,
  Sparkles,
} from 'lucide-react';
import type { VideoClip, Subtitle, Voiceover, BackgroundMusic } from '../types/editor';
import { TRANSITION_PRESETS } from '../types/editor';
import { formatTime } from '../utils/time';

interface TimelineProps {
  clips: VideoClip[];
  setClips: React.Dispatch<React.SetStateAction<VideoClip[]>>;
  selectedClipId: string | null;
  setSelectedClipId: (id: string | null) => void;
  subtitles: Subtitle[];
  setSubtitles: React.Dispatch<React.SetStateAction<Subtitle[]>>;
  voiceovers: Voiceover[];
  setVoiceovers: React.Dispatch<React.SetStateAction<Voiceover[]>>;
  currentTime: number;
  setCurrentTime: (t: number) => void;
  totalDuration: number;
  onSplitClip: (clipId: string, splitTime: number) => void;
  isPlaying?: boolean;
  setIsPlaying?: (playing: boolean) => void;
  bgm?: BackgroundMusic | null;
  setBgm?: React.Dispatch<React.SetStateAction<BackgroundMusic | null>>;
  onOpenMusicTab?: () => void;
  onOpenTransitionTab?: (clipIndex: number) => void;
  onExtractAudio?: (clipId: string) => void;
  onToggleMuteClip?: (clipId: string) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  clips,
  setClips,
  selectedClipId,
  setSelectedClipId,
  subtitles,
  setSubtitles,
  voiceovers,
  setVoiceovers,
  currentTime,
  setCurrentTime,
  totalDuration,
  onSplitClip,
  isPlaying,
  setIsPlaying,
  bgm,
  setBgm,
  onOpenMusicTab,
  onOpenTransitionTab,
  onExtractAudio,
  onToggleMuteClip,
}) => {
  const [zoom, setZoom] = useState(40); // pixels per second
  const timelineTracksRef = useRef<HTMLDivElement>(null);

  // Selected tracks on timeline
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(null);
  const [selectedVoiceoverId, setSelectedVoiceoverId] = useState<string | null>(null);

  const hasSelection = Boolean(selectedClipId || selectedSubtitleId || selectedVoiceoverId);
  const selectionType: 'video' | 'subtitle' | 'voiceover' | null = selectedClipId
    ? 'video'
    : selectedSubtitleId
    ? 'subtitle'
    : selectedVoiceoverId
    ? 'voiceover'
    : null;

  // Dragging states
  const [dragAction, setDragAction] = useState<{
    type:
      | 'playhead'
      | 'trim-start'
      | 'trim-end'
      | 'voiceover'
      | 'subtitle'
      | 'subtitle-resize-start'
      | 'subtitle-resize-end';
    targetId?: string;
    initialMouseX: number;
    initialValue: number;
    initialValue2?: number; // for subtitles duration or second bound
    clipOriginalDuration?: number;
  } | null>(null);

  // Drag & drop reorder clips
  const [draggedClipIndex, setDraggedClipIndex] = useState<number | null>(null);
  const [dragOverClipIndex, setDragOverClipIndex] = useState<number | null>(null);

  // Calculate timeline dimensions
  const maxTimelineDuration = Math.max(totalDuration + 5, 20);
  const totalTimelineWidth = Math.max(maxTimelineDuration * zoom, 800);

  const timeToPx = useCallback((sec: number) => sec * zoom, [zoom]);
  const pxToTime = useCallback((px: number) => Math.max(0, px / zoom), [zoom]);

  // Global MouseMove and MouseUp event listener for smooth dragging
  useEffect(() => {
    if (!dragAction) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!timelineTracksRef.current) return;
      const rect = timelineTracksRef.current.getBoundingClientRect();
      const currentScrollLeft = timelineTracksRef.current.scrollLeft;

      if (dragAction.type === 'playhead') {
        const mouseX = e.clientX - rect.left + currentScrollLeft;
        const newTime = Math.max(0, Math.min(totalDuration, pxToTime(mouseX)));
        setCurrentTime(newTime);
      } else if (dragAction.type === 'trim-start' && dragAction.targetId) {
        const deltaX = e.clientX - dragAction.initialMouseX;
        const deltaSec = deltaX / zoom;
        const clip = clips.find((c) => c.id === dragAction.targetId);
        if (!clip) return;

        const newTrimStart = Math.max(
          0,
          Math.min(clip.trimEnd - 0.2, dragAction.initialValue + deltaSec)
        );
        setClips((prev) =>
          prev.map((c) => (c.id === clip.id ? { ...c, trimStart: newTrimStart } : c))
        );
      } else if (dragAction.type === 'trim-end' && dragAction.targetId) {
        const deltaX = e.clientX - dragAction.initialMouseX;
        const deltaSec = deltaX / zoom;
        const clip = clips.find((c) => c.id === dragAction.targetId);
        if (!clip) return;

        const maxDur = dragAction.clipOriginalDuration ?? clip.duration;
        const newTrimEnd = Math.max(
          clip.trimStart + 0.2,
          Math.min(maxDur, dragAction.initialValue + deltaSec)
        );
        setClips((prev) =>
          prev.map((c) => (c.id === clip.id ? { ...c, trimEnd: newTrimEnd } : c))
        );
      } else if (dragAction.type === 'voiceover' && dragAction.targetId) {
        const deltaX = e.clientX - dragAction.initialMouseX;
        const deltaSec = deltaX / zoom;
        const newStart = Math.max(0, dragAction.initialValue + deltaSec);
        setVoiceovers((prev) =>
          prev.map((v) =>
            v.id === dragAction.targetId ? { ...v, startTime: parseFloat(newStart.toFixed(2)) } : v
          )
        );
      } else if (dragAction.type === 'subtitle' && dragAction.targetId) {
        const deltaX = e.clientX - dragAction.initialMouseX;
        const deltaSec = deltaX / zoom;
        const dur = (dragAction.initialValue2 ?? 2) - dragAction.initialValue;
        const newStart = Math.max(0, dragAction.initialValue + deltaSec);
        const newEnd = newStart + dur;

        setSubtitles((prev) =>
          prev.map((s) =>
            s.id === dragAction.targetId
              ? {
                  ...s,
                  startTime: parseFloat(newStart.toFixed(2)),
                  endTime: parseFloat(newEnd.toFixed(2)),
                }
              : s
          )
        );
      } else if (dragAction.type === 'subtitle-resize-start' && dragAction.targetId) {
        const deltaX = e.clientX - dragAction.initialMouseX;
        const deltaSec = deltaX / zoom;
        const endT = dragAction.initialValue2 ?? 2;
        const newStart = Math.max(0, Math.min(endT - 0.3, dragAction.initialValue + deltaSec));
        setSubtitles((prev) =>
          prev.map((s) =>
            s.id === dragAction.targetId ? { ...s, startTime: parseFloat(newStart.toFixed(2)) } : s
          )
        );
      } else if (dragAction.type === 'subtitle-resize-end' && dragAction.targetId) {
        const deltaX = e.clientX - dragAction.initialMouseX;
        const deltaSec = deltaX / zoom;
        const startT = dragAction.initialValue;
        const newEnd = Math.max(startT + 0.3, (dragAction.initialValue2 ?? startT + 2) + deltaSec);
        setSubtitles((prev) =>
          prev.map((s) =>
            s.id === dragAction.targetId ? { ...s, endTime: parseFloat(newEnd.toFixed(2)) } : s
          )
        );
      }
    };

    const handleWindowMouseUp = () => {
      setDragAction(null);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [dragAction, zoom, clips, totalDuration, setCurrentTime, setClips, setVoiceovers, setSubtitles, pxToTime]);

  // Click on ruler or track background to scrub playhead
  const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineTracksRef.current) return;
    const rect = timelineTracksRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + timelineTracksRef.current.scrollLeft;
    const newTime = Math.max(0, Math.min(totalDuration, pxToTime(clickX)));
    setCurrentTime(newTime);

    // Pause playback while scrubbing so user can scrub backward/forward freely
    if (isPlaying && setIsPlaying) {
      setIsPlaying(false);
    }

    setDragAction({
      type: 'playhead',
      initialMouseX: e.clientX,
      initialValue: newTime,
    });
  };

  // Split selected clip or subtitle at current playhead
  const handleSplitCurrent = () => {
    if (selectedClipId) {
      onSplitClip(selectedClipId, currentTime);
    } else if (selectedSubtitleId) {
      const sub = subtitles.find((s) => s.id === selectedSubtitleId);
      if (sub && currentTime > sub.startTime + 0.2 && currentTime < sub.endTime - 0.2) {
        const firstPart: Subtitle = {
          ...sub,
          endTime: parseFloat(currentTime.toFixed(2)),
        };
        const secondPart: Subtitle = {
          ...sub,
          id: `sub-${Date.now()}`,
          startTime: parseFloat(currentTime.toFixed(2)),
        };
        setSubtitles((prev) =>
          prev.flatMap((s) => (s.id === sub.id ? [firstPart, secondPart] : [s]))
        );
        setSelectedSubtitleId(secondPart.id);
      }
    } else {
      let runningTime = 0;
      for (const clip of clips) {
        const effDur = Math.max(0, clip.trimEnd - clip.trimStart);
        if (currentTime > runningTime && currentTime < runningTime + effDur) {
          onSplitClip(clip.id, currentTime);
          break;
        }
        runningTime += effDur;
      }
    }
  };

  // Delete selected item (video clip, subtitle, or voiceover)
  const handleDeleteSelected = () => {
    if (selectedClipId) {
      setClips((prev) => prev.filter((c) => c.id !== selectedClipId));
      setSelectedClipId(null);
    } else if (selectedSubtitleId) {
      setSubtitles((prev) => prev.filter((s) => s.id !== selectedSubtitleId));
      setSelectedSubtitleId(null);
    } else if (selectedVoiceoverId) {
      setVoiceovers((prev) => prev.filter((v) => v.id !== selectedVoiceoverId));
      setSelectedVoiceoverId(null);
    }
  };

  // Global Keyboard shortcut listener for Delete / Backspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipId) {
          e.preventDefault();
          setClips((prev) => prev.filter((c) => c.id !== selectedClipId));
          setSelectedClipId(null);
        } else if (selectedSubtitleId) {
          e.preventDefault();
          setSubtitles((prev) => prev.filter((s) => s.id !== selectedSubtitleId));
          setSelectedSubtitleId(null);
        } else if (selectedVoiceoverId) {
          e.preventDefault();
          setVoiceovers((prev) => prev.filter((v) => v.id !== selectedVoiceoverId));
          setSelectedVoiceoverId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedClipId,
    selectedSubtitleId,
    selectedVoiceoverId,
    setClips,
    setSubtitles,
    setVoiceovers,
    setSelectedClipId,
  ]);

  // Duplicate selected clip
  const handleDuplicateSelected = () => {
    if (!selectedClipId) return;
    const clip = clips.find((c) => c.id === selectedClipId);
    if (!clip) return;

    const newClip: VideoClip = {
      ...clip,
      id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: `${clip.name} (Copy)`,
    };

    const idx = clips.findIndex((c) => c.id === selectedClipId);
    const updated = [...clips];
    updated.splice(idx + 1, 0, newClip);
    setClips(updated);
    setSelectedClipId(newClip.id);
  };

  // Compute positions of video clips (Memoized to prevent recalculations on every frame)
  const clipPositions = useMemo(() => {
    const positions = [];
    let currentStart = 0;
    for (let i = 0; i < clips.length; i++) {
      const c = clips[i];
      const effDur = Math.max(0, c.trimEnd - c.trimStart);
      positions.push({
        clip: c,
        startTime: currentStart,
        duration: effDur,
      });
      currentStart += effDur;
    }
    return positions;
  }, [clips]);

  // Memoize Ruler Marks to avoid recreating hundreds of JSX DOM elements 60x/second during playback
  const rulerMarks = useMemo(() => {
    const totalSecs = Math.ceil(maxTimelineDuration);
    const marks = [];
    for (let sec = 0; sec <= totalSecs; sec++) {
      const isMajor = sec % 5 === 0;
      marks.push(
        <div
          key={sec}
          style={{ left: `${sec * zoom}px` }}
          className="absolute top-0 bottom-0 flex flex-col justify-end pointer-events-none"
        >
          <span
            className={`text-[9px] font-mono pl-1 ${
              isMajor ? 'text-gray-300 font-bold' : 'text-gray-600'
            }`}
          >
            {isMajor ? `${sec}s` : '·'}
          </span>
          <div
            className={`w-px ${
              isMajor ? 'h-3 bg-gray-500' : 'h-1.5 bg-gray-700'
            }`}
          />
        </div>
      );
    }
    return marks;
  }, [maxTimelineDuration, zoom]);

  return (
    <div className="h-64 bg-[#111217] border-t border-[#232530] flex flex-col select-none">
      {/* Timeline Action Header */}
      <div className="h-10 bg-[#161720] border-b border-[#232530] px-4 flex items-center justify-between">
        {/* Editing Tools */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSplitCurrent}
            className="flex items-center space-x-1.5 px-3 py-1 bg-[#20222e] hover:bg-teal-500 hover:text-black text-gray-200 text-xs font-semibold rounded-lg transition-all border border-[#2e3142]"
            title="Potong / Belah Klip Video atau Subtitle di Playhead"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Potong (Split)</span>
          </button>

          <button
            onClick={handleDeleteSelected}
            disabled={!hasSelection}
            className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs rounded-lg border transition-all ${
              hasSelection
                ? 'bg-[#20222e] hover:bg-red-500/20 text-red-400 border-red-500/30 font-semibold shadow-sm'
                : 'text-gray-600 border-transparent cursor-not-allowed'
            }`}
            title={
              selectionType === 'video'
                ? 'Hapus Klip Video Terpilih (Tombol Delete / Backspace)'
                : selectionType === 'subtitle'
                ? 'Hapus Subtitle Terpilih (Tombol Delete / Backspace)'
                : selectionType === 'voiceover'
                ? 'Hapus Narasi Suara Terpilih (Tombol Delete / Backspace)'
                : 'Pilih klip video, subtitle, atau narasi suara terlebih dahulu untuk menghapusnya'
            }
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>
              Hapus{' '}
              {selectionType === 'video'
                ? 'Video'
                : selectionType === 'subtitle'
                ? 'Subtitle'
                : selectionType === 'voiceover'
                ? 'Narasi'
                : ''}
            </span>
          </button>

          {/* Button: Hapus Semua Narasi & Subtitle Sekaligus */}
          {(voiceovers.length > 0 || subtitles.length > 0) && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    `Hapus SEMUA (${voiceovers.length}) klip narasi suara DAN SEMUA (${subtitles.length}) baris subtitle sekaligus?`
                  )
                ) {
                  setVoiceovers([]);
                  setSubtitles([]);
                  setSelectedVoiceoverId(null);
                  setSelectedSubtitleId(null);
                }
              }}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs rounded-lg border bg-red-500/15 hover:bg-red-500/25 text-red-300 border-red-500/40 transition-all font-semibold shadow-sm"
              title="Hapus semua klip narasi suara dan semua baris subtitle sekaligus"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Hapus Semua Narasi & Subtitle</span>
            </button>
          )}

          <button
            onClick={handleDuplicateSelected}
            disabled={!selectedClipId}
            className={`flex items-center space-x-1 px-2.5 py-1 text-xs rounded-lg border transition-all ${
              selectedClipId
                ? 'bg-[#20222e] hover:bg-[#282b3a] text-gray-300 border-[#2e3142]'
                : 'text-gray-600 border-transparent cursor-not-allowed'
            }`}
            title="Duplikat Klip Video"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplikat</span>
          </button>

          {/* Extract Audio Button */}
          {selectedClipId && onExtractAudio && (
            <button
              onClick={() => onExtractAudio(selectedClipId)}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs rounded-lg border bg-[#20222e] hover:bg-[#282b3a] text-cyan-300 border-cyan-500/40 hover:border-cyan-500/70 transition-all font-semibold"
              title="Pisahkan audio asli video ke trek audio (agar bisa dihapus atau diedit)"
            >
              <Scissors className="w-3.5 h-3.5 text-cyan-400" />
              <span>Pisahkan Audio</span>
            </button>
          )}

          {/* Mute/Unmute Video Clip Button */}
          {selectedClipId && onToggleMuteClip && (
            <button
              onClick={() => onToggleMuteClip(selectedClipId)}
              className={`flex items-center space-x-1 px-2.5 py-1 text-xs rounded-lg border transition-all ${
                (clips.find((c) => c.id === selectedClipId)?.volume ?? 1) === 0
                  ? 'bg-red-500/20 text-red-300 border-red-500/50 hover:bg-red-500/30'
                  : 'bg-[#20222e] hover:bg-[#282b3a] text-gray-300 border-[#2e3142]'
              }`}
              title="Bisukan atau aktifkan kembali suara asli video ini"
            >
              {(clips.find((c) => c.id === selectedClipId)?.volume ?? 1) === 0 ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-red-400" />
                  <span>Bisu (Aktifkan?)</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-gray-400" />
                  <span>Bisukan Suara</span>
                </>
              )}
            </button>
          )}

          {/* Transisi Tab Button */}
          {clips.length > 1 && onOpenTransitionTab && (
            <button
              onClick={() => onOpenTransitionTab(0)}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs rounded-lg border bg-[#20222e] hover:bg-[#282b3a] text-purple-300 border-purple-500/40 hover:border-purple-500/70 transition-all font-semibold"
              title="Buka panel efek transisi halus antar klip video"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>
                Transisi ({clips.filter((c) => c.transition && c.transition.type !== 'none').length}/{clips.length - 1})
              </span>
            </button>
          )}

          <div className="h-4 w-px bg-[#2b2d3d] mx-2" />
          <span className="text-[11px] text-gray-400 hidden md:inline">
            💡 Tips: Klik klip video, subtitle, atau narasi suara lalu klik <b>Hapus</b> (atau tekan tombol <b>Delete</b> di keyboard).
          </span>
        </div>

        {/* Timeline Zoom Slider */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setZoom((z) => Math.max(15, z - 10))}
            className="text-gray-400 hover:text-gray-200 p-1"
            title="Perkecil Timeline"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            min="15"
            max="120"
            value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value))}
            className="w-24 accent-teal-400 h-1"
          />
          <button
            onClick={() => setZoom((z) => Math.min(120, z + 10))}
            className="text-gray-400 hover:text-gray-200 p-1"
            title="Perbesar Timeline"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Timeline Multi-Track Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Track Labels */}
        <div className="w-32 bg-[#14151c] border-r border-[#232530] flex flex-col flex-shrink-0 z-20">
          <div className="h-7 border-b border-[#232530] flex items-center px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Trek Editor
          </div>
          <div className="h-16 border-b border-[#232530] flex items-center px-3 space-x-2 text-xs font-semibold text-gray-300">
            <Film className="w-4 h-4 text-cyan-400" />
            <span>Video</span>
          </div>
          <div className="h-11 border-b border-[#232530] flex items-center px-3 space-x-2 text-xs font-semibold text-gray-300">
            <Type className="w-4 h-4 text-amber-400" />
            <span>Subtitle</span>
          </div>
          <div className="h-11 border-b border-[#232530] flex items-center px-3 space-x-2 text-xs font-semibold text-gray-300">
            <Mic className="w-4 h-4 text-teal-400" />
            <span>Narasi</span>
          </div>
          <div className="h-11 border-b border-[#232530] flex items-center px-3 space-x-2 text-xs font-semibold text-gray-300">
            <Music className="w-4 h-4 text-purple-400" />
            <span>Musik (BGM)</span>
          </div>
        </div>

        {/* Scrollable Timeline Area */}
        <div
          ref={timelineTracksRef}
          className="flex-1 overflow-x-auto overflow-y-hidden relative"
        >
          <div
            style={{ width: `${totalTimelineWidth}px` }}
            className="min-h-full relative select-none"
          >
            {/* 1. TIME RULER */}
            <div
              onMouseDown={handleRulerMouseDown}
              className="h-7 bg-[#14151c] border-b border-[#232530] flex relative cursor-pointer"
            >
              {rulerMarks}
            </div>

            {/* 2. TRACK: VIDEO CLIPS */}
            <div
              onMouseDown={(e) => {
                // If clicked on track background, scrub playhead
                if (e.target === e.currentTarget) {
                  setSelectedClipId(null);
                  setSelectedSubtitleId(null);
                  setSelectedVoiceoverId(null);
                  handleRulerMouseDown(e);
                }
              }}
              className="h-16 border-b border-[#232530] bg-[#111218] relative flex items-center"
            >
              {clipPositions.map(({ clip, startTime, duration }, index) => {
                const isSelected = clip.id === selectedClipId;
                const leftPx = timeToPx(startTime);
                const widthPx = Math.max(timeToPx(duration), 28);
                const isBeingDraggedOver = dragOverClipIndex === index;

                return (
                  <React.Fragment key={clip.id}>
                    <div
                      onMouseDown={(e) => {
                        // Clicking or dragging clip body scrubs playhead and selects clip
                        setSelectedClipId(clip.id);
                        setSelectedSubtitleId(null);
                        setSelectedVoiceoverId(null);
                        handleRulerMouseDown(e);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverClipIndex(index);
                      }}
                      onDragLeave={() => {
                        if (dragOverClipIndex === index) setDragOverClipIndex(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedClipIndex !== null && draggedClipIndex !== index) {
                          const updated = [...clips];
                          const [moved] = updated.splice(draggedClipIndex, 1);
                          updated.splice(index, 0, moved);
                          setClips(updated);
                          setSelectedClipId(moved.id);
                        }
                        setDraggedClipIndex(null);
                        setDragOverClipIndex(null);
                      }}
                      style={{
                        left: `${leftPx}px`,
                        width: `${widthPx}px`,
                      }}
                      className={`absolute top-1 bottom-1 rounded-lg overflow-hidden flex flex-col justify-between border cursor-pointer transition-all ${
                        isBeingDraggedOver
                          ? 'border-yellow-400 ring-2 ring-yellow-400/50 scale-105 z-20'
                          : isSelected
                          ? 'border-cyan-400 bg-cyan-950/40 ring-2 ring-cyan-500/50 z-10'
                          : 'border-[#2d3248] bg-[#1b1e2a] hover:border-gray-500'
                      }`}
                      title={`Klik untuk memilih klip video, tarik gagang ⠿ untuk tukar urutan, atau geser ujung samping untuk potong (Trim)`}
                    >
                      {/* Header info */}
                      <div className="flex items-center justify-between px-2 pt-1 text-[11px] font-semibold text-gray-200 truncate">
                        <div className="flex items-center space-x-1 truncate">
                          <div
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              setDraggedClipIndex(index);
                              e.dataTransfer.setData('text/plain', clip.id);
                            }}
                            className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-white/10 rounded flex-shrink-0"
                            title="Tarik ikon ini untuk menukar urutan klip"
                          >
                            <GripVertical className="w-3.5 h-3.5 text-cyan-400" />
                          </div>
                          <span className="truncate pointer-events-none">{clip.name}</span>
                        </div>
                        <div className="flex items-center space-x-1 ml-1 flex-shrink-0">
                          {(clip.volume ?? 1) === 0 && (
                            <span
                              className="bg-red-950/80 text-red-300 border border-red-700/60 text-[9px] px-1 py-0.5 rounded font-bold flex items-center space-x-0.5"
                              title="Suara asli video ini dibisukan (0%)"
                            >
                              <VolumeX className="w-2.5 h-2.5" />
                              <span>Bisu</span>
                            </span>
                          )}
                          {/* Quick Mute Toggle Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onToggleMuteClip) {
                                onToggleMuteClip(clip.id);
                              }
                            }}
                            className={`p-0.5 rounded transition-colors ${
                              (clip.volume ?? 1) === 0
                                ? 'text-red-400 hover:bg-red-500/20'
                                : 'text-gray-400 hover:text-cyan-300 hover:bg-white/10'
                            }`}
                            title={(clip.volume ?? 1) === 0 ? 'Aktifkan Suara Asli Video' : 'Bisukan Suara Asli Video'}
                          >
                            {(clip.volume ?? 1) === 0 ? (
                              <VolumeX className="w-3 h-3" />
                            ) : (
                              <Volume2 className="w-3 h-3" />
                            )}
                          </button>
                          <span className="text-[10px] text-cyan-300 font-mono pointer-events-none">
                            {formatTime(duration)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setClips((prev) => prev.filter((c) => c.id !== clip.id));
                              if (selectedClipId === clip.id) setSelectedClipId(null);
                            }}
                            className="p-0.5 rounded hover:bg-red-500/30 text-gray-400 hover:text-red-400 transition-colors"
                            title="Hapus Klip Video Ini"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Clip preview thumbnail strip */}
                      <div className="h-6 flex items-center px-2 space-x-1 overflow-hidden opacity-75 pointer-events-none">
                        {clip.thumbnailUrl && (
                          <img
                            src={clip.thumbnailUrl}
                            alt=""
                            className="h-5 w-8 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 h-1.5 bg-cyan-500/30 rounded" />
                      </div>

                      {/* DRAGGABLE LEFT TRIM HANDLE */}
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDragAction({
                            type: 'trim-start',
                            targetId: clip.id,
                            initialMouseX: e.clientX,
                            initialValue: clip.trimStart,
                            clipOriginalDuration: clip.duration,
                          });
                        }}
                        className="absolute left-0 top-0 bottom-0 w-3 hover:w-4 bg-cyan-500/80 hover:bg-cyan-400 cursor-col-resize flex items-center justify-center transition-all z-20 group"
                        title="Geser ke kanan/kiri untuk memotong titik awal klip (Trim In)"
                      >
                        <div className="w-0.5 h-4 bg-black rounded" />
                      </div>

                      {/* DRAGGABLE RIGHT TRIM HANDLE */}
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDragAction({
                            type: 'trim-end',
                            targetId: clip.id,
                            initialMouseX: e.clientX,
                            initialValue: clip.trimEnd,
                            clipOriginalDuration: clip.duration,
                          });
                        }}
                        className="absolute right-0 top-0 bottom-0 w-3 hover:w-4 bg-cyan-500/80 hover:bg-cyan-400 cursor-col-resize flex items-center justify-center transition-all z-20 group"
                        title="Geser ke kanan/kiri untuk memotong titik akhir klip (Trim Out)"
                      >
                        <div className="w-0.5 h-4 bg-black rounded" />
                      </div>
                    </div>

                    {/* TRANSITION CUT BUTTON BETWEEN ADJACENT CLIPS */}
                    {index < clipPositions.length - 1 && (
                      <div
                        style={{
                          left: `${leftPx + widthPx - 11}px`,
                        }}
                        className="absolute top-1/2 -translate-y-1/2 z-30 pointer-events-auto"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentTime(Math.max(0, startTime + duration - 0.3));
                            if (onOpenTransitionTab) {
                              onOpenTransitionTab(index);
                            }
                          }}
                          className={`w-5.5 h-5.5 rounded-md flex items-center justify-center transition-all shadow-lg group ${
                            clip.transition && clip.transition.type !== 'none'
                              ? 'bg-purple-900/90 text-purple-200 border-2 border-purple-400 hover:scale-120 hover:bg-purple-800 ring-2 ring-purple-500/50'
                              : 'bg-[#181a24] text-gray-400 border border-[#3e4256] hover:border-purple-400 hover:text-purple-300 hover:scale-115'
                          }`}
                          title={
                            clip.transition && clip.transition.type !== 'none'
                              ? `Transisi: ${clip.transition.type} (${clip.transition.duration}s) - Klik untuk ubah`
                              : 'Klik untuk tambah efek transisi antar video'
                          }
                        >
                          {clip.transition && clip.transition.type !== 'none' ? (
                            <span className="text-[10px] leading-none pointer-events-none">
                              {TRANSITION_PRESETS.find((p) => p.id === clip.transition?.type)?.icon || '✨'}
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold leading-none text-gray-400 group-hover:text-purple-400 pointer-events-none">
                              ⧉
                            </span>
                          )}
                        </button>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* 3. TRACK: SUBTITLES (DRAGGABLE ALONG TIMELINE) */}
            <div
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                  setSelectedSubtitleId(null);
                  setSelectedClipId(null);
                  setSelectedVoiceoverId(null);
                  handleRulerMouseDown(e);
                }
              }}
              className="h-11 border-b border-[#232530] bg-[#111218] relative flex items-center"
            >
              {subtitles.map((sub) => {
                const isSelected = sub.id === selectedSubtitleId;
                const leftPx = timeToPx(sub.startTime);
                const dur = Math.max(0.5, sub.endTime - sub.startTime);
                const widthPx = Math.max(timeToPx(dur), 28);

                return (
                  <div
                    key={sub.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSubtitleId(sub.id);
                      setSelectedClipId(null);
                      setSelectedVoiceoverId(null);
                      setCurrentTime(sub.startTime);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setSelectedSubtitleId(sub.id);
                      setSelectedClipId(null);
                      setSelectedVoiceoverId(null);
                      setDragAction({
                        type: 'subtitle',
                        targetId: sub.id,
                        initialMouseX: e.clientX,
                        initialValue: sub.startTime,
                        initialValue2: sub.endTime,
                      });
                    }}
                    style={{
                      left: `${leftPx}px`,
                      width: `${widthPx}px`,
                    }}
                    className={`absolute top-1.5 bottom-1.5 rounded-md px-2.5 flex items-center justify-between text-[10px] font-medium overflow-hidden shadow-sm cursor-grab active:cursor-grabbing transition-all group ${
                      isSelected
                        ? 'bg-amber-500/35 border-2 border-amber-300 text-amber-100 ring-2 ring-amber-400/50 z-10'
                        : 'bg-amber-500/20 border border-amber-500/60 hover:border-amber-400 text-amber-200 hover:bg-amber-500/30'
                    }`}
                    title={`Klik untuk memilih subtitle (${formatTime(sub.startTime)} - ${formatTime(sub.endTime)}), seret tepi kiri/kanan untuk ubah durasi`}
                  >
                    {/* Left Resize Handle */}
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedSubtitleId(sub.id);
                        setSelectedClipId(null);
                        setSelectedVoiceoverId(null);
                        setDragAction({
                          type: 'subtitle-resize-start',
                          targetId: sub.id,
                          initialMouseX: e.clientX,
                          initialValue: sub.startTime,
                          initialValue2: sub.endTime,
                        });
                      }}
                      className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-amber-300/60 z-20"
                      title="Seret untuk ubah waktu mulai subtitle"
                    />
                    <span className="truncate select-none pointer-events-none flex-1 min-w-0 pr-1">
                      {sub.text || '(Teks kosong)'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSubtitles((prev) => prev.filter((s) => s.id !== sub.id));
                        if (selectedSubtitleId === sub.id) setSelectedSubtitleId(null);
                      }}
                      className="p-0.5 rounded hover:bg-red-500/30 text-amber-300 hover:text-red-400 flex-shrink-0 transition-colors mr-1"
                      title="Hapus Subtitle Ini"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    {/* Right Resize Handle */}
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedSubtitleId(sub.id);
                        setSelectedClipId(null);
                        setSelectedVoiceoverId(null);
                        setDragAction({
                          type: 'subtitle-resize-end',
                          targetId: sub.id,
                          initialMouseX: e.clientX,
                          initialValue: sub.startTime,
                          initialValue2: sub.endTime,
                        });
                      }}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-amber-300/60 z-20"
                      title="Seret untuk memperpanjang/memendekkan durasi subtitle"
                    />
                  </div>
                );
              })}
            </div>

            {/* 4. TRACK: NARASI SUARA (DRAGGABLE ALONG TIMELINE) */}
            <div
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                  setSelectedSubtitleId(null);
                  setSelectedClipId(null);
                  setSelectedVoiceoverId(null);
                  handleRulerMouseDown(e);
                }
              }}
              className="h-11 border-b border-[#232530] bg-[#111218] relative flex items-center"
            >
              {voiceovers.map((vo) => {
                const isSelected = vo.id === selectedVoiceoverId;
                const leftPx = timeToPx(vo.startTime);
                const widthPx = Math.max(timeToPx(vo.duration), 28);

                return (
                  <div
                    key={vo.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVoiceoverId(vo.id);
                      setSelectedClipId(null);
                      setSelectedSubtitleId(null);
                      setCurrentTime(vo.startTime);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setSelectedVoiceoverId(vo.id);
                      setSelectedClipId(null);
                      setSelectedSubtitleId(null);
                      setDragAction({
                        type: 'voiceover',
                        targetId: vo.id,
                        initialMouseX: e.clientX,
                        initialValue: vo.startTime,
                      });
                    }}
                    style={{
                      left: `${leftPx}px`,
                      width: `${widthPx}px`,
                    }}
                    className={`absolute top-1.5 bottom-1.5 rounded-md px-2 flex items-center justify-between text-[10px] font-medium overflow-hidden shadow-sm cursor-grab active:cursor-grabbing transition-all ${
                      isSelected
                        ? 'bg-teal-500/35 border-2 border-teal-300 text-teal-100 ring-2 ring-teal-400/50 z-10'
                        : 'bg-teal-500/20 border border-teal-500/60 hover:border-teal-400 text-teal-200 hover:bg-teal-500/30'
                    }`}
                    title={`Klik untuk memilih narasi (${formatTime(vo.startTime)} - ${formatTime(vo.startTime + vo.duration)}), tekan tombol Hapus/Del untuk menghapus`}
                  >
                    <div className="flex items-center space-x-1.5 min-w-0 flex-1 truncate pr-1 pointer-events-none">
                      <Mic className="w-3 h-3 text-teal-400 flex-shrink-0" />
                      <span className="truncate select-none">{vo.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVoiceovers((prev) => prev.filter((v) => v.id !== vo.id));
                        if (selectedVoiceoverId === vo.id) setSelectedVoiceoverId(null);
                      }}
                      className="p-0.5 rounded hover:bg-red-500/30 text-teal-300 hover:text-red-400 flex-shrink-0 transition-colors"
                      title="Hapus Narasi Suara Ini"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* 5. TRACK: MUSIK LATAR (BGM) */}
            <div
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                  setSelectedSubtitleId(null);
                  setSelectedClipId(null);
                  setSelectedVoiceoverId(null);
                  handleRulerMouseDown(e);
                }
              }}
              className="h-11 border-b border-[#232530] bg-[#111218] relative flex items-center"
            >
              {bgm ? (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenMusicTab) onOpenMusicTab();
                  }}
                  style={{
                    left: '0px',
                    width: `${Math.max(timeToPx(totalDuration || bgm.duration || 10), 80)}px`,
                  }}
                  className="absolute top-1.5 bottom-1.5 rounded-md px-2.5 flex items-center justify-between text-[10px] font-medium overflow-hidden shadow-sm bg-purple-600/25 border border-purple-500/60 hover:border-purple-400 text-purple-200 hover:bg-purple-600/35 transition-all cursor-pointer group"
                  title={`Musik Latar: ${bgm.name} (Volume: ${Math.round((bgm.volume ?? 0.2) * 100)}%${bgm.loop ? ', Loop Aktif' : ''}) - Klik untuk buka pengaturan musik`}
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1 truncate pr-1">
                    <Music className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 animate-pulse" />
                    <span className="font-bold truncate text-white">{bgm.name}</span>
                    <span className="bg-purple-900/60 text-purple-300 text-[9px] px-1.5 py-0.5 rounded border border-purple-700/50 flex-shrink-0 font-mono">
                      Vol {Math.round((bgm.volume ?? 0.2) * 100)}%
                    </span>
                    {bgm.loop && (
                      <span className="bg-purple-950/80 text-purple-300 text-[9px] px-1 py-0.5 rounded border border-purple-700/40 flex-shrink-0">
                        🔁 Loop
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (setBgm) setBgm(null);
                    }}
                    className="p-1 rounded hover:bg-red-500/30 text-purple-300 hover:text-red-400 flex-shrink-0 transition-colors ml-1"
                    title="Hapus Musik Latar"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => onOpenMusicTab && onOpenMusicTab()}
                  className="px-3 text-[10px] text-gray-500 hover:text-purple-300 cursor-pointer flex items-center space-x-1.5 transition-colors select-none"
                >
                  <Plus className="w-3 h-3 text-purple-400" />
                  <span>Klik untuk menambahkan musik latar (BGM)...</span>
                </div>
              )}
            </div>

            {/* RED PLAYHEAD LINE & DRAGGABLE SCRUBBER HANDLE */}
            <div
              style={{ left: `${timeToPx(currentTime)}px` }}
              className="absolute top-0 bottom-0 pointer-events-none z-30"
            >
              {/* Playhead Top Scrubber Cap */}
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (isPlaying && setIsPlaying) setIsPlaying(false);
                  setDragAction({
                    type: 'playhead',
                    initialMouseX: e.clientX,
                    initialValue: currentTime,
                  });
                }}
                className="w-4 h-5 bg-red-500 hover:bg-red-400 rounded-b -translate-x-1/2 flex items-center justify-center shadow-lg cursor-col-resize pointer-events-auto transition-transform active:scale-125"
                title="Geser jarum waktu (Playhead)"
              >
                <div className="w-1 h-2.5 bg-white/80 rounded-full" />
              </div>

              {/* Vertical Red Needle Line with clickable drag zone */}
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (isPlaying && setIsPlaying) setIsPlaying(false);
                  setDragAction({
                    type: 'playhead',
                    initialMouseX: e.clientX,
                    initialValue: currentTime,
                  });
                }}
                className="w-4 -translate-x-1/2 h-full flex justify-center cursor-col-resize pointer-events-auto group"
                title="Geser jarum waktu (Playhead)"
              >
                <div className="w-0.5 h-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] group-hover:w-1 transition-all" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
