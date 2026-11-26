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
  Music,
  Check,
  Disc,
  VolumeX,
  Box,
} from 'lucide-react';
import type {
  VideoClip,
  Subtitle,
  Watermark,
  Voiceover,
  WatermarkPosition,
  BackgroundMusic,
  TransitionType,
  StickmanPose,
  StickmanCharacterStyle,
  SarungPattern,
  CameraPreset3D,
  StageTheme3D,
  StoryProp3D,
  AmbientEffect3D,
  Scene3DConfig,
} from '../types/editor';
import {
  TRANSITION_PRESETS,
  STICKMAN_POSES,
  STICKMAN_STYLES,
  SARUNG_PATTERNS,
  STORY_PROPS_3D,
  AMBIENT_EFFECTS_3D,
  CAMERA_PRESETS_3D,
  STAGE_THEMES_3D,
  CHARACTER_COLORS_3D,
} from '../types/editor';
import { create3DClipThumbnail, ensureStoryImageLoaded } from '../utils/scene3d';
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
import {
  BGM_PRESETS,
  generateBgmAudio,
  playBgmPreview,
  stopBgmPreview,
  type BgmPreset,
} from '../utils/audioPresets';

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
    id: 'minimalist',
    name: 'Clean White (No BG)',
    preview: 'PUTIH',
    color: '#FFFFFF',
    bgColor: 'transparent',
    fontFamily: 'impact',
    strokeColor: '#000000',
    strokeWidth: 1.5,
    isUppercase: true,
  },
  {
    id: 'tiktok',
    name: 'TikTok Kuning (No BG)',
    preview: 'VIRAL',
    color: '#FACC15',
    bgColor: 'transparent',
    fontFamily: 'impact',
    strokeColor: '#000000',
    strokeWidth: 1.5,
    isUppercase: true,
  },
  {
    id: 'cyber',
    name: 'Cyber Neon (No BG)',
    preview: 'NEON',
    color: '#2DD4BF',
    bgColor: 'transparent',
    fontFamily: 'impact',
    strokeColor: '#0F766E',
    strokeWidth: 1.5,
    glowColor: '#14B8A6',
    isUppercase: true,
  },
  {
    id: 'aesthetic',
    name: 'Pastel Glow (No BG)',
    preview: 'PASTEL',
    color: '#F472B6',
    bgColor: 'transparent',
    fontFamily: 'cursive',
    strokeColor: '#701A75',
    strokeWidth: 2.5,
    glowColor: '#F472B6',
    isUppercase: false,
  },
  {
    id: 'cinematic',
    name: 'Cinematic Box',
    preview: 'BOX',
    color: '#F3F4F6',
    bgColor: 'rgba(0, 0, 0, 0.85)',
    fontFamily: 'sans',
    strokeColor: 'transparent',
    strokeWidth: 0,
    isUppercase: false,
  },
  {
    id: 'youtube',
    name: 'YouTube Red Box',
    preview: 'RED',
    color: '#FFFFFF',
    bgColor: '#DC2626',
    fontFamily: 'sans',
    strokeColor: 'transparent',
    strokeWidth: 0,
    isUppercase: true,
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
  bgm?: BackgroundMusic | null;
  setBgm?: React.Dispatch<React.SetStateAction<BackgroundMusic | null>>;
  activeTab?: TabType;
  setActiveTab?: (tab: TabType) => void;
  selectedTransitionCutIndex?: number;
  setSelectedTransitionCutIndex?: (idx: number) => void;
  onPlayPreview?: () => void;
  onExtractAudio?: (clipId: string) => void;
  onToggleMuteClip?: (clipId: string) => void;
}

export type TabType =
  | 'media'
  | 'studio3d'
  | 'edit'
  | 'transition'
  | 'subtitle'
  | 'watermark'
  | 'voiceover'
  | 'music';

