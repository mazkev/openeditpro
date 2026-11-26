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

export type StickmanCharacterStyle = 'blangkon' | 'classic';

export type SarungPattern = 'plaid-red' | 'plaid-green' | 'batik-brown' | 'plain-black';

export type CameraPreset3D = 'presenter' | 'orbit' | 'zoom-in' | 'low-angle' | 'pan';

export type StageTheme3D =
  | 'paper-sketch'
  | 'chalkboard'
  | 'cozy-room'
  | 'countryside'
  | 'cosmic'
  | 'dark-studio'
  // Backward compatibility aliases
  | 'light-studio'
  | 'neon-cyber'
  | 'warm-sunset';

export type StoryProp3D =
  | 'none'
  | 'thought-question'
  | 'idea-bulb'
  | 'octopus-hearts'
  | 'planet-space'
  | 'comic-shock'
  | 'money-gold'
  | 'ancient-book'
  | 'magnifier'
  | 'fire-energy';

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
  characterStyle?: StickmanCharacterStyle;
  sarungPattern?: SarungPattern;
  storyProp?: StoryProp3D;
}

export const STORY_PROPS_3D: {
  id: StoryProp3D;
  name: string;
  icon: string;
  description: string;
}[] = [
  {
    id: 'thought-question',
    name: 'Balon Pikiran & Tanda Tanya',
    icon: '❓',
    description: 'Balon awan pikiran melayang ("Kok bisa?")',
  },
  {
    id: 'idea-bulb',
    name: 'Bohlam Ide Menyala',
    icon: '💡',
    description: 'Bohlam kuning bersinar terang dengan kilatan ide',
  },
  {
    id: 'octopus-hearts',
    name: 'Gurita & 3 Jantung',
    icon: '🐙',
    description: 'Gurita kartun & 3 jantung berdenyut (fakta biologi)',
  },
  {
    id: 'comic-shock',
    name: 'Ledakan Komik (Speed lines)',
    icon: '⚡',
    description: 'Garis kilatan aksi manga dramatis saat kaget',
  },
  {
    id: 'planet-space',
    name: 'Planet & Antariksa',
    icon: '🪐',
    description: 'Planet Saturnus bercincin & bintang sains',
  },
  {
    id: 'money-gold',
    name: 'Koin Emas & Pundi Uang',
    icon: '💰',
    description: 'Koin emas kartun berkilau & pundi uang',
  },
  {
    id: 'ancient-book',
    name: 'Buku / Naskah Kuno',
    icon: '📜',
    description: 'Buku kuno terbuka untuk cerita sejarah / mitologi',
  },
  {
    id: 'magnifier',
    name: 'Kaca Pembesar Rahasia',
    icon: '🔍',
    description: 'Lensa penyelidikan mengungkap fakta tersembunyi',
  },
  {
    id: 'fire-energy',
    name: 'Kobaran Api Semangat',
    icon: '🔥',
    description: 'Lidah api kartun berenergi membara',
  },
  {
    id: 'none',
    name: 'Tanpa Objek Tambahan',
    icon: '🚫',
    description: 'Fokus murni ke karakter & gerakan presenter',
  },
];

export const STICKMAN_STYLES: {
  id: StickmanCharacterStyle;
  name: string;
  icon: string;
  description: string;
}[] = [
  {
    id: 'blangkon',
    name: 'Si Stickman Blangkon (Nusantara)',
    icon: '👳‍♂️',
    description: 'Khas Fakta Unik Indonesia: Blangkon batik, sarung kotak-kotak & mata ekspresif',
  },
  {
    id: 'classic',
    name: 'Stickman Minimalis',
    icon: '🕺',
    description: 'Gaya stickman modern tanpa aksesoris blangkon & sarung',
  },
];

export const SARUNG_PATTERNS: {
  id: SarungPattern;
  name: string;
  colorPreview: string;
}[] = [
  { id: 'plaid-red', name: 'Kotak Marun (Khas Foto)', colorPreview: '#881337' },
  { id: 'plaid-green', name: 'Kotak Hijau Zamrud', colorPreview: '#065f46' },
  { id: 'batik-brown', name: 'Batik Parang Klasik', colorPreview: '#78350f' },
  { id: 'plain-black', name: 'Hitam Polos Elegan', colorPreview: '#1e293b' },
];

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
  description: string;
}[] = [
  {
    id: 'paper-sketch',
    name: 'Kertas Sketsa (Kok Bisa)',
    bgPreview: '#fbf9f4',
    description: 'Latar kertas putih-krem dengan bayangan pensil tangan',
  },
  {
    id: 'chalkboard',
    name: 'Papan Tulis Kelas',
    bgPreview: '#1b382b',
    description: 'Papan kapur hijau tua dengan doodle edukasi',
  },
  {
    id: 'cozy-room',
    name: 'Studio Kamar Santai',
    bgPreview: '#fdf6e2',
    description: 'Latar pastel hangat dengan siluet rak buku & jendela',
  },
  {
    id: 'countryside',
    name: 'Alam Pedesaan',
    bgPreview: '#bae6fd',
    description: 'Langit cerah & bukit kartun sawah nusantara',
  },
  {
    id: 'cosmic',
    name: 'Kosmik Sains',
    bgPreview: '#0f172a',
    description: 'Langit malam biru tua berbintang kartun',
  },
  {
    id: 'dark-studio',
    name: 'Studio Gelap Kontras',
    bgPreview: '#111827',
    description: 'Latar gelap pekat sinematik modern',
  },
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
