import type {
  Scene3DConfig,
  StageTheme3D,
  StickmanCharacterStyle,
  SarungPattern,
  StickmanPose,
  StoryProp3D,
  Subtitle,
  TransitionType,
  VideoClip,
  Voiceover,
} from '../types/editor';
import { create3DClipThumbnail } from './scene3d';
import { CARTOON_SFX_PRESETS, getCartoonSfxAudio, type CartoonSfxId } from './sfx';

export interface StoryboardOptions {
  topic: string;
  characterStyle: StickmanCharacterStyle;
  sarungPattern: SarungPattern;
  characterColor: string;
  includeDialogue: boolean;
  includeSfx: boolean;
  enableKaraoke: boolean;
}

type TopicCategory = 'history' | 'science' | 'nature' | 'general';

function detectCategory(topic: string): TopicCategory {
  const lower = topic.toLowerCase();
  if (
    /(sejarah|kerajaan|majapahit|sriwijaya|diponegoro|soekarno|proklamasi|kemerdekaan|candi|borobudur|prambanan|belanda|nusantara|pahlawan|kuno|abad|perang|kolonial|sumpah pemuda|kartini)/.test(
      lower
    )
  ) {
    return 'history';
  }
  if (
    /(planet|bumi|angkasa|bintang|matahari|bulan|langit|fisika|sains|kenapa|mengapa|otak|listrik|atom|gravitasi|galaksi|misteri|segitiga|teknologi|ai|internet)/.test(
      lower
    )
  ) {
    return 'science';
  }
  if (
    /(hewan|kucing|komodo|gurita|ikan|burung|hutan|alam|pohon|laut|dino|harimau|orangutan|gajah|lebah|semut|paus)/.test(
      lower
    )
  ) {
    return 'nature';
  }
  return 'general';
}

interface SceneBlueprint {
  label: string;
  dur: number;
  pose: StickmanPose;
  prop: StoryProp3D;
  theme: StageTheme3D;
  camera: Scene3DConfig['cameraPreset'];
  badge: string;
  subtitle: string;
  subColor: string;
  transition?: { type: TransitionType; duration: number };
  dialogue?: boolean;
  partnerPose?: StickmanPose;
  speaker?: 'main' | 'partner' | 'both';
  ambientEffect: Scene3DConfig['ambientEffect'];
}

