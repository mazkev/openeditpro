import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  Scissors,
  Type,
  Shield,
  Mic,
  Upload,
  Plus,
  Trash2,
  Volume2,
  ChevronUp,
  ChevronDown,
  StopCircle,
  Radio,
  RotateCcw,
  Sparkles,
  Play,
  Square,
  Loader2,
  Palette,
  Sliders,
} from 'lucide-react';
import type { VideoClip, Subtitle, Watermark, Voiceover, WatermarkPosition } from '../types/editor';
import { formatTime } from '../utils/time';
import { processVideoFile, processAudioFile } from '../utils/media';
import {
  AVAILABLE_VOICES,
  VOICE_EFFECTS,
  generateTTSAudio,
  playTTSPreview,
  stopTTSPreview,
  generateSyncedSubtitlesFromText,
  getSystemVoices,
  type VoiceEffectPreset,
} from '../utils/tts';

interface SubtitleStylePreset {
  id: string;
  name: string;
  preview: string;
  color: string;
  bgColor: string;
  fontFamily: 'sans' | 'impact' | 'serif' | 'mono' | 'cursive';
  strokeColor: string;
  strokeWidth: number;
  isUppercase: boolean;
  glowColor?: string;
}

const SUBTITLE_PRESETS: SubtitleStylePreset[] = [
  {
    id: 'tiktok',
    name: 'TikTok Viral',
    preview: 'VIRAL',
    color: '#FACC15',
    bgColor: '#000000',
    fontFamily: 'impact',
    strokeColor: '#000000',
    strokeWidth: 3,
    isUppercase: true,
  },
  {
    id: 'youtube',
    name: 'YouTube Red',
    preview: 'BOX RED',
    color: '#FFFFFF',
    bgColor: '#DC2626',
    fontFamily: 'sans',
    strokeColor: 'transparent',
    strokeWidth: 0,
    isUppercase: true,
  },
  {
    id: 'cyber',
    name: 'Cyber Glow',
    preview: 'NEON',
    color: '#2DD4BF',
    bgColor: 'rgba(15, 23, 42, 0.9)',
    fontFamily: 'mono',
    strokeColor: '#0F766E',
    strokeWidth: 2,
    glowColor: '#14B8A6',
    isUppercase: true,
  },
  {
    id: 'minimalist',
    name: 'Clean White',
    preview: 'Classic',
    color: '#FFFFFF',
    bgColor: 'transparent',
    fontFamily: 'sans',
    strokeColor: '#000000',
    strokeWidth: 3,
    isUppercase: false,
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    preview: 'Cinema',
    color: '#F3F4F6',
    bgColor: 'rgba(0, 0, 0, 0.85)',
    fontFamily: 'serif',
    strokeColor: 'transparent',
    strokeWidth: 0,
    isUppercase: false,
  },
  {
    id: 'aesthetic',
    name: 'Pastel Glow',
    preview: 'Pastel',
    color: '#F472B6',
    bgColor: 'rgba(30, 27, 75, 0.85)',
    fontFamily: 'cursive',
    strokeColor: '#701A75',
    strokeWidth: 2,
    isUppercase: false,
  },
];

interface SidebarProps {
  clips: VideoClip[];
  setClips: React.Dispatch<React.SetStateAction<VideoClip[]>>;
  selectedClipId: string | null;
  setSelectedClipId: (id: string | null) => void;
  subtitles: Subtitle[];
  setSubtitles: React.Dispatch<React.SetStateAction<Subtitle[]>>;
  watermark: Watermark;
  setWatermark: React.Dispatch<React.SetStateAction<Watermark>>;
  voiceovers: Voiceover[];
  setVoiceovers: React.Dispatch<React.SetStateAction<Voiceover[]>>;
  currentTime: number;
  setCurrentTime?: (t: number) => void;
  totalDuration?: number;
  onSplitClip: (clipId: string, splitTime: number) => void;
  onOpenAutoSubtitle: () => void;
}

type TabType = 'media' | 'edit' | 'subtitle' | 'watermark' | 'voiceover';

