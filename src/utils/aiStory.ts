import type {
  StageTheme3D,
  StickmanCharacterStyle,
  SarungPattern,
  StickmanPose,
  StoryProp3D,
  Subtitle,
  VideoClip,
  Voiceover,
} from '../types/editor';
import { create3DClipThumbnail, ensureStoryImageLoaded } from './scene3d';
import { CARTOON_SFX_PRESETS, getCartoonSfxAudio, type CartoonSfxId } from './sfx';
import { generateStoryboardFromTopic } from './storyboard';

export interface WikiFactResult {
  title: string;
  sentences: string[];
  extract: string;
  imageUrl?: string;
}

interface AiSceneItem {
  pose?: string;
  prop?: string;
  theme?: string;
  badge?: string;
  subtitle?: string;
  imagePrompt?: string;
  dialogue?: boolean;
  partnerPose?: string;
  speaker?: string;
}

const VALID_POSES: StickmanPose[] = ['wave', 'explain', 'think', 'shock', 'point', 'walk', 'idle'];
const VALID_PROPS: StoryProp3D[] = [
  'none',
  'thought-question',
  'idea-bulb',
  'octopus-hearts',
  'planet-space',
  'comic-shock',
  'money-gold',
  'ancient-book',
  'magnifier',
  'fire-energy',
  'coffee-cup',
  'microphone',
  'earth-globe',
  'clock-time',
  'camera-flash',
  'trophy-star',
];
const VALID_THEMES: StageTheme3D[] = [
  'paper-sketch',
  'chalkboard',
  'cozy-room',
  'countryside',
  'cosmic',
  'dark-studio',
];

/**
 * Fetches real Indonesian facts and photo from Wikipedia Indonesia (100% free, no API key).
 */
export async function fetchWikipediaIndonesia(topic: string): Promise<WikiFactResult | null> {
  const clean = topic.trim();
  if (!clean) return null;

  try {
    const searchUrl = `https://id.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
      clean
    )}&limit=1&namespace=0&format=json&origin=*`;
    const searchResp = await fetch(searchUrl);
    if (!searchResp.ok) return null;
    const searchData = (await searchResp.json()) as [string, string[]];
    const matchedTitle = searchData?.[1]?.[0] || clean;

    const summaryUrl = `https://id.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      matchedTitle
    )}`;
    const sumResp = await fetch(summaryUrl);
    if (!sumResp.ok) return null;
    const sumData = (await sumResp.json()) as {
      title?: string;
      extract?: string;
      thumbnail?: { source?: string };
      originalimage?: { source?: string };
    };

    const extract = (sumData.extract || '').trim();
    if (!extract) return null;

    const rawSentences = extract
      .replace(/\([^)]*\)/g, '')
      .replace(/\s+/g, ' ')
      .match(/[^.!?]+[.!?]+/g);

    const sentences = (rawSentences || [extract])
      .map((s) => s.trim())
      .filter((s) => s.length > 15);

    const imageUrl = sumData.thumbnail?.source || sumData.originalimage?.source;

    return {
      title: sumData.title || matchedTitle,
      sentences,
      extract,
      imageUrl,
    };
  } catch {
    return null;
  }
}

/**
 * Fetches real, fast-loading topic photos from Wikimedia Commons (100% free, CORS-enabled).
 */
async function fetchWikimediaCommonsImages(topic: string, limit = 5): Promise<string[]> {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      topic
    )}&gsrnamespace=6&gsrlimit=${limit + 3}&prop=imageinfo&iiprop=url|mime&iiurlwidth=960&format=json&origin=*`;
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const data = (await resp.json()) as {
      query?: {
        pages?: Record<
          string,
          { imageinfo?: { thumburl?: string; url?: string; mime?: string }[] }
        >;
      };
    };
    const pages = Object.values(data.query?.pages || {});
    const urls: string[] = [];
    for (const p of pages) {
      const info = p.imageinfo?.[0];
      if (!info) continue;
      if (info.mime && !/(image\/jpeg|image\/png|image\/webp)/i.test(info.mime)) continue;
      const chosen = info.thumburl || info.url;
      if (chosen) urls.push(chosen);
      if (urls.length >= limit) break;
    }
    return urls;
  } catch {
    return [];
  }
}

/**
 * Builds a free AI illustration URL via Pollinations.ai (no API key required).
 */
export function buildFreeAiImageUrl(prompt: string, seed = 42): string {
  const enhancedPrompt = `${prompt}, colorful 2d educational cartoon illustration, clean outlines, vibrant storytelling art`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    enhancedPrompt
  )}?width=768&height=512&nologo=true&seed=${seed}`;
}

