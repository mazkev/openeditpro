import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { PreviewPlayer } from './components/PreviewPlayer';
import { Timeline } from './components/Timeline';
import { ExportModal } from './components/ExportModal';
import { AutoSubtitleModal } from './components/AutoSubtitleModal';
import type { VideoClip, Subtitle, Watermark, Voiceover, AspectRatio } from './types/editor';
import { exportVideo } from './utils/exportVideo';
import type { ExportProgress } from './utils/exportVideo';
import { createSampleVideo } from './utils/media';

export function App() {
  const [projectName, setProjectName] = useState('Proyek OpenEdit');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  // Subtitles
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);

  // Watermark
  const [watermark, setWatermark] = useState<Watermark>({
    enabled: true,
    type: 'text',
    text: '@OpenEdit',
    position: 'top-right',
    opacity: 0.85,
    scale: 1,
    color: '#ffffff',
  });

  // Voiceovers
  const [voiceovers, setVoiceovers] = useState<Voiceover[]>([]);

  // Playback state
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Export State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    progress: 0,
    status: '',
  });
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isAutoSubtitleModalOpen, setIsAutoSubtitleModalOpen] = useState<boolean>(false);

  // Calculate Total Timeline Duration
  const totalDuration = clips.reduce((acc, c) => acc + Math.max(0, c.trimEnd - c.trimStart), 0);

  // Split Clip handler
  const handleSplitClip = useCallback(
    (clipId: string, splitTimelineTime: number) => {
      // Find clip index and timeline start
      let running = 0;
      let targetIndex = -1;
      let clipStartTimeline = 0;

      for (let i = 0; i < clips.length; i++) {
        const c = clips[i];
        const effDur = Math.max(0, c.trimEnd - c.trimStart);
        if (c.id === clipId) {
          targetIndex = i;
          clipStartTimeline = running;
          break;
        }
        running += effDur;
      }

      if (targetIndex === -1) return;
      const targetClip = clips[targetIndex];
      const effDur = targetClip.trimEnd - targetClip.trimStart;

      // Ensure splitTimelineTime is inside this clip
      if (
        splitTimelineTime <= clipStartTimeline ||
        splitTimelineTime >= clipStartTimeline + effDur
      ) {
        alert('Posisi playhead harus berada di dalam rentang klip yang ingin dipotong!');
        return;
      }

      const relativeSplitSec = splitTimelineTime - clipStartTimeline;
      const splitPointInOriginal = targetClip.trimStart + relativeSplitSec;

      const firstPart: VideoClip = {
        ...targetClip,
        id: `clip-${Date.now()}-part1`,
        name: `${targetClip.name} (Bagian 1)`,
        trimEnd: splitPointInOriginal,
      };

      const secondPart: VideoClip = {
        ...targetClip,
        id: `clip-${Date.now()}-part2`,
        name: `${targetClip.name} (Bagian 2)`,
        trimStart: splitPointInOriginal,
      };

      const updated = [...clips];
      updated.splice(targetIndex, 1, firstPart, secondPart);
      setClips(updated);
      setSelectedClipId(firstPart.id);
    },
    [clips]
  );

  // Load Sample Demo Video
  const handleLoadDemo = async () => {
    try {
      // Create Clip 1 (Intro)
      const clip1 = await createSampleVideo('OpenEdit Intro', '#0f2027', '#2c5364', 4);
      // Create Clip 2 (Action)
      const clip2 = await createSampleVideo('Video Sambungan', '#8A2387', '#E94057', 4);

      const newClips: VideoClip[] = [
        {
          id: `demo-1-${Date.now()}`,
          name: 'Demo Clip 1 - Intro',
          url: clip1.url,
          duration: clip1.duration,
          trimStart: 0,
          trimEnd: clip1.duration,
          thumbnailUrl: clip1.thumbnailUrl,
          volume: 1,
          speed: 1,
        },
        {
          id: `demo-2-${Date.now()}`,
          name: 'Demo Clip 2 - Sambungan',
          url: clip2.url,
          duration: clip2.duration,
          trimStart: 0,
          trimEnd: clip2.duration,
          thumbnailUrl: clip2.thumbnailUrl,
          volume: 1,
          speed: 1,
        },
      ];

      setClips(newClips);
      setSelectedClipId(newClips[0].id);

      // Add Sample Subtitles
      setSubtitles([
        {
          id: `sub-demo-1`,
          text: 'Halo! Selamat datang di OpenEdit Video Editor 🎬',
          startTime: 0.5,
          endTime: 3.8,
          fontSize: 26,
          color: '#ffffff',
          bgColor: 'rgba(0, 0, 0, 0.7)',
          positionY: 82,
        },
        {
          id: `sub-demo-2`,
          text: 'Bisa potong klip, sambung video, watermark, & narasi suara!',
          startTime: 4.2,
          endTime: 7.8,
          fontSize: 24,
          color: '#2dd4bf',
          bgColor: 'rgba(15, 23, 42, 0.85)',
          positionY: 82,
        },
      ]);

      // Watermark
      setWatermark({
        enabled: true,
        type: 'text',
        text: '@OpenEdit',
        position: 'top-right',
        opacity: 0.85,
        scale: 1.1,
        color: '#ffffff',
      });

      setCurrentTime(0);
    } catch (e) {
      console.error('Error loading demo:', e);
      alert('Gagal memuat sampel demo.');
    }
  };

  // Export Video Handler
  const handleExport = async () => {
    if (clips.length === 0) return;
    setIsPlaying(false);
    setIsExporting(true);
    setExportedBlob(null);
    setIsExportModalOpen(true);

    try {
      const blob = await exportVideo(
        clips,
        subtitles,
        watermark,
        voiceovers,
        aspectRatio,
        (progress) => {
          setExportProgress(progress);
        }
      );
      setExportedBlob(blob);
    } catch (err: unknown) {
      console.error('Export error:', err);
      alert(`Gagal mengekspor video: ${err instanceof Error ? err.message : 'Terjadi kesalahan'}`);
      setIsExportModalOpen(false);
    } finally {
      setIsExporting(false);
    }
  };

  // Keyboard Shortcuts (Space for Play/Pause)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (clips.length > 0) {
          setIsPlaying((prev) => !prev);
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setCurrentTime((t) => Math.max(0, t - 1));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setCurrentTime((t) => Math.min(totalDuration, t + 1));
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedClipId) {
          setClips((prev) => prev.filter((c) => c.id !== selectedClipId));
          setSelectedClipId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clips, selectedClipId, totalDuration]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0f0f12] text-gray-200 overflow-hidden select-none font-sans">
      {/* Top Navbar */}
      <Navbar
        projectName={projectName}
        setProjectName={setProjectName}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        onExport={handleExport}
        onLoadDemo={handleLoadDemo}
        isExporting={isExporting}
        hasClips={clips.length > 0}
      />

      {/* Main Workspace (Sidebar + Player Preview) */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          clips={clips}
          setClips={setClips}
          selectedClipId={selectedClipId}
          setSelectedClipId={setSelectedClipId}
          subtitles={subtitles}
          setSubtitles={setSubtitles}
          watermark={watermark}
          setWatermark={setWatermark}
          voiceovers={voiceovers}
          setVoiceovers={setVoiceovers}
          currentTime={currentTime}
          onSplitClip={handleSplitClip}
          onOpenAutoSubtitle={() => setIsAutoSubtitleModalOpen(true)}
        />

        {/* Center Canvas Preview Player */}
        <PreviewPlayer
          clips={clips}
          subtitles={subtitles}
          watermark={watermark}
          voiceovers={voiceovers}
          aspectRatio={aspectRatio}
          currentTime={currentTime}
          setCurrentTime={setCurrentTime}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          totalDuration={totalDuration}
        />
      </div>

      {/* Bottom Timeline Tracks */}
      <Timeline
        clips={clips}
        setClips={setClips}
        selectedClipId={selectedClipId}
        setSelectedClipId={setSelectedClipId}
        subtitles={subtitles}
        voiceovers={voiceovers}
        currentTime={currentTime}
        setCurrentTime={setCurrentTime}
        totalDuration={totalDuration}
        onSplitClip={handleSplitClip}
      />

      {/* Export Progress Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        progress={exportProgress}
        exportedBlob={exportedBlob}
        projectName={projectName}
      />

      {/* Auto Subtitle (Speech-to-Text) Modal */}
      <AutoSubtitleModal
        isOpen={isAutoSubtitleModalOpen}
        onClose={() => setIsAutoSubtitleModalOpen(false)}
        clips={clips}
        onApplySubtitles={(newSubs) => setSubtitles((prev) => [...prev, ...newSubs])}
        totalDuration={totalDuration}
      />
    </div>
  );
}

export default App;