const SidebarComponent: React.FC<SidebarProps> = ({
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
  bgm,
  setBgm,
  activeTab: controlledActiveTab,
  setActiveTab: controlledSetActiveTab,
  selectedTransitionCutIndex: controlledCutIdx,
  setSelectedTransitionCutIndex: controlledSetCutIdx,
  onPlayPreview,
  onExtractAudio,
  onToggleMuteClip,
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<TabType>('media');
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const setActiveTab = controlledSetActiveTab ?? setInternalActiveTab;

  // Selected transition cut index (0 means between clips[0] and clips[1])
  const [internalCutIdx, setInternalCutIdx] = useState(0);
  const activeCutIdx = controlledCutIdx ?? internalCutIdx;
  const setActiveCutIdx = controlledSetCutIdx ?? setInternalCutIdx;

  const [transitionCategory, setTransitionCategory] = useState<
    'all' | 'basic' | 'motion' | 'zoom' | 'wipe'
  >('all');

  // 3D Stickman Studio State
  const [characterStyle3d, setCharacterStyle3d] = useState<StickmanCharacterStyle>('blangkon');
  const [sarungPattern3d, setSarungPattern3d] = useState<SarungPattern>('plaid-red');
  const [pose3d, setPose3d] = useState<StickmanPose>('explain');
  const [prop3d, setProp3d] = useState<StoryProp3D>('thought-question');
  const [color3d, setColor3d] = useState('#f8fafc');
  const [theme3d, setTheme3d] = useState<StageTheme3D>('paper-sketch');
  const [camera3d, setCamera3d] = useState<CameraPreset3D>('presenter');
  const [duration3d, setDuration3d] = useState(5);
  const [speed3d, setSpeed3d] = useState(1.0);
  const [cartoonAnimType3d, setCartoonAnimType3d] = useState<'articulated' | 'photo-cutout'>('articulated');
  const [ambientEffect3d, setAmbientEffect3d] = useState<AmbientEffect3D>('auto');
  const [customPropImageUrl3d, setCustomPropImageUrl3d] = useState('');
  const [customBackdropImageUrl3d, setCustomBackdropImageUrl3d] = useState('');
  const [factBadge3d, setFactBadge3d] = useState('TAHUKAH KAMU?');
  const [mode3d, setMode3d] = useState<'stickman' | 'glb'>('stickman');
  const [glbUrl3d, setGlbUrl3d] = useState('');
  const [glbName3d, setGlbName3d] = useState('');
  const glbInputRef = useRef<HTMLInputElement>(null);
  const customPropInputRef = useRef<HTMLInputElement>(null);
  const customBackdropInputRef = useRef<HTMLInputElement>(null);
  const batchStoryImagesRef = useRef<HTMLInputElement>(null);
  const lastSynced3DClipIdRef = useRef<string | null>(null);
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
  const [ttsPlacementMode, setTtsPlacementMode] = useState<'start' | 'playhead'>('start');

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
  const bgmUploadRef = useRef<HTMLInputElement>(null);
  const watermarkImgRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  // BGM states
  const [bgmCategoryFilter, setBgmCategoryFilter] = useState<'all' | 'chill' | 'acoustic' | 'cinematic' | 'energy' | 'vlog'>('all');
  const [generatingBgmId, setGeneratingBgmId] = useState<string | null>(null);
  const [previewingBgmId, setPreviewingBgmId] = useState<string | null>(null);

  // Stop BGM preview on unmount
  useEffect(() => {
    return () => {
      stopBgmPreview();
    };
  }, []);

  const handlePreviewBgm = async (preset: BgmPreset) => {
    if (previewingBgmId === preset.id) {
      stopBgmPreview();
      setPreviewingBgmId(null);
      return;
    }

    stopBgmPreview();
    setGeneratingBgmId(preset.id);
    try {
      const { url } = await generateBgmAudio(preset.id);
      playBgmPreview(url, () => setPreviewingBgmId(null));
      setPreviewingBgmId(preset.id);
    } catch (err) {
      console.error('Failed to preview BGM:', err);
    } finally {
      setGeneratingBgmId(null);
    }
  };

  const handleApplyBgmPreset = async (preset: BgmPreset) => {
    if (!setBgm) return;
    setGeneratingBgmId(preset.id);
    try {
      const { url, duration } = await generateBgmAudio(preset.id);
      setBgm({
        id: `bgm-${preset.id}`,
        name: preset.name,
        url,
        duration,
        volume: bgm?.volume ?? 0.20,
        loop: true,
        category: preset.category,
      });
      stopBgmPreview();
      setPreviewingBgmId(null);
    } catch (err) {
      console.error('Failed to apply BGM:', err);
      alert('Gagal menerapkan musik latar');
    } finally {
      setGeneratingBgmId(null);
    }
  };

  const handleUploadBgm = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !setBgm) return;
    try {
      const { url, duration } = await processAudioFile(file);
      setBgm({
        id: `bgm-upload-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        url,
        duration,
        volume: bgm?.volume ?? 0.20,
        loop: true,
        category: 'custom',
      });
      stopBgmPreview();
      setPreviewingBgmId(null);
    } catch (err) {
      console.error('Failed to upload BGM:', err);
      alert('Gagal memproses file audio');
    } finally {
      if (bgmUploadRef.current) bgmUploadRef.current.value = '';
    }
  };

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
      } catch {
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
    } catch {
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
    } catch {
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
      bgColor: 'transparent',
      strokeColor: '#000000',
      strokeWidth: 3,
      fontFamily: 'impact',
      isUppercase: true,
      positionY: 82,
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
      let edgeVoice: string | undefined = undefined;

      if (ttsVoice.startsWith('sys-')) {
        lang = 'id';
        voiceLabel = ttsVoice.replace(/^sys-/, '').slice(0, 15);
      } else {
        const voiceObj = AVAILABLE_VOICES.find((v) => v.id === ttsVoice) || AVAILABLE_VOICES[0];
        lang = voiceObj.lang;
        voiceLabel = voiceObj.name.split(' ')[0];
        edgeVoice =
          voiceObj.edgeVoice ||
          (voiceObj.gender === 'female' ? 'id-ID-GadisNeural' : 'id-ID-ArdiNeural');

        const basePitch = voiceObj.defaultPitch ?? 1.0;
        const baseSpeed = voiceObj.defaultSpeed ?? 1.0;
        effectivePitch = basePitch * ttsPitch;
        effectiveSpeed = baseSpeed * ttsSpeed;
      }

      const { url, duration } = await generateTTSAudio(ttsText, lang, {
        pitch: effectivePitch,
        speed: effectiveSpeed,
        edgeVoice,
        onProgress: (msg) => setTtsStatus(msg),
      });

      // Placement offset: start from beginning (00:00) or from playhead (currentTime)
      const targetStart =
        ttsPlacementMode === 'start'
          ? 0
          : totalDuration > 0 && currentTime >= totalDuration - 0.2
            ? 0
            : currentTime;

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

  const handleNarrateSubtitles = async (singleSub?: Subtitle) => {
    const targets = (singleSub ? [singleSub] : subtitles).filter((s) => s.text.trim().length > 0);
    if (targets.length === 0) return;

    setIsGeneratingTTS(true);
    try {
      const voiceObj = AVAILABLE_VOICES.find((v) => v.id === ttsVoice) || AVAILABLE_VOICES[0];
      const lang = ttsVoice.startsWith('sys-') ? 'id' : voiceObj.lang;
      const voiceLabel = ttsVoice.startsWith('sys-')
        ? ttsVoice.replace(/^sys-/, '').slice(0, 15)
        : voiceObj.name.split(' ')[0];
      const edgeVoice = ttsVoice.startsWith('sys-')
        ? undefined
        : voiceObj.edgeVoice ||
          (voiceObj.gender === 'female' ? 'id-ID-GadisNeural' : 'id-ID-ArdiNeural');
      const effectivePitch = ttsVoice.startsWith('sys-')
        ? ttsPitch
        : (voiceObj.defaultPitch ?? 1.0) * ttsPitch;
      const effectiveSpeed = ttsVoice.startsWith('sys-')
        ? ttsSpeed
        : (voiceObj.defaultSpeed ?? 1.0) * ttsSpeed;

      const generatedVoiceovers: Voiceover[] = [];
      for (let i = 0; i < targets.length; i++) {
        const sub = targets[i];
        setTtsStatus(`Merekam narasi ${i + 1}/${targets.length}...`);
        const { url, duration } = await generateTTSAudio(sub.text, lang, {
          pitch: effectivePitch,
          speed: effectiveSpeed,
          edgeVoice,
        });
        generatedVoiceovers.push({
          id: `vo-sub-${sub.id}-${Date.now()}`,
          name: `Narasi [${voiceLabel}]: ${sub.text.slice(0, 22)}${sub.text.length > 22 ? '...' : ''}`,
          url,
          duration,
          startTime: parseFloat(Math.max(0, sub.startTime).toFixed(1)),
          volume: 1,
        });
      }

      setVoiceovers((prev) => {
        const targetSubIds = new Set(targets.map((s) => s.id));
        const filtered = prev.filter(
          (v) => !Array.from(targetSubIds).some((sid) => v.id.startsWith(`vo-sub-${sid}-`))
        );
        return [...filtered, ...generatedVoiceovers];
      });

      setTtsStatus('');
      if (setCurrentTime) setCurrentTime(targets[0].startTime);
    } catch (err: unknown) {
      console.error('Narrate subtitles error:', err);
      alert('Gagal menarasikan subtitle: ' + (err instanceof Error ? err.message : 'Terjadi kesalahan'));
    } finally {
      setIsGeneratingTTS(false);
    }
  };

  const selectedClip = clips.find((c) => c.id === selectedClipId);

  // Sync 3D studio controls when user selects a 3D clip on the timeline
  useEffect(() => {
    if (
      selectedClip?.clipType === '3d' &&
      selectedClip.scene3d &&
      selectedClip.id !== lastSynced3DClipIdRef.current
    ) {
      lastSynced3DClipIdRef.current = selectedClip.id;
      const s = selectedClip.scene3d;
      const dur = selectedClip.duration;
      queueMicrotask(() => {
        if (s.pose) setPose3d(s.pose);
        if (s.characterColor) setColor3d(s.characterColor);
        if (s.stageTheme) setTheme3d(s.stageTheme);
        if (s.cameraPreset) setCamera3d(s.cameraPreset);
        if (s.animationSpeed) setSpeed3d(s.animationSpeed);
        if (s.factBadgeText !== undefined) setFactBadge3d(s.factBadgeText);
        if (s.mode) setMode3d(s.mode);
        if (s.characterStyle) setCharacterStyle3d(s.characterStyle);
        if (s.sarungPattern) setSarungPattern3d(s.sarungPattern);
        if (s.storyProp) setProp3d(s.storyProp);
        if (s.cartoonAnimType) setCartoonAnimType3d(s.cartoonAnimType);
        if (s.ambientEffect) setAmbientEffect3d(s.ambientEffect);
        setCustomPropImageUrl3d(s.customPropImageUrl || '');
        setCustomBackdropImageUrl3d(s.customBackdropImageUrl || '');
        setDuration3d(dur);
      });
    }
  }, [selectedClip?.id, selectedClip?.clipType, selectedClip?.duration, selectedClip?.scene3d]);

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
          onClick={() => setActiveTab('studio3d')}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all relative ${
            activeTab === 'studio3d'
              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/60 shadow-sm'
              : 'text-gray-400 hover:text-cyan-300 hover:bg-[#1a1c24]'
          }`}
          title="Studio Kartun 2D Stickman Fakta Unik & 3D"
        >
          <Box className="w-5 h-5 mb-0.5 text-cyan-400" />
          <span className="text-[10px] font-bold">Kartun</span>
          {clips.some((c) => c.clipType === '3d') && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400" />
          )}
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
          onClick={() => setActiveTab('transition')}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all relative ${
            activeTab === 'transition'
              ? 'bg-purple-500/25 text-purple-400 border border-purple-500/50'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1c24]'
          }`}
          title="Efek Transisi Antar Klip Video"
        >
          <Sparkles className="w-5 h-5 mb-0.5 text-purple-400" />
          <span className="text-[10px] font-medium">Transisi</span>
          {clips.some((c) => c.transition && c.transition.type !== 'none') && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-purple-400 shadow-sm" />
          )}
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

        <button
          onClick={() => setActiveTab('music')}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${
            activeTab === 'music'
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1c24]'
          }`}
          title="Musik Latar (BGM)"
        >
          <Music className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium">Musik</span>
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

        {/* TAB: 3D STUDIO (STICKMAN FAKTA UNIK & GLB) */}
        {activeTab === 'studio3d' && (
          <div className="flex flex-col h-full overflow-y-auto pr-1 space-y-3.5">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-100 flex items-center space-x-1.5">
                  <Box className="w-4 h-4 text-cyan-400" />
                  <span>Studio Kartun 2D Stickman</span>
                </h2>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-semibold">
                  Fakta Unik Nusantara
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Animasi 2D Si Stickman Blangkon khas konten fakta unik & edukasi, lengkap dengan ilustrasi objek cerita dan balon kata.
              </p>
            </div>

            {/* 1-CLICK TEMPLATE PAKET 6 ADEGAN CERITA & FAKTA UNIK */}
            <div className="bg-gradient-to-br from-cyan-950/60 via-[#151c2c] to-purple-950/50 p-3 rounded-xl border border-cyan-500/40 shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-200 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Template Cerita Nusantara (6 Adegan)</span>
                </span>
                <span className="text-[10px] text-cyan-300/80 font-mono">22 detik</span>
              </div>
              <p className="text-[10px] text-gray-300 leading-relaxed">
                Langsung membuat 6 adegan lengkap (Sapaan → Berpikir → Penjelasan → Sejarah → Plot Twist → Penutup) lengkap dengan latar, properti, efek & subtitle.
              </p>
              <button
                type="button"
                onClick={() => {
                  const now = Date.now();
                  const scenes: {
                    cfg: Scene3DConfig;
                    label: string;
                    dur: number;
                    transition?: { type: TransitionType; duration: number };
                  }[] = [
                    {
                      label: '1. Pembuka (Menyapa)',
                      dur: 3.5,
                      transition: { type: 'fade', duration: 0.4 },
                      cfg: {
                        mode: 'stickman',
                        characterStyle: characterStyle3d,
                        sarungPattern: sarungPattern3d,
                        pose: 'wave',
                        storyProp: 'coffee-cup',
                        characterColor: color3d,
                        stageTheme: 'cozy-room',
                        cameraPreset: 'presenter',
                        animationSpeed: 1.0,
                        factBadgeText: 'HALO SOBAT!',
                        cartoonAnimType: 'articulated',
                        ambientEffect: 'music-notes',
                      },
                    },
                    {
                      label: '2. Pertanyaan (Berpikir)',
                      dur: 3.5,
                      transition: { type: 'slide-left', duration: 0.4 },
                      cfg: {
                        mode: 'stickman',
                        characterStyle: characterStyle3d,
                        sarungPattern: sarungPattern3d,
                        pose: 'think',
                        storyProp: 'thought-question',
                        characterColor: color3d,
                        stageTheme: 'paper-sketch',
                        cameraPreset: 'zoom-in',
                        animationSpeed: 1.0,
                        factBadgeText: 'KOK BISA?!',
                        cartoonAnimType: 'articulated',
                        ambientEffect: 'auto',
                      },
                    },
                    {
                      label: '3. Fakta Dunia (Jelaskan)',
                      dur: 4.0,
                      transition: { type: 'zoom-in', duration: 0.4 },
                      cfg: {
                        mode: 'stickman',
                        characterStyle: characterStyle3d,
                        sarungPattern: sarungPattern3d,
                        pose: 'explain',
                        storyProp: 'earth-globe',
                        characterColor: color3d,
                        stageTheme: 'chalkboard',
                        cameraPreset: 'presenter',
                        animationSpeed: 1.0,
                        factBadgeText: 'REMPAH NUSANTARA',
                        cartoonAnimType: 'articulated',
                        ambientEffect: 'sparkles',
                      },
                    },
                    {
                      label: '4. Catatan Sejarah (Menunjuk)',
                      dur: 3.8,
                      transition: { type: 'fade-white', duration: 0.35 },
                      cfg: {
                        mode: 'stickman',
                        characterStyle: characterStyle3d,
                        sarungPattern: sarungPattern3d,
                        pose: 'point',
                        storyProp: 'ancient-book',
                        characterColor: color3d,
                        stageTheme: 'countryside',
                        cameraPreset: 'pan',
                        animationSpeed: 1.0,
                        factBadgeText: 'CATATAN SEJARAH',
                        cartoonAnimType: 'articulated',
                        ambientEffect: 'auto',
                      },
                    },
                    {
                      label: '5. Plot Twist (Kaget)',
                      dur: 3.4,
                      transition: { type: 'zoom-out', duration: 0.4 },
                      cfg: {
                        mode: 'stickman',
                        characterStyle: characterStyle3d,
                        sarungPattern: sarungPattern3d,
                        pose: 'shock',
                        storyProp: 'comic-shock',
                        characterColor: color3d,
                        stageTheme: 'cosmic',
                        cameraPreset: 'low-angle',
                        animationSpeed: 1.1,
                        factBadgeText: 'MIND BLOWN!',
                        cartoonAnimType: 'articulated',
                        ambientEffect: 'auto',
                      },
                    },
                    {
                      label: '6. Penutup (Perayaan)',
                      dur: 3.8,
                      cfg: {
                        mode: 'stickman',
                        characterStyle: characterStyle3d,
                        sarungPattern: sarungPattern3d,
                        pose: 'walk',
                        storyProp: 'trophy-star',
                        characterColor: color3d,
                        stageTheme: 'countryside',
                        cameraPreset: 'presenter',
                        animationSpeed: 1.0,
                        factBadgeText: 'BANGGA INDONESIA!',
                        cartoonAnimType: 'articulated',
                        ambientEffect: 'confetti',
                      },
                    },
                  ];

                  const charLabel = characterStyle3d === 'blangkon' ? 'Stickman Blangkon' : 'Stickman';
                  const new3DClips: VideoClip[] = scenes.map((sc, idx) => ({
                    id: `3d-fact-${idx + 1}-${now}`,
                    name: `${charLabel} - ${sc.label}`,
                    url: '',
                    duration: sc.dur,
                    trimStart: 0,
                    trimEnd: sc.dur,
                    thumbnailUrl: create3DClipThumbnail(sc.cfg),
                    volume: 0,
                    speed: 1,
                    clipType: '3d',
                    scene3d: sc.cfg,
                    transition: sc.transition,
                  }));

                  setClips((prev) => [...prev, ...new3DClips]);
                  setSelectedClipId(new3DClips[0].id);

                  if (subtitles.length === 0) {
                    setSubtitles([
                      {
                        id: `sub-3d-1-${now}`,
                        text: 'Halo sobat! Tahu nggak kenapa Nusantara dulu diperebutkan dunia?',
                        startTime: 0.2,
                        endTime: 3.3,
                        fontSize: 24,
                        color: '#ffffff',
                        bgColor: 'rgba(15, 23, 42, 0.85)',
                        strokeColor: '#000000',
                        strokeWidth: 2,
                        fontFamily: 'impact',
                        isUppercase: true,
                        positionY: 82,
                      },
                      {
                        id: `sub-3d-2-${now}`,
                        text: 'Ternyata bukan cuma karena emas, tapi karena sesuatu di dapur kita!',
                        startTime: 3.6,
                        endTime: 6.8,
                        fontSize: 24,
                        color: '#38bdf8',
                        bgColor: 'rgba(15, 23, 42, 0.85)',
                        strokeColor: '#000000',
                        strokeWidth: 2,
                        fontFamily: 'impact',
                        isUppercase: true,
                        positionY: 82,
                      },
                      {
                        id: `sub-3d-3-${now}`,
                        text: 'Di abad ke-15, pala dan cengkeh Maluku lebih mahal daripada emas di Eropa!',
                        startTime: 7.1,
                        endTime: 10.8,
                        fontSize: 24,
                        color: '#fde047',
                        bgColor: 'rgba(15, 23, 42, 0.85)',
                        strokeColor: '#000000',
                        strokeWidth: 2,
                        fontFamily: 'impact',
                        isUppercase: true,
                        positionY: 82,
                      },
                      {
                        id: `sub-3d-4-${now}`,
                        text: 'Bahkan satu pulau kecil di Banda pernah ditukar dengan pulau di New York!',
                        startTime: 11.1,
                        endTime: 14.6,
                        fontSize: 24,
                        color: '#4ade80',
                        bgColor: 'rgba(15, 23, 42, 0.85)',
                        strokeColor: '#000000',
                        strokeWidth: 2,
                        fontFamily: 'impact',
                        isUppercase: true,
                        positionY: 82,
                      },
                      {
                        id: `sub-3d-5-${now}`,
                        text: 'Serius! Pulau Run di Maluku ditukar Belanda dengan Manhattan tahun 1667!',
                        startTime: 14.9,
                        endTime: 18.0,
                        fontSize: 24,
                        color: '#facc15',
                        bgColor: 'rgba(15, 23, 42, 0.85)',
                        strokeColor: '#000000',
                        strokeWidth: 2,
                        fontFamily: 'impact',
                        isUppercase: true,
                        positionY: 82,
                      },
                      {
                        id: `sub-3d-6-${now}`,
                        text: 'Sejarah Nusantara memang luar biasa! Yuk ikuti terus fakta seru lainnya!',
                        startTime: 18.3,
                        endTime: 21.8,
                        fontSize: 24,
                        color: '#ffffff',
                        bgColor: 'rgba(15, 23, 42, 0.85)',
                        strokeColor: '#000000',
                        strokeWidth: 2,
                        fontFamily: 'impact',
                        isUppercase: true,
                        positionY: 82,
                      },
                    ]);
                  }

                  if (setCurrentTime) setCurrentTime(0);
                  if (onPlayPreview) onPlayPreview();
                }}
                className="w-full py-2 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs rounded-lg transition-all shadow flex items-center justify-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Muat Template 6 Adegan Nusantara</span>
              </button>
            </div>

            {/* MODE SWITCH: STICKMAN 2D VS UPLOAD .GLB */}
            <div className="flex bg-[#101116] p-1 rounded-xl border border-[#232530]">
              <button
                type="button"
                onClick={() => setMode3d('stickman')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  mode3d === 'stickman'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                🎨 Stickman 2D
              </button>
              <button
                type="button"
                onClick={() => setMode3d('glb')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  mode3d === 'glb'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                📦 Upload .GLB/.GLTF
              </button>
            </div>

            {mode3d === 'stickman' ? (
              <div className="space-y-3">
                {/* MODE ANIMASI 2D: ARTIKULASI HIDUP VS CUTOUT STATIS */}
                <div className="bg-[#171820] p-2.5 rounded-xl border border-[#252834] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-200 block">
                      Tipe Gerakan Karakter 2D:
                    </span>
                    <span className="text-[10px] text-cyan-400 font-semibold">
                      {cartoonAnimType3d === 'articulated' ? 'Hidup Berartikulasi' : 'Kertas Statis'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCartoonAnimType3d('articulated')}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        cartoonAnimType3d === 'articulated'
                          ? 'bg-cyan-950/70 border-cyan-400 text-white ring-1 ring-cyan-400/50'
                          : 'bg-[#12131a] border-[#232532] text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center space-x-1">
                        <span>🎭</span>
                        <span>Animasi Hidup</span>
                      </div>
                      <p className="text-[9.5px] text-gray-400 mt-0.5 leading-tight">
                        Mata kedip, mulut bicara (lip-sync), lengan bertekuk melambai & menunjuk.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCartoonAnimType3d('photo-cutout')}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        cartoonAnimType3d === 'photo-cutout'
                          ? 'bg-cyan-950/70 border-cyan-400 text-white ring-1 ring-cyan-400/50'
                          : 'bg-[#12131a] border-[#232532] text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center space-x-1">
                        <span>📄</span>
                        <span>Cutout Foto</span>
                      </div>
                      <p className="text-[9.5px] text-gray-400 mt-0.5 leading-tight">
                        Foto potongan asli bergoyang (*flat paper cutout*).
                      </p>
                    </button>
                  </div>
                </div>

                {/* GAYA KARAKTER 3D */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-gray-200 block">
                    1. Gaya Karakter Stickman:
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {STICKMAN_STYLES.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setCharacterStyle3d(st.id)}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          characterStyle3d === st.id
                            ? 'bg-cyan-950/70 border-cyan-400 text-white ring-1 ring-cyan-400/50'
                            : 'bg-[#171820] border-[#252834] text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{st.icon}</span>
                            <span className="text-xs font-bold">{st.name}</span>
                          </div>
                          {st.id === 'blangkon' && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-bold">
                              Khas Fakta Unik
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">
                          {st.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* MOTIF SARUNG (HANYA JIKA GAYA BLANGKON AKTIF) */}
                {characterStyle3d === 'blangkon' && (
                  <div className="bg-[#171820] p-2.5 rounded-xl border border-[#252834] space-y-1.5">
                    <span className="text-xs font-semibold text-gray-200 block">
                      Motif Sarung Nusantara:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {SARUNG_PATTERNS.map((sp) => (
                        <button
                          key={sp.id}
                          type="button"
                          onClick={() => setSarungPattern3d(sp.id)}
                          className={`flex items-center space-x-2 p-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                            sarungPattern3d === sp.id
                              ? 'border-cyan-400 bg-cyan-950/60 text-white ring-1 ring-cyan-400/40'
                              : 'border-[#232532] bg-[#12131a] text-gray-300 hover:border-gray-600'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded border border-white/30 flex-shrink-0"
                            style={{ backgroundColor: sp.colorPreview }}
                          />
                          <span className="truncate">{sp.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* POSE / EKSPRESI */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-gray-200 block">
                    2. Pilih Pose / Gerakan Stickman:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {STICKMAN_POSES.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPose3d(p.id)}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          pose3d === p.id
                            ? 'bg-cyan-950/70 border-cyan-400 text-white ring-1 ring-cyan-400/50'
                            : 'bg-[#171820] border-[#252834] text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5">
                          <span className="text-base">{p.icon}</span>
                          <span className="text-xs font-bold truncate">{p.name}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                          {p.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* OBJEK ILUSTRASI CERITA (STORY PROPS) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-200 block">
                      3. Objek Ilustrasi Cerita:
                    </span>
                    <span className="text-[10px] text-cyan-400 font-semibold">
                      Elemen Pendukung Fakta
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {STORY_PROPS_3D.map((pr) => (
                      <button
                        key={pr.id}
                        type="button"
                        onClick={() => setProp3d(pr.id)}
                        className={`p-1.5 rounded-xl border text-left transition-all ${
                          prop3d === pr.id
                            ? 'bg-cyan-950/70 border-cyan-400 text-white ring-1 ring-cyan-400/50'
                            : 'bg-[#171820] border-[#252834] text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5">
                          <span className="text-base">{pr.icon}</span>
                          <span className="text-[11px] font-bold truncate">{pr.name}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                          {pr.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* EFEK KECIL & PARTIKEL */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-200 block">
                      3b. Efek Kecil & Partikel:
                    </span>
                    <span className="text-[10px] text-amber-400 font-semibold">
                      Micro-Animations
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {AMBIENT_EFFECTS_3D.map((fx) => (
                      <button
                        key={fx.id}
                        type="button"
                        onClick={() => setAmbientEffect3d(fx.id)}
                        className={`p-1.5 rounded-xl border text-left transition-all ${
                          ambientEffect3d === fx.id
                            ? 'bg-amber-950/60 border-amber-400 text-white ring-1 ring-amber-400/50'
                            : 'bg-[#171820] border-[#252834] text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5">
                          <span className="text-base">{fx.icon}</span>
                          <span className="text-[11px] font-bold truncate">{fx.name}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                          {fx.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* GAMBAR CERITA / SEJARAH (UPLOAD FOTO & MULTI-ADEGAN) */}
                <div className="bg-gradient-to-br from-emerald-950/40 via-[#171820] to-cyan-950/30 p-3 rounded-xl border border-emerald-500/35 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-200 block">
                      3c. Gambar Cerita / Sejarah:
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold">
                      Slide & Foto Asli
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-300 leading-relaxed">
                    Untuk video cerita (mis. Sejarah Indonesia), unggah foto pahlawan, peta, atau ilustrasi agar tampil di sebelah atau di belakang Stickman.
                  </p>

                  {/* Hidden File Inputs */}
                  <input
                    ref={customPropInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = URL.createObjectURL(file);
                      await ensureStoryImageLoaded(url);
                      setCustomPropImageUrl3d(url);
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={customBackdropInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = URL.createObjectURL(file);
                      await ensureStoryImageLoaded(url);
                      setCustomBackdropImageUrl3d(url);
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={batchStoryImagesRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;

                      const poseCycle: StickmanPose[] = ['think', 'explain', 'point', 'shock', 'wave'];
                      const transitionCycle: TransitionType[] = ['fade', 'slide-left', 'zoom-in'];
                      const now = Date.now();

                      const newClips: VideoClip[] = [];
                      for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        const url = URL.createObjectURL(file);
                        await ensureStoryImageLoaded(url);
                        const pose = poseCycle[i % poseCycle.length];
                        const sceneCfg: Scene3DConfig = {
                          mode: 'stickman',
                          characterStyle: characterStyle3d,
                          sarungPattern: sarungPattern3d,
                          pose,
                          storyProp: 'none',
                          customPropImageUrl: url,
                          characterColor: color3d,
                          stageTheme: theme3d || 'paper-sketch',
                          cameraPreset: i % 2 === 0 ? 'presenter' : 'zoom-in',
                          animationSpeed: speed3d,
                          cartoonAnimType: cartoonAnimType3d,
                          ambientEffect: ambientEffect3d,
                          factBadgeText: `BAGIAN ${i + 1}`,
                        };
                        const cleanName = file.name.replace(/\.[^/.]+$/, '').slice(0, 22);
                        newClips.push({
                          id: `story-img-${now}-${i}`,
                          name: `Cerita ${i + 1}: ${cleanName}`,
                          url: '',
                          duration: duration3d,
                          trimStart: 0,
                          trimEnd: duration3d,
                          thumbnailUrl: create3DClipThumbnail(sceneCfg),
                          volume: 0,
                          speed: 1,
                          clipType: '3d',
                          scene3d: sceneCfg,
                          transition:
                            i < files.length - 1
                              ? { type: transitionCycle[i % transitionCycle.length], duration: 0.4 }
                              : undefined,
                        });
                      }

                      setClips((prev) => [...prev, ...newClips]);
                      if (newClips.length > 0) setSelectedClipId(newClips[0].id);
                      e.target.value = '';
                    }}
                  />

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => customPropInputRef.current?.click()}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        customPropImageUrl3d
                          ? 'bg-emerald-900/50 border-emerald-400 text-white'
                          : 'bg-[#12131a] border-[#252834] text-gray-300 hover:border-emerald-500/60'
                      }`}
                    >
                      <div className="text-[11px] font-bold flex items-center justify-between">
                        <span>🖼️ Kartu Foto</span>
                        {customPropImageUrl3d && <span className="text-emerald-400">✓</span>}
                      </div>
                      <p className="text-[9.5px] text-gray-400 mt-0.5">
                        Foto di bingkai samping
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => customBackdropInputRef.current?.click()}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        customBackdropImageUrl3d
                          ? 'bg-emerald-900/50 border-emerald-400 text-white'
                          : 'bg-[#12131a] border-[#252834] text-gray-300 hover:border-emerald-500/60'
                      }`}
                    >
                      <div className="text-[11px] font-bold flex items-center justify-between">
                        <span>🌄 Latar Penuh</span>
                        {customBackdropImageUrl3d && <span className="text-emerald-400">✓</span>}
                      </div>
                      <p className="text-[9.5px] text-gray-400 mt-0.5">
                        Foto penuh di belakang
                      </p>
                    </button>
                  </div>

                  {(customPropImageUrl3d || customBackdropImageUrl3d) && (
                    <div className="flex items-center space-x-2 text-[10px]">
                      {customPropImageUrl3d && (
                        <button
                          type="button"
                          onClick={() => setCustomPropImageUrl3d('')}
                          className="text-red-400 hover:text-red-300 underline"
                        >
                          Hapus Kartu Foto
                        </button>
                      )}
                      {customBackdropImageUrl3d && (
                        <button
                          type="button"
                          onClick={() => setCustomBackdropImageUrl3d('')}
                          className="text-red-400 hover:text-red-300 underline"
                        >
                          Hapus Latar Penuh
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => batchStoryImagesRef.current?.click()}
                    className="w-full py-2 px-2.5 bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition-all shadow flex items-center justify-center space-x-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Banyak Gambar (Auto Adegan)</span>
                  </button>
                </div>

                {/* WARNA STICKMAN */}
                <div className="bg-[#171820] p-2.5 rounded-xl border border-[#252834] space-y-1.5">
                  <span className="text-xs font-semibold text-gray-200 block">
                    4. Warna Karakter Stickman:
                  </span>
                  <div className="flex items-center space-x-2">
                    {CHARACTER_COLORS_3D.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setColor3d(c.hex)}
                        title={c.name}
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${
                          color3d === c.hex
                            ? 'border-cyan-400 scale-115 ring-2 ring-cyan-400/40'
                            : 'border-gray-600 hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#171820] p-3 rounded-xl border border-[#252834] space-y-2">
                <span className="text-xs font-bold text-gray-200 block">
                  Upload Model 3D (.glb / .gltf):
                </span>
                <input
                  ref={glbInputRef}
                  type="file"
                  accept=".glb,.gltf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setGlbUrl3d(URL.createObjectURL(f));
                    setGlbName3d(f.name);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => glbInputRef.current?.click()}
                  className="w-full py-2.5 px-3 rounded-lg border border-dashed border-cyan-500/50 bg-cyan-950/20 hover:bg-cyan-950/40 text-xs text-cyan-300 font-semibold flex items-center justify-center space-x-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>{glbName3d ? `Terpilih: ${glbName3d}` : 'Pilih File .GLB / .GLTF'}</span>
                </button>
              </div>
            )}

            {/* PAPAN JUDUL / BALON KARTUN */}
            <div className="bg-[#171820] p-2.5 rounded-xl border border-[#252834] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-200 block">
                  Balon Judul / Fakta (Opsional):
                </span>
                <span className="text-[10px] text-gray-400">Balon Kartun</span>
              </div>
              <input
                type="text"
                value={factBadge3d}
                onChange={(e) => setFactBadge3d(e.target.value)}
                placeholder="Contoh: KOK BISA?! (kosongkan jika tidak perlu)"
                className="w-full bg-[#101116] border border-[#2b2d3d] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 outline-none focus:border-cyan-400"
              />
            </div>

            {/* TEMA LATAR PANGGUNG KARTUN & KAMERA */}
            <div className="bg-[#171820] p-2.5 rounded-xl border border-[#252834] space-y-2.5">
              <div>
                <span className="text-xs font-semibold text-gray-200 block mb-1.5">
                  Latar Panggung Kartun:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {STAGE_THEMES_3D.map((th) => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => setTheme3d(th.id)}
                      className={`flex items-center space-x-2 p-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                        theme3d === th.id
                          ? 'border-cyan-400 bg-cyan-950/60 text-white ring-1 ring-cyan-400/50'
                          : 'border-[#232532] bg-[#12131a] text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded border border-white/20 flex-shrink-0"
                        style={{ backgroundColor: th.bgPreview }}
                      />
                      <span className="truncate">{th.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-gray-200 block mb-1.5">
                  5. Gerakan Kamera 3D:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {CAMERA_PRESETS_3D.map((cam) => (
                    <button
                      key={cam.id}
                      type="button"
                      onClick={() => setCamera3d(cam.id)}
                      className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
                        camera3d === cam.id
                          ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                          : 'border-[#232532] bg-[#12131a] text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {cam.icon} {cam.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* DURASI & KECEPATAN */}
            <div className="bg-[#171820] p-2.5 rounded-xl border border-[#252834] space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-300 font-semibold">Durasi Adegan 3D:</span>
                <span className="text-cyan-300 font-mono font-bold">{duration3d} detik</span>
              </div>
              <input
                type="range"
                min="2"
                max="15"
                step="0.5"
                value={duration3d}
                onChange={(e) => setDuration3d(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
              <div className="flex justify-between text-xs pt-1">
                <span className="text-gray-300 font-semibold">Kecepatan Gerak:</span>
                <span className="text-cyan-300 font-mono font-bold">{speed3d.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speed3d}
                onChange={(e) => setSpeed3d(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* TOMBOL TAMBAH / UPDATE KE TIMELINE */}
            <div className="space-y-2 pb-2">
              <button
                type="button"
                onClick={() => {
                  if (mode3d === 'glb' && !glbUrl3d) {
                    alert('Silakan pilih file .glb / .gltf terlebih dahulu.');
                    return;
                  }
                  const sceneConfig: Scene3DConfig = {
                    mode: mode3d,
                    characterStyle: characterStyle3d,
                    sarungPattern: sarungPattern3d,
                    pose: pose3d,
                    storyProp: prop3d,
                    characterColor: color3d,
                    stageTheme: theme3d,
                    cameraPreset: camera3d,
                    animationSpeed: speed3d,
                    factBadgeText: factBadge3d.trim() || undefined,
                    cartoonAnimType: cartoonAnimType3d,
                    ambientEffect: ambientEffect3d,
                    customPropImageUrl: customPropImageUrl3d || undefined,
                    customBackdropImageUrl: customBackdropImageUrl3d || undefined,
                    glbUrl: mode3d === 'glb' ? glbUrl3d : undefined,
                  };
                  const poseLabel =
                    STICKMAN_POSES.find((p) => p.id === pose3d)?.name || 'Stickman';
                  const charLabel = characterStyle3d === 'blangkon' ? 'Stickman Blangkon' : 'Stickman';
                  const newClip: VideoClip = {
                    id: `3d-clip-${Date.now()}`,
                    name:
                      mode3d === 'glb'
                        ? `3D: ${glbName3d || 'Model'}`
                        : `2D ${charLabel} (${poseLabel})`,
                    url: '',
                    duration: duration3d,
                    trimStart: 0,
                    trimEnd: duration3d,
                    thumbnailUrl: create3DClipThumbnail(sceneConfig),
                    volume: 0,
                    speed: 1,
                    clipType: '3d',
                    scene3d: sceneConfig,
                  };
                  setClips((prev) => [...prev, newClip]);
                  setSelectedClipId(newClip.id);
                }}
                className="w-full py-2.5 px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow flex items-center justify-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Tambahkan Adegan Kartun ke Timeline</span>
              </button>

              {selectedClip?.clipType === '3d' && (
                <button
                  type="button"
                  onClick={() => {
                    const sceneConfig: Scene3DConfig = {
                      mode: mode3d,
                      characterStyle: characterStyle3d,
                      sarungPattern: sarungPattern3d,
                      pose: pose3d,
                      storyProp: prop3d,
                      characterColor: color3d,
                      stageTheme: theme3d,
                      cameraPreset: camera3d,
                      animationSpeed: speed3d,
                      factBadgeText: factBadge3d.trim() || undefined,
                      cartoonAnimType: cartoonAnimType3d,
                      ambientEffect: ambientEffect3d,
                      customPropImageUrl: customPropImageUrl3d || undefined,
                      customBackdropImageUrl: customBackdropImageUrl3d || undefined,
                      glbUrl:
                        mode3d === 'glb'
                          ? glbUrl3d || selectedClip.scene3d?.glbUrl
                          : undefined,
                    };
                    const poseLabel =
                      STICKMAN_POSES.find((p) => p.id === pose3d)?.name || 'Stickman';
                    const charLabel = characterStyle3d === 'blangkon' ? 'Stickman Blangkon' : 'Stickman';
                    setClips((prev) =>
                      prev.map((c) =>
                        c.id === selectedClip.id
                          ? {
                              ...c,
                              name:
                                mode3d === 'glb'
                                  ? `3D: ${glbName3d || 'Model'}`
                                  : `2D ${charLabel} (${poseLabel})`,
                              duration: duration3d,
                              trimStart: 0,
                              trimEnd: duration3d,
                              thumbnailUrl: create3DClipThumbnail(sceneConfig),
                              scene3d: sceneConfig,
                            }
                          : c
                      )
                    );
                  }}
                  className="w-full py-2 px-3 bg-[#20222e] hover:bg-[#282b3a] text-cyan-300 border border-cyan-500/40 font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Perbarui Klip Kartun yang Dipilih</span>
                </button>
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

                {/* Audio Asli Video & Pisahkan Suara */}
                <div className="bg-[#171820] p-3 rounded-xl border border-[#252834] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-200 flex items-center space-x-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-teal-400" />
                      <span>Suara Asli Video</span>
                    </span>
                    {(selectedClip.volume ?? 1) === 0 ? (
                      <span className="bg-red-500/20 text-red-300 border border-red-500/40 text-[9px] px-1.5 py-0.5 rounded font-semibold">
                        🔇 Dibisukan
                      </span>
                    ) : (
                      <span className="font-mono text-teal-400 text-xs font-bold">
                        {Math.round((selectedClip.volume ?? 1) * 100)}%
                      </span>
                    )}
                  </div>

                  {/* Volume Slider */}
                  <div>
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
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>0% (Hening)</span>
                      <span>50%</span>
                      <span>100% (Penuh)</span>
                    </div>
                  </div>

                  {/* 1-Click Mute / Unmute Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onToggleMuteClip) {
                        onToggleMuteClip(selectedClip.id);
                      } else {
                        const isMuted = (selectedClip.volume ?? 1) === 0;
                        setClips((prev) =>
                          prev.map((c) => (c.id === selectedClip.id ? { ...c, volume: isMuted ? 1 : 0 } : c))
                        );
                      }
                    }}
                    className={`w-full py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 border transition-all ${
                      (selectedClip.volume ?? 1) === 0
                        ? 'bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border-teal-500/50'
                        : 'bg-red-500/15 hover:bg-red-500/25 text-red-300 border-red-500/40'
                    }`}
                  >
                    {(selectedClip.volume ?? 1) === 0 ? (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-teal-400" />
                        <span>🔊 Aktifkan Kembali Suara Asli</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-red-400" />
                        <span>🔇 Bisukan Suara Asli Video</span>
                      </>
                    )}
                  </button>

                  <div className="pt-2 border-t border-[#252835]">
                    {/* Separate Audio Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (onExtractAudio) {
                          onExtractAudio(selectedClip.id);
                        }
                      }}
                      className="w-full py-2 bg-[#222533] hover:bg-[#2c3044] text-cyan-300 hover:text-cyan-200 text-xs font-bold rounded-lg border border-cyan-500/40 hover:border-cyan-500/70 flex items-center justify-center space-x-2 transition-all shadow-sm"
                      title="Ekstrak audio video ini ke trek audio terpisah agar bisa dihapus atau diedit"
                    >
                      <Scissors className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Pisahkan Audio Video (Extract)</span>
                    </button>
                    <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed text-center">
                      Audio akan dipindahkan ke trek audio di bawah, dan suara video otomatis dibisukan agar Anda bisa menghapus suaranya jika tidak diperlukan.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500 text-xs bg-[#171820] rounded-xl border border-[#252834]">
                Pilih sebuah klip video terlebih dahulu untuk memotong atau mengatur sambungan.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TRANSISI (SMOOTH TRANSITIONS) */}
        {activeTab === 'transition' && (
          <div className="flex flex-col h-full overflow-y-auto pr-1 space-y-3.5">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-200 flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Transisi Antar Video</span>
                </h2>
                {clips.length > 1 && (
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-medium">
                    {clips.filter((c) => c.transition && c.transition.type !== 'none').length} / {clips.length - 1} Aktif
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Tambahkan efek transisi mulus dan sinematik pada sambungan antar klip video.
              </p>
            </div>

            {clips.length < 2 ? (
              <div className="bg-[#171820] p-4 rounded-xl border border-[#252834] text-center space-y-2.5">
                <Sparkles className="w-8 h-8 text-purple-400/60 mx-auto animate-pulse" />
                <p className="text-xs font-bold text-gray-200">Memerlukan Minimal 2 Klip Video</p>
                <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                  Tambahkan atau potong klip video di timeline agar memiliki sambungan antar adegan untuk diberi transisi.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('media')}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition-all shadow"
                >
                  Buka Tab Media / Upload Video
                </button>
              </div>
            ) : (
              <>
                {/* 1. TARGET CUT SELECTOR */}
                <div className="bg-[#171820] p-3 rounded-xl border border-[#252834] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-200">Pilih Sambungan Klip:</span>
                    <span className="text-[10px] text-purple-300 font-mono">
                      Sambungan {activeCutIdx + 1} dari {clips.length - 1}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {Array.from({ length: clips.length - 1 }).map((_, idx) => {
                      const cA = clips[idx];
                      const cB = clips[idx + 1];
                      const isTarget = idx === activeCutIdx;
                      const cutTrans = cA?.transition?.type || 'none';
                      const presetObj = TRANSITION_PRESETS.find((p) => p.id === cutTrans);

                      return (
                        <button
                          key={`cut-select-${idx}`}
                          type="button"
                          onClick={() => {
                            setActiveCutIdx(idx);
                            // Move playhead to cut time
                            let cutTime = 0;
                            for (let i = 0; i <= idx; i++) {
                              cutTime += Math.max(0, clips[i].trimEnd - clips[i].trimStart);
                            }
                            if (setCurrentTime) {
                              setCurrentTime(Math.max(0, cutTime - 0.4));
                            }
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg text-left text-xs transition-all border ${
                            isTarget
                              ? 'bg-purple-950/60 border-purple-500/80 text-white shadow ring-1 ring-purple-500/40'
                              : 'bg-[#12131a] border-[#232532] text-gray-300 hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <span className="w-5 h-5 rounded bg-[#1e202d] flex items-center justify-center text-[10px] font-bold text-purple-300 flex-shrink-0">
                              {idx + 1}
                            </span>
                            <div className="truncate">
                              <span className="font-semibold text-gray-200 truncate">{cA.name}</span>
                              <span className="text-purple-400 mx-1">➡️</span>
                              <span className="font-semibold text-gray-200 truncate">{cB.name}</span>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full flex items-center space-x-1 font-semibold flex-shrink-0 ml-1.5 ${
                              cutTrans !== 'none'
                                ? 'bg-purple-500/25 text-purple-200 border border-purple-500/40'
                                : 'bg-gray-800 text-gray-400'
                            }`}
                          >
                            <span>{presetObj?.icon || '✂️'}</span>
                            <span>{cutTrans === 'none' ? 'Cut' : presetObj?.name.split(' ')[0]}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. DURATION SLIDER & TEST PREVIEW */}
                {(() => {
                  const targetClip = clips[activeCutIdx];
                  const currentTrans = targetClip?.transition || { type: 'none', duration: 0.5 };
                  const currentDuration = currentTrans.duration ?? 0.5;

                  const handleUpdateDuration = (newDur: number) => {
                    const clamped = Math.max(0.2, Math.min(1.5, Math.round(newDur * 10) / 10));
                    setClips((prev) =>
                      prev.map((c, i) =>
                        i === activeCutIdx
                          ? {
                              ...c,
                              transition: {
                                type: c.transition?.type || 'fade',
                                duration: clamped,
                              },
                            }
                          : c
                      )
                    );
                  };

                  const handleSelectTransition = (type: TransitionType) => {
                    setClips((prev) =>
                      prev.map((c, i) =>
                        i === activeCutIdx
                          ? {
                              ...c,
                              transition: {
                                type,
                                duration: currentDuration,
                              },
                            }
                          : c
                      )
                    );
                  };

                  const handleApplyToAll = () => {
                    if (
                      window.confirm(
                        `Terapkan transisi "${
                          TRANSITION_PRESETS.find((p) => p.id === currentTrans.type)?.name || 'ini'
                        }" (${currentDuration}s) ke SEMUA ${clips.length - 1} sambungan klip?`
                      )
                    ) {
                      setClips((prev) =>
                        prev.map((c, i) =>
                          i < prev.length - 1
                            ? {
                                ...c,
                                transition: {
                                  type: currentTrans.type === 'none' ? 'fade' : currentTrans.type,
                                  duration: currentDuration,
                                },
                              }
                            : c
                        )
                      );
                    }
                  };

                  const handlePreviewTransition = () => {
                    let cutTime = 0;
                    for (let i = 0; i <= activeCutIdx; i++) {
                      cutTime += Math.max(0, clips[i].trimEnd - clips[i].trimStart);
                    }
                    if (setCurrentTime) {
                      setCurrentTime(Math.max(0, cutTime - currentDuration - 0.2));
                    }
                    if (onPlayPreview) {
                      onPlayPreview();
                    }
                  };

                  const filteredPresets = TRANSITION_PRESETS.filter(
                    (p) => transitionCategory === 'all' || p.category === transitionCategory || p.id === 'none'
                  );

                  return (
                    <div className="space-y-3">
                      {/* DURATION & ACTIONS BAR */}
                      <div className="bg-[#171820] p-3 rounded-xl border border-[#252834] space-y-2.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-200 font-semibold flex items-center space-x-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                            <span>Durasi Efek Transisi:</span>
                          </span>
                          <span className="font-mono text-purple-300 font-bold bg-purple-950/60 border border-purple-500/40 px-2 py-0.5 rounded text-[11px]">
                            {currentDuration.toFixed(1)} detik
                          </span>
                        </div>

                        <input
                          type="range"
                          min="0.2"
                          max="1.5"
                          step="0.1"
                          value={currentDuration}
                          onChange={(e) => handleUpdateDuration(parseFloat(e.target.value))}
                          className="w-full accent-purple-400 cursor-pointer"
                        />

                        {/* Quick Duration Chips */}
                        <div className="flex items-center space-x-1.5 pt-0.5">
                          {[0.3, 0.5, 0.8, 1.0].map((dur) => (
                            <button
                              key={`chip-${dur}`}
                              type="button"
                              onClick={() => handleUpdateDuration(dur)}
                              className={`flex-1 py-1 text-[10px] rounded-md border font-semibold transition-all ${
                                Math.abs(currentDuration - dur) < 0.05
                                  ? 'bg-purple-600 text-white border-purple-400 shadow'
                                  : 'bg-[#12131a] text-gray-400 border-[#232530] hover:text-gray-200 hover:bg-[#1a1c24]'
                              }`}
                            >
                              {dur}s
                            </button>
                          ))}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center space-x-2 pt-1 border-t border-[#232530]">
                          <button
                            type="button"
                            onClick={handlePreviewTransition}
                            className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow"
                            title="Putar video tepat sebelum titik transisi untuk melihat hasilnya"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Uji Coba Transisi</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleApplyToAll}
                            className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 bg-[#20222e] hover:bg-[#282b3a] text-purple-300 border border-purple-500/40 hover:border-purple-500/70 rounded-lg text-xs font-semibold transition-all"
                            title="Terapkan efek transisi dan durasi ini ke seluruh sambungan di video"
                          >
                            <Check className="w-3 h-3" />
                            <span>Semua Klip</span>
                          </button>
                        </div>
                      </div>

                      {/* 3. CATEGORY FILTERS */}
                      <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-[11px]">
                        {[
                          { id: 'all', label: 'Semua' },
                          { id: 'basic', label: 'Dasar (Fade)' },
                          { id: 'motion', label: 'Gerakan (Slide)' },
                          { id: 'zoom', label: 'Zoom' },
                          { id: 'wipe', label: 'Wipe (Sapuan)' },
                        ].map((cat) => (
                          <button
                            key={`cat-${cat.id}`}
                            type="button"
                            onClick={() => setTransitionCategory(cat.id as any)}
                            className={`px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-all ${
                              transitionCategory === cat.id
                                ? 'bg-purple-500 text-white font-bold shadow'
                                : 'bg-[#171820] text-gray-400 hover:text-gray-200 border border-[#252834]'
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>

                      {/* 4. PRESET GRID CARDS */}
                      <div className="grid grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1">
                        {filteredPresets.map((preset) => {
                          const isSelected = currentTrans.type === preset.id;

                          return (
                            <button
                              key={`preset-${preset.id}`}
                              type="button"
                              onClick={() => handleSelectTransition(preset.id)}
                              className={`flex flex-col p-2.5 rounded-xl text-left transition-all border relative overflow-hidden group ${
                                isSelected
                                  ? 'bg-gradient-to-b from-purple-950/80 to-[#1e1b2e] border-purple-400 shadow-lg ring-2 ring-purple-500/50'
                                  : 'bg-[#171820] border-[#252834] hover:border-purple-500/50 hover:bg-[#1d1f2b]'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full mb-1">
                                <span className="text-xl group-hover:scale-110 transition-transform">
                                  {preset.icon}
                                </span>
                                {isSelected && (
                                  <span className="w-2 h-2 rounded-full bg-purple-400 shadow-sm" />
                                )}
                              </div>
                              <span
                                className={`text-xs font-bold leading-tight ${
                                  isSelected ? 'text-white' : 'text-gray-200'
                                }`}
                              >
                                {preset.name}
                              </span>
                              <span className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                                {preset.description}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* TAB 4: SUBTITLE */}
        {activeTab === 'subtitle' && (
          <div className="flex flex-col h-full overflow-y-auto pr-1">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-gray-200">Subtitle & Teks</h2>
              <div className="flex items-center space-x-1.5">
                {subtitles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Hapus SEMUA (${subtitles.length}) baris subtitle?`)) {
                        setSubtitles([]);
                      }
                    }}
                    className="flex items-center space-x-1 px-2 py-1 bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs rounded-lg border border-red-500/40 transition-colors font-medium"
                    title="Hapus semua baris subtitle sekaligus"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Hapus Semua ({subtitles.length})</span>
                  </button>
                )}
                <button
                  onClick={handleAddSubtitle}
                  className="flex items-center space-x-1 px-2 py-1 bg-[#202230] hover:bg-[#282a3c] text-gray-300 text-xs rounded-lg border border-[#2f3246] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Manual</span>
                </button>
              </div>
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

            {/* NARASIKAN SUBTITLE MENJADI SUARA AI (TTS) */}
            {subtitles.length > 0 && (
              <div className="p-3 bg-gradient-to-r from-indigo-950/60 to-purple-950/50 border border-indigo-500/40 rounded-xl mb-3 shadow-md space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-200 flex items-center space-x-1.5">
                    <Mic className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Narasikan Subtitle (Suara AI)</span>
                  </span>
                  <span className="text-[10px] text-indigo-300 font-mono">
                    {subtitles.length} baris
                  </span>
                </div>
                <p className="text-[10px] text-gray-300 leading-relaxed">
                  Ubah semua teks subtitle di bawah menjadi suara narasi otomatis sesuai waktunya di Timeline.
                </p>
                <div className="flex items-center space-x-1.5">
                  <select
                    value={ttsVoice}
                    onChange={(e) => setTtsVoice(e.target.value)}
                    className="flex-1 bg-[#101115] border border-indigo-500/30 rounded-lg px-2 py-1.5 text-[11px] text-gray-200 outline-none focus:border-indigo-400"
                  >
                    {AVAILABLE_VOICES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={isGeneratingTTS}
                    onClick={() => handleNarrateSubtitles()}
                    className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center space-x-1 shadow transition-all"
                  >
                    {isGeneratingTTS ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                    <span>{isGeneratingTTS ? 'Proses...' : 'Narasikan Semua'}</span>
                  </button>
                </div>
                {ttsStatus && (
                  <p className="text-[10px] text-indigo-300 font-medium animate-pulse">
                    {ttsStatus}
                  </p>
                )}
              </div>
            )}

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

            {/* GLOBAL SUBTITLE SETTINGS: UKURAN & BACKGROUND */}
            <div className="bg-[#171820] p-3 rounded-xl border border-[#252834] mb-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-200 flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-teal-400" />
                  <span>Ukuran & Latar Subtitle</span>
                </span>
                <span className="text-[10px] text-teal-400 font-mono">Semua Subtitle</span>
              </div>

              {/* Quick Background Toggles: Tanpa Background vs Background Box */}
              <div>
                <span className="text-[11px] text-gray-400 block mb-1.5">
                  Latar Belakang (Background):
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Remove background from all subtitles, set clean crisp stroke where white dominates!
                      setSubtitles((prev) =>
                        prev.map((s) => ({
                          ...s,
                          bgColor: 'transparent',
                          color: '#FFFFFF',
                          strokeColor: '#000000',
                          strokeWidth: 1.5,
                        }))
                      );
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 border transition-all ${
                      subtitles.length > 0 && subtitles.every((s) => s.bgColor === 'transparent')
                        ? 'bg-teal-500 text-black border-teal-400 shadow-sm'
                        : 'bg-[#121319] hover:bg-[#1a1c25] text-teal-300 border-teal-500/40'
                    }`}
                    title="Hilangkan background kotak pada semua subtitle (gaya TikTok/Reels)"
                  >
                    <span>🚫 Tanpa Background</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      // Apply dark transparent box to all subtitles
                      setSubtitles((prev) =>
                        prev.map((s) => ({
                          ...s,
                          bgColor: 'rgba(0, 0, 0, 0.75)',
                          strokeWidth: 0,
                        }))
                      );
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 border transition-all ${
                      subtitles.length > 0 &&
                      subtitles.some((s) => s.bgColor && s.bgColor !== 'transparent')
                        ? 'bg-[#252838] text-gray-200 border-gray-500 shadow-sm'
                        : 'bg-[#121319] hover:bg-[#1a1c25] text-gray-400 border-[#2b2d3e]'
                    }`}
                    title="Beri background kotak hitam transparan pada semua subtitle"
                  >
                    <span>⬛ Box Hitam</span>
                  </button>
                </div>
              </div>

              {/* Global Font Size Slider with - and + buttons */}
              <div>
                <div className="flex justify-between items-center text-[11px] text-gray-400 mb-1">
                  <span>Ukuran Huruf (Font Size):</span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSubtitles((prev) =>
                          prev.map((s) => ({
                            ...s,
                            fontSize: Math.max(16, (s.fontSize || 26) - 2),
                          }))
                        );
                      }}
                      className="px-2 py-0.5 bg-[#121319] hover:bg-[#20222e] text-gray-300 rounded border border-[#2c2f42] text-[10px] font-bold"
                      title="Perkecil semua subtitle (-2px)"
                    >
                      A-
                    </button>
                    <span className="text-teal-400 font-mono font-bold">
                      {subtitles[0]?.fontSize || 26}px
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSubtitles((prev) =>
                          prev.map((s) => ({
                            ...s,
                            fontSize: Math.min(56, (s.fontSize || 26) + 2),
                          }))
                        );
                      }}
                      className="px-2 py-0.5 bg-[#121319] hover:bg-[#20222e] text-gray-300 rounded border border-[#2c2f42] text-[10px] font-bold"
                      title="Perbesar semua subtitle (+2px)"
                    >
                      A+
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min="16"
                  max="52"
                  step="2"
                  value={subtitles[0]?.fontSize || 26}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setSubtitles((prev) => prev.map((s) => ({ ...s, fontSize: val })));
                  }}
                  className="w-full accent-teal-400"
                />
              </div>

              {/* Global Stroke Width Slider */}
              <div>
                <div className="flex justify-between items-center text-[11px] text-gray-400 mb-1">
                  <span>Tebal Garis Tepi (Stroke Outline):</span>
                  <span className="text-teal-400 font-mono text-[11px]">
                    {subtitles[0]?.strokeWidth ?? 1.5}px{' '}
                    <span className="text-[10px] text-gray-500 font-sans">
                      {(subtitles[0]?.strokeWidth ?? 1.5) === 0
                        ? '(Polos)'
                        : (subtitles[0]?.strokeWidth ?? 1.5) <= 1.5
                          ? '(Putih Dominan ✨)'
                          : '(Garis Tebal)'}
                    </span>
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="4"
                  step="0.5"
                  value={subtitles[0]?.strokeWidth ?? 1.5}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setSubtitles((prev) => prev.map((s) => ({ ...s, strokeWidth: val })));
                  }}
                  className="w-full accent-teal-400"
                />
              </div>

              {/* Global Position Y Slider */}
              <div>
                <div className="flex justify-between items-center text-[11px] text-gray-400 mb-1">
                  <span>Tinggi Posisi Subtitle di Layar:</span>
                  <span className="text-teal-400 font-mono text-[11px]">
                    {subtitles[0]?.positionY ?? 82}%{' '}
                    <span className="text-[10px] text-gray-500 font-sans">
                      {(subtitles[0]?.positionY ?? 82) > 75
                        ? '(Bawah)'
                        : (subtitles[0]?.positionY ?? 82) > 55
                          ? '(Tengah)'
                          : '(Atas)'}
                    </span>
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="92"
                  step="2"
                  value={subtitles[0]?.positionY ?? 82}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setSubtitles((prev) => prev.map((s) => ({ ...s, positionY: val })));
                  }}
                  className="w-full accent-teal-400"
                />
              </div>
            </div>

            <p className="text-[11px] text-gray-400 mb-3">
              Keterangan teks akan ditampilkan otomatis sesuai rentang waktu yang diatur:
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
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          disabled={isGeneratingTTS || !sub.text.trim()}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleNarrateSubtitles(sub);
                          }}
                          className="text-indigo-400 hover:text-indigo-300 disabled:opacity-40 p-1 rounded hover:bg-indigo-500/15 transition-colors"
                          title="Narasikan baris subtitle ini dengan suara AI"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
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

                {/* Posisi Mulai Narasi: Awal Video vs Garis Merah */}
                <div className="bg-[#101116] p-2.5 rounded-lg border border-[#232535] space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-300 font-semibold flex items-center space-x-1">
                      <span>Mulai Narasi di:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentTime && setCurrentTime(0)}
                      className="text-[10px] text-teal-400 hover:text-teal-300 underline font-medium"
                      title="Geser garis merah (playhead) langsung ke awal (00:00)"
                    >
                      ⏮️ Geser Garis ke Awal
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setTtsPlacementMode('start')}
                      className={`p-2 rounded-lg border text-left flex items-start space-x-1.5 transition-all ${
                        ttsPlacementMode === 'start'
                          ? 'bg-teal-500/20 border-teal-400 text-teal-200 shadow-sm font-bold'
                          : 'bg-[#15161f] border-[#252838] text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <span className="text-sm leading-none mt-0.5">⏮️</span>
                      <div className="min-w-0">
                        <p className="font-bold truncate">Awal Video (00:00)</p>
                        <p className="text-[9px] text-gray-400 truncate">Default / Disarankan</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTtsPlacementMode('playhead')}
                      className={`p-2 rounded-lg border text-left flex items-start space-x-1.5 transition-all ${
                        ttsPlacementMode === 'playhead'
                          ? 'bg-teal-500/20 border-teal-400 text-teal-200 shadow-sm font-bold'
                          : 'bg-[#15161f] border-[#252838] text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <span className="text-sm leading-none mt-0.5">🔴</span>
                      <div className="min-w-0">
                        <p className="font-bold truncate">Garis Merah</p>
                        <p className="text-[9px] text-gray-400 truncate">Detik {formatTime(currentTime)}</p>
                      </div>
                    </button>
                  </div>
                </div>

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
                  {ttsPlacementMode === 'start'
                    ? 'Audio narasi & subtitle otomatis dimulai dari detik 00:00 (Awal Video).'
                    : `Audio narasi & subtitle akan dimulai dari posisi garis merah (${formatTime(currentTime)}).`}
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
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">
                  Daftar Klip Narasi ({voiceovers.length})
                </span>
                {voiceovers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Hapus SEMUA (${voiceovers.length}) klip narasi suara?`)) {
                        setVoiceovers([]);
                      }
                    }}
                    className="text-[10px] text-red-400 hover:text-red-300 flex items-center space-x-1 hover:underline font-semibold"
                    title="Hapus semua klip narasi suara"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Hapus Semua ({voiceovers.length})</span>
                  </button>
                )}
              </div>

              {/* Combined Clear Button for Narration & Subtitles */}
              {(voiceovers.length > 0 || subtitles.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Hapus SEMUA (${voiceovers.length}) narasi suara DAN SEMUA (${subtitles.length}) baris subtitle sekaligus?`
                      )
                    ) {
                      setVoiceovers([]);
                      setSubtitles([]);
                    }
                  }}
                  className="w-full py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/35 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                  title="Hapus semua klip narasi dan subtitle sekaligus"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Hapus Semua Narasi & Subtitle Sekaligus</span>
                </button>
              )}
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

        {/* TAB 6: MUSIK LATAR (BGM) */}
        {activeTab === 'music' && (
          <div className="flex flex-col h-full overflow-y-auto pr-1 space-y-3.5">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-200 flex items-center space-x-1.5">
                  <Music className="w-4 h-4 text-purple-400" />
                  <span>Musik Latar (BGM)</span>
                </h2>
                {bgm && (
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-medium">
                    1 Musik Aktif
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Tambahkan musik latar bebas royalti untuk menghidupkan suasana video Anda.
              </p>
            </div>

            {/* ACTIVE BGM CARD */}
            {bgm ? (
              <div className="bg-gradient-to-br from-purple-950/40 via-[#181524] to-[#12131a] p-3 rounded-xl border border-purple-500/40 shadow-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center flex-shrink-0">
                      <Disc className="w-4 h-4 text-purple-300 animate-spin" style={{ animationDuration: '4s' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{bgm.name}</p>
                      <p className="text-[10px] text-purple-300/80">
                        {formatTime(bgm.duration)} · {bgm.loop ? '🔁 Loop Aktif' : 'Sekali Putar'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBgm && setBgm(null)}
                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Hapus Musik Latar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Volume Slider with Recommendation Note */}
                <div className="bg-[#101116]/80 p-2.5 rounded-lg border border-purple-900/40 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-300 font-medium flex items-center space-x-1">
                      <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                      <span>Volume Musik Latar:</span>
                    </span>
                    <span className="text-purple-300 font-mono font-bold">
                      {Math.round((bgm.volume ?? 0.2) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={bgm.volume ?? 0.2}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (setBgm) {
                        setBgm((prev) => (prev ? { ...prev, volume: val } : null));
                      }
                    }}
                    className="w-full accent-purple-400"
                  />
                  <div className="flex justify-between items-center text-[10px] text-gray-400 pt-0.5">
                    <span className="text-purple-300/90 font-medium">✨ Disarankan 15% - 25%</span>
                    <span>agar suara narasi tetap jelas</span>
                  </div>
                </div>

                {/* Loop Checkbox */}
                <label className="flex items-center space-x-2 text-[11px] text-gray-300 cursor-pointer pt-0.5">
                  <input
                    type="checkbox"
                    checked={bgm.loop ?? true}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      if (setBgm) {
                        setBgm((prev) => (prev ? { ...prev, loop: checked } : null));
                      }
                    }}
                    className="rounded accent-purple-400 w-3.5 h-3.5"
                  />
                  <span>🔁 Ulang Otomatis (Loop sepanjang durasi video)</span>
                </label>
              </div>
            ) : (
              <div className="bg-[#171820] p-3 rounded-xl border border-[#252834] text-center space-y-2">
                <Music className="w-8 h-8 text-gray-500 mx-auto" />
                <p className="text-xs font-medium text-gray-300">Belum ada musik latar aktif</p>
                <p className="text-[10px] text-gray-400">
                  Pilih salah satu lagu bebas royalti di bawah atau upload lagu favorit Anda.
                </p>
              </div>
            )}

            {/* UPLOAD CUSTOM AUDIO FILE */}
            <div className="bg-[#171820] p-3 rounded-xl border border-[#252834] space-y-2">
              <span className="text-xs font-semibold text-gray-200 block">
                Punya Lagu Sendiri? Upload di Sini
              </span>
              <input
                ref={bgmUploadRef}
                type="file"
                accept="audio/*"
                onChange={handleUploadBgm}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => bgmUploadRef.current?.click()}
                className="w-full py-2 bg-[#20222d] hover:bg-[#282a38] text-purple-300 text-xs font-semibold rounded-lg border border-purple-500/30 hover:border-purple-500/50 flex items-center justify-center space-x-2 transition-all shadow-sm"
              >
                <Upload className="w-3.5 h-3.5 text-purple-400" />
                <span>Upload File Musik (MP3 / WAV)</span>
              </button>
            </div>

            {/* PRESET ROYALTY-FREE MUSIC LIBRARY */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-200">
                  Koleksi Bebas Royalti (Siap Pakai):
                </span>
                <span className="text-[10px] text-purple-400 font-mono">
                  100% Free
                </span>
              </div>

              {/* Category Filter */}
              <div className="flex space-x-1 overflow-x-auto pb-1 text-[10px]">
                {[
                  { id: 'all', label: 'Semua (6)' },
                  { id: 'chill', label: '☕ Chill' },
                  { id: 'acoustic', label: '✨ Akustik' },
                  { id: 'cinematic', label: '🎬 Sinematik' },
                  { id: 'energy', label: '⚡ Energik' },
                  { id: 'vlog', label: '🎉 Vlog' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setBgmCategoryFilter(cat.id as typeof bgmCategoryFilter)}
                    className={`px-2.5 py-1 rounded-md whitespace-nowrap transition-colors font-medium ${
                      bgmCategoryFilter === cat.id
                        ? 'bg-purple-600 text-white font-semibold shadow-sm'
                        : 'bg-[#101115] text-gray-400 hover:text-gray-200 border border-[#262836]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Preset Cards List */}
              <div className="space-y-2">
                {BGM_PRESETS.filter(
                  (p) => bgmCategoryFilter === 'all' || p.category === bgmCategoryFilter
                ).map((preset) => {
                  const isCurrentActive = bgm?.id === `bgm-${preset.id}`;
                  const isPreviewing = previewingBgmId === preset.id;
                  const isGenerating = generatingBgmId === preset.id;

                  return (
                    <div
                      key={preset.id}
                      className={`p-2.5 rounded-xl border transition-all space-y-2 ${
                        isCurrentActive
                          ? 'bg-purple-950/30 border-purple-500/60 shadow-md ring-1 ring-purple-500/30'
                          : 'bg-[#171820] border-[#252834] hover:border-[#383c4e]'
                      }`}
                    >
                      <div className="flex items-start justify-between space-x-2">
                        <div className="flex items-start space-x-2 min-w-0">
                          <span className="text-xl leading-none mt-0.5">{preset.icon}</span>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5 flex-wrap">
                              <span className="text-xs font-bold text-gray-100">{preset.name}</span>
                              <span className="text-[9px] bg-[#101116] text-purple-300 px-1.5 py-0.5 rounded border border-[#2b2d3d] font-medium">
                                {preset.vibe}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                              {preset.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-[#232535]">
                        <span className="text-[10px] text-gray-400 font-mono">
                          ~{preset.duration}s Loop · {preset.bpm} BPM
                        </span>

                        <div className="flex items-center space-x-1.5">
                          {/* Preview / Listen button */}
                          <button
                            type="button"
                            onClick={() => handlePreviewBgm(preset)}
                            disabled={isGenerating}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center space-x-1 transition-colors ${
                              isPreviewing
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-[#222430] hover:bg-[#2c2f3e] text-gray-300 border border-[#303346]'
                            }`}
                          >
                            {isGenerating ? (
                              <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                            ) : isPreviewing ? (
                              <>
                                <Square className="w-3 h-3 text-amber-400 fill-amber-400" />
                                <span>Stop</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 text-purple-400 fill-purple-400" />
                                <span>Tes</span>
                              </>
                            )}
                          </button>

                          {/* Apply as BGM button */}
                          <button
                            type="button"
                            onClick={() => handleApplyBgmPreset(preset)}
                            disabled={isGenerating}
                            className={`px-3 py-1 rounded-md text-[11px] font-bold flex items-center space-x-1 transition-all ${
                              isCurrentActive
                                ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400'
                                : 'bg-purple-600/80 hover:bg-purple-500 text-white shadow-sm'
                            }`}
                          >
                            {isCurrentActive ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Dipakai</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>Gunakan</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const Sidebar = React.memo(SidebarComponent, (prevProps, nextProps) => {
  if (prevProps.clips !== nextProps.clips) return false;
  if (prevProps.selectedClipId !== nextProps.selectedClipId) return false;
  if (prevProps.subtitles !== nextProps.subtitles) return false;
  if (prevProps.watermark !== nextProps.watermark) return false;
  if (prevProps.voiceovers !== nextProps.voiceovers) return false;
  if (prevProps.activeTab !== nextProps.activeTab) return false;
  if (prevProps.bgm !== nextProps.bgm) return false;
  if (prevProps.totalDuration !== nextProps.totalDuration) return false;

  // Throttle currentTime updates in Sidebar during fast playback ticks to prevent UI stutter
  if (Math.abs(prevProps.currentTime - nextProps.currentTime) >= 0.5) return false;

  return true;
});
