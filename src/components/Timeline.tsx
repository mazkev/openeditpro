import React, { useRef, useState } from 'react';
import {
  Scissors,
  Trash2,
  Copy,
  ZoomIn,
  ZoomOut,
  Film,
  Type,
  Mic,
} from 'lucide-react';
import type { VideoClip, Subtitle, Voiceover } from '../types/editor';
import { formatTime } from '../utils/time';

interface TimelineProps {
  clips: VideoClip[];
  setClips: React.Dispatch<React.SetStateAction<VideoClip[]>>;
  selectedClipId: string | null;
  setSelectedClipId: (id: string | null) => void;
  subtitles: Subtitle[];
  voiceovers: Voiceover[];
  currentTime: number;
  setCurrentTime: (t: number) => void;
  totalDuration: number;
  onSplitClip: (clipId: string, splitTime: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  clips,
  setClips,
  selectedClipId,
  setSelectedClipId,
  subtitles,
  voiceovers,
  currentTime,
  setCurrentTime,
  totalDuration,
  onSplitClip,
}) => {
  const [zoom, setZoom] = useState(40); // pixels per second
  const timelineTracksRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  // Time ruler intervals
  const maxTimelineDuration = Math.max(totalDuration + 5, 20);
  const totalTimelineWidth = Math.max(maxTimelineDuration * zoom, 800);

  // Calculate pixel position from time
  const timeToPx = (sec: number) => sec * zoom;
  const pxToTime = (px: number) => Math.max(0, px / zoom);

  // Handle click or drag on timeline to scrub playhead
  const handleTimelineScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineTracksRef.current) return;
    const rect = timelineTracksRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + timelineTracksRef.current.scrollLeft;
    const newTime = Math.min(totalDuration, pxToTime(clickX));
    setCurrentTime(newTime);
  };

  const handleMouseDownScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDraggingPlayhead(true);
    handleTimelineScrub(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingPlayhead) {
      handleTimelineScrub(e);
    }
  };

  const handleMouseUp = () => {
    setIsDraggingPlayhead(false);
  };

  // Split selected clip at current playhead
  const handleSplitCurrent = () => {
    if (selectedClipId) {
      onSplitClip(selectedClipId, currentTime);
    } else {
      // Find clip under playhead
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

  // Compute visual layout for clips on video track
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
    <div
      className="h-64 bg-[#111217] border-t border-[#232530] flex flex-col select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
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

      {/* Timeline Ruler & Multi-Track Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Track Headers */}
        <div className="w-32 bg-[#14151c] border-r border-[#232530] flex flex-col flex-shrink-0 z-10">
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

        {/* Scrollable Tracks Canvas */}
        <div
          ref={timelineTracksRef}
          onMouseDown={handleMouseDownScrub}
          className="flex-1 overflow-x-auto overflow-y-hidden relative cursor-pointer"
        >
          <div
            style={{ width: `${totalTimelineWidth}px` }}
            className="min-h-full relative"
          >
            {/* 1. Time Ruler (Seconds header) */}
            <div className="h-7 bg-[#14151c] border-b border-[#232530] flex relative select-none">
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

            {/* 2. Track: Video Clips */}
            <div className="h-16 border-b border-[#232530] bg-[#111218] relative flex items-center">
              {clipPositions.map(({ clip, startTime, duration }) => {
                const isSelected = clip.id === selectedClipId;
                const leftPx = timeToPx(startTime);
                const widthPx = Math.max(timeToPx(duration), 24);

                return (
                  <div
                    key={clip.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedClipId(clip.id);
                    }}
                    style={{
                      left: `${leftPx}px`,
                      width: `${widthPx}px`,
                    }}
                    className={`absolute top-1 bottom-1 rounded-lg overflow-hidden flex flex-col justify-between border cursor-pointer transition-shadow shadow-md ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/40 ring-2 ring-cyan-500/50 z-10'
                        : 'border-[#2d3248] bg-[#1b1e2a] hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between px-2 pt-1 text-[11px] font-semibold text-gray-200 truncate">
                      <span className="truncate">{clip.name}</span>
                      <span className="text-[10px] text-cyan-300 font-mono ml-1 flex-shrink-0">
                        {formatTime(duration)}
                      </span>
                    </div>

                    {/* Clip preview thumbnail strip */}
                    <div className="h-6 flex items-center px-2 space-x-1 overflow-hidden opacity-75">
                      {clip.thumbnailUrl && (
                        <img
                          src={clip.thumbnailUrl}
                          alt=""
                          className="h-5 w-8 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 h-1.5 bg-cyan-500/30 rounded" />
                    </div>

                    {/* Trim handles indicators */}
                    {isSelected && (
                      <>
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-cyan-400 rounded-l" />
                        <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-cyan-400 rounded-r" />
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 3. Track: Subtitles */}
            <div className="h-11 border-b border-[#232530] bg-[#111218] relative flex items-center">
              {subtitles.map((sub) => {
                const leftPx = timeToPx(sub.startTime);
                const dur = Math.max(0.5, sub.endTime - sub.startTime);
                const widthPx = Math.max(timeToPx(dur), 20);

                return (
                  <div
                    key={sub.id}
                    style={{
                      left: `${leftPx}px`,
                      width: `${widthPx}px`,
                    }}
                    className="absolute top-1.5 bottom-1.5 rounded-md bg-amber-500/20 border border-amber-500/50 text-amber-200 px-2 flex items-center justify-between text-[10px] font-medium overflow-hidden truncate shadow-sm"
                    title={`Subtitle: "${sub.text}" (${formatTime(sub.startTime)} - ${formatTime(sub.endTime)})`}
                  >
                    <span className="truncate">{sub.text || '(Teks kosong)'}</span>
                  </div>
                );
              })}
            </div>

            {/* 4. Track: Narasi Suara (Voiceover) */}
            <div className="h-11 border-b border-[#232530] bg-[#111218] relative flex items-center">
              {voiceovers.map((vo) => {
                const leftPx = timeToPx(vo.startTime);
                const widthPx = Math.max(timeToPx(vo.duration), 24);

                return (
                  <div
                    key={vo.id}
                    style={{
                      left: `${leftPx}px`,
                      width: `${widthPx}px`,
                    }}
                    className="absolute top-1.5 bottom-1.5 rounded-md bg-teal-500/20 border border-teal-500/50 text-teal-200 px-2 flex items-center space-x-1.5 text-[10px] font-medium overflow-hidden shadow-sm"
                    title={`Narasi: ${vo.name} (${formatTime(vo.startTime)} - ${formatTime(vo.startTime + vo.duration)})`}
                  >
                    <Mic className="w-3 h-3 text-teal-400 flex-shrink-0" />
                    <span className="truncate">{vo.name}</span>
                  </div>
                );
              })}
            </div>

            {/* RED PLAYHEAD LINE & HANDLE */}
            <div
              style={{ left: `${timeToPx(currentTime)}px` }}
              className="absolute top-0 bottom-0 pointer-events-none z-30"
            >
              {/* Playhead Top Scrubber Cap */}
              <div className="w-3.5 h-4 bg-red-500 rounded-b -translate-x-1/2 flex items-center justify-center shadow-lg">
                <div className="w-1 h-2 bg-white/70 rounded-full" />
              </div>
              {/* Vertical Red Needle Line */}
              <div className="w-0.5 h-full bg-red-500 -translate-x-1/2 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