function buildLlmStoryboardPrompt(
  topic: string,
  wikiExtract: string | undefined,
  includeDialogue: boolean
): string {
  return `Kamu adalah penulis naskah video animasi edukasi Indonesia gaya "Kok Bisa?" yang santai, seru, akurat, dan menarik.
Buatkan storyboard 6 adegan untuk topik: "${topic}".
${wikiExtract ? `Gunakan fakta referensi berikut agar akurat:\n${wikiExtract.slice(0, 900)}\n` : ''}
Aturan ketat:
- Balas HANYA dengan JSON array berisi tepat 6 objek tanpa markdown backticks atau teks lain.
- Setiap objek punya field:
  - "pose": salah satu dari ["wave","think","explain","point","shock","walk"]
  - "prop": salah satu dari ["thought-question","idea-bulb","comic-shock","planet-space","money-gold","ancient-book","magnifier","fire-energy","coffee-cup","microphone","earth-globe","clock-time","camera-flash","trophy-star","none"]
  - "theme": salah satu dari ["paper-sketch","cozy-room","countryside"] (hindari latar gelap/hitam)
  - "badge": teks balon kata singkat max 3 kata huruf kapital (contoh: "KOK BISA?!")
  - "subtitle": 1 kalimat narasi bahasa Indonesia yang natural dan seru (max 18 kata)
  - "imagePrompt": deskripsi ilustrasi kartun dalam bahasa Inggris (5-10 kata) untuk adegan ini
  - "dialogue": ${includeDialogue ? 'true pada adegan 2 dan 5, false pada lainnya' : 'false'}
  - "speaker": "main" atau "partner" atau "both"
  - "partnerPose": salah satu dari ["think","shock","explain","wave","point"]`;
}

function parseAiScenesJson(rawText: string): AiSceneItem[] | null {
  try {
    const cleaned = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    const startIdx = cleaned.indexOf('[');
    const endIdx = cleaned.lastIndexOf(']');
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return null;
    const parsed = JSON.parse(cleaned.slice(startIdx, endIdx + 1));
    if (!Array.isArray(parsed) || parsed.length < 3) return null;
    return parsed.slice(0, 6) as AiSceneItem[];
  } catch {
    return null;
  }
}

