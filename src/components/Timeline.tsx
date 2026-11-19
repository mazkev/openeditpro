import React, { useRef, useState, useEffect } from 'react';
import {
  Scissors,
  Trash2,
  Copy,
  ZoomIn,
  ZoomOut,
  Film,
  Type,
  Mic,
  GripVertical,
} from 'lucide-react';
import type { VideoClip, Subtitle, Voiceover } from '../types/editor';
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
}) => {
  const [zoom, setZoom] = useState(40); // pixels per second
  const timelineTracksRef = useRef<HTMLDivElement>(null);

  // Dragging states
  const [dragAction, setDragAction] = useState<{
    type: 'playhead' | 'trim-start' | 'trim-end' | 'voiceover' | 'subtitle';
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

  const timeToPx = (sec: number) => sec * zoom;
  const pxToTime = (px: number) => Math.max(0, px / zoom);

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
  }, [dragAction, zoom, clips, totalDuration, setCurrentTime, setClips, setVoiceovers, setSubtitles]);

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

  // Split selected clip at current playhead
  const handleSplitCurrent = () => {
    if (selectedClipId) {
      onSplitClip(selectedClipId, currentTime);
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

  // Delete selected clip
  const handleDeleteSelected = () => {
    if (selectedClipId) {
      setClips((prev) => prev.filter((c) => c.id !== selectedClipId));
      setSelectedClipId(null);
    }
  };

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

  // Compute positions of video clips
  let accumulatedTime = 0;
  const clipPositions = clips.map((c) => {
    const start = accumulatedTime;
    const effDur = Math.max(0, c.trimEnd - c.trimStart);
    accumulatedTime += effDur;
    return {
      clip: c,
      startTime: start,
      duration: effDur,
    };
  });

  return (
    <div className="h-64 bg-[#111217] border-t border-[#232530] flex flex-col select-none">
      {/* Timeline Action Header */}
      <div className="h-10 bg-[#161720] border-b border-[#232530] px-4 flex items-center justify-between">
        {/* Editing Tools */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSplitCurrent}
            className="flex items-center space-x-1.5 px-3 py-1 bg-[#20222e] hover:bg-teal-500 hover:text-black text-gray-200 text-xs font-semibold rounded-lg transition-all border border-[#2e3142]"
            title="Potong / Belah Klip di Playhead"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Potong (Split)</span>
          </button>

          <button
            onClick={handleDeleteSelected}
            disabled={!selectedClipId}
            className={`flex items-center space-x-1 px-2.5 py-1 text-xs rounded-lg border transition-all ${
              selectedClipId
                ? 'bg-[#20222e] hover:bg-red-500/20 text-red-400 border-red-500/30'
                : 'text-gray-600 border-transparent cursor-not-allowed'
            }`}
            title="Hapus Klip Terpilih"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus</span>
          </button>

          <button
            onClick={handleDuplicateSelected}
            disabled={!selectedClipId}
            className={`flex items-center space-x-1 px-2.5 py-1 text-xs rounded-lg border transition-all ${
              selectedClipId
                ? 'bg-[#20222e] hover:bg-[#282b3a] text-gray-300 border-[#2e3142]'
                : 'text-gray-600 border-transparent cursor-not-allowed'
            }`}
            title="Duplikat Klip"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplikat</span>
          </button>

          <div className="h-4 w-px bg-[#2b2d3d] mx-2" />
          <span className="text-[11px] text-gray-400 hidden md:inline">
            💡 Tips: Geser ujung balok klip untuk potong (Trim), geser balok narasi/subtitle untuk atur waktu.
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
              {Array.from({ length: Math.ceil(maxTimelineDuration) }).map((_, sec) => {
                const isMajor = sec % 5 === 0;
                return (
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
              })}
            </div>

            {/* 2. TRACK: VIDEO CLIPS */}
            <div
              onMouseDown={(e) => {
                // If clicked on track background, scrub playhead
                if (e.target === e.currentTarget) {
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
                  <div
                    key={clip.id}
                    onMouseDown={(e) => {
                      // Clicking or dragging clip body scrubs playhead and selects clip
                      setSelectedClipId(clip.id);
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
                    title={`Klik untuk arahkan playhead, tarik gagang ⠿ untuk tukar urutan, atau geser ujung samping untuk potong (Trim)`}
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
                      <span className="text-[10px] text-cyan-300 font-mono ml-1 flex-shrink-0 pointer-events-none">
                        {formatTime(duration)}
                      </span>
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
                );
              })}
            </div>

            {/* 3. TRACK: SUBTITLES (DRAGGABLE ALONG TIMELINE) */}
            <div
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) handleRulerMouseDown(e);
              }}
              className="h-11 border-b border-[#232530] bg-[#111218] relative flex items-center"
            >
              {subtitles.map((sub) => {
                const leftPx = timeToPx(sub.startTime);
                const dur = Math.max(0.5, sub.endTime - sub.startTime);
                const widthPx = Math.max(timeToPx(dur), 24);

                return (
                  <div
                    key={sub.id}
                    onMouseDown={(e) => {
                      e.stopPropagation();
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
                    className="absolute top-1.5 bottom-1.5 rounded-md bg-amber-500/20 border border-amber-500/60 hover:border-amber-400 text-amber-200 px-2 flex items-center justify-between text-[10px] font-medium overflow-hidden truncate shadow-sm cursor-grab active:cursor-grabbing hover:bg-amber-500/30 transition-colors"
                    title={`Geser balok ini ke kiri/kanan untuk mengatur timing munculnya subtitle (${formatTime(sub.startTime)} - ${formatTime(sub.endTime)})`}
                  >
                    <span className="truncate select-none pointer-events-none">
                      {sub.text || '(Teks kosong)'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 4. TRACK: NARASI SUARA (DRAGGABLE ALONG TIMELINE) */}
            <div
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) handleRulerMouseDown(e);
              }}
              className="h-11 border-b border-[#232530] bg-[#111218] relative flex items-center"
            >
              {voiceovers.map((vo) => {
                const leftPx = timeToPx(vo.startTime);
                const widthPx = Math.max(timeToPx(vo.duration), 28);

                return (
                  <div
                    key={vo.id}
                    onMouseDown={(e) => {
                      e.stopPropagation();
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
                    className="absolute top-1.5 bottom-1.5 rounded-md bg-teal-500/20 border border-teal-500/60 hover:border-teal-400 text-teal-200 px-2 flex items-center space-x-1.5 text-[10px] font-medium overflow-hidden shadow-sm cursor-grab active:cursor-grabbing hover:bg-teal-500/30 transition-colors"
                    title={`Geser balok ini ke kiri/kanan untuk menyelaraskan narasi suara dengan momen video (${formatTime(vo.startTime)} - ${formatTime(vo.startTime + vo.duration)})`}
                  >
                    <Mic className="w-3 h-3 text-teal-400 flex-shrink-0 pointer-events-none" />
                    <span className="truncate select-none pointer-events-none">{vo.name}</span>
                  </div>
                );
              })}
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
