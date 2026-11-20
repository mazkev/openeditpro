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