async function callPollinationsTextLlm(prompt: string): Promise<AiSceneItem[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 14000);
  try {
    const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&json=true`;
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) return null;
    const text = await resp.text();
    return parseAiScenesJson(text);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function callGeminiLlm(prompt: string, apiKey: string): Promise<AiSceneItem[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 14000);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(
      apiKey.trim()
    )}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      }),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return parseAiScenesJson(text);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface FreeAiStoryboardOptions {
  topic: string;
  characterStyle: StickmanCharacterStyle;
  sarungPattern: SarungPattern;
  characterColor: string;
  includeDialogue: boolean;
  includeSfx: boolean;
  enableKaraoke: boolean;
  includeAiImages: boolean;
  geminiApiKey?: string;
  onStatus?: (msg: string) => void;
}

/**
 * Generates a 6-scene storyboard powered by real LLM AI:
 * - Uses Google Gemini 2.0 Flash if user provides a free Gemini API key,
 * - Otherwise uses Pollinations Text LLM (free, no API key required),
 * - Grounded with Wikipedia Indonesia facts + Pollinations AI images!
 */
export async function generateFreeAiStoryboard(opts: FreeAiStoryboardOptions): Promise<{
  clips: VideoClip[];
  subtitles: Subtitle[];
  sfxVoiceovers: Voiceover[];
  usedSource: 'gemini' | 'pollinations-llm' | 'wikipedia-template';
}> {
  const topic = opts.topic.trim() || 'Candi Borobudur';

  opts.onStatus?.('Mencari fakta di Wikipedia Indonesia...');
  const wiki = await fetchWikipediaIndonesia(topic);

  const prompt = buildLlmStoryboardPrompt(wiki?.title || topic, wiki?.extract, opts.includeDialogue);

  let aiScenes: AiSceneItem[] | null = null;
  let usedSource: 'gemini' | 'pollinations-llm' | 'wikipedia-template' = 'wikipedia-template';

  if (opts.geminiApiKey && opts.geminiApiKey.trim().length > 10) {
    opts.onStatus?.('Menulis naskah dengan Gemini AI...');
    aiScenes = await callGeminiLlm(prompt, opts.geminiApiKey);
    if (aiScenes) usedSource = 'gemini';
  }

  if (!aiScenes) {
    opts.onStatus?.('Menulis naskah dengan LLM AI Gratis...');
    aiScenes = await callPollinationsTextLlm(prompt);
    if (aiScenes) usedSource = 'pollinations-llm';
  }

  // Build base structure (ensuring valid clips/subtitles/SFX)
  const base = generateStoryboardFromTopic({
    topic: wiki?.title || topic,
    characterStyle: opts.characterStyle,
    sarungPattern: opts.sarungPattern,
    characterColor: opts.characterColor,
    includeDialogue: opts.includeDialogue,
    includeSfx: opts.includeSfx,
    enableKaraoke: opts.enableKaraoke,
  });

  const now = Date.now();
  const displayTitle = wiki?.title || topic;

  // Apply AI-authored scenes if LLM succeeded!
  if (aiScenes && aiScenes.length > 0) {
    aiScenes.forEach((sc, idx) => {
      const clip = base.clips[idx];
      const sub = base.subtitles[idx];
      if (!clip || !clip.scene3d || !sub) return;

      if (sc.pose && VALID_POSES.includes(sc.pose as StickmanPose)) {
        clip.scene3d.pose = sc.pose as StickmanPose;
      }
      if (sc.prop && VALID_PROPS.includes(sc.prop as StoryProp3D)) {
        clip.scene3d.storyProp = sc.prop as StoryProp3D;
      }
      if (sc.theme && VALID_THEMES.includes(sc.theme as StageTheme3D)) {
        const isSpaceTopic = /(planet|angkasa|bintang|galaksi|bulan|matahari|cosmic)/i.test(topic);
        const rawTheme = sc.theme as StageTheme3D;
        clip.scene3d.stageTheme =
          !isSpaceTopic && (rawTheme === 'cosmic' || rawTheme === 'dark-studio' || rawTheme === 'chalkboard')
            ? idx % 2 === 0
              ? 'paper-sketch'
              : 'cozy-room'
            : rawTheme;
      }
      if (sc.badge && typeof sc.badge === 'string') {
        clip.scene3d.factBadgeText = sc.badge.toUpperCase().slice(0, 26);
      }
      if (typeof sc.dialogue === 'boolean') {
        clip.scene3d.dialogueMode = sc.dialogue;
      }
      if (sc.partnerPose && VALID_POSES.includes(sc.partnerPose as StickmanPose)) {
        clip.scene3d.partnerPose = sc.partnerPose as StickmanPose;
      }
      if (sc.speaker === 'main' || sc.speaker === 'partner' || sc.speaker === 'both') {
        clip.scene3d.activeSpeaker = sc.speaker;
      }
      if (sc.subtitle && typeof sc.subtitle === 'string') {
        sub.text = sc.subtitle.trim();
      }
      clip.thumbnailUrl = create3DClipThumbnail(clip.scene3d);
    });
  } else if (wiki && wiki.sentences.length > 0) {
    // Fallback to Wikipedia sentences if LLM timed out
    const s1 = wiki.sentences[0];
    const s2 = wiki.sentences[1] || `Fakta menarik lainnya, ${displayTitle} memiliki sejarah panjang di Nusantara.`;
    const s3 = wiki.sentences[2] || `Tidak heran jika ${displayTitle} sangat terkenal!`;
    if (base.subtitles[1]) base.subtitles[1].text = s1.length > 135 ? `${s1.slice(0, 132)}...` : s1;
    if (base.subtitles[2]) base.subtitles[2].text = s2.length > 135 ? `${s2.slice(0, 132)}...` : s2;
    if (base.subtitles[3]) base.subtitles[3].text = s3.length > 135 ? `${s3.slice(0, 132)}...` : s3;
  }

  // Attach real Wikipedia/Wikimedia Commons photos and/or Free AI illustrations to scenes!
  if (opts.includeAiImages) {
    opts.onStatus?.('Menyiapkan foto & ilustrasi adegan...');
    const seedBase = now % 10000;
    const wikiImg = wiki?.imageUrl;
    const commonsImgs = await fetchWikimediaCommonsImages(displayTitle, 5);

    const p1 = aiScenes?.[1]?.imagePrompt || `${displayTitle} historical illustration`;
    const p2 = aiScenes?.[2]?.imagePrompt || `${displayTitle} scenic storytelling background`;
    const p3 = aiScenes?.[3]?.imagePrompt || `${displayTitle} detailed cultural scene`;
    const p4 = aiScenes?.[4]?.imagePrompt || `${displayTitle} dramatic climax illustration`;

    const aiImg1 = wikiImg || commonsImgs[0] || buildFreeAiImageUrl(p1, seedBase + 1);
    const aiImg2 = commonsImgs[1] || wikiImg || buildFreeAiImageUrl(p2, seedBase + 2);
    const aiImg3 = commonsImgs[2] || buildFreeAiImageUrl(p3, seedBase + 3);
    const aiImg4 = commonsImgs[3] || commonsImgs[0] || buildFreeAiImageUrl(p4, seedBase + 4);

    await Promise.race([
      Promise.all([aiImg1, aiImg2, aiImg3, aiImg4].map((u) => ensureStoryImageLoaded(u))),
      new Promise((resolve) => setTimeout(resolve, 7500)),
    ]);

    if (base.clips[1]?.scene3d) {
      base.clips[1].scene3d.customPropImageUrl = aiImg1;
      base.clips[1].thumbnailUrl = create3DClipThumbnail(base.clips[1].scene3d);
    }
    if (base.clips[2]?.scene3d) {
      base.clips[2].scene3d.customBackdropImageUrl = aiImg2;
      base.clips[2].thumbnailUrl = create3DClipThumbnail(base.clips[2].scene3d);
    }
    if (base.clips[3]?.scene3d) {
      base.clips[3].scene3d.customPropImageUrl = aiImg3;
      base.clips[3].thumbnailUrl = create3DClipThumbnail(base.clips[3].scene3d);
    }
    if (base.clips[4]?.scene3d) {
      base.clips[4].scene3d.customBackdropImageUrl = aiImg4;
      base.clips[4].thumbnailUrl = create3DClipThumbnail(base.clips[4].scene3d);
    }
  }

  // Re-sync SFX to final poses
  if (opts.includeSfx) {
    const sfxList: Voiceover[] = [];
    let cursor = 0;
    base.clips.forEach((c, idx) => {
      const dur = Math.max(0, c.trimEnd - c.trimStart);
      const pose: StickmanPose = c.scene3d?.pose || 'wave';
      const sfxId: CartoonSfxId =
        pose === 'shock'
          ? 'shock'
          : pose === 'think'
          ? 'bloop'
          : pose === 'explain'
          ? 'ding'
          : pose === 'point'
          ? 'whoosh'
          : pose === 'walk'
          ? 'sparkle'
          : 'pop';
      const preset = CARTOON_SFX_PRESETS.find((p) => p.id === sfxId)!;
      const { url, duration } = getCartoonSfxAudio(sfxId);
      sfxList.push({
        id: `vo-sfx-auto-${now}-${idx}`,
        name: `SFX: ${preset.icon} ${preset.name}`,
        url,
        duration,
        startTime: parseFloat(cursor.toFixed(2)),
        volume: 0.65,
      });
      const transOverlap =
        idx < base.clips.length - 1 && c.transition && c.transition.type !== 'none'
          ? Math.min(dur * 0.45, c.transition.duration)
          : 0;
      cursor += Math.max(0, dur - transOverlap);
    });
    base.sfxVoiceovers = sfxList;
  }

  opts.onStatus?.('');
  return {
    ...base,
    usedSource,
  };
}
