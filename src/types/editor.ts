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

export interface VideoClip {
  id: string;
  name: string;
  url: string; // Object URL or source URL
  duration: number; // Original duration in seconds
  trimStart: number; // Trim start offset in seconds
  trimEnd: number; // Trim end offset in seconds (effective duration = trimEnd - trimStart)
  thumbnailUrl?: string;
  volume: number; // 0 to 1
  speed: number; // 1.0 default
  transition?: VideoTransition; // Transition applied into the next clip on timeline
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
