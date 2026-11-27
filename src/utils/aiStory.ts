import type {
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
import { create3DClipThumbnail, ensureStoryImageLoaded } from './scene3d';
import { CARTOON_SFX_PRESETS, getCartoonSfxAudio, type CartoonSfxId } from './sfx';
import { generateStoryboardFromTopic } from './storyboard';

export interface WikiFactResult {
  title: string;
  sentences: string[];
  imageUrl?: string;
}

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
      .replace(/\([^)]*\)/g, '') // remove parenthetical clutter for cleaner narration
      .replace(/\s+/g, ' ')
      .match(/[^.!?]+[.!?]+/g);

    const sentences = (rawSentences || [extract])
      .map((s) => s.trim())
      .filter((s) => s.length > 15);

    const imageUrl = sumData.thumbnail?.source || sumData.originalimage?.source;

    return {
      title: sumData.title || matchedTitle,
      sentences,
      imageUrl,
    };
  } catch {
    return null;
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

export interface FreeAiStoryboardOptions {
  topic: string;
  characterStyle: StickmanCharacterStyle;
  sarungPattern: SarungPattern;
  characterColor: string;
  includeDialogue: boolean;
  includeSfx: boolean;
  enableKaraoke: boolean;
  includeAiImages: boolean;
  onStatus?: (msg: string) => void;
}

/**
 * Generates a 6-scene storyboard powered by Wikipedia Indonesia (real facts + photo)
 * and free AI illustration images (Pollinations.ai) — 100% free with zero API key needed.
 */
export async function generateFreeAiStoryboard(opts: FreeAiStoryboardOptions): Promise<{
  clips: VideoClip[];
  subtitles: Subtitle[];
  sfxVoiceovers: Voiceover[];
  usedWikipediaTitle?: string;
}> {
  const topic = opts.topic.trim() || 'Candi Borobudur';

  opts.onStatus?.('Mencari fakta asli di Wikipedia Indonesia...');
  const wiki = await fetchWikipediaIndonesia(topic);

  // Start with smart structural template
  const base = generateStoryboardFromTopic({
    topic: wiki?.title || topic,
    characterStyle: opts.characterStyle,
    sarungPattern: opts.sarungPattern,
    characterColor: opts.characterColor,
    includeDialogue: opts.includeDialogue,
    includeSfx: opts.includeSfx,
    enableKaraoke: opts.enableKaraoke,
  });

  if (!wiki && !opts.includeAiImages) {
    return base;
  }

  const now = Date.now();
  const displayTitle = wiki?.title || topic;

  // Replace middle scenes' subtitles with real factual sentences from Wikipedia when available!
  if (wiki && wiki.sentences.length > 0) {
    const s1 = wiki.sentences[0];
    const s2 = wiki.sentences[1] || `Fakta menarik lainnya, ${displayTitle} memiliki sejarah panjang di Nusantara.`;
    const s3 = wiki.sentences[2] || `Tidak heran jika ${displayTitle} menjadi salah satu topik yang paling banyak dicari!`;

    if (base.subtitles[1]) {
      base.subtitles[1].text = s1.length > 135 ? `${s1.slice(0, 132)}...` : s1;
    }
    if (base.subtitles[2]) {
      base.subtitles[2].text = s2.length > 135 ? `${s2.slice(0, 132)}...` : s2;
    }
    if (base.subtitles[3]) {
      base.subtitles[3].text = s3.length > 135 ? `${s3.slice(0, 132)}...` : s3;
    }
  }

  // Attach real Wikipedia image and/or Free AI illustrations to scenes!
  if (opts.includeAiImages) {
    opts.onStatus?.('Menyiapkan foto & ilustrasi AI gratis...');
    const seedBase = now % 10000;
    const wikiImg = wiki?.imageUrl;
    const aiImg1 = buildFreeAiImageUrl(`${displayTitle} historical scene`, seedBase + 1);
    const aiImg2 = buildFreeAiImageUrl(`${displayTitle} close up detail`, seedBase + 2);

    const imgCandidates = [wikiImg || aiImg1, aiImg1, aiImg2].filter(Boolean) as string[];
    // Preload with a safe timeout so slow image servers never block the UI
    await Promise.race([
      Promise.all(imgCandidates.map((u) => ensureStoryImageLoaded(u))),
      new Promise((resolve) => setTimeout(resolve, 6000)),
    ]);

    // Attach to Scene 2 (Card), Scene 3 (Full Backdrop with Ken Burns), Scene 4 (Card)
    if (base.clips[1]?.scene3d) {
      base.clips[1].scene3d.customPropImageUrl = wikiImg || aiImg1;
      base.clips[1].thumbnailUrl = create3DClipThumbnail(base.clips[1].scene3d);
    }
    if (base.clips[2]?.scene3d) {
      base.clips[2].scene3d.customBackdropImageUrl = aiImg1;
      base.clips[2].thumbnailUrl = create3DClipThumbnail(base.clips[2].scene3d);
    }
    if (base.clips[3]?.scene3d) {
      base.clips[3].scene3d.customPropImageUrl = aiImg2;
      base.clips[3].thumbnailUrl = create3DClipThumbnail(base.clips[3].scene3d);
    }
  }

  // Ensure SFX stay synced
  if (opts.includeSfx && base.sfxVoiceovers.length === 0) {
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
      base.sfxVoiceovers.push({
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
  }

  opts.onStatus?.('');
  return {
    ...base,
    usedWikipediaTitle: wiki?.title,
  };
}

// Re-export unused types cleanly if needed
export type { StageTheme3D, StoryProp3D, TransitionType };