export function generateStoryboardFromTopic(opts: StoryboardOptions): {
  clips: VideoClip[];
  subtitles: Subtitle[];
  sfxVoiceovers: Voiceover[];
} {
  const rawTopic = opts.topic.trim() || 'Fakta Unik Nusantara';
  const shortTopic = rawTopic.replace(/^(sejarah|fakta unik|rahasia|kenapa|mengapa)\s+/i, '').trim() || rawTopic;
  const upperBadge = shortTopic.toUpperCase().slice(0, 22);
  const category = detectCategory(rawTopic);

  let blueprints: SceneBlueprint[];

  if (category === 'history') {
    blueprints = [
      {
        label: '1. Pembuka Sejarah',
        dur: 3.6,
        pose: 'wave',
        prop: 'coffee-cup',
        theme: 'cozy-room',
        camera: 'presenter',
        badge: 'KISAH SEJARAH',
        subtitle: `Halo sobat! Pernah dengar kisah menarik di balik ${rawTopic}?`,
        subColor: '#ffffff',
        transition: { type: 'fade', duration: 0.4 },
        ambientEffect: 'music-notes',
      },
      {
        label: '2. Pertanyaan Masa Lalu',
        dur: 3.8,
        pose: 'think',
        prop: 'thought-question',
        theme: 'paper-sketch',
        camera: 'zoom-in',
        badge: 'KOK BISA?!',
        subtitle: `Banyak yang mengira ${shortTopic} cuma cerita biasa, padahal ada fakta besarnya!`,
        subColor: '#38bdf8',
        transition: { type: 'slide-left', duration: 0.4 },
        dialogue: opts.includeDialogue,
        partnerPose: 'think',
        speaker: 'partner',
        ambientEffect: 'auto',
      },
      {
        label: '3. Catatan Naskah Kuno',
        dur: 4.2,
        pose: 'explain',
        prop: 'ancient-book',
        theme: 'cozy-room',
        camera: 'presenter',
        badge: upperBadge,
        subtitle: `Dalam catatan sejarah, ${shortTopic} punya peran penting yang mengubah perjalanan Nusantara.`,
        subColor: '#fde047',
        transition: { type: 'zoom-in', duration: 0.4 },
        ambientEffect: 'sparkles',
      },
      {
        label: '4. Jangkauan Dunia',
        dur: 3.8,
        pose: 'point',
        prop: 'clock-time',
        theme: 'countryside',
        camera: 'pan',
        badge: 'JEJAK WAKTU',
        subtitle: `Jejak sejarah ${shortTopic} bahkan tercatat dan dikagumi hingga ke mancanegara.`,
        subColor: '#4ade80',
        transition: { type: 'fade-white', duration: 0.35 },
        ambientEffect: 'auto',
      },
      {
        label: '5. Fakta Mengejutkan',
        dur: 3.6,
        pose: 'shock',
        prop: 'comic-shock',
        theme: 'paper-sketch',
        camera: 'low-angle',
        badge: 'MIND BLOWN!',
        subtitle: `Dan yang paling bikin kaget, warisan ${shortTopic} masih bisa kita rasakan sampai hari ini!`,
        subColor: '#facc15',
        transition: { type: 'zoom-out', duration: 0.4 },
        dialogue: opts.includeDialogue,
        partnerPose: 'shock',
        speaker: 'both',
        ambientEffect: 'auto',
      },
      {
        label: '6. Penutup Inspiratif',
        dur: 3.8,
        pose: 'walk',
        prop: 'trophy-star',
        theme: 'countryside',
        camera: 'presenter',
        badge: 'BANGGA INDONESIA!',
        subtitle: `Luar biasa ya sejarah ${shortTopic}! Yuk bagikan kisah ini ke temanmu!`,
        subColor: '#ffffff',
        ambientEffect: 'confetti',
      },
    ];
  } else if (category === 'science') {
    blueprints = [
      {
        label: '1. Hook Penasaran',
        dur: 3.5,
        pose: 'wave',
        prop: 'thought-question',
        theme: 'paper-sketch',
        camera: 'presenter',
        badge: 'TAHUKAH KAMU?',
        subtitle: `Halo sobat! Pernah nggak kamu kepikiran soal ${rawTopic}?`,
        subColor: '#ffffff',
        transition: { type: 'fade', duration: 0.4 },
        ambientEffect: 'auto',
      },
      {
        label: '2. Tebakan Awal',
        dur: 3.6,
        pose: 'think',
        prop: 'magnifier',
        theme: 'cozy-room',
        camera: 'zoom-in',
        badge: 'MISTERI SAINS',
        subtitle: `Sekilas kelihatan sederhana, tapi secara ilmiah proses ${shortTopic} itu unik banget!`,
        subColor: '#38bdf8',
        transition: { type: 'slide-left', duration: 0.4 },
        dialogue: opts.includeDialogue,
        partnerPose: 'think',
        speaker: 'partner',
        ambientEffect: 'auto',
      },
      {
        label: '3. Penjelasan Ilmiah',
        dur: 4.2,
        pose: 'explain',
        prop: 'idea-bulb',
        theme: 'cozy-room',
        camera: 'presenter',
        badge: upperBadge,
        subtitle: `Para ilmuwan menemukan bahwa ${shortTopic} bekerja lewat reaksi alam yang sangat presisi.`,
        subColor: '#fde047',
        transition: { type: 'zoom-in', duration: 0.4 },
        ambientEffect: 'sparkles',
      },
      {
        label: '4. Skala Semesta',
        dur: 3.8,
        pose: 'point',
        prop: 'planet-space',
        theme: 'cosmic',
        camera: 'pan',
        badge: 'FAKTA SAINS',
        subtitle: `Fenomena ${shortTopic} ini terjadi terus-menerus dan memengaruhi kehidupan di bumi.`,
        subColor: '#4ade80',
        transition: { type: 'fade-white', duration: 0.35 },
        ambientEffect: 'auto',
      },
      {
        label: '5. Fakta Mindblown',
        dur: 3.5,
        pose: 'shock',
        prop: 'comic-shock',
        theme: 'paper-sketch',
        camera: 'low-angle',
        badge: 'LUAR BIASA!',
        subtitle: `Tanpa adanya ${shortTopic}, keseimbangan alam di sekitar kita bisa berubah drastis!`,
        subColor: '#facc15',
        transition: { type: 'zoom-out', duration: 0.4 },
        dialogue: opts.includeDialogue,
        partnerPose: 'shock',
        speaker: 'main',
        ambientEffect: 'auto',
      },
      {
        label: '6. Kesimpulan',
        dur: 3.6,
        pose: 'wave',
        prop: 'trophy-star',
        theme: 'paper-sketch',
        camera: 'presenter',
        badge: 'MAKIN PINTAR!',
        subtitle: `Sekarang kamu sudah tahu rahasia ${shortTopic}! Ikuti fakta seru lainnya ya!`,
        subColor: '#ffffff',
        ambientEffect: 'confetti',
      },
    ];
  } else if (category === 'nature') {
    blueprints = [
      {
        label: '1. Sapaan Alam',
        dur: 3.5,
        pose: 'wave',
        prop: 'earth-globe',
        theme: 'countryside',
        camera: 'presenter',
        badge: 'FAKTA ALAM',
        subtitle: `Halo sobat! Ada fakta unik banget tentang ${rawTopic} yang wajib kamu tahu!`,
        subColor: '#ffffff',
        transition: { type: 'fade', duration: 0.4 },
        ambientEffect: 'sparkles',
      },
      {
        label: '2. Pertanyaan Unik',
        dur: 3.6,
        pose: 'think',
        prop: 'thought-question',
        theme: 'paper-sketch',
        camera: 'zoom-in',
        badge: 'KOK BISA?!',
        subtitle: `Kenapa ${shortTopic} punya kemampuan yang berbeda dari makhluk hidup lainnya?`,
        subColor: '#38bdf8',
        transition: { type: 'slide-left', duration: 0.4 },
        dialogue: opts.includeDialogue,
        partnerPose: 'think',
        speaker: 'partner',
        ambientEffect: 'auto',
      },
      {
        label: '3. Rahasia Adaptasi',
        dur: 4.2,
        pose: 'explain',
        prop: 'magnifier',
        theme: 'cozy-room',
        camera: 'presenter',
        badge: upperBadge,
        subtitle: `Ternyata ${shortTopic} dibekali keunikan alami untuk bertahan hidup di habitatnya!`,
        subColor: '#fde047',
        transition: { type: 'zoom-in', duration: 0.4 },
        ambientEffect: 'auto',
      },
      {
        label: '4. Fakta Menarik',
        dur: 3.8,
        pose: 'point',
        prop: 'camera-flash',
        theme: 'countryside',
        camera: 'pan',
        badge: 'TERUNGKAP!',
        subtitle: `Peneliti bahkan terkejut saat merekam perilaku ${shortTopic} di alam liar.`,
        subColor: '#4ade80',
        transition: { type: 'fade-white', duration: 0.35 },
        ambientEffect: 'auto',
      },
      {
        label: '5. Plot Twist Alam',
        dur: 3.5,
        pose: 'shock',
        prop: 'comic-shock',
        theme: 'paper-sketch',
        camera: 'low-angle',
        badge: 'MIND BLOWN!',
        subtitle: `Faktanya, ${shortTopic} termasuk salah satu keajaiban alam paling langka di dunia!`,
        subColor: '#facc15',
        transition: { type: 'zoom-out', duration: 0.4 },
        dialogue: opts.includeDialogue,
        partnerPose: 'shock',
        speaker: 'both',
        ambientEffect: 'auto',
      },
      {
        label: '6. Penutup',
        dur: 3.6,
        pose: 'walk',
        prop: 'trophy-star',
        theme: 'countryside',
        camera: 'presenter',
        badge: 'LESTARIKAN ALAM!',
        subtitle: `Keren banget kan ${shortTopic}! Jangan lupa like dan bagikan ke temanmu!`,
        subColor: '#ffffff',
        ambientEffect: 'confetti',
      },
    ];
  } else {
    blueprints = [
      {
        label: '1. Pembuka Hangat',
        dur: 3.5,
        pose: 'wave',
        prop: 'coffee-cup',
        theme: 'cozy-room',
        camera: 'presenter',
        badge: 'HALO SOBAT!',
        subtitle: `Halo sobat! Sambil santai, yuk bahas fakta seru tentang ${rawTopic}!`,
        subColor: '#ffffff',
        transition: { type: 'fade', duration: 0.4 },
        ambientEffect: 'music-notes',
      },
      {
        label: '2. Pertanyaan Pemantik',
        dur: 3.6,
        pose: 'think',
        prop: 'thought-question',
        theme: 'paper-sketch',
        camera: 'zoom-in',
        badge: 'KOK BISA?!',
        subtitle: `Banyak orang sering dengar soal ${shortTopic}, tapi jarang tahu cerita aslinya!`,
        subColor: '#38bdf8',
        transition: { type: 'slide-left', duration: 0.4 },
        dialogue: opts.includeDialogue,
        partnerPose: 'think',
        speaker: 'partner',
        ambientEffect: 'auto',
      },
      {
        label: '3. Penjelasan Utama',
        dur: 4.2,
        pose: 'explain',
        prop: 'microphone',
        theme: 'cozy-room',
        camera: 'presenter',
        badge: upperBadge,
        subtitle: `Sebenarnya, di balik ${shortTopic} ada fakta unik yang bikin kita geleng-geleng kepala.`,
        subColor: '#fde047',
        transition: { type: 'zoom-in', duration: 0.4 },
        ambientEffect: 'sparkles',
      },
      {
        label: '4. Sorotan Bukti',
        dur: 3.8,
        pose: 'point',
        prop: 'money-gold',
        theme: 'cozy-room',
        camera: 'pan',
        badge: 'FAKTA MENARIK',
        subtitle: `Nilai dan pengaruh ${shortTopic} bahkan dikenal luas sampai ke berbagai negara.`,
        subColor: '#4ade80',
        transition: { type: 'fade-white', duration: 0.35 },
        ambientEffect: 'auto',
      },
      {
        label: '5. Plot Twist!',
        dur: 3.5,
        pose: 'shock',
        prop: 'comic-shock',
        theme: 'paper-sketch',
        camera: 'low-angle',
        badge: 'MIND BLOWN!',
        subtitle: `Yang paling mengejutkan, hal kecil dari ${shortTopic} ini berdampak besar bagi kita!`,
        subColor: '#facc15',
        transition: { type: 'zoom-out', duration: 0.4 },
        dialogue: opts.includeDialogue,
        partnerPose: 'shock',
        speaker: 'both',
        ambientEffect: 'auto',
      },
      {
        label: '6. Penutup Ceria',
        dur: 3.6,
        pose: 'walk',
        prop: 'trophy-star',
        theme: 'countryside',
        camera: 'presenter',
        badge: 'MANTAP!',
        subtitle: `Nah, itulah fakta unik ${shortTopic}! Ketemu lagi di cerita seru berikutnya ya!`,
        subColor: '#ffffff',
        ambientEffect: 'confetti',
      },
    ];
  }

  const now = Date.now();
  const charLabel = opts.characterStyle === 'blangkon' ? 'Stickman Blangkon' : 'Stickman';

  const clips: VideoClip[] = [];
  const subtitles: Subtitle[] = [];
  const sfxVoiceovers: Voiceover[] = [];

  let cursor = 0;

  blueprints.forEach((bp, idx) => {
    const cfg: Scene3DConfig = {
      mode: 'stickman',
      characterStyle: opts.characterStyle,
      sarungPattern: opts.sarungPattern,
      pose: bp.pose,
      storyProp: bp.prop,
      characterColor: opts.characterColor,
      stageTheme: bp.theme,
      cameraPreset: bp.camera,
      animationSpeed: bp.pose === 'shock' ? 1.1 : 1.0,
      factBadgeText: bp.badge,
      cartoonAnimType: 'articulated',
      ambientEffect: bp.ambientEffect,
      dialogueMode: Boolean(bp.dialogue),
      partnerPose: bp.partnerPose || 'think',
      activeSpeaker: bp.speaker || 'main',
    };

    clips.push({
      id: `story-clip-${idx + 1}-${now}`,
      name: `${charLabel} - ${bp.label}`,
      url: '',
      duration: bp.dur,
      trimStart: 0,
      trimEnd: bp.dur,
      thumbnailUrl: create3DClipThumbnail(cfg),
      volume: 0,
      speed: 1,
      clipType: '3d',
      scene3d: cfg,
      transition: bp.transition,
    });

    const transOverlap =
      idx < blueprints.length - 1 && bp.transition && bp.transition.type !== 'none'
        ? Math.min(bp.dur * 0.45, bp.transition.duration)
        : 0;

    subtitles.push({
      id: `sub-sb-${idx + 1}-${now}`,
      text: bp.subtitle,
      startTime: parseFloat((cursor + 0.15).toFixed(1)),
      endTime: parseFloat((cursor + bp.dur - 0.15).toFixed(1)),
      fontSize: 24,
      color: bp.subColor,
      bgColor: 'rgba(15, 23, 42, 0.85)',
      strokeColor: '#000000',
      strokeWidth: 2,
      fontFamily: 'impact',
      isUppercase: true,
      positionY: 82,
      karaokeHighlight: opts.enableKaraoke,
      karaokeColor: '#facc15',
    });

    if (opts.includeSfx) {
      const sfxId: CartoonSfxId =
        bp.pose === 'shock'
          ? 'shock'
          : bp.pose === 'think'
          ? 'bloop'
          : bp.pose === 'explain'
          ? 'ding'
          : bp.pose === 'point'
          ? 'whoosh'
          : bp.pose === 'walk'
          ? 'sparkle'
          : 'pop';
      const preset = CARTOON_SFX_PRESETS.find((p) => p.id === sfxId)!;
      const { url, duration } = getCartoonSfxAudio(sfxId);
      sfxVoiceovers.push({
        id: `vo-sfx-auto-${now}-${idx}`,
        name: `SFX: ${preset.icon} ${preset.name}`,
        url,
        duration,
        startTime: parseFloat(cursor.toFixed(2)),
        volume: 0.65,
      });
    }

    cursor += Math.max(0, bp.dur - transOverlap);
  });

  return { clips, subtitles, sfxVoiceovers };
}