export const Sidebar: React.FC<SidebarProps> = ({
  clips,
  setClips,
  selectedClipId,
  setSelectedClipId,
  subtitles,
  setSubtitles,
  watermark,
  setWatermark,
  voiceovers,
  setVoiceovers,
  currentTime,
  setCurrentTime,
  totalDuration = 0,
  onSplitClip,
  onOpenAutoSubtitle,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('media');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Text-to-Speech (TTS) State
  const [narrationMode, setNarrationMode] = useState<'tts' | 'mic' | 'upload'>('tts');
  const [ttsText, setTtsText] = useState('');
  const [ttsVoice, setTtsVoice] = useState('id-female');
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [ttsPitch, setTtsPitch] = useState(1.0);
  const [selectedVoiceEffect, setSelectedVoiceEffect] = useState('normal');
  const [voiceCategoryFilter, setVoiceCategoryFilter] = useState<'all' | 'id' | 'en' | 'intl' | 'system'>('all');
  const [systemVoices, setSystemVoices] = useState<{ id: string; name: string; lang: string }[]>([]);
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
  const [ttsStatus, setTtsStatus] = useState('');
  const [createSubtitleFromTTS, setCreateSubtitleFromTTS] = useState(true);
  const [isPreviewingSpeech, setIsPreviewingSpeech] = useState(false);

  // Fetch native system OS speech synthesis voices
  useEffect(() => {
    const loadVoices = () => {
      const sys = getSystemVoices();
      setSystemVoices(sys);
    };
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const watermarkImgRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  // Handle Video Upload
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const { url, duration, thumbnailUrl } = await processVideoFile(file);
        const newClip: VideoClip = {
          id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          url,
          duration,
          trimStart: 0,
          trimEnd: duration,
          thumbnailUrl,
          volume: 1,
          speed: 1,
        };
        setClips((prev) => [...prev, newClip]);
        if (!selectedClipId) setSelectedClipId(newClip.id);
      } catch (err) {
        alert(`Gagal memuat file ${file.name}`);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle Audio Upload
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    try {
      const { url, duration } = await processAudioFile(file);
      const newVoiceover: Voiceover = {
        id: `vo-${Date.now()}`,
        name: file.name,
        url,
        duration,
        startTime: currentTime,
        volume: 1,
      };
      setVoiceovers((prev) => [...prev, newVoiceover]);
    } catch (err) {
      alert(`Gagal memuat audio: ${file.name}`);
    }
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  // Microphone Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const { url, duration } = await processAudioFile(audioBlob);
        const newVoiceover: Voiceover = {
          id: `vo-rec-${Date.now()}`,
          name: `Narasi Rekaman (${formatTime(duration)})`,
          url,
          duration,
          startTime: currentTime,
          volume: 1,
        };
        setVoiceovers((prev) => [...prev, newVoiceover]);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordTimerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Tidak dapat mengakses mikrofon. Pastikan izin mic diberikan.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    }
  };

  // Watermark Image Upload
  const handleWatermarkImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setWatermark((prev) => ({
        ...prev,
        type: 'image',
        imageUrl: url,
      }));
    }
  };

  // Subtitle Operations
  const handleAddSubtitle = () => {
    const targetStart = totalDuration > 0 && currentTime >= totalDuration - 0.2 ? 0 : currentTime;
    const newSub: Subtitle = {
      id: `sub-${Date.now()}`,
      text: 'Teks Subtitle Baru',
      startTime: parseFloat(targetStart.toFixed(1)),
      endTime: parseFloat((targetStart + 3).toFixed(1)),
      fontSize: 26,
      color: '#ffffff',
      bgColor: 'rgba(0, 0, 0, 0.75)',
      positionY: 80,
    };
    setSubtitles((prev) => [...prev, newSub]);
    if (setCurrentTime) setCurrentTime(targetStart);
  };

  // Text-to-Speech (TTS) Operations
  const handleSelectVoiceEffect = (effect: VoiceEffectPreset) => {
    setSelectedVoiceEffect(effect.id);
    setTtsPitch(effect.pitch);
    setTtsSpeed(effect.speed);
  };

  const handleSelectVoice = (voiceId: string) => {
    stopTTSPreview();
    setIsPreviewingSpeech(false);
    setTtsVoice(voiceId);
  };

  const handlePreviewTTS = async () => {
    // If currently previewing, stop it immediately!
    if (isPreviewingSpeech) {
      stopTTSPreview();
      setIsPreviewingSpeech(false);
      return;
    }

    const trimmed = ttsText.trim();
    const textToPlay =
      trimmed ||
      'Halo! Ini adalah contoh uji coba suara narasi saya. Silakan dengarkan karakternya.';
    if (!trimmed) {
      setTtsText(textToPlay);
    }

    setIsPreviewingSpeech(true);

    try {
      if (ttsVoice.startsWith('sys-')) {
        const rawName = ttsVoice.replace(/^sys-/, '');
        await playTTSPreview(
          textToPlay,
          { id: ttsVoice, name: rawName, lang: 'id' },
          ttsPitch,
          ttsSpeed,
          () => setIsPreviewingSpeech(false)
        );
      } else {
        const voiceObj = AVAILABLE_VOICES.find((v) => v.id === ttsVoice) || AVAILABLE_VOICES[0];
        await playTTSPreview(
          textToPlay,
          voiceObj,
          ttsPitch,
          ttsSpeed,
          () => setIsPreviewingSpeech(false)
        );
      }
    } catch (err) {
      console.error('Preview speech error:', err);
      setIsPreviewingSpeech(false);
    }
  };

  const handleGenerateTTS = async () => {
    stopTTSPreview();
    setIsPreviewingSpeech(false);

    if (!ttsText.trim()) {
      alert('Silakan ketik atau paste teks narasi terlebih dahulu.');
      return;
    }

    setIsGeneratingTTS(true);
    setTtsStatus('Menghubungkan ke server suara...');

    try {
      let lang = 'id';
      let voiceLabel = 'Narasi';
      let effectivePitch = ttsPitch;
      let effectiveSpeed = ttsSpeed;

      if (ttsVoice.startsWith('sys-')) {
        lang = 'id';
        voiceLabel = ttsVoice.replace(/^sys-/, '').slice(0, 15);
      } else {
        const voiceObj = AVAILABLE_VOICES.find((v) => v.id === ttsVoice) || AVAILABLE_VOICES[0];
        lang = voiceObj.lang;
        voiceLabel = voiceObj.name.split(' ')[0];

        const basePitch = voiceObj.defaultPitch ?? (voiceObj.gender === 'male' ? 0.80 : 1.0);
        const baseSpeed = voiceObj.defaultSpeed ?? 1.0;
        effectivePitch = basePitch * ttsPitch;
        effectiveSpeed = baseSpeed * ttsSpeed;
      }

      const { url, duration } = await generateTTSAudio(ttsText, lang, {
        pitch: effectivePitch,
        speed: effectiveSpeed,
        onProgress: (msg) => setTtsStatus(msg),
      });

      // If currentTime is at the end of the video, place from 0 so it plays from beginning!
      const targetStart = totalDuration > 0 && currentTime >= totalDuration - 0.2 ? 0 : currentTime;

      const newVoiceover: Voiceover = {
        id: `vo-tts-${Date.now()}`,
        name: `TTS [${voiceLabel}]: ${ttsText.slice(0, 20)}...`,
        url,
        duration,
        startTime: parseFloat(targetStart.toFixed(1)),
        volume: 1,
      };

      setVoiceovers((prev) => [...prev, newVoiceover]);

      // If user also wants subtitles generated from this narration
      // Split into synchronized phrases so subtitles appear progressively with the voice!
      if (createSubtitleFromTTS) {
        const syncedSubtitles = generateSyncedSubtitlesFromText(
          ttsText,
          targetStart,
          Math.max(1.5, duration)
        );
        setSubtitles((prev) => [...prev, ...syncedSubtitles]);
      }

      if (setCurrentTime) {
        setCurrentTime(targetStart);
      }

      setTtsText('');
      setTtsStatus('');
    } catch (err: unknown) {
      console.error('TTS error:', err);
      alert('Gagal membuat suara narasi: ' + (err instanceof Error ? err.message : 'Terjadi kesalahan'));
    } finally {
      setIsGeneratingTTS(false);
    }
  };

  const selectedClip = clips.find((c) => c.id === selectedClipId);

  return (
    <div className="flex h-full w-[380px] bg-[#14151a] border-r border-[#252733] select-none flex-shrink-0">
      {/* Icon Navigation Tabs */}
      <div className="w-16 bg-[#101115] border-r border-[#222430] flex flex-col items-center py-3 space-y-4">
        <button
          onClick={() => setActiveTab('media')}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${
            activeTab === 'media'
              ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1c24]'
          }`}
          title="Media Video"
        >
          <Film className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium">Media</span>
        </button>

        <button
          onClick={() => setActiveTab('edit')}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${
            activeTab === 'edit'
              ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1c24]'
          }`}
          title="Potong & Sambung Video"
        >
          <Scissors className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium">Potong</span>
        </button>

        <button
          onClick={() => setActiveTab('subtitle')}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${
            activeTab === 'subtitle'
              ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1c24]'
          }`}
          title="Subtitle & Teks"
        >
          <Type className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium">Subtitle</span>
        </button>

        <button
          onClick={() => setActiveTab('watermark')}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${
            activeTab === 'watermark'
              ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1c24]'
          }`}
          title="Watermark Logo/Teks"
        >
          <Shield className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium">Watermark</span>
        </button>

        <button
          onClick={() => setActiveTab('voiceover')}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${
            activeTab === 'voiceover'
              ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1c24]'
          }`}
          title="Narasi Suara"
        >
          <Mic className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium">Narasi</span>
        </button>
      </div>

      {/* Main Tab Content Drawer */}
      <div className="flex-1 flex flex-col h-full overflow-hidden p-4">
        {/* TAB 1: MEDIA */}
        {activeTab === 'media' && (
          <div className="flex flex-col h-full">
            <h2 className="text-sm font-bold text-gray-200 mb-3 flex items-center justify-between">
              <span>Ambil & Kelola Video</span>
              <span className="text-xs text-gray-400 font-normal">{clips.length} klip</span>
            </h2>

            {/* Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#2f3242] hover:border-teal-500/70 bg-[#191b22] hover:bg-[#1f222c] rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all mb-4 text-center group"
            >
              <div className="w-10 h-10 rounded-full bg-teal-500/10 group-hover:bg-teal-500/20 flex items-center justify-center text-teal-400 mb-2 transition-transform group-hover:scale-110">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-gray-200">Klik untuk Unggah Video</p>
              <p className="text-[11px] text-gray-400 mt-1">Mendukung MP4, WebM, MOV, dsb.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                multiple
                onChange={handleVideoUpload}
                className="hidden"
              />
            </div>

            {/* Video List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {clips.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs">
                  Belum ada video. Silakan upload video atau gunakan tombol "Muat Sampel Demo" di atas.
                </div>
              ) : (
                clips.map((clip, index) => {
                  const effectiveDur = Math.max(0, clip.trimEnd - clip.trimStart);
                  const isSelected = clip.id === selectedClipId;
                  return (
                    <div
                      key={clip.id}
                      onClick={() => setSelectedClipId(clip.id)}
                      className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer border transition-all ${
                        isSelected
                          ? 'bg-[#1f222c] border-teal-500/60 shadow-sm'
                          : 'bg-[#171820] border-[#252834] hover:border-gray-600'
                      }`}
                    >
                      <div className="w-16 h-10 bg-black rounded overflow-hidden flex-shrink-0 relative">
                        {clip.thumbnailUrl ? (
                          <img
                            src={clip.thumbnailUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-[10px]">
                            Video
                          </div>
                        )}
                        <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-[9px] px-1 rounded text-gray-300">
                          {formatTime(effectiveDur)}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-200 truncate">{clip.name}</p>
                        <p className="text-[10px] text-gray-400">
                          Urutan #{index + 1} • {formatTime(clip.duration)}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setClips((prev) => prev.filter((c) => c.id !== clip.id));
                          if (selectedClipId === clip.id) setSelectedClipId(null);
                        }}
                        className="p-1 hover:text-red-400 text-gray-500 transition-colors"
                        title="Hapus Klip"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: POTONG & SAMBUNG */}
        {activeTab === 'edit' && (
          <div className="flex flex-col h-full overflow-y-auto pr-1">
            <h2 className="text-sm font-bold text-gray-200 mb-1 flex items-center justify-between">
              <span>Potong & Sambung Video</span>
            </h2>
            <p className="text-[11px] text-gray-400 mb-4">
              Atur titik potong (Trim), belah klip (Split), dan urutan sambungan klip.
            </p>

            {selectedClip ? (
              <div className="space-y-4">
                <div className="bg-[#171820] p-3 rounded-xl border border-[#252834]">
                  <p className="text-xs font-bold text-teal-400 truncate mb-1">
                    {selectedClip.name}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Durasi Asli: {formatTime(selectedClip.duration, true)} • Aktif:{' '}
                    {formatTime(selectedClip.trimEnd - selectedClip.trimStart, true)}
                  </p>
                </div>

                {/* Trim Start & End Sliders */}
                <div className="bg-[#171820] p-3 rounded-xl border border-[#252834] space-y-3">
                  <span className="text-xs font-semibold text-gray-300 block">
                    ✂️ Titik Potong (Trim Range)
                  </span>

                  <div>
                    <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                      <span>Mulai (Trim In):</span>
                      <span className="text-teal-400 font-mono">
                        {formatTime(selectedClip.trimStart, true)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={selectedClip.trimEnd - 0.2}
                      step={0.1}
                      value={selectedClip.trimStart}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setClips((prev) =>
                          prev.map((c) => (c.id === selectedClip.id ? { ...c, trimStart: val } : c))
                        );
                      }}
                      className="w-full accent-teal-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                      <span>Selesai (Trim Out):</span>
                      <span className="text-teal-400 font-mono">
                        {formatTime(selectedClip.trimEnd, true)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={selectedClip.trimStart + 0.2}
                      max={selectedClip.duration}
                      step={0.1}
                      value={selectedClip.trimEnd}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setClips((prev) =>
                          prev.map((c) => (c.id === selectedClip.id ? { ...c, trimEnd: val } : c))
                        );
                      }}
                      className="w-full accent-teal-400"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setClips((prev) =>
                        prev.map((c) =>
                          c.id === selectedClip.id
                            ? { ...c, trimStart: 0, trimEnd: c.duration }
                            : c
                        )
                      );
                    }}
                    className="flex items-center space-x-1.5 text-[11px] text-gray-400 hover:text-gray-200 mt-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Potongan</span>
                  </button>
                </div>

                {/* Split Action */}
                <div className="bg-[#171820] p-3 rounded-xl border border-[#252834] space-y-2">
                  <span className="text-xs font-semibold text-gray-300 block">
                    Belah / Potong di Posisi Playhead
                  </span>
                  <p className="text-[11px] text-gray-400">
                    Playhead saat ini: <span className="text-teal-400 font-mono">{formatTime(currentTime, true)}</span>
                  </p>
                  <button
                    onClick={() => onSplitClip(selectedClip.id, currentTime)}
                    className="w-full py-2 bg-[#252838] hover:bg-[#2d3144] text-teal-300 font-semibold text-xs rounded-lg border border-teal-500/30 flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Scissors className="w-4 h-4 text-teal-400" />
                    <span>Potong Klip Ini (Split)</span>
                  </button>
                </div>

                {/* Reordering / Sambung Sequence */}
                <div className="bg-[#171820] p-3 rounded-xl border border-[#252834] space-y-2">
                  <span className="text-xs font-semibold text-gray-300 block">
                    🔗 Urutan Sambungan Video
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        const idx = clips.findIndex((c) => c.id === selectedClip.id);
                        if (idx > 0) {
                          const updated = [...clips];
                          const temp = updated[idx];
                          updated[idx] = updated[idx - 1];
                          updated[idx - 1] = temp;
                          setClips(updated);
                        }
                      }}
                      className="flex-1 py-1.5 bg-[#20222d] hover:bg-[#282a38] text-gray-300 text-xs rounded-lg flex items-center justify-center space-x-1"
                    >
                      <ChevronUp className="w-4 h-4" />
                      <span>Geser Maju</span>
                    </button>
                    <button
                      onClick={() => {
                        const idx = clips.findIndex((c) => c.id === selectedClip.id);
                        if (idx < clips.length - 1 && idx !== -1) {
                          const updated = [...clips];
                          const temp = updated[idx];
                          updated[idx] = updated[idx + 1];
                          updated[idx + 1] = temp;
                          setClips(updated);
                        }
                      }}
                      className="flex-1 py-1.5 bg-[#20222d] hover:bg-[#282a38] text-gray-300 text-xs rounded-lg flex items-center justify-center space-x-1"
                    >
                      <ChevronDown className="w-4 h-4" />
                      <span>Geser Mundur</span>
                    </button>
                  </div>
                </div>

                {/* Volume of clip */}
                <div className="bg-[#171820] p-3 rounded-xl border border-[#252834] space-y-2">
                  <div className="flex justify-between text-xs text-gray-300">
                    <span className="flex items-center space-x-1">
                      <Volume2 className="w-3.5 h-3.5 text-gray-400" />
                      <span>Volume Klip:</span>
                    </span>
                    <span className="font-mono text-teal-400">
                      {Math.round((selectedClip.volume ?? 1) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={selectedClip.volume ?? 1}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setClips((prev) =>
                        prev.map((c) => (c.id === selectedClip.id ? { ...c, volume: val } : c))
                      );
                    }}
                    className="w-full accent-teal-400"
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500 text-xs bg-[#171820] rounded-xl border border-[#252834]">
                Pilih sebuah klip video terlebih dahulu untuk memotong atau mengatur sambungan.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SUBTITLE */}
        {activeTab === 'subtitle' && (
          <div className="flex flex-col h-full overflow-y-auto pr-1">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-gray-200">Subtitle & Teks</h2>
              <button
                onClick={handleAddSubtitle}
                className="flex items-center space-x-1 px-2 py-1 bg-[#202230] hover:bg-[#282a3c] text-gray-300 text-xs rounded-lg border border-[#2f3246] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Manual</span>
              </button>
            </div>

            {/* Smart Auto Subtitle Banner */}
            <div className="p-3 bg-gradient-to-r from-teal-950/60 to-cyan-950/50 border border-teal-500/40 rounded-xl mb-3 shadow-md">
              <div className="flex items-center space-x-2 mb-1">
                <Sparkles className="w-4 h-4 text-teal-400 animate-pulse" />
                <span className="text-xs font-bold text-teal-300">
                  Auto Subtitle (AI Dengar Video)
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mb-2 leading-relaxed">
                Otomatis mendeteksi ucapan dan percakapan audio dari video dan mengubahnya menjadi baris subtitle.
              </p>
              <button
                onClick={onOpenAutoSubtitle}
                className="w-full py-1.5 bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 text-black text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-black" />
                <span>Buat Subtitle Otomatis</span>
              </button>
            </div>

            {/* POPULAR SUBTITLE STYLE PRESETS */}
            <div className="bg-[#171820] p-3 rounded-xl border border-[#252834] mb-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-200 flex items-center space-x-1.5">
                  <Palette className="w-3.5 h-3.5 text-teal-400" />
                  <span>Preset Gaya Teks (CapCut)</span>
                </span>
                <span className="text-[10px] text-gray-400">Pilih tema</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {SUBTITLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      // Apply to all subtitles
                      setSubtitles((prev) =>
                        prev.map((s) => ({
                          ...s,
                          color: preset.color,
                          bgColor: preset.bgColor,
                          fontFamily: preset.fontFamily,
                          strokeColor: preset.strokeColor,
                          strokeWidth: preset.strokeWidth,
                          isUppercase: preset.isUppercase,
                          glowColor: preset.glowColor,
                          stylePreset: preset.id,
                        }))
                      );
                    }}
                    className="p-1.5 bg-[#121319] hover:bg-[#1f212d] border border-[#2b2d3e] hover:border-teal-400/60 rounded-lg flex flex-col items-center justify-center transition-all group active:scale-95 text-center"
                    title={`Terapkan gaya "${preset.name}" ke semua subtitle`}
                  >
                    <span
                      className="text-xs font-black px-1.5 py-0.5 rounded"
                      style={{
                        color: preset.color,
                        backgroundColor: preset.bgColor,
                        fontFamily: preset.fontFamily === 'impact' ? 'Impact, sans-serif' : 'sans-serif',
                        textTransform: preset.isUppercase ? 'uppercase' : 'none',
                        textShadow: preset.glowColor ? `0 0 8px ${preset.glowColor}` : 'none',
                        WebkitTextStroke: preset.strokeWidth > 0 ? `1px ${preset.strokeColor}` : 'none',
                      }}
                    >
                      {preset.preview}
                    </span>
                    <span className="text-[9px] text-gray-400 mt-1 truncate max-w-full">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-gray-400 mb-3">
              Keterangan teks akan ditampilkan otomatis sesuai rentang waktu yang diatur.
            </p>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {subtitles.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-xs bg-[#171820] rounded-xl border border-[#252834]">
                  Belum ada subtitle. Klik tombol "+ Tambah Teks" di atas.
                </div>
              ) : (
                subtitles.map((sub, index) => (
                  <div
                    key={sub.id}
                    onClick={() => setCurrentTime && setCurrentTime(sub.startTime)}
                    className="bg-[#171820] hover:bg-[#1a1b24] p-3 rounded-xl border border-[#252834] hover:border-teal-500/40 space-y-2.5 transition-colors cursor-pointer"
                    title="Klik untuk melihat subtitle ini pada layar video"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-teal-400 flex items-center space-x-1.5">
                        <span>Subtitle #{index + 1}</span>
                        <span className="text-[10px] text-gray-400 font-mono font-normal">
                          ({formatTime(sub.startTime)} - {formatTime(sub.endTime)})
                        </span>
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSubtitles((prev) => prev.filter((s) => s.id !== sub.id));
                        }}
                        className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                        title="Hapus Subtitle"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <textarea
                      value={sub.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSubtitles((prev) =>
                          prev.map((s) => (s.id === sub.id ? { ...s, text: val } : s))
                        );
                      }}
                      rows={2}
                      placeholder="Masukkan teks caption..."
                      className="w-full bg-[#101115] border border-[#2b2d3d] rounded-lg p-2 text-xs text-gray-200 outline-none focus:border-teal-500/60 resize-none"
                    />

                    {/* Timing */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-gray-400 block mb-1">Mulai (detik):</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={sub.startTime}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setSubtitles((prev) =>
                              prev.map((s) => (s.id === sub.id ? { ...s, startTime: val } : s))
                            );
                          }}
                          className="w-full bg-[#101115] border border-[#2b2d3d] rounded px-2 py-1 text-gray-200 font-mono text-xs outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-1">Selesai (detik):</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={sub.endTime}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setSubtitles((prev) =>
                              prev.map((s) => (s.id === sub.id ? { ...s, endTime: val } : s))
                            );
                          }}
                          className="w-full bg-[#101115] border border-[#2b2d3d] rounded px-2 py-1 text-gray-200 font-mono text-xs outline-none"
                        />
                      </div>
                    </div>

                    {/* Font Family & Uppercase */}
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#222430]">
                      <div className="col-span-2">
                        <span className="text-[10px] text-gray-400 block mb-1">Gaya Font:</span>
                        <select
                          value={sub.fontFamily || 'sans'}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setSubtitles((prev) =>
                              prev.map((s) => (s.id === sub.id ? { ...s, fontFamily: val } : s))
                            );
                          }}
                          className="w-full bg-[#101115] border border-[#2b2d3d] rounded px-2 py-1 text-[11px] text-gray-200 outline-none"
                        >
                          <option value="sans">Modern Sans (Inter)</option>
                          <option value="impact">Impact (Viral Reels / Meme)</option>
                          <option value="serif">Serif (Elegan / Novel)</option>
                          <option value="mono">Monospace (Code / Retro)</option>
                          <option value="cursive">Cursive (Santai / Vlog)</option>
                        </select>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 block mb-1">Kapital:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSubtitles((prev) =>
                              prev.map((s) =>
                                s.id === sub.id ? { ...s, isUppercase: !s.isUppercase } : s
                              )
                            );
                          }}
                          className={`w-full py-1 rounded text-xs font-bold border transition-colors ${
                            sub.isUppercase
                              ? 'bg-teal-500 text-black border-teal-400 font-extrabold'
                              : 'bg-[#101115] text-gray-400 border-[#2b2d3d] hover:text-gray-200'
                          }`}
                        >
                          AA CAPS
                        </button>
                      </div>
                    </div>

                    {/* Colors & Outline */}
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                      <div>
                        <span className="text-[10px] text-gray-400 block mb-1">Warna Teks:</span>
                        <input
                          type="color"
                          value={sub.color}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSubtitles((prev) =>
                              prev.map((s) => (s.id === sub.id ? { ...s, color: val } : s))
                            );
                          }}
                          className="w-full h-7 bg-transparent rounded cursor-pointer border border-[#2b2d3d]"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 block mb-1">Background:</span>
                        <select
                          value={sub.bgColor || 'rgba(0, 0, 0, 0.8)'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSubtitles((prev) =>
                              prev.map((s) => (s.id === sub.id ? { ...s, bgColor: val } : s))
                            );
                          }}
                          className="w-full h-7 bg-[#101115] border border-[#2b2d3d] rounded px-1.5 text-[10px] text-gray-200 outline-none"
                        >
                          <option value="rgba(0, 0, 0, 0.8)">Hitam Gelap</option>
                          <option value="#000000">Hitam Solid</option>
                          <option value="#DC2626">Merah YouTube</option>
                          <option value="rgba(15, 23, 42, 0.9)">Biru Cyber</option>
                          <option value="rgba(30, 27, 75, 0.85)">Ungu Aesthetic</option>
                          <option value="transparent">Tanpa Background</option>
                        </select>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 block mb-1">Garis Tepi ({sub.strokeWidth ?? 3}px):</span>
                        <input
                          type="range"
                          min="0"
                          max="6"
                          step="1"
                          value={sub.strokeWidth ?? 3}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setSubtitles((prev) =>
                              prev.map((s) => (s.id === sub.id ? { ...s, strokeWidth: val } : s))
                            );
                          }}
                          className="w-full accent-teal-400 mt-1"
                        />
                      </div>
                    </div>

                    {/* Size & Position */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#222430]">
                      <div>
                        <span className="text-[10px] text-gray-400 block mb-1">Ukuran Huruf ({sub.fontSize}px):</span>
                        <input
                          type="range"
                          min="16"
                          max="48"
                          value={sub.fontSize}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setSubtitles((prev) =>
                              prev.map((s) => (s.id === sub.id ? { ...s, fontSize: val } : s))
                            );
                          }}
                          className="w-full accent-teal-400"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] text-gray-400">Posisi Layar:</span>
                          <span className="text-[9px] text-teal-400 font-mono">{sub.positionY}%</span>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSubtitles((prev) =>
                                prev.map((s) => (s.id === sub.id ? { ...s, positionY: 20 } : s))
                              );
                            }}
                            className={`flex-1 py-0.5 rounded text-[9px] border ${
                              sub.positionY === 20
                                ? 'bg-teal-500 text-black border-teal-400 font-bold'
                                : 'bg-[#101115] text-gray-400 border-[#2b2d3d]'
                            }`}
                          >
                            Atas
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSubtitles((prev) =>
                                prev.map((s) => (s.id === sub.id ? { ...s, positionY: 50 } : s))
                              );
                            }}
                            className={`flex-1 py-0.5 rounded text-[9px] border ${
                              sub.positionY === 50
                                ? 'bg-teal-500 text-black border-teal-400 font-bold'
                                : 'bg-[#101115] text-gray-400 border-[#2b2d3d]'
                            }`}
                          >
                            Tengah
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSubtitles((prev) =>
                                prev.map((s) => (s.id === sub.id ? { ...s, positionY: 80 } : s))
                              );
                            }}
                            className={`flex-1 py-0.5 rounded text-[9px] border ${
                              sub.positionY === 80
                                ? 'bg-teal-500 text-black border-teal-400 font-bold'
                                : 'bg-[#101115] text-gray-400 border-[#2b2d3d]'
                            }`}
                          >
                            Bawah
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: WATERMARK */}
        {activeTab === 'watermark' && (
          <div className="flex flex-col h-full overflow-y-auto pr-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-200">Watermark Video</h2>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={watermark.enabled}
                  onChange={(e) =>
                    setWatermark((prev) => ({ ...prev, enabled: e.target.checked }))
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
              </label>
            </div>

            <div className="bg-[#171820] p-3 rounded-xl border border-[#252834] space-y-3">
              <span className="text-xs font-semibold text-gray-300 block">Tipe Watermark</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setWatermark((prev) => ({ ...prev, type: 'text' }))}
                  className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    watermark.type === 'text'
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                      : 'bg-[#20222d] text-gray-400 border-transparent hover:text-gray-200'
                  }`}
                >
                  Teks
                </button>
                <button
                  onClick={() => setWatermark((prev) => ({ ...prev, type: 'image' }))}
                  className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    watermark.type === 'image'
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                      : 'bg-[#20222d] text-gray-400 border-transparent hover:text-gray-200'
                  }`}
                >
                  Logo Gambar
                </button>
              </div>

              {watermark.type === 'text' ? (
                <div>
                  <span className="text-[11px] text-gray-400 block mb-1">Teks Watermark:</span>
                  <input
                    type="text"
                    value={watermark.text}
                    onChange={(e) =>
                      setWatermark((prev) => ({ ...prev, text: e.target.value }))
                    }
                    placeholder="misal: @CapCutCreator"
                    className="w-full bg-[#101115] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 outline-none focus:border-teal-500/60"
                  />
                </div>
              ) : (
                <div>
                  <span className="text-[11px] text-gray-400 block mb-1">File Gambar Logo:</span>
                  <input
                    ref={watermarkImgRef}
                    type="file"
                    accept="image/*"
                    onChange={handleWatermarkImageUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => watermarkImgRef.current?.click()}
                    className="w-full py-2 bg-[#20222d] hover:bg-[#282a38] text-xs text-teal-300 font-medium rounded-lg border border-[#2f3244] flex items-center justify-center space-x-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{watermark.imageUrl ? 'Ganti Logo Gambar' : 'Pilih Logo PNG/JPG'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Position Picker */}
            <div className="bg-[#171820] p-3 rounded-xl border border-[#252834] space-y-2">
              <span className="text-xs font-semibold text-gray-300 block">Posisi Watermark</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    ['top-left', 'Kiri Atas'],
                    ['center', 'Tengah'],
                    ['top-right', 'Kanan Atas'],
                    ['bottom-left', 'Kiri Bawah'],
                    ['', ''],
                    ['bottom-right', 'Kanan Bawah'],
                  ] as [WatermarkPosition | '', string][]
                ).map(([pos, label], i) => {
                  if (!pos) return <div key={i} />;
                  return (
                    <button
                      key={pos}
                      onClick={() => setWatermark((prev) => ({ ...prev, position: pos }))}
                      className={`py-1 px-1 rounded text-[11px] font-medium border transition-colors ${
                        watermark.position === pos
                          ? 'bg-teal-500 text-black border-teal-400 font-semibold'
                          : 'bg-[#20222d] text-gray-400 border-transparent hover:text-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sliders: Opacity & Scale */}
            <div className="bg-[#171820] p-3 rounded-xl border border-[#252834] space-y-3">
              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Transparansi (Opacity):</span>
                  <span className="text-teal-400">{Math.round(watermark.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={watermark.opacity}
                  onChange={(e) =>
                    setWatermark((prev) => ({ ...prev, opacity: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-teal-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Ukuran Skala:</span>
                  <span className="text-teal-400">{watermark.scale}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={watermark.scale}
                  onChange={(e) =>
                    setWatermark((prev) => ({ ...prev, scale: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-teal-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: NARASI SUARA */}
        {activeTab === 'voiceover' && (
          <div className="flex flex-col h-full overflow-y-auto pr-1 space-y-3">
            <div>
              <h2 className="text-sm font-bold text-gray-200">Narasi Suara (Voiceover)</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Generate suara otomatis dari teks naskah, rekam mic, atau upload audio.
              </p>
            </div>

            {/* Sub-mode selector tabs */}
            <div className="flex p-1 bg-[#101116] rounded-xl border border-[#232535] text-[11px]">
              <button
                onClick={() => setNarrationMode('tts')}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center space-x-1 ${
                  narrationMode === 'tts'
                    ? 'bg-teal-500 text-black font-semibold shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Teks ke Suara</span>
              </button>

              <button
                onClick={() => setNarrationMode('mic')}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center space-x-1 ${
                  narrationMode === 'mic'
                    ? 'bg-teal-500 text-black font-semibold shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Rekam Mic</span>
              </button>

              <button
                onClick={() => setNarrationMode('upload')}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center space-x-1 ${
                  narrationMode === 'upload'
                    ? 'bg-teal-500 text-black font-semibold shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>
            </div>

            {/* 1. TEXT TO SPEECH (COPY & GENERATE) */}
            {narrationMode === 'tts' && (
              <div className="bg-[#171820] p-3 rounded-xl border border-[#252834] space-y-3">
                {/* Textarea */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-gray-300">
                      Naskah Narasi Suara
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() =>
                          setTtsText(
                            'Halo kawan-kawan! Selamat datang kembali di video terbaru saya. Hari ini kita akan menjelajahi sesuatu yang sangat luar biasa.'
                          )
                        }
                        className="text-[10px] text-teal-400 hover:text-teal-300 underline"
                      >
                        Contoh Naskah
                      </button>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {ttsText.length} karakter
                      </span>
                    </div>
                  </div>
                  <textarea
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                    placeholder="Paste atau ketik naskah narasi di sini... (contoh: Halo kawan-kawan! Selamat datang kembali di video terbaru saya. Hari ini kita akan membahas tutorial yang sangat menarik.)"
                    rows={3}
                    className="w-full bg-[#101115] border border-[#2b2d3d] rounded-lg p-2.5 text-xs text-gray-200 outline-none focus:border-teal-500/70 resize-none leading-relaxed"
                  />
                </div>

                {/* Voice Category Filter */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] font-semibold text-gray-300">
                      Pilihan Karakter Suara:
                    </span>
                    <span className="text-[10px] text-teal-400 font-mono">
                      {AVAILABLE_VOICES.length} Versi Suara
                    </span>
                  </div>

                  <div className="flex space-x-1 overflow-x-auto pb-1.5 text-[10px]">
                    {[
                      { id: 'all', label: `Semua (${AVAILABLE_VOICES.length})` },
                      {
                        id: 'id',
                        label: `🇮🇩 Indonesia (${AVAILABLE_VOICES.filter((v) => v.category === 'id').length})`,
                      },
                      {
                        id: 'en',
                        label: `🇺🇸 English (${AVAILABLE_VOICES.filter((v) => v.category === 'en').length})`,
                      },
                      {
                        id: 'intl',
                        label: `🌏 Internasional (${AVAILABLE_VOICES.filter((v) => v.category === 'intl').length})`,
                      },
                      ...(systemVoices.length > 0
                        ? [{ id: 'system', label: `💻 OS (${systemVoices.length})` }]
                        : []),
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setVoiceCategoryFilter(cat.id as typeof voiceCategoryFilter)}
                        className={`px-2 py-1 rounded-md whitespace-nowrap transition-colors font-medium ${
                          voiceCategoryFilter === cat.id
                            ? 'bg-teal-500 text-black font-semibold'
                            : 'bg-[#101115] text-gray-400 hover:text-gray-200 border border-[#262836]'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Voice Select Dropdown */}
                  <select
                    value={ttsVoice}
                    onChange={(e) => handleSelectVoice(e.target.value)}
                    className="w-full bg-[#101115] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 outline-none focus:border-teal-500/60 font-medium"
                  >
                    {voiceCategoryFilter === 'all' ? (
                      <>
                        <optgroup label="🇮🇩 Bahasa Indonesia">
                          {AVAILABLE_VOICES.filter((v) => v.category === 'id').map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.flag} {v.name}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="🇺🇸 / 🇬🇧 English">
                          {AVAILABLE_VOICES.filter((v) => v.category === 'en').map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.flag} {v.name}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="🌏 Internasional & Asia">
                          {AVAILABLE_VOICES.filter((v) => v.category === 'intl').map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.flag} {v.name}
                            </option>
                          ))}
                        </optgroup>
                        {systemVoices.length > 0 && (
                          <optgroup label="💻 Suara Komputer / OS">
                            {systemVoices.map((v) => (
                              <option key={v.id} value={v.id}>
                                💻 {v.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </>
                    ) : voiceCategoryFilter === 'system' ? (
                      systemVoices.map((v) => (
                        <option key={v.id} value={v.id}>
                          💻 {v.name}
                        </option>
                      ))
                    ) : (
                      AVAILABLE_VOICES.filter((v) => v.category === voiceCategoryFilter).map(
                        (v) => (
                          <option key={v.id} value={v.id}>
                            {v.flag} {v.name}
                          </option>
                        )
                      )
                    )}
                  </select>

                  {/* Selected Voice Card */}
                  {(() => {
                    const currentVoice = AVAILABLE_VOICES.find((v) => v.id === ttsVoice);
                    if (!currentVoice || ttsVoice.startsWith('sys-')) return null;
                    return (
                      <div className="mt-1.5 bg-[#101115] p-2 rounded-lg border border-[#252834] flex items-center justify-between text-[11px]">
                        <div className="min-w-0 pr-2">
                          <p className="text-teal-300 font-semibold truncate">
                            {currentVoice.flag} {currentVoice.name}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">
                            {currentVoice.description}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={handlePreviewTTS}
                            className={`px-2 py-1 rounded flex items-center space-x-1 text-[10px] font-semibold border transition-all ${
                              isPreviewingSpeech
                                ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                                : 'bg-teal-500/10 text-teal-300 border-teal-500/30 hover:bg-teal-500/20'
                            }`}
                            title="Tes Dengar Karakter Suara Ini Langsung"
                          >
                            {isPreviewingSpeech ? (
                              <Square className="w-2.5 h-2.5 fill-current" />
                            ) : (
                              <Play className="w-2.5 h-2.5 fill-current" />
                            )}
                            <span>{isPreviewingSpeech ? 'Stop' : 'Tes Suara'}</span>
                          </button>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1c1e28] text-gray-300 font-medium uppercase">
                            {currentVoice.gender === 'female' ? 'Wanita' : 'Pria'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Voice Character Effect Presets (CapCut Style) */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] font-semibold text-gray-300">
                      🎭 Karakter / Efek Suara (Presets):
                    </span>
                    <span className="text-[10px] text-gray-500">CapCut Style</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {VOICE_EFFECTS.map((eff) => (
                      <button
                        key={eff.id}
                        type="button"
                        onClick={() => handleSelectVoiceEffect(eff)}
                        className={`p-2 rounded-lg text-left border transition-all flex items-start space-x-2 ${
                          selectedVoiceEffect === eff.id
                            ? 'bg-teal-500/20 border-teal-400 text-teal-200 shadow-sm'
                            : 'bg-[#101115] border-[#252838] hover:border-gray-600 text-gray-300'
                        }`}
                      >
                        <span className="text-base leading-none">{eff.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold truncate">{eff.name}</p>
                          <p className="text-[9px] text-gray-400 truncate">{eff.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fine-Tuning Sliders: Pitch & Speed */}
                <div className="bg-[#101115] p-2.5 rounded-lg border border-[#232535] space-y-2.5">
                  <div>
                    <div className="flex justify-between items-center text-[11px] text-gray-400 mb-1">
                      <span className="flex items-center space-x-1">
                        <Sliders className="w-3 h-3 text-teal-400" />
                        <span>Nada Suara (Pitch):</span>
                      </span>
                      <span className="text-teal-400 font-mono text-[11px]">
                        {ttsPitch.toFixed(2)}x{' '}
                        <span className="text-[10px] text-gray-400 font-sans">
                          {ttsPitch < 0.85
                            ? '🎬 Berat / Deep'
                            : ttsPitch > 1.35
                              ? '🐿️ Kartun / Tupai'
                              : ttsPitch > 1.12
                                ? '🌸 Ceria / Anime'
                                : '🎙️ Normal'}
                        </span>
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.65"
                      max="1.6"
                      step="0.05"
                      value={ttsPitch}
                      onChange={(e) => {
                        setTtsPitch(parseFloat(e.target.value));
                        setSelectedVoiceEffect('custom');
                      }}
                      className="w-full accent-teal-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-[11px] text-gray-400 mb-1">
                      <span>Kecepatan Bicara (Speed):</span>
                      <span className="text-teal-400 font-mono text-[11px]">
                        {ttsSpeed.toFixed(2)}x{' '}
                        <span className="text-[10px] text-gray-400 font-sans">
                          {ttsSpeed < 0.9 ? '🌙 Lambat' : ttsSpeed > 1.15 ? '⚡ Cepat' : '🎙️ Normal'}
                        </span>
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.75"
                      max="1.5"
                      step="0.05"
                      value={ttsSpeed}
                      onChange={(e) => {
                        setTtsSpeed(parseFloat(e.target.value));
                        setSelectedVoiceEffect('custom');
                      }}
                      className="w-full accent-teal-400"
                    />
                  </div>

                  <div className="flex justify-end pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setTtsPitch(1.0);
                        setTtsSpeed(1.0);
                        setSelectedVoiceEffect('normal');
                      }}
                      className="text-[10px] text-gray-400 hover:text-teal-400 flex items-center space-x-1"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Reset Nada & Tempo</span>
                    </button>
                  </div>
                </div>

                {/* Option: Also create subtitle */}
                <label className="flex items-center space-x-2 text-xs text-gray-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={createSubtitleFromTTS}
                    onChange={(e) => setCreateSubtitleFromTTS(e.target.checked)}
                    className="rounded accent-teal-500"
                  />
                  <span className="text-[11px] text-teal-300 font-medium">
                    ✨ Otomatis buat subtitle sinkron per frasa (CapCut style)
                  </span>
                </label>

                {/* Action buttons */}
                <div className="flex space-x-2 pt-1">
                  <button
                    onClick={handlePreviewTTS}
                    disabled={isGeneratingTTS}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50 ${
                      isPreviewingSpeech
                        ? 'bg-red-500/20 border-red-500/50 text-red-300 hover:bg-red-500/30'
                        : 'bg-[#20222d] hover:bg-[#282a38] text-gray-200 border-[#2f3244]'
                    }`}
                    title={
                      isPreviewingSpeech
                        ? 'Klik untuk menghentikan audio preview'
                        : 'Tes mendengarkan sampel suara secara langsung'
                    }
                  >
                    {isPreviewingSpeech ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current text-red-400" />
                        <span>Berhenti</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current text-teal-400" />
                        <span>Tes Dengar</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleGenerateTTS}
                    disabled={!ttsText.trim() || isGeneratingTTS}
                    className="flex-1 py-2 bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-300 hover:to-cyan-400 text-black text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isGeneratingTTS ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{ttsStatus || 'Memproses...'}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate & Pasang Narasi</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[10px] text-gray-500 text-center">
                  Audio narasi otomatis disisipkan di detik ke-{formatTime(currentTime)} pada linimasa.
                </p>
              </div>
            )}

            {/* 2. REKAM MIC */}
            {narrationMode === 'mic' && (
              <div className="bg-[#171820] p-4 rounded-xl border border-[#252834] flex flex-col items-center justify-center text-center space-y-3">
                {isRecording ? (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-14 h-14 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center animate-pulse">
                      <Radio className="w-7 h-7 text-red-500" />
                    </div>
                    <span className="text-xs font-bold text-red-400">
                      Sedang Merekam: {formatTime(recordingDuration)}
                    </span>
                    <button
                      onClick={stopRecording}
                      className="flex items-center space-x-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-md transition-colors"
                    >
                      <StopCircle className="w-4 h-4" />
                      <span>Berhenti & Simpan</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <button
                      onClick={startRecording}
                      className="w-14 h-14 rounded-full bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-400 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-md"
                      title="Mulai Rekam Suara"
                    >
                      <Mic className="w-7 h-7" />
                    </button>
                    <span className="text-xs font-semibold text-gray-200">
                      Klik Mic untuk Mulai Rekam
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Audio akan disisipkan di posisi waktu saat ini ({formatTime(currentTime)})
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 3. UPLOAD AUDIO FILE */}
            {narrationMode === 'upload' && (
              <div className="bg-[#171820] p-3 rounded-xl border border-[#252834] space-y-2">
                <span className="text-xs font-semibold text-gray-300 block">
                  Pilih File Audio dari Komputer
                </span>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="hidden"
                />
                <button
                  onClick={() => audioInputRef.current?.click()}
                  className="w-full py-2 bg-[#20222d] hover:bg-[#282a38] text-teal-300 text-xs font-medium rounded-lg border border-[#2f3244] flex items-center justify-center space-x-2 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Audio (MP3/WAV)</span>
                </button>
              </div>
            )}

            {/* Voiceovers list */}
            <div className="space-y-2 flex-1 overflow-y-auto">
              <span className="text-xs font-semibold text-gray-300 block">
                Daftar Klip Narasi ({voiceovers.length})
              </span>
              {voiceovers.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-xs bg-[#171820] rounded-xl border border-[#252834]">
                  Belum ada narasi suara.
                </div>
              ) : (
                voiceovers.map((vo) => (
                  <div
                    key={vo.id}
                    className="bg-[#171820] p-2.5 rounded-xl border border-[#252834] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <Mic className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                        <span className="text-xs font-medium text-gray-200 truncate">
                          {vo.name}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setVoiceovers((prev) => prev.filter((v) => v.id !== vo.id))
                        }
                        className="text-gray-500 hover:text-red-400 p-1"
                        title="Hapus Narasi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="text-gray-400 block">Mulai di:</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={vo.startTime}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setVoiceovers((prev) =>
                              prev.map((v) => (v.id === vo.id ? { ...v, startTime: val } : v))
                            );
                          }}
                          className="w-full bg-[#101115] border border-[#2b2d3d] rounded px-2 py-0.5 text-gray-200 font-mono text-xs outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-gray-400 block">Volume: {Math.round(vo.volume * 100)}%</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={vo.volume}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setVoiceovers((prev) =>
                              prev.map((v) => (v.id === vo.id ? { ...v, volume: val } : v))
                            );
                          }}
                          className="w-full accent-teal-400 mt-1"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
