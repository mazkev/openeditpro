export type TransitionType =
  | 'none'
  | 'fade'
  | 'fade-black'
  | 'fade-white'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'zoom-in'
  | 'zoom-out'
  | 'wipe-left'
  | 'wipe-right';

export interface VideoTransition {
  type: TransitionType;
  duration: number; // in seconds, default 0.5s (0.2s to 1.5s)
}

export interface TransitionPreset {
  id: TransitionType;
  name: string;
  category: 'basic' | 'motion' | 'zoom' | 'wipe';
  icon: string;
  description: string;
}

export const TRANSITION_PRESETS: TransitionPreset[] = [
  {
    id: 'none',
    name: 'Tanpa Transisi (Cut)',
    category: 'basic',
    icon: '✂️',
    description: 'Potongan langsung standar tanpa efek transisi',
  },
  {
    id: 'fade',
    name: 'Cross Dissolve',
    category: 'basic',
    icon: '🌫️',
    description: 'Peleburan halus bertahap antar video (transisi klasik)',
  },
  {
    id: 'fade-black',
    name: 'Dip to Black',
    category: 'basic',
    icon: '⬛',
    description: 'Memudar ke hitam lalu muncul video baru (gaya sinematik)',
  },
  {
    id: 'fade-white',
    name: 'Flash / Dip to White',
    category: 'basic',
    icon: '⚡',
    description: 'Kilatan cahaya putih dramatis & berenergi antar adegan',
  },
  {
    id: 'slide-left',
    name: 'Slide Kiri',
    category: 'motion',
    icon: '⬅️',
    description: 'Video baru masuk menggeser video lama ke arah kiri',
  },
  {
    id: 'slide-right',
    name: 'Slide Kanan',
    category: 'motion',
    icon: '➡️',
    description: 'Video baru masuk menggeser video lama ke arah kanan',
  },
  {
    id: 'slide-up',
    name: 'Slide Naik',
    category: 'motion',
    icon: '⬆️',
    description: 'Video baru bergeser mendorong video lama dari bawah ke atas',
  },
  {
    id: 'slide-down',
    name: 'Slide Turun',
    category: 'motion',
    icon: '⬇️',
    description: 'Video baru bergeser mendorong video lama dari atas ke bawah',
  },
  {
    id: 'zoom-in',
    name: 'Zoom In',
    category: 'zoom',
    icon: '🔍',
    description: 'Kamera melesat maju memperbesar klip baru secara dinamis',
  },
  {
    id: 'zoom-out',
    name: 'Zoom Out',
    category: 'zoom',
    icon: '🔎',
    description: 'Kamera bergerak mundur memperkecil klip baru secara dramatis',
  },
  {
    id: 'wipe-left',
    name: 'Wipe Kiri',
    category: 'wipe',
    icon: '◀️',
    description: 'Sapuan tirai mulus dari sisi kanan membuka ke kiri',
  },
  {
    id: 'wipe-right',
    name: 'Wipe Kanan',
    category: 'wipe',
    icon: '▶️',
    description: 'Sapuan tirai mulus dari sisi kiri membuka ke kanan',
  },
];

export type StickmanPose =
  | 'explain'
  | 'think'
  | 'shock'
  | 'point'
  | 'wave'
  | 'walk'
  | 'idle';

export type CameraPreset3D = 'presenter' | 'orbit' | 'zoom-in' | 'low-angle' | 'pan';

export type StageTheme3D = 'dark-studio' | 'light-studio' | 'neon-cyber' | 'warm-sunset';

export interface Scene3DConfig {
  mode: 'stickman' | 'glb';
  pose: StickmanPose;
  characterColor: string;
  stageTheme: StageTheme3D;
  cameraPreset: CameraPreset3D;
  animationSpeed: number;
  factBadgeText?: string;
  glbUrl?: string;
  glbAnimationIndex?: number;
}

export const STICKMAN_POSES: {
  id: StickmanPose;
  name: string;
  icon: string;
  description: string;
}[] = [
  {
    id: 'explain',
    name: 'Menjelaskan',
    icon: '🗣️',
    description: 'Gerakan tangan aktif ala presenter fakta unik',
  },
  {
    id: 'think',
    name: 'Berpikir',
    icon: '🤔',
    description: 'Tangan di dagu, cocok untuk kalimat tanya "Kok bisa?"',
  },
  {
    id: 'shock',
    name: 'Kaget / Mindblown',
    icon: '🤯',
    description: 'Melompat kaget saat fakta mencengangkan terungkap',
  },
  {
    id: 'point',
    name: 'Menunjuk',
    icon: '👉',
    description: 'Menunjuk ke atas/samping ke arah teks fakta',
  },
  {
    id: 'wave',
    name: 'Sapaan / Outro',
    icon: '👋',
    description: 'Melambaikan tangan ramah untuk pembuka/penutup',
  },
  {
    id: 'walk',
    name: 'Berjalan',
    icon: '🚶',
    description: 'Berjalan santai di tempat dengan ayunan alami',
  },
  {
    id: 'idle',
    name: 'Santai (Idle)',
    icon: '🧍',
    description: 'Berdiri tenang sambil bernapas & mengangguk ringan',
  },
];

export const CAMERA_PRESETS_3D: {
  id: CameraPreset3D;
  name: string;
  icon: string;
}[] = [
  { id: 'presenter', name: 'Fokus Presenter', icon: '🎥' },
  { id: 'orbit', name: 'Orbit Melingkar', icon: '🔄' },
  { id: 'zoom-in', name: 'Zoom Dramatis', icon: '🔍' },
  { id: 'low-angle', name: 'Hero Low-Angle', icon: '📐' },
  { id: 'pan', name: 'Geser Sinematik', icon: '↔️' },
];

export const STAGE_THEMES_3D: {
  id: StageTheme3D;
  name: string;
  bgPreview: string;
}[] = [
  { id: 'dark-studio', name: 'Studio Gelap', bgPreview: '#0f172a' },
  { id: 'neon-cyber', name: 'Neon Fakta', bgPreview: '#1e1b4b' },
  { id: 'light-studio', name: 'Studio Putih', bgPreview: '#e2e8f0' },
  { id: 'warm-sunset', name: 'Hangat Senja', bgPreview: '#451a03' },
];

export const CHARACTER_COLORS_3D: { name: string; hex: string }[] = [
  { name: 'Putih Klasik', hex: '#f8fafc' },
  { name: 'Biru Cyan', hex: '#38bdf8' },
  { name: 'Kuning Fakta', hex: '#facc15' },
  { name: 'Merah Energi', hex: '#fb7185' },
  { name: 'Hijau Mint', hex: '#34d399' },
  { name: 'Hitam Elegan', hex: '#1e293b' },
];

export interface VideoClip {
  id: string;
  name: string;
  url: string; // Object URL or source URL (empty string for procedural 3D clips)
  duration: number; // Original duration in seconds
  trimStart: number; // Trim start offset in seconds
  trimEnd: number; // Trim end offset in seconds (effective duration = trimEnd - trimStart)
  thumbnailUrl?: string;
  volume: number; // 0 to 1
  speed: number; // 1.0 default
  transition?: VideoTransition; // Transition applied into the next clip on timeline
  clipType?: 'video' | '3d';
  scene3d?: Scene3DConfig;
}

export interface Subtitle {
  id: string;
  text: string;
  startTime: number; // in seconds relative to timeline
  endTime: number; // in seconds relative to timeline
  fontSize: number; // e.g. 26
  color: string; // hex
  bgColor: string; // rgba
  positionY: number; // percentage from top (e.g. 80 for bottom)
  fontFamily?: 'sans' | 'impact' | 'serif' | 'mono' | 'cursive';
  strokeColor?: string;
  strokeWidth?: number;
  isUppercase?: boolean;
  glowColor?: string;
  stylePreset?: string;
}

export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export interface Watermark {
  enabled: boolean;
  type: 'text' | 'image';
  text: string;
  imageUrl?: string;
  position: WatermarkPosition;
  opacity: number; // 0 to 1
  scale: number; // 0.5 to 2
  color: string;
}

export interface Voiceover {
  id: string;
  name: string;
  url: string; // Object URL
  duration: number; // in seconds
  startTime: number; // placement on timeline in seconds
  volume: number; // 0 to 1
  trimStart?: number; // offset in source media file (for extracted video audio)
}

export interface BackgroundMusic {
  id: string;
  name: string;
  url: string; // Object URL or source URL
  duration: number; // in seconds
  volume: number; // 0 to 1 (default 0.20)
  loop: boolean; // default true
  category?: 'chill' | 'vlog' | 'cinematic' | 'acoustic' | 'energy' | 'custom';
}

export type AspectRatio = '16:9' | '9:16' | '1:1';

export type ExportResolution = '720p' | '1080p';
export type SharpenLevel = 'subtle' | 'high';

export interface ExportConfig {
  resolution: ExportResolution;
  sharpen: boolean;
  sharpenLevel: SharpenLevel;
}
