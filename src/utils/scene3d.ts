import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type {
  SarungPattern,
  Scene3DConfig,
  StageTheme3D,
  StickmanPose,
  StoryProp3D,
} from '../types/editor';

interface StickmanRig {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftEye: THREE.Group;
  rightEye: THREE.Group;
  leftBrow: THREE.Mesh;
  rightBrow: THREE.Mesh;
  mouth: THREE.Mesh;
  blangkonGroup: THREE.Group;
  sarungGroup: THREE.Group;
  sarungMesh: THREE.Mesh;
  sarungKnot: THREE.Mesh;
  sarungMaterial: THREE.MeshStandardMaterial;
  sarungKnotMaterial: THREE.MeshStandardMaterial;
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
  bodyMaterial: THREE.MeshStandardMaterial;
  stickMaterial: THREE.MeshStandardMaterial;
  outlineMaterial: THREE.MeshBasicMaterial;
}

const THEME_PALETTES: Record<
  StageTheme3D,
  { bg: number; fog: number; floor: number; grid: number; rim: number; key: number; isCartoon?: boolean }
> = {
  'paper-sketch': {
    bg: 0xfcfbf7,
    fog: 0xfcfbf7,
    floor: 0xfcfbf7,
    grid: 0xe5e7eb,
    rim: 0xffffff,
    key: 0xffffff,
    isCartoon: true,
  },
  'chalkboard': {
    bg: 0x183325,
    fog: 0x183325,
    floor: 0x142b20,
    grid: 0x274e3b,
    rim: 0xa7f3d0,
    key: 0xffffff,
    isCartoon: true,
  },
  'cozy-room': {
    bg: 0xfbf4e6,
    fog: 0xfbf4e6,
    floor: 0xf5ebd6,
    grid: 0xe8dcbf,
    rim: 0xfde68a,
    key: 0xffffff,
    isCartoon: true,
  },
  'countryside': {
    bg: 0xbae6fd,
    fog: 0xbae6fd,
    floor: 0x86efac,
    grid: 0x4ade80,
    rim: 0xfef08a,
    key: 0xffffff,
    isCartoon: true,
  },
  'cosmic': {
    bg: 0x090d16,
    fog: 0x090d16,
    floor: 0x0f172a,
    grid: 0x1e293b,
    rim: 0x38bdf8,
    key: 0xf8fafc,
    isCartoon: true,
  },
  'dark-studio': {
    bg: 0x0b1120,
    fog: 0x0b1120,
    floor: 0x111827,
    grid: 0x1e293b,
    rim: 0x38bdf8,
    key: 0xffffff,
    isCartoon: false,
  },
  // Backward compatibility aliases
  'light-studio': {
    bg: 0xfcfbf7,
    fog: 0xfcfbf7,
    floor: 0xfcfbf7,
    grid: 0xe5e7eb,
    rim: 0xffffff,
    key: 0xffffff,
    isCartoon: true,
  },
  'neon-cyber': {
    bg: 0x090d16,
    fog: 0x090d16,
    floor: 0x0f172a,
    grid: 0x1e293b,
    rim: 0x38bdf8,
    key: 0xf8fafc,
    isCartoon: true,
  },
  'warm-sunset': {
    bg: 0xfbf4e6,
    fog: 0xfbf4e6,
    floor: 0xf5ebd6,
    grid: 0xe8dcbf,
    rim: 0xfde68a,
    key: 0xffffff,
    isCartoon: true,
  },
};

/**
 * Procedural Batik Texture generator for the authentic Javanese Blangkon
 * Creates traditional Parang / Lereng diagonal motif with warm chocolate & gold tones.
 */
let cachedBatikTexture: THREE.CanvasTexture | null = null;
function getBatikBlangkonTexture(): THREE.CanvasTexture {
  if (cachedBatikTexture) return cachedBatikTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Warm deep batik base
  ctx.fillStyle = '#451a03';
  ctx.fillRect(0, 0, 512, 512);

  // Diagonal Parang Rusak / Lereng batik bands (45-degree angle)
  ctx.save();
  ctx.translate(256, 256);
  ctx.rotate(-Math.PI / 4);
  ctx.translate(-256, -256);

  const bandWidth = 44;
  for (let x = -200; x < 800; x += bandWidth) {
    const isAlt = Math.floor(x / bandWidth) % 2 === 0;
    ctx.fillStyle = isAlt ? '#78350f' : '#b45309';
    ctx.fillRect(x, -200, bandWidth, 1000);

    // Parang curved tongue / flames
    ctx.fillStyle = isAlt ? '#291003' : '#fed7aa';
    for (let y = -200; y < 1000; y += 32) {
      ctx.beginPath();
      ctx.arc(x + bandWidth * 0.35, y, 9, 0, Math.PI * 2);
      ctx.fill();

      // Gold highlight dot (ceplok / truntum)
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(x + bandWidth * 0.7, y + 16, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isAlt ? '#291003' : '#fed7aa';
    }

    ctx.strokeStyle = '#1e0c02';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, -200);
    ctx.lineTo(x, 1000);
    ctx.stroke();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  cachedBatikTexture = tex;
  return tex;
}

/**
 * Procedural Checkered Sarong Texture generator (matching traditional Indonesian sarung Wadimor/Gajah Duduk)
 */
const cachedSarungTextures = new Map<SarungPattern, THREE.CanvasTexture>();
function getSarungTexture(pattern: SarungPattern): THREE.CanvasTexture {
  const cached = cachedSarungTextures.get(pattern);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  if (pattern === 'plain-black') {
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, 498, 498);
  } else if (pattern === 'batik-brown') {
    return getBatikBlangkonTexture();
  } else {
    // Plaid Sarung (Red/Maroon as in photo, or Emerald Green)
    const isRed = pattern === 'plaid-red';
    const baseColor = isRed ? '#6b111a' : '#064e3b';
    const accentColor = isRed ? '#991b1b' : '#047857';

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);

    const step = 64;

    // Vertical stripes
    for (let x = 0; x < 512; x += step) {
      ctx.fillStyle = '#09090b';
      ctx.fillRect(x + 8, 0, 22, 512);

      ctx.fillStyle = accentColor;
      ctx.fillRect(x + 32, 0, 18, 512);

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(x + 52, 0, 4, 512);
      ctx.fillRect(x + 4, 0, 2, 512);
    }

    // Horizontal stripes with blend overlay
    ctx.save();
    ctx.globalAlpha = 0.72;
    for (let y = 0; y < 512; y += step) {
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, y + 8, 512, 22);

      ctx.fillStyle = accentColor;
      ctx.fillRect(0, y + 32, 512, 18);

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, y + 52, 512, 4);
      ctx.fillRect(0, y + 4, 512, 2);
    }
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  cachedSarungTextures.set(pattern, tex);
  return tex;
}

/**
 * 2D Cartoon Stickman Image Loader & Flood-Fill Cutout Generator
 * Extracts the authentic hand-drawn 2D stickman from the user reference photo
 */
let cachedStickmanCutoutTex: THREE.CanvasTexture | null = null;
let cachedStickmanOriginalTex: THREE.CanvasTexture | null = null;
let isStickmanLoading = false;
const stickmanLoadCallbacks: (() => void)[] = [];

function makeStickmanCutout(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(sourceCanvas, 0, 0);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Flood fill from outer borders to turn the off-white paper background transparent
  const visited = new Uint8Array(w * h);
  const queueX = new Int32Array(w * h);
  const queueY = new Int32Array(w * h);
  let qStart = 0;
  let qEnd = 0;

  const isBg = (idx: number) => {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    // Paper background is very light off-white (RGB > 218)
    return r > 218 && g > 215 && b > 208;
  };

  // Seed top and bottom borders
  for (let x = 0; x < w; x++) {
    const topIdx = x * 4;
    if (isBg(topIdx)) {
      queueX[qEnd] = x;
      queueY[qEnd] = 0;
      qEnd++;
      visited[x] = 1;
    }
    const botIdx = ((h - 1) * w + x) * 4;
    if (isBg(botIdx)) {
      queueX[qEnd] = x;
      queueY[qEnd] = h - 1;
      qEnd++;
      visited[(h - 1) * w + x] = 1;
    }
  }

  // Seed left and right borders
  for (let y = 0; y < h; y++) {
    const leftIdx = y * w * 4;
    if (isBg(leftIdx) && !visited[y * w]) {
      queueX[qEnd] = 0;
      queueY[qEnd] = y;
      qEnd++;
      visited[y * w] = 1;
    }
    const rightIdx = (y * w + (w - 1)) * 4;
    if (isBg(rightIdx) && !visited[y * w + (w - 1)]) {
      queueX[qEnd] = w - 1;
      queueY[qEnd] = y;
      qEnd++;
      visited[y * w + (w - 1)] = 1;
    }
  }

  // BFS Flood-fill
  while (qStart < qEnd) {
    const qx = queueX[qStart];
    const qy = queueY[qStart];
    qStart++;

    const pIdx = (qy * w + qx) * 4;
    data[pIdx + 3] = 0; // Transparent!

    // 4-neighborhood
    const nx0 = qx + 1;
    if (nx0 < w) {
      const nPos = qy * w + nx0;
      if (!visited[nPos]) {
        visited[nPos] = 1;
        if (isBg(nPos * 4)) {
          queueX[qEnd] = nx0;
          queueY[qEnd] = qy;
          qEnd++;
        }
      }
    }
    const nx1 = qx - 1;
    if (nx1 >= 0) {
      const nPos = qy * w + nx1;
      if (!visited[nPos]) {
        visited[nPos] = 1;
        if (isBg(nPos * 4)) {
          queueX[qEnd] = nx1;
          queueY[qEnd] = qy;
          qEnd++;
        }
      }
    }
    const ny0 = qy + 1;
    if (ny0 < h) {
      const nPos = ny0 * w + qx;
      if (!visited[nPos]) {
        visited[nPos] = 1;
        if (isBg(nPos * 4)) {
          queueX[qEnd] = qx;
          queueY[qEnd] = ny0;
          qEnd++;
        }
      }
    }
    const ny1 = qy - 1;
    if (ny1 >= 0) {
      const nPos = ny1 * w + qx;
      if (!visited[nPos]) {
        visited[nPos] = 1;
        if (isBg(nPos * 4)) {
          queueX[qEnd] = qx;
          queueY[qEnd] = ny1;
          qEnd++;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return c;
}

function loadStickmanTextures(onReady?: () => void) {
  if (cachedStickmanCutoutTex && cachedStickmanOriginalTex) {
    if (onReady) onReady();
    return;
  }
  if (onReady) stickmanLoadCallbacks.push(onReady);
  if (isStickmanLoading) return;
  isStickmanLoading = true;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = '/stickman/stickman-blangkon.jpg';

  img.onload = () => {
    try {
      const origCanvas = document.createElement('canvas');
      origCanvas.width = img.naturalWidth || 1024;
      origCanvas.height = img.naturalHeight || 571;
      const origCtx = origCanvas.getContext('2d');
      if (origCtx) {
        origCtx.drawImage(img, 0, 0);

        const origTex = new THREE.CanvasTexture(origCanvas);
        origTex.colorSpace = THREE.SRGBColorSpace;
        cachedStickmanOriginalTex = origTex;

        const cutoutCanvas = makeStickmanCutout(origCanvas);
        const cutoutTex = new THREE.CanvasTexture(cutoutCanvas);
        cutoutTex.colorSpace = THREE.SRGBColorSpace;
        cachedStickmanCutoutTex = cutoutTex;
      }
    } catch (err) {
      console.warn('Stickman cutout fallback to original:', err);
    } finally {
      isStickmanLoading = false;
      while (stickmanLoadCallbacks.length > 0) {
        const cb = stickmanLoadCallbacks.shift();
        if (cb) cb();
      }
    }
  };

  img.onerror = () => {
    isStickmanLoading = false;
  };
}

let cachedStickmanPlaceholderTex: THREE.CanvasTexture | null = null;
function getStickmanPlaceholderTexture(): THREE.CanvasTexture {
  if (cachedStickmanPlaceholderTex) return cachedStickmanPlaceholderTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 286;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 512, 286);
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    // Head
    ctx.beginPath();
    ctx.arc(256, 90, 48, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();
    // Blangkon
    ctx.beginPath();
    ctx.arc(256, 75, 48, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fillStyle = '#5c2c16';
    ctx.fill();
    ctx.stroke();
    // Eyes & Smile
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.arc(242, 88, 5, 0, Math.PI * 2);
    ctx.arc(270, 88, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(256, 96, 16, 0.1, Math.PI - 0.1);
    ctx.stroke();
    // Body & Sarung
    ctx.beginPath();
    ctx.moveTo(256, 138);
    ctx.lineTo(256, 190);
    ctx.stroke();
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(238, 190, 36, 45);
    ctx.strokeRect(238, 190, 36, 45);
    // Legs
    ctx.beginPath();
    ctx.moveTo(246, 235);
    ctx.lineTo(244, 265);
    ctx.moveTo(266, 235);
    ctx.lineTo(268, 265);
    // Arms waving
    ctx.moveTo(256, 150);
    ctx.lineTo(210, 110);
    ctx.moveTo(256, 150);
    ctx.lineTo(285, 175);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedStickmanPlaceholderTex = tex;
  return tex;
}

let stickmanLoadPromise: Promise<void> | null = null;
export function ensureStickmanLoaded(): Promise<void> {
  if (cachedStickmanCutoutTex && cachedStickmanOriginalTex) {
    return Promise.resolve();
  }
  if (!stickmanLoadPromise) {
    stickmanLoadPromise = new Promise<void>((resolve) => {
      loadStickmanTextures(() => resolve());
    });
  }
  return stickmanLoadPromise;
}

if (typeof window !== 'undefined') {
  void ensureStickmanLoaded();
}

/**
 * Hand-drawn sketchy pencil shadow lines under stickman feet
 * (matching the authentic cartoon line art from the user's reference image)
 */
let cachedGroundSketchTex: THREE.CanvasTexture | null = null;
function getGroundSketchTexture(): THREE.CanvasTexture {
  if (cachedGroundSketchTex) return cachedGroundSketchTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 512, 128);

  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 3.8;
  ctx.lineCap = 'round';

  // Main ground baseline with subtle pencil hand tremor
  ctx.beginPath();
  ctx.moveTo(60, 64);
  ctx.quadraticCurveTo(256, 62, 452, 65);
  ctx.stroke();

  // Secondary scribble hatch lines under feet
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(110, 74);
  ctx.lineTo(210, 72);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(300, 73);
  ctx.lineTo(405, 75);
  ctx.stroke();

  // Tiny hand scribble ticks
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(420, 75);
  ctx.lineTo(445, 75);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedGroundSketchTex = tex;
  return tex;
}

/**
 * Storytelling Props Generator (Illustrations & Visual Elements)
 */
function renderStoryPropCanvas(
  prop: StoryProp3D,
  t: number,
  canvas: HTMLCanvasElement
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = 512;
  canvas.height = 512;
  ctx.clearRect(0, 0, 512, 512);

  switch (prop) {
    case 'thought-question': {
      // Floating Thought Cloud + Bouncing Question Marks ("Kok Bisa?")
      const bounce = Math.sin(t * 4.0) * 12;
      const cloudY = 300;

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 6;

      ctx.beginPath();
      ctx.arc(140, 420, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(180, 380, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(230, cloudY, 52, 0, Math.PI * 2);
      ctx.arc(290, cloudY - 26, 62, 0, Math.PI * 2);
      ctx.arc(360, cloudY, 54, 0, Math.PI * 2);
      ctx.arc(330, cloudY + 44, 46, 0, Math.PI * 2);
      ctx.arc(250, cloudY + 40, 46, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Big vibrant cartoon question mark
      ctx.save();
      ctx.translate(290, cloudY + bounce);
      ctx.font = 'bold 130px "Comic Sans MS", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 14;
      ctx.strokeText('?', 0, 0);
      ctx.fillStyle = '#f43f5e';
      ctx.fillText('?', 0, 0);

      // Mini cyan question mark
      ctx.font = 'bold 64px "Comic Sans MS", system-ui, sans-serif';
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 8;
      ctx.strokeText('?', 70, -60);
      ctx.fillStyle = '#06b6d4';
      ctx.fillText('?', 70, -60);
      ctx.restore();
      break;
    }

    case 'idea-bulb': {
      // Glowing Idea Lightbulb with Radiating Comic Rays
      const pulse = 1.0 + Math.sin(t * 6.0) * 0.08;
      ctx.save();
      ctx.translate(256, 256);
      ctx.scale(pulse, pulse);

      // Radiating light rays
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * 150, Math.sin(ang) * 150);
        ctx.lineTo(Math.cos(ang) * 210, Math.sin(ang) * 210);
        ctx.stroke();
      }

      // Bulb glass
      ctx.beginPath();
      ctx.arc(0, -30, 95, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a';
      ctx.fill();
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 10;
      ctx.stroke();

      // Glow filament
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-35, 10);
      ctx.lineTo(-20, -50);
      ctx.lineTo(20, -50);
      ctx.lineTo(35, 10);
      ctx.stroke();

      // Screw base
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-45, 65, 90, 45);
      ctx.strokeRect(-45, 65, 90, 45);

      ctx.fillStyle = '#475569';
      ctx.fillRect(-30, 110, 60, 20);
      ctx.strokeRect(-30, 110, 60, 20);
      ctx.restore();
      break;
    }

    case 'octopus-hearts': {
      // Cute Purple Octopus + 3 Pulsing Red Hearts (Biology/Nature facts!)
      ctx.save();
      ctx.translate(256, 310);
      ctx.fillStyle = '#a855f7';
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 9;

      ctx.beginPath();
      ctx.arc(0, -20, 80, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Big cute octopus eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-30, -30, 24, 0, Math.PI * 2);
      ctx.arc(30, -30, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(-24, -30, 12, 0, Math.PI * 2);
      ctx.arc(36, -30, 12, 0, Math.PI * 2);
      ctx.fill();

      // Cute blush
      ctx.fillStyle = 'rgba(244, 63, 94, 0.45)';
      ctx.beginPath();
      ctx.arc(-45, -5, 12, 0, Math.PI * 2);
      ctx.arc(45, -5, 12, 0, Math.PI * 2);
      ctx.fill();

      // Wavy tentacles
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      for (let i = -3; i <= 3; i++) {
        const x = i * 24;
        const wave = Math.sin(t * 6 + i) * 16;
        ctx.beginPath();
        ctx.moveTo(x, 50);
        ctx.quadraticCurveTo(x + wave, 95, x + wave * 1.5, 130);
        ctx.stroke();
      }
      ctx.restore();

      // 3 Pulsing Hearts above head!
      const heartPulse = 1.0 + Math.abs(Math.sin(t * 7.0)) * 0.22;
      const drawHeart = (hx: number, hy: number, scale: number) => {
        ctx.save();
        ctx.translate(hx, hy);
        ctx.scale(scale * heartPulse, scale * heartPulse);
        ctx.beginPath();
        ctx.moveTo(0, 15);
        ctx.bezierCurveTo(-25, -20, -45, 10, 0, 48);
        ctx.bezierCurveTo(45, 10, 25, -20, 0, 15);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.restore();
      };

      drawHeart(256, 110, 1.15);
      drawHeart(150, 150, 0.85);
      drawHeart(360, 150, 0.85);
      break;
    }

    case 'comic-shock': {
      // Dynamic Anime / Manga Speed Lines & Burst Shock!
      ctx.save();
      ctx.translate(256, 256);
      const numLines = 28;
      ctx.fillStyle = '#18181b';
      for (let i = 0; i < numLines; i++) {
        const ang = (i * 2 * Math.PI) / numLines + (t % 0.2);
        const len = 220 + ((i % 3) * 25);
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * 90, Math.sin(ang) * 90);
        ctx.lineTo(Math.cos(ang - 0.05) * len, Math.sin(ang - 0.05) * len);
        ctx.lineTo(Math.cos(ang + 0.05) * len, Math.sin(ang + 0.05) * len);
        ctx.closePath();
        ctx.fill();
      }

      ctx.font = '900 170px "Impact", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 22;
      ctx.strokeText('!', 0, 0);
      ctx.fillStyle = '#ef4444';
      ctx.fillText('!', 0, 0);
      ctx.restore();
      break;
    }

    case 'planet-space': {
      // Saturn Planet with Rings, Stars & Mini Rocket
      ctx.save();
      ctx.translate(256, 256);
      ctx.rotate(-0.25);

      ctx.beginPath();
      ctx.ellipse(0, 0, 180, 52, 0, Math.PI, 0);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 26;
      ctx.stroke();
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 95, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 9;
      ctx.stroke();

      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#f97316';
      ctx.fillRect(-100, -30, 200, 25);
      ctx.fillRect(-100, 20, 200, 25);
      ctx.restore();

      ctx.beginPath();
      ctx.ellipse(0, 0, 180, 52, 0, 0, Math.PI);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 26;
      ctx.stroke();
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 5;
      ctx.stroke();

      ctx.restore();

      const star = (sx: number, sy: number, sz: number) => {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(sx, sy, sz, 0, Math.PI * 2);
        ctx.fill();
      };
      star(80, 100, 8);
      star(420, 120, 10);
      star(400, 420, 7);
      break;
    }

    case 'money-gold': {
      // Golden coins stack & sparkles
      ctx.save();
      ctx.translate(256, 260);

      const drawCoin = (cx: number, cy: number, rot: number) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, 68, 48, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#facc15';
        ctx.fill();
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 7;
        ctx.stroke();

        ctx.font = 'bold 36px sans-serif';
        ctx.fillStyle = '#b45309';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Rp', 0, 0);
        ctx.restore();
      };

      drawCoin(-40, 70, -0.1);
      drawCoin(50, 80, 0.15);
      drawCoin(0, 20, 0.05);
      drawCoin(-20, -40, -0.2);
      drawCoin(40, -35, 0.25);
      drawCoin(0, -90, Math.sin(t * 4) * 0.1);

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-80, -110, 10, 0, Math.PI * 2);
      ctx.arc(100, -80, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }

    case 'ancient-book': {
      // Open ancient tome / manuscript with magnifying glass
      ctx.save();
      ctx.translate(256, 270);
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.moveTo(0, 80);
      ctx.quadraticCurveTo(-90, 70, -180, 90);
      ctx.lineTo(-180, -80);
      ctx.quadraticCurveTo(-90, -100, 0, -80);
      ctx.quadraticCurveTo(90, -100, 180, -80);
      ctx.lineTo(180, 90);
      ctx.quadraticCurveTo(90, 70, 0, 80);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 8;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -80);
      ctx.lineTo(0, 80);
      ctx.stroke();

      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 5;
      for (let y = -50; y <= 50; y += 22) {
        ctx.beginPath();
        ctx.moveTo(-150, y);
        ctx.lineTo(-20, y);
        ctx.moveTo(20, y);
        ctx.lineTo(150, y);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case 'magnifier': {
      // Detective magnifying glass
      ctx.save();
      ctx.translate(230, 230);
      ctx.rotate(-Math.PI / 4 + Math.sin(t * 3) * 0.1);

      ctx.fillStyle = '#78350f';
      ctx.fillRect(-18, 110, 36, 140);
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 8;
      ctx.strokeRect(-18, 110, 36, 140);

      ctx.beginPath();
      ctx.arc(0, 0, 110, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(224, 242, 254, 0.85)';
      ctx.fill();
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 14;
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, 0, 85, -Math.PI * 0.8, -Math.PI * 0.3);
      ctx.stroke();

      ctx.font = 'bold 74px sans-serif';
      ctx.fillStyle = '#dc2626';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FAKTA!', 0, 5);
      ctx.restore();
      break;
    }

    case 'fire-energy': {
      // Comic blazing flames
      const flameFlicker = Math.sin(t * 12) * 15;
      ctx.save();
      ctx.translate(256, 320);

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(-130, 90);
      ctx.quadraticCurveTo(-150, -60, -70 + flameFlicker, -160);
      ctx.quadraticCurveTo(-20, -90, 0, -210 + flameFlicker);
      ctx.quadraticCurveTo(30, -90, 70 - flameFlicker, -160);
      ctx.quadraticCurveTo(150, -60, 130, 90);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 9;
      ctx.stroke();

      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-90, 90);
      ctx.quadraticCurveTo(-100, -30, -40, -110 + flameFlicker);
      ctx.quadraticCurveTo(-10, -60, 0, -150);
      ctx.quadraticCurveTo(10, -60, 40, -110 - flameFlicker);
      ctx.quadraticCurveTo(100, -30, 90, 90);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(-50, 90);
      ctx.quadraticCurveTo(-60, 0, 0, -90 + flameFlicker);
      ctx.quadraticCurveTo(60, 0, 50, 90);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
      break;
    }

    case 'none':
    default:
      break;
  }
}

/**
 * Helper to create a crisp stickman limb with cel-shaded outline
 */
function createStickLimb(
  radius: number,
  length: number,
  material: THREE.Material,
  outlineMaterial: THREE.Material
): THREE.Group {
  const group = new THREE.Group();

  const geo = new THREE.CylinderGeometry(radius, radius * 0.92, length, 14);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = -length / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  const outlineGeo = new THREE.CylinderGeometry(
    radius + 0.007,
    radius * 0.92 + 0.007,
    length + 0.01,
    14
  );
  const outlineMesh = new THREE.Mesh(outlineGeo, outlineMaterial);
  outlineMesh.position.y = -length / 2;
  group.add(outlineMesh);

  return group;
}

function createJointSphere(
  radius: number,
  material: THREE.Material,
  outlineMaterial: THREE.Material
): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 14), material);
  m.castShadow = true;
  g.add(m);
  const o = new THREE.Mesh(new THREE.SphereGeometry(radius + 0.007, 14, 14), outlineMaterial);
  g.add(o);
  return g;
}

function buildStickmanRig(colorHex: string): StickmanRig {
  const root = new THREE.Group();

  // White matte body finish for head and torso
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.88,
    metalness: 0.0,
  });

  const isDarkBody =
    colorHex.toLowerCase() === '#1e293b' || colorHex.toLowerCase() === '#000000';

  const outlineMaterial = new THREE.MeshBasicMaterial({
    color: isDarkBody ? 0x38bdf8 : 0x0f172a,
    side: THREE.BackSide,
  });

  // Solid dark matte finish for classic stickman limbs
  const stickMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.92,
    metalness: 0.0,
  });

  const featureMaterial = new THREE.MeshBasicMaterial({
    color: 0x0f172a,
  });

  const scleraMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });

  // Hips (pelvis center at y = 0.96)
  const hips = new THREE.Group();
  hips.position.y = 0.96;
  root.add(hips);
  hips.add(createJointSphere(0.036, bodyMaterial, outlineMaterial));

  // Torso (clean white stickman spine)
  const torso = new THREE.Group();
  hips.add(torso);

  const spineLen = 0.56;
  const spineGeo = new THREE.CylinderGeometry(0.028, 0.026, spineLen, 14);
  const spineMesh = new THREE.Mesh(spineGeo, bodyMaterial);
  spineMesh.position.y = spineLen / 2;
  spineMesh.castShadow = true;
  torso.add(spineMesh);

  const spineOutline = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.034, spineLen + 0.01, 14),
    outlineMaterial
  );
  spineOutline.position.y = spineLen / 2;
  torso.add(spineOutline);

  // Chest / Shoulder crossbar
  const shoulderBar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.34, 12),
    bodyMaterial
  );
  shoulderBar.rotation.z = Math.PI / 2;
  shoulderBar.position.y = 0.52;
  shoulderBar.castShadow = true;
  torso.add(shoulderBar);

  const shoulderBarOutline = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.35, 12),
    outlineMaterial
  );
  shoulderBarOutline.rotation.z = Math.PI / 2;
  shoulderBarOutline.position.y = 0.52;
  torso.add(shoulderBarOutline);

  // Pelvis crossbar
  const pelvisBar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.22, 12),
    bodyMaterial
  );
  pelvisBar.rotation.z = Math.PI / 2;
  hips.add(pelvisBar);

  // Head (classic large round cartoon head)
  const head = new THREE.Group();
  head.position.y = 0.62;
  torso.add(head);

  const headRadius = 0.235;
  const headMesh = new THREE.Mesh(
    new THREE.SphereGeometry(headRadius, 24, 24),
    bodyMaterial
  );
  headMesh.position.y = 0.21;
  headMesh.castShadow = true;
  head.add(headMesh);

  const headOutline = new THREE.Mesh(
    new THREE.SphereGeometry(headRadius + 0.013, 24, 24),
    outlineMaterial
  );
  headOutline.position.y = 0.21;
  head.add(headOutline);

  // ==========================================
  // BLANGKON JAWA (Batik Headwear + Mondholan Bun)
  // ==========================================
  const blangkonGroup = new THREE.Group();
  head.add(blangkonGroup);

  const batikTex = getBatikBlangkonTexture();
  const blangkonMat = new THREE.MeshStandardMaterial({
    map: batikTex,
    roughness: 0.85,
    metalness: 0.0,
  });

  // Cap dome over top of head
  const capGeo = new THREE.SphereGeometry(
    headRadius + 0.01,
    24,
    16,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.58
  );
  const capMesh = new THREE.Mesh(capGeo, blangkonMat);
  capMesh.position.y = 0.21;
  capMesh.rotation.x = 0.08;
  capMesh.castShadow = true;
  blangkonGroup.add(capMesh);

  const capOutline = new THREE.Mesh(
    new THREE.SphereGeometry(headRadius + 0.02, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.58),
    outlineMaterial
  );
  capOutline.position.y = 0.21;
  capOutline.rotation.x = 0.08;
  blangkonGroup.add(capOutline);

  // Wiron front fold crest (curved band right on brow)
  const wironGeo = new THREE.TorusGeometry(headRadius + 0.008, 0.022, 10, 24, Math.PI * 0.72);
  const wironMesh = new THREE.Mesh(wironGeo, blangkonMat);
  wironMesh.rotation.x = Math.PI * 0.56;
  wironMesh.rotation.z = Math.PI * 0.14;
  wironMesh.position.set(0, 0.26, 0.075);
  blangkonGroup.add(wironMesh);

  // Mondholan (iconic rounded bun at the rear/back of head)
  const mondholanRadius = 0.088;
  const mondholanGeo = new THREE.SphereGeometry(mondholanRadius, 18, 18);
  const mondholanMesh = new THREE.Mesh(mondholanGeo, blangkonMat);
  mondholanMesh.position.set(0.045, 0.17, -0.215);
  mondholanMesh.castShadow = true;
  blangkonGroup.add(mondholanMesh);

  const mondholanOutline = new THREE.Mesh(
    new THREE.SphereGeometry(mondholanRadius + 0.01, 18, 18),
    outlineMaterial
  );
  mondholanOutline.position.set(0.045, 0.17, -0.215);
  blangkonGroup.add(mondholanOutline);

  // ==========================================
  // EXPRESSIVE CARTOON EYES (matching reference image)
  // ==========================================
  function createCartoonEye(): THREE.Group {
    const eyeGroup = new THREE.Group();

    // Outer thick black border
    const borderMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.054, 16, 16),
      featureMaterial
    );
    borderMesh.scale.set(1, 1.25, 0.35);
    eyeGroup.add(borderMesh);

    // Pure white sclera
    const scleraMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.047, 16, 16),
      scleraMaterial
    );
    scleraMesh.position.z = 0.008;
    scleraMesh.scale.set(1, 1.25, 0.35);
    eyeGroup.add(scleraMesh);

    // Solid black circular pupil
    const pupilMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 14, 14),
      featureMaterial
    );
    pupilMesh.position.set(0.005, 0.008, 0.022);
    pupilMesh.scale.set(1, 1.15, 0.4);
    eyeGroup.add(pupilMesh);

    return eyeGroup;
  }

  const leftEye = createCartoonEye();
  leftEye.position.set(-0.078, 0.22, 0.218);
  head.add(leftEye);

  const rightEye = createCartoonEye();
  rightEye.position.set(0.078, 0.22, 0.218);
  head.add(rightEye);

  // Expressive Eyebrows
  const browGeo = new THREE.BoxGeometry(0.075, 0.018, 0.02);
  const leftBrow = new THREE.Mesh(browGeo, featureMaterial);
  leftBrow.position.set(-0.078, 0.31, 0.218);
  leftBrow.rotation.z = -0.12;
  head.add(leftBrow);

  const rightBrow = new THREE.Mesh(browGeo, featureMaterial);
  rightBrow.position.set(0.078, 0.31, 0.218);
  rightBrow.rotation.z = 0.12;
  head.add(rightBrow);

  // Animated Happy Smile Mouth
  const mouthGeo = new THREE.SphereGeometry(0.042, 14, 14);
  const mouth = new THREE.Mesh(mouthGeo, featureMaterial);
  mouth.position.set(0, 0.12, 0.222);
  mouth.scale.set(1.4, 0.5, 0.4);
  head.add(mouth);

  // ==========================================
  // SARUNG (Indonesian Plaid / Batik Sarong)
  // ==========================================
  const sarungGroup = new THREE.Group();
  hips.add(sarungGroup);

  const defaultSarungTex = getSarungTexture('plaid-red');
  const sarungMaterial = new THREE.MeshStandardMaterial({
    map: defaultSarungTex,
    roughness: 0.88,
    metalness: 0.0,
  });

  const sarungKnotMaterial = new THREE.MeshStandardMaterial({
    map: defaultSarungTex,
    roughness: 0.88,
    metalness: 0.0,
  });

  // Skirt cylinder (y reaches from hips down to below knees)
  const sarungGeo = new THREE.CylinderGeometry(0.188, 0.226, 0.52, 24, 1, true);
  const sarungMesh = new THREE.Mesh(sarungGeo, sarungMaterial);
  sarungMesh.position.y = -0.26;
  sarungMesh.castShadow = true;
  sarungMesh.receiveShadow = true;
  sarungGroup.add(sarungMesh);

  const sarungOutline = new THREE.Mesh(
    new THREE.CylinderGeometry(0.198, 0.236, 0.525, 24, 1, true),
    outlineMaterial
  );
  sarungOutline.position.y = -0.26;
  sarungGroup.add(sarungOutline);

  // Rolled waistband ring ("gulungan sarung di pinggang")
  const waistRollGeo = new THREE.TorusGeometry(0.192, 0.024, 10, 24);
  const waistRollMesh = new THREE.Mesh(waistRollGeo, sarungMaterial);
  waistRollMesh.rotation.x = Math.PI / 2;
  waistRollMesh.position.y = 0.01;
  sarungGroup.add(waistRollMesh);

  // Front knot & flap ("lipatan wiron sarung depan")
  const knotGeo = new THREE.BoxGeometry(0.11, 0.42, 0.03);
  const sarungKnot = new THREE.Mesh(knotGeo, sarungKnotMaterial);
  sarungKnot.position.set(0.025, -0.23, 0.198);
  sarungKnot.rotation.z = -0.05;
  sarungKnot.castShadow = true;
  sarungGroup.add(sarungKnot);

  const knotOutline = new THREE.Mesh(
    new THREE.BoxGeometry(0.124, 0.435, 0.038),
    outlineMaterial
  );
  knotOutline.position.set(0.025, -0.23, 0.198);
  knotOutline.rotation.z = -0.05;
  sarungGroup.add(knotOutline);

  // ==========================================
  // ARMS & HANDS (Black Stickman Style)
  // ==========================================
  const leftShoulder = new THREE.Group();
  leftShoulder.position.set(-0.17, 0.52, 0);
  torso.add(leftShoulder);
  leftShoulder.add(createJointSphere(0.03, stickMaterial, outlineMaterial));
  leftShoulder.add(createStickLimb(0.023, 0.34, stickMaterial, outlineMaterial));

  const leftElbow = new THREE.Group();
  leftElbow.position.y = -0.34;
  leftShoulder.add(leftElbow);
  leftElbow.add(createJointSphere(0.026, stickMaterial, outlineMaterial));
  leftElbow.add(createStickLimb(0.021, 0.33, stickMaterial, outlineMaterial));

  const leftHand = createJointSphere(0.046, stickMaterial, outlineMaterial);
  leftHand.position.y = -0.34;
  leftElbow.add(leftHand);

  // Right Arm
  const rightShoulder = new THREE.Group();
  rightShoulder.position.set(0.17, 0.52, 0);
  torso.add(rightShoulder);
  rightShoulder.add(createJointSphere(0.03, stickMaterial, outlineMaterial));
  rightShoulder.add(createStickLimb(0.023, 0.34, stickMaterial, outlineMaterial));

  const rightElbow = new THREE.Group();
  rightElbow.position.y = -0.34;
  rightShoulder.add(rightElbow);
  rightElbow.add(createJointSphere(0.026, stickMaterial, outlineMaterial));
  rightElbow.add(createStickLimb(0.021, 0.33, stickMaterial, outlineMaterial));

  const rightHand = createJointSphere(0.046, stickMaterial, outlineMaterial);
  rightHand.position.y = -0.34;
  rightElbow.add(rightHand);

  // ==========================================
  // LEGS & FEET
  // ==========================================
  const leftHip = new THREE.Group();
  leftHip.position.set(-0.11, 0, 0);
  hips.add(leftHip);
  leftHip.add(createJointSphere(0.03, stickMaterial, outlineMaterial));
  leftHip.add(createStickLimb(0.026, 0.46, stickMaterial, outlineMaterial));

  const leftKnee = new THREE.Group();
  leftKnee.position.y = -0.46;
  leftHip.add(leftKnee);
  leftKnee.add(createJointSphere(0.028, stickMaterial, outlineMaterial));
  leftKnee.add(createStickLimb(0.024, 0.46, stickMaterial, outlineMaterial));

  const leftFoot = createJointSphere(0.048, bodyMaterial, outlineMaterial);
  leftFoot.scale.set(0.9, 0.65, 1.8);
  leftFoot.position.set(0, -0.47, 0.045);
  leftKnee.add(leftFoot);

  // Right Leg
  const rightHip = new THREE.Group();
  rightHip.position.set(0.11, 0, 0);
  hips.add(rightHip);
  rightHip.add(createJointSphere(0.03, stickMaterial, outlineMaterial));
  rightHip.add(createStickLimb(0.026, 0.46, stickMaterial, outlineMaterial));

  const rightKnee = new THREE.Group();
  rightKnee.position.y = -0.46;
  rightHip.add(rightKnee);
  rightKnee.add(createJointSphere(0.028, stickMaterial, outlineMaterial));
  rightKnee.add(createStickLimb(0.024, 0.46, stickMaterial, outlineMaterial));

  const rightFoot = createJointSphere(0.048, bodyMaterial, outlineMaterial);
  rightFoot.scale.set(0.9, 0.65, 1.8);
  rightFoot.position.set(0, -0.47, 0.045);
  rightKnee.add(rightFoot);

  return {
    root,
    hips,
    torso,
    head,
    leftEye,
    rightEye,
    leftBrow,
    rightBrow,
    mouth,
    blangkonGroup,
    sarungGroup,
    sarungMesh,
    sarungKnot,
    sarungMaterial,
    sarungKnotMaterial,
    leftShoulder,
    leftElbow,
    rightShoulder,
    rightElbow,
    leftHip,
    leftKnee,
    rightHip,
    rightKnee,
    bodyMaterial,
    stickMaterial,
    outlineMaterial,
  };
}

export function applyStickmanPose(rig: StickmanRig, pose: StickmanPose, t: number) {
  // Reset transforms
  rig.root.position.set(0, 0, 0);
  rig.root.rotation.set(0, 0, 0);
  rig.hips.position.set(0, 0.96, 0);
  rig.hips.rotation.set(0, 0, 0);
  rig.torso.rotation.set(0, 0, 0);
  rig.head.rotation.set(0, 0, 0);
  rig.leftEye.scale.set(1, 1, 1);
  rig.rightEye.scale.set(1, 1, 1);
  rig.leftBrow.position.set(-0.078, 0.31, 0.218);
  rig.leftBrow.rotation.set(0, 0, -0.12);
  rig.rightBrow.position.set(0.078, 0.31, 0.218);
  rig.rightBrow.rotation.set(0, 0, 0.12);
  rig.mouth.scale.set(1.4, 0.5, 0.4);
  rig.sarungMesh.rotation.set(0, 0, 0);
  rig.sarungKnot.rotation.set(0, 0, -0.05);
  rig.leftShoulder.rotation.set(0, 0, 0.14);
  rig.leftElbow.rotation.set(-0.25, 0, 0);
  rig.rightShoulder.rotation.set(0, 0, -0.14);
  rig.rightElbow.rotation.set(-0.25, 0, 0);
  rig.leftHip.rotation.set(0, 0, 0.04);
  rig.leftKnee.rotation.set(0, 0, 0);
  rig.rightHip.rotation.set(0, 0, -0.04);
  rig.rightKnee.rotation.set(0, 0, 0);

  switch (pose) {
    case 'explain': {
      // Energetic presenter talking, gesturing, and bouncing rhythmically
      const bounce = Math.abs(Math.sin(t * 5.0)) * 0.055;
      rig.hips.position.y = 0.94 + bounce;
      rig.torso.rotation.y = Math.sin(t * 2.6) * 0.24;
      rig.torso.rotation.z = Math.cos(t * 2.6) * 0.08;
      rig.head.rotation.y = Math.sin(t * 2.6 + 0.5) * 0.22;
      rig.head.rotation.x = Math.sin(t * 5.0) * 0.12;

      // Animated talking mouth
      const talkOpen = 0.35 + Math.abs(Math.sin(t * 14)) * 0.95;
      rig.mouth.scale.set(1.25, talkOpen, 0.45);
      rig.leftBrow.position.y = 0.31 + Math.sin(t * 4) * 0.015;
      rig.rightBrow.position.y = 0.31 + Math.sin(t * 4) * 0.015;

      // Expressive hand gestures
      rig.leftShoulder.rotation.set(-0.85 + Math.sin(t * 5.2) * 0.45, 0.2, 0.45);
      rig.leftElbow.rotation.set(-1.2 + Math.cos(t * 5.2) * 0.4, 0, 0);

      rig.rightShoulder.rotation.set(-0.95 + Math.cos(t * 4.8) * 0.45, -0.2, -0.45);
      rig.rightElbow.rotation.set(-1.25 + Math.sin(t * 4.8) * 0.4, 0, 0);

      // Slight knee bend on bounce
      rig.leftHip.rotation.x = -bounce * 1.4;
      rig.leftKnee.rotation.x = bounce * 2.5;
      rig.rightHip.rotation.x = -bounce * 1.4;
      rig.rightKnee.rotation.x = bounce * 2.5;
      rig.sarungKnot.rotation.z = -0.05 + Math.sin(t * 2.6) * 0.05;
      break;
    }

    case 'think': {
      // Clearly thinking: body sways, head tilts & nods, hand taps chin, foot taps floor!
      const sway = Math.sin(t * 2.2);
      rig.hips.position.y = 0.95 + Math.abs(Math.sin(t * 2.2)) * 0.025;
      rig.torso.rotation.z = -0.1 + sway * 0.06;
      rig.torso.rotation.y = -0.22 + sway * 0.14;
      rig.head.rotation.z = 0.22 + Math.sin(t * 2.8) * 0.1;
      rig.head.rotation.x = -0.1 + Math.cos(t * 2.4) * 0.08;

      // Asymmetric curious eyebrows & squinting eye
      rig.leftEye.scale.set(1.0, 0.75, 1.0);
      rig.rightEye.scale.set(1.15, 1.25, 1.0);
      rig.leftBrow.rotation.z = -0.26;
      rig.rightBrow.position.y = 0.33;
      rig.rightBrow.rotation.z = 0.18;
      rig.mouth.scale.set(0.9, 0.35, 0.4);

      // Right hand tapping chin
      const chinTap = Math.sin(t * 5.5) * 0.14;
      rig.rightShoulder.rotation.set(-1.4 + chinTap * 0.4, -0.3, -0.15);
      rig.rightElbow.rotation.set(-1.7 + chinTap, 0, 0.35);

      // Left arm folded across waist
      rig.leftShoulder.rotation.set(-0.55, 0.45, 0.2);
      rig.leftElbow.rotation.set(-1.35, 0, -0.55);

      // Impatient/curious foot tapping!
      const tap = Math.max(0, Math.sin(t * 6.5)) * 0.3;
      rig.leftHip.rotation.x = -0.15;
      rig.leftKnee.rotation.x = 0.25 + tap;
      break;
    }

    case 'shock': {
      // Dramatic mindblown jump, wide eyes, O-mouth, waving arms!
      const jump = Math.max(0, Math.sin(t * 6.5)) * 0.3;
      rig.hips.position.y = 0.95 + jump;
      rig.torso.rotation.x = -0.22 + Math.sin(t * 10) * 0.08;
      rig.torso.rotation.y = Math.sin(t * 5) * 0.15;
      rig.head.rotation.x = -0.25;
      rig.head.rotation.z = Math.sin(t * 12) * 0.12;

      rig.leftEye.scale.set(1.4, 1.45, 1.0);
      rig.rightEye.scale.set(1.4, 1.45, 1.0);
      rig.leftBrow.position.y = 0.35;
      rig.rightBrow.position.y = 0.35;
      rig.mouth.scale.set(1.1, 1.7, 0.6); // Big surprised "O" mouth

      rig.leftShoulder.rotation.set(-2.45 + Math.sin(t * 9) * 0.3, 0, 0.65);
      rig.leftElbow.rotation.set(-0.5 + Math.cos(t * 9) * 0.3, 0, 0);
      rig.rightShoulder.rotation.set(-2.45 + Math.cos(t * 9) * 0.3, 0, -0.65);
      rig.rightElbow.rotation.set(-0.5 + Math.sin(t * 9) * 0.3, 0, 0);

      rig.leftHip.rotation.x = -jump * 1.4;
      rig.leftKnee.rotation.x = jump * 2.5;
      rig.rightHip.rotation.x = -jump * 1.4;
      rig.rightKnee.rotation.x = jump * 2.5;
      rig.sarungKnot.rotation.x = -jump * 0.6;
      break;
    }

    case 'point': {
      // Leaning forward and pointing emphatically toward fact text
      const pulse = Math.sin(t * 5.5) * 0.16;
      rig.hips.position.y = 0.95 + Math.abs(Math.sin(t * 3.5)) * 0.03;
      rig.torso.rotation.y = -0.3;
      rig.torso.rotation.x = 0.1;
      rig.head.rotation.y = 0.25;
      rig.head.rotation.x = -0.15 + Math.sin(t * 4) * 0.08;
      rig.mouth.scale.set(1.3, 0.45 + Math.abs(Math.sin(t * 10)) * 0.6, 0.45);

      rig.rightShoulder.rotation.set(-2.25 + pulse, 0, -0.5);
      rig.rightElbow.rotation.set(-0.2 + pulse * 0.5, 0, 0);

      // Left hand on hip
      rig.leftShoulder.rotation.set(-0.2, 0, 0.65);
      rig.leftElbow.rotation.set(-1.3, 0, -0.4);
      break;
    }

    case 'wave': {
      // Cheerful bounce & big friendly wave matching the uploaded reference image!
      const bounce = Math.abs(Math.sin(t * 4.5)) * 0.05;
      rig.hips.position.y = 0.94 + bounce;
      rig.torso.rotation.z = Math.sin(t * 4.5) * 0.06;
      rig.head.rotation.z = Math.sin(t * 4.5) * 0.09;
      rig.mouth.scale.set(1.4, 0.85, 0.45);

      // Right arm high up waving enthusiastically (as in photo)
      rig.rightShoulder.rotation.set(-2.55, 0.1, -0.42 + Math.sin(t * 8.5) * 0.38);
      rig.rightElbow.rotation.set(-0.45 + Math.sin(t * 8.5) * 0.3, 0, 0);

      // Left hand resting on hip / waist behind sarung (as in photo)
      rig.leftShoulder.rotation.set(-0.15, 0.2, 0.55);
      rig.leftElbow.rotation.set(-1.45, 0, -0.4);

      rig.sarungKnot.rotation.z = -0.05 + Math.sin(t * 4.5) * 0.04;
      break;
    }

    case 'walk': {
      // Energetic cartoon walk cycle
      const phase = t * 6.0;
      const swing = Math.sin(phase);
      const lift = Math.abs(Math.cos(phase));
      rig.hips.position.y = 0.92 + lift * 0.07;
      rig.torso.rotation.y = -swing * 0.22;
      rig.torso.rotation.x = 0.08;
      rig.head.rotation.y = swing * 0.14;

      rig.leftHip.rotation.x = swing * 0.72;
      rig.leftKnee.rotation.x = Math.max(0, -swing) * 0.95;
      rig.rightHip.rotation.x = -swing * 0.72;
      rig.rightKnee.rotation.x = Math.max(0, swing) * 0.95;

      rig.leftShoulder.rotation.x = -swing * 0.65;
      rig.leftElbow.rotation.x = -0.6;
      rig.rightShoulder.rotation.x = swing * 0.65;
      rig.rightElbow.rotation.x = -0.6;

      rig.sarungMesh.rotation.y = -swing * 0.18;
      rig.sarungMesh.rotation.x = 0.05 + Math.abs(swing) * 0.06;
      rig.sarungKnot.rotation.z = -0.05 + swing * 0.12;
      break;
    }

    case 'idle':
    default: {
      // Lively relaxed idle: breathing, weight shift & looking around
      const shift = Math.sin(t * 2.0);
      rig.hips.position.y = 0.95 + Math.abs(shift) * 0.03;
      rig.hips.position.x = shift * 0.04;
      rig.torso.rotation.z = -shift * 0.06;
      rig.head.rotation.y = Math.sin(t * 1.4) * 0.2;
      rig.head.rotation.x = Math.sin(t * 2.5) * 0.07;
      rig.leftShoulder.rotation.set(0, 0, 0.18 + Math.sin(t * 2.5) * 0.08);
      rig.rightShoulder.rotation.set(0, 0, -0.18 - Math.sin(t * 2.5) * 0.08);
      rig.sarungKnot.rotation.z = -0.05 + Math.sin(t * 2.0) * 0.03;
      break;
    }
  }
}

function createFactBadgeTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Cartoon Comic Speech Bubble with Tail
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(24, 18, canvas.width - 48, 136, 26);
  ctx.fill();

  // Speech bubble pointer tail (points down toward stickman head)
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 20, 154);
  ctx.lineTo(canvas.width / 2 - 45, 185);
  ctx.lineTo(canvas.width / 2 + 15, 154);
  ctx.closePath();
  ctx.fill();

  // Bold black comic outline
  ctx.lineWidth = 6.5;
  ctx.strokeStyle = '#18181b';
  ctx.stroke();

  // Re-stroke bubble body
  ctx.beginPath();
  ctx.roundRect(24, 18, canvas.width - 48, 136, 26);
  ctx.stroke();

  // Vibrant comic title text
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 48px "Impact", "Arial Black", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase().slice(0, 26), canvas.width / 2, 86);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Fully Articulated 2D Vector Cartoon Character Engine (Si Stickman Blangkon)
 * - Renders crisp vector cartoon line art matching the user reference photo.
 * - Dynamic blinking eyes with expressive pupil tracking.
 * - Animated talking mouth (lip-sync mouth flap during explanations, gasp during shock, smile during greeting).
 * - Articulated bending arms and hands (waves, gestures, scratches chin, clenches cheeks).
 * - Natural breathing, head tilting, sarung swaying, and stepping legs.
 */
export function renderArticulatedStickman2D(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pose: StickmanPose,
  t: number,
  config: Scene3DConfig
): void {
  ctx.clearRect(0, 0, width, height);

  const cx = width / 2; // 512
  const groundY = height * 0.88; // ~900

  // 1. Natural Breathing & Organic Kinematics
  const breatheY = Math.sin(t * 3.5) * 4.5;
  const breatheScaleY = 1.0 + Math.sin(t * 3.5) * 0.012;
  const breatheScaleX = 1.0 - Math.sin(t * 3.5) * 0.008;

  let bodyOffsetY = 0;
  let bodyOffsetX = 0;
  let bodyTilt = 0;

  if (pose === 'shock') {
    bodyOffsetY = -Math.abs(Math.sin(t * 8.5)) * 32;
    bodyOffsetX = Math.sin(t * 45.0) * 4.5;
    bodyTilt = Math.sin(t * 28.0) * 0.02;
  } else if (pose === 'walk') {
    bodyOffsetY = -Math.abs(Math.sin(t * 7.0)) * 18;
    bodyTilt = Math.sin(t * 3.5) * 0.035;
  } else if (pose === 'wave') {
    bodyTilt = Math.sin(t * 5.5) * 0.025;
  } else if (pose === 'think') {
    bodyTilt = 0.035 + Math.sin(t * 2.2) * 0.015;
  }

  ctx.save();
  ctx.translate(cx + bodyOffsetX, groundY + bodyOffsetY);
  ctx.scale(breatheScaleX, breatheScaleY);
  ctx.rotate(bodyTilt);

  // Colors & Styles
  const strokeColor = '#18181b';
  const fillColor = '#ffffff';
  const lineWidth = 8;

  // Ground sketch lines (matching original artwork)
  ctx.save();
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-110, 0);
  ctx.lineTo(130, 0);
  ctx.moveTo(-75, 4);
  ctx.lineTo(45, 4);
  ctx.stroke();
  ctx.restore();

  // Reference points relative to feet at (0, 0):
  const pelvisY = -180 + breatheY;
  const shoulderY = -345 + breatheY;
  const neckY = -365 + breatheY;
  const headR = 88;
  const headCenterY = neckY - headR; // ~ -453

  // 2. LEGS & FEET
  const leftHipX = -26;
  const rightHipX = 26;
  let leftFootX = -40;
  let leftFootY = 0;
  let rightFootX = 35;
  let rightFootY = 0;

  if (pose === 'walk') {
    const walkPhase = t * 7.0;
    leftFootY = -Math.max(0, Math.sin(walkPhase)) * 32;
    leftFootX = -40 + Math.cos(walkPhase) * 20;
    rightFootY = -Math.max(0, Math.sin(walkPhase + Math.PI)) * 32;
    rightFootX = 35 - Math.cos(walkPhase) * 20;
  }

  // Draw Legs
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Left Leg
  ctx.beginPath();
  ctx.moveTo(leftHipX, pelvisY + 30);
  ctx.lineTo(leftFootX, leftFootY);
  ctx.stroke();

  // Right Leg
  ctx.beginPath();
  ctx.moveTo(rightHipX, pelvisY + 30);
  ctx.lineTo(rightFootX, rightFootY);
  ctx.stroke();

  // Feet / Shoes (distinctive elongated cartoon shoes from reference image)
  const drawFoot = (fx: number, fy: number, isRight: boolean) => {
    ctx.save();
    ctx.translate(fx, fy);
    ctx.beginPath();
    if (isRight) {
      ctx.moveTo(-10, -10);
      ctx.quadraticCurveTo(38, -12, 42, -2);
      ctx.quadraticCurveTo(35, 6, -10, 4);
      ctx.closePath();
    } else {
      ctx.moveTo(10, -10);
      ctx.quadraticCurveTo(-38, -12, -42, -2);
      ctx.quadraticCurveTo(-35, 6, 10, 4);
      ctx.closePath();
    }
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.restore();
  };

  drawFoot(leftFootX, leftFootY, false);
  drawFoot(rightFootX, rightFootY, true);

  // 3. SARUNG & KNOT (Authentic Plaid Tartan Pattern)
  const sarungPattern = config.sarungPattern || 'plaid-red';
  const sarungTex = getSarungTexture(sarungPattern);
  const sarungSway = pose === 'walk' ? Math.sin(t * 7.0) * 12 : Math.sin(t * 2.5) * 4;

  ctx.save();
  ctx.beginPath();
  // Sarung trapezoid silhouette
  const sarungTopY = pelvisY - 45;
  const sarungBotY = pelvisY + 80;
  ctx.moveTo(-52, sarungTopY);
  ctx.lineTo(52, sarungTopY);
  ctx.lineTo(68 + sarungSway, sarungBotY);
  ctx.lineTo(-68 + sarungSway, sarungBotY);
  ctx.closePath();

  // Fill with sarung pattern
  if (sarungTex.image) {
    const pattern = ctx.createPattern(sarungTex.image as HTMLCanvasElement, 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fill();
    } else {
      ctx.fillStyle = '#6b111a';
      ctx.fill();
    }
  } else {
    ctx.fillStyle = '#6b111a';
    ctx.fill();
  }
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  // Tied knot / folded belt at waist
  ctx.beginPath();
  ctx.roundRect(-24, sarungTopY - 8, 48, 22, 6);
  if (sarungTex.image) {
    const knotPattern = ctx.createPattern(sarungTex.image as HTMLCanvasElement, 'repeat');
    if (knotPattern) {
      ctx.fillStyle = knotPattern;
      ctx.fill();
    }
  }
  ctx.stroke();

  // Folded knot cloth tail hanging down
  ctx.beginPath();
  ctx.moveTo(-6, sarungTopY + 14);
  ctx.lineTo(8, sarungTopY + 14);
  ctx.lineTo(14, sarungTopY + 68);
  ctx.lineTo(-8, sarungTopY + 65);
  ctx.closePath();
  if (sarungTex.image) {
    const tailPattern = ctx.createPattern(sarungTex.image as HTMLCanvasElement, 'repeat');
    if (tailPattern) {
      ctx.fillStyle = tailPattern;
      ctx.fill();
    }
  }
  ctx.stroke();
  ctx.restore();

  // 4. TORSO (White Shirt / Surjan with black stroke)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-36, shoulderY);
  ctx.lineTo(36, shoulderY);
  ctx.lineTo(44, sarungTopY);
  ctx.lineTo(-44, sarungTopY);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.restore();

  // 5. ARMS & HANDS (Articulated Kinematics)
  const leftShoulderX = 36;
  const rightShoulderX = -36;

  // Draw Arm Helper (bends at elbow to wrist, with hand)
  const drawSegmentedArm = (
    sx: number,
    sy: number,
    ex: number,
    ey: number,
    wx: number,
    wy: number,
    handType: 'fist' | 'open' | 'pointing' | 'akimbo' | 'cheek' | 'chin',
    angleHand = 0
  ) => {
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Upper arm
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    // Forearm
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(wx, wy);
    ctx.stroke();

    // Hand
    ctx.translate(wx, wy);
    ctx.rotate(angleHand);
    ctx.fillStyle = strokeColor; // Black stickman hands (matching reference photo)

    if (handType === 'open') {
      // Waving open hand with 4 cartoon fingers
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      // Fingers
      for (let i = -1.5; i <= 1.5; i++) {
        const fingerAngle = i * 0.28 - Math.PI / 2;
        const fLen = 18 - Math.abs(i) * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(fingerAngle) * fLen, Math.sin(fingerAngle) * fLen);
        ctx.lineWidth = 5.5;
        ctx.stroke();
      }
    } else if (handType === 'pointing') {
      // Clenched fist with pointing index finger
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      // Index finger pointing out
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.lineTo(24, -3);
      ctx.lineWidth = 6;
      ctx.stroke();
    } else if (handType === 'cheek' || handType === 'chin') {
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  // RIGHT ARM (Viewer's Left - Primary Action Arm)
  if (pose === 'wave') {
    // Forearm rocks back and forth waving vigorously!
    const waveAngle = -1.15 + Math.sin(t * 8.5) * 0.38;
    const elbowX = rightShoulderX - 45;
    const elbowY = shoulderY - 55;
    const wristX = elbowX + Math.cos(waveAngle) * 85;
    const wristY = elbowY + Math.sin(waveAngle) * 85;
    drawSegmentedArm(rightShoulderX, shoulderY, elbowX, elbowY, wristX, wristY, 'open', waveAngle + Math.PI / 2);
  } else if (pose === 'explain') {
    // Open palm gesture bobbing rhythmically
    const gestureY = Math.sin(t * 6.0) * 16;
    const elbowX = rightShoulderX - 48;
    const elbowY = shoulderY + 45;
    const wristX = elbowX - 52;
    const wristY = elbowY - 25 + gestureY;
    drawSegmentedArm(rightShoulderX, shoulderY, elbowX, elbowY, wristX, wristY, 'open', -0.5);
  } else if (pose === 'think') {
    // Arm bends up to scratch chin / temple
    const tap = Math.sin(t * 7.0) * 3;
    const elbowX = rightShoulderX - 35;
    const elbowY = shoulderY + 55;
    const wristX = -18;
    const wristY = headCenterY + headR - 12 + tap;
    drawSegmentedArm(rightShoulderX, shoulderY, elbowX, elbowY, wristX, wristY, 'chin', -1.2);
  } else if (pose === 'shock') {
    // Clutch right cheek!
    const elbowX = rightShoulderX - 55;
    const elbowY = shoulderY - 35;
    const wristX = -headR * 0.85;
    const wristY = headCenterY + 15;
    drawSegmentedArm(rightShoulderX, shoulderY, elbowX, elbowY, wristX, wristY, 'cheek', 0.6);
  } else if (pose === 'point') {
    // Arm points across to the right side
    const elbowX = rightShoulderX + 25;
    const elbowY = shoulderY - 15;
    const wristX = elbowX + 110;
    const wristY = elbowY - 20;
    drawSegmentedArm(rightShoulderX, shoulderY, elbowX, elbowY, wristX, wristY, 'pointing', 0);
  } else if (pose === 'walk') {
    // Arm swings
    const armSwing = Math.sin(t * 7.0) * 45;
    const elbowX = rightShoulderX - 25;
    const elbowY = shoulderY + 45;
    const wristX = elbowX + armSwing;
    const wristY = elbowY + 35;
    drawSegmentedArm(rightShoulderX, shoulderY, elbowX, elbowY, wristX, wristY, 'fist', 0);
  } else {
    // Idle: relaxed resting arm
    const elbowX = rightShoulderX - 32;
    const elbowY = shoulderY + 45;
    const wristX = elbowX - 10;
    const wristY = elbowY + 45;
    drawSegmentedArm(rightShoulderX, shoulderY, elbowX, elbowY, wristX, wristY, 'fist', 0);
  }

  // LEFT ARM (Viewer's Right)
  if (pose === 'shock') {
    // Clutch left cheek!
    const elbowX = leftShoulderX + 55;
    const elbowY = shoulderY - 35;
    const wristX = headR * 0.85;
    const wristY = headCenterY + 15;
    drawSegmentedArm(leftShoulderX, shoulderY, elbowX, elbowY, wristX, wristY, 'cheek', -0.6);
  } else if (pose === 'walk') {
    // Counter-phase arm swing
    const armSwing = -Math.sin(t * 7.0) * 45;
    const elbowX = leftShoulderX + 25;
    const elbowY = shoulderY + 45;
    const wristX = elbowX + armSwing;
    const wristY = elbowY + 35;
    drawSegmentedArm(leftShoulderX, shoulderY, elbowX, elbowY, wristX, wristY, 'fist', 0);
  } else {
    // Classic Akimbo: hand resting on hip (exact match to reference photo!)
    const elbowX = leftShoulderX + 46;
    const elbowY = shoulderY + 52;
    const wristX = leftShoulderX + 18;
    const wristY = sarungTopY + 16;
    drawSegmentedArm(leftShoulderX, shoulderY, elbowX, elbowY, wristX, wristY, 'akimbo', 0);
  }

  // 6. HEAD & NECK
  const headNodY = pose === 'explain' ? Math.sin(t * 6.5) * 5 : 0;
  const headTiltAngle =
    pose === 'think' ? 0.08 + Math.sin(t * 2.2) * 0.03 : Math.sin(t * 2.5) * 0.02;

  ctx.save();
  ctx.translate(0, headCenterY + headNodY);
  ctx.rotate(headTiltAngle);

  // Big Round White Head
  ctx.beginPath();
  ctx.arc(0, 0, headR, 0, Math.PI * 2);
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  // 7. BLANGKON (Traditional Javanese Batik Headwear)
  const batikTex = getBatikBlangkonTexture();

  ctx.save();
  // Mondholan (the iconic rounded bun at back right)
  const mondholanX = headR * 0.88;
  const mondholanY = -12;
  ctx.beginPath();
  ctx.ellipse(mondholanX, mondholanY, 24, 34, 0.35, 0, Math.PI * 2);
  if (batikTex.image) {
    const bPat = ctx.createPattern(batikTex.image as HTMLCanvasElement, 'repeat');
    if (bPat) {
      ctx.fillStyle = bPat;
      ctx.fill();
    } else {
      ctx.fillStyle = '#451a03';
      ctx.fill();
    }
  }
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  // Contour swirls on mondholan
  ctx.strokeStyle = '#291003';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(mondholanX, mondholanY, 14, 0.4, Math.PI * 1.5);
  ctx.stroke();

  // Blangkon Main Cap on Head
  ctx.beginPath();
  ctx.arc(0, 0, headR + 1, Math.PI, 0); // Upper hemisphere
  // Forehead contour with distinctive inverted V-notch
  ctx.quadraticCurveTo(headR * 0.5, 4, 0, 18); // Dip to center forehead
  ctx.quadraticCurveTo(-headR * 0.5, 4, -headR - 1, 0);
  ctx.closePath();

  if (batikTex.image) {
    const bPat = ctx.createPattern(batikTex.image as HTMLCanvasElement, 'repeat');
    if (bPat) {
      ctx.fillStyle = bPat;
      ctx.fill();
    } else {
      ctx.fillStyle = '#451a03';
      ctx.fill();
    }
  }
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  // Pleated wiron fold lines across blangkon
  ctx.strokeStyle = 'rgba(254, 215, 170, 0.45)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-headR * 0.85, -20);
  ctx.quadraticCurveTo(0, -6, headR * 0.85, -20);
  ctx.moveTo(-headR * 0.75, -45);
  ctx.quadraticCurveTo(0, -32, headR * 0.75, -45);
  ctx.stroke();
  ctx.restore();

  // 8. EYES & NATURAL BLINKING
  const blinkCycle = t % 3.4;
  const isBlinking = blinkCycle < 0.14;
  const eyeBlinkScale = isBlinking ? Math.max(0.08, Math.sin((blinkCycle / 0.14) * Math.PI)) : 1.0;

  let pupilDx = 0;
  let pupilDy = 0;
  let eyeScale = 1.0;

  if (pose === 'think') {
    pupilDx = 8;
    pupilDy = -12; // Looking up thoughtfully
  } else if (pose === 'point') {
    pupilDx = 11;
    pupilDy = 0;
  } else if (pose === 'shock') {
    eyeScale = 1.35; // Bulging shock eyes!
  }

  const drawEye = (ex: number, ey: number) => {
    ctx.save();
    ctx.translate(ex, ey);
    ctx.scale(eyeScale, eyeScale * eyeBlinkScale);

    // Eye outline & white eyeball
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 30, 0, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 6.5;
    ctx.stroke();

    // Pupil
    if (!isBlinking) {
      const pupilR = pose === 'shock' ? 7 : 11;
      ctx.beginPath();
      ctx.arc(pupilDx, pupilDy, pupilR, 0, Math.PI * 2);
      ctx.fillStyle = strokeColor;
      ctx.fill();

      // Specular highlight dot
      ctx.beginPath();
      ctx.arc(pupilDx - 3.5, pupilDy - 3.5, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    ctx.restore();
  };

  const eyeLeftX = -32;
  const eyeRightX = 32;
  const eyeY = 22;

  drawEye(eyeLeftX, eyeY);
  drawEye(eyeRightX, eyeY);

  // 9. EYEBROWS
  ctx.save();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';

  if (pose === 'shock') {
    // High arched shock brows
    ctx.beginPath();
    ctx.arc(eyeLeftX, -16, 26, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(eyeRightX, -16, 26, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else if (pose === 'think') {
    // Left brow arched high, right brow furrowed
    ctx.beginPath();
    ctx.arc(eyeLeftX, -18, 24, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(eyeRightX - 22, -8);
    ctx.lineTo(eyeRightX + 22, -2);
    ctx.stroke();
  } else {
    // Friendly arched smiling brows
    ctx.beginPath();
    ctx.arc(eyeLeftX, -8, 22, Math.PI * 1.18, Math.PI * 1.82);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(eyeRightX, -8, 22, Math.PI * 1.18, Math.PI * 1.82);
    ctx.stroke();
  }
  ctx.restore();

  // 10. MOUTH (Animated Lip-Sync, Talking, Smile & Gasp)
  ctx.save();
  ctx.translate(0, 56);

  if (pose === 'explain') {
    // DYNAMIC TALKING MOUTH FLAP (LIP SYNC)!
    const talkCycle = Math.abs(Math.sin(t * 13.5));
    const mouthOpen = 8 + talkCycle * 24;

    ctx.beginPath();
    ctx.ellipse(0, 0, 26, mouthOpen, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#4c0519'; // Deep cavity
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 6.5;
    ctx.stroke();

    // Upper teeth
    if (mouthOpen > 14) {
      ctx.beginPath();
      ctx.rect(-16, -mouthOpen + 2, 32, 9);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    // Pink tongue
    ctx.beginPath();
    ctx.ellipse(0, mouthOpen - 4, 16, 8, 0, 0, Math.PI);
    ctx.fillStyle = '#fb7185';
    ctx.fill();
  } else if (pose === 'shock') {
    // Huge open O gasp
    ctx.beginPath();
    ctx.ellipse(0, 4, 20, 32, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1e1b4b';
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 7;
    ctx.stroke();
  } else if (pose === 'think') {
    // Small sideways pursed curious mouth
    ctx.beginPath();
    ctx.arc(10, 0, 12, 0.4, Math.PI * 1.1);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();
  } else {
    // Broad open cartoon smile (classic Kok Bisa smile from reference photo)
    ctx.beginPath();
    ctx.arc(0, -6, 32, 0.15, Math.PI - 0.15);
    ctx.closePath();
    ctx.fillStyle = '#881337'; // Warm dark red mouth cavity
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 6.5;
    ctx.stroke();

    // White teeth band
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-26, -6, 52, 9);
    // Coral tongue
    ctx.beginPath();
    ctx.arc(0, 22, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#fb7185';
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  ctx.restore(); // End head
  ctx.restore(); // End body
}

/**
 * Deterministic Three.js 2D/3D Explainer Studio Renderer shared by PreviewPlayer and Mediabunny MP4 Export.
 */
export class Scene3DRenderer {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private floorMesh: THREE.Mesh;
  private gridHelper: THREE.GridHelper;
  private podiumRing: THREE.Mesh;
  private groundSketchMesh: THREE.Mesh;
  private propCanvas: HTMLCanvasElement;
  private propTexture: THREE.CanvasTexture;
  private propMesh: THREE.Mesh;
  private stickmanCanvas: HTMLCanvasElement;
  private stickmanCtx: CanvasRenderingContext2D | null;
  private stickmanTex: THREE.CanvasTexture;
  private stickman2DMesh: THREE.Mesh;
  private stickman2DMat: THREE.MeshBasicMaterial;
  private rig: StickmanRig;
  private badgeMesh: THREE.Mesh;
  private currentBadgeText = '';
  private currentTheme: StageTheme3D = 'paper-sketch';
  private glbGroup: THREE.Group | null = null;
  private glbMixer: THREE.AnimationMixer | null = null;
  private glbAnimations: THREE.AnimationClip[] = [];
  private loadedGlbUrl = '';
  private gltfLoader = new GLTFLoader();

  constructor(width = 640, height = 360) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: false,
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    this.camera.position.set(0, 1.25, 3.4);

    // 3-Point Studio Lighting
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 1.25);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    this.keyLight.position.set(2.5, 4.5, 3.5);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.rimLight.position.set(-2.5, 3.0, -3.0);
    this.scene.add(this.rimLight);

    // Studio Floor & Glowing Podium Ring
    const floorGeo = new THREE.CircleGeometry(10, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xfcfbf7,
      roughness: 0.95,
      metalness: 0.0,
    });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    this.gridHelper = new THREE.GridHelper(12, 24, 0xd1d5db, 0xd1d5db);
    this.gridHelper.position.y = 0.002;
    this.scene.add(this.gridHelper);

    this.podiumRing = new THREE.Mesh(
      new THREE.RingGeometry(0.65, 0.72, 48),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      })
    );
    this.podiumRing.rotation.x = -Math.PI / 2;
    this.podiumRing.position.y = 0.004;
    this.scene.add(this.podiumRing);

    // Hand-drawn sketchy pencil shadow lines under feet (Kok Bisa style)
    const groundGeo = new THREE.PlaneGeometry(2.1, 0.52);
    const groundMat = new THREE.MeshBasicMaterial({
      map: getGroundSketchTexture(),
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.groundSketchMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundSketchMesh.rotation.x = -Math.PI / 2;
    this.groundSketchMesh.position.set(0, 0.003, 0.05);
    this.scene.add(this.groundSketchMesh);

    // Procedural Storytelling Prop Billboard (Floating illustrations)
    this.propCanvas = document.createElement('canvas');
    this.propCanvas.width = 512;
    this.propCanvas.height = 512;
    this.propTexture = new THREE.CanvasTexture(this.propCanvas);
    this.propTexture.colorSpace = THREE.SRGBColorSpace;
    const propMat = new THREE.MeshBasicMaterial({
      map: this.propTexture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const propGeo = new THREE.PlaneGeometry(1.3, 1.3);
    this.propMesh = new THREE.Mesh(propGeo, propMat);
    this.propMesh.position.set(0.65, 1.45, 0.1);
    this.propMesh.visible = false;
    this.scene.add(this.propMesh);

    // Fully Articulated 2D Cartoon Character Canvas & Texture
    this.stickmanCanvas = document.createElement('canvas');
    this.stickmanCanvas.width = 1024;
    this.stickmanCanvas.height = 1024;
    this.stickmanCtx = this.stickmanCanvas.getContext('2d');
    this.stickmanTex = new THREE.CanvasTexture(this.stickmanCanvas);
    this.stickmanTex.colorSpace = THREE.SRGBColorSpace;

    // 2D Cartoon Stickman Character Plane (Pivot at bottom feet)
    const meshSize = 2.15;
    const planeGeo = new THREE.PlaneGeometry(meshSize, meshSize);
    planeGeo.translate(0, meshSize / 2, 0);

    this.stickman2DMat = new THREE.MeshBasicMaterial({
      map: this.stickmanTex,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.stickman2DMesh = new THREE.Mesh(planeGeo, this.stickman2DMat);
    this.stickman2DMesh.position.set(0, 0, 0.02);
    this.scene.add(this.stickman2DMesh);

    // Procedural Stickman Rig (kept hidden in 2D cartoon mode)
    this.rig = buildStickmanRig('#f8fafc');
    this.rig.root.visible = false;
    this.scene.add(this.rig.root);

    // Floating Cartoon Speech/Fact Badge
    const badgeGeo = new THREE.PlaneGeometry(1.85, 0.46);
    const badgeMat = new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
    this.badgeMesh.position.set(0, 2.38, 0);
    this.badgeMesh.visible = false;
    this.scene.add(this.badgeMesh);

    this.applyTheme('paper-sketch');
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  resize(width: number, height: number): void {
    if (this.canvas.width === width && this.canvas.height === height) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private applyTheme(theme: StageTheme3D): void {
    if (this.currentTheme === theme && this.scene.background) return;
    this.currentTheme = theme;
    const p = THEME_PALETTES[theme] || THEME_PALETTES['paper-sketch'];
    this.scene.background = new THREE.Color(p.bg);
    this.scene.fog = new THREE.Fog(p.fog, 6, 15);
    (this.floorMesh.material as THREE.MeshStandardMaterial).color.setHex(p.floor);
    this.rimLight.color.setHex(p.rim);
    this.keyLight.color.setHex(p.key);

    if (p.isCartoon) {
      this.gridHelper.visible = false;
      this.podiumRing.visible = false;
      this.groundSketchMesh.visible = theme === 'paper-sketch' || theme === 'light-studio';
      this.hemiLight.intensity = 1.35;
      this.keyLight.intensity = 1.55;
    } else {
      this.gridHelper.visible = true;
      this.podiumRing.visible = true;
      this.groundSketchMesh.visible = false;
      this.hemiLight.intensity = 0.9;
      this.keyLight.intensity = 1.85;
      (this.podiumRing.material as THREE.MeshBasicMaterial).color.setHex(p.rim);
    }
  }

  async ensureGlbLoaded(url: string): Promise<void> {
    if (!url || this.loadedGlbUrl === url) return;
    this.loadedGlbUrl = url;

    if (this.glbGroup) {
      this.scene.remove(this.glbGroup);
      this.glbGroup = null;
      this.glbMixer = null;
      this.glbAnimations = [];
    }

    const gltf = await this.gltfLoader.loadAsync(url);
    const model = gltf.scene;

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const scale = 1.8 / maxDim;
    model.scale.setScalar(scale);

    const scaledBox = new THREE.Box3().setFromObject(model);
    const center = scaledBox.getCenter(new THREE.Vector3());
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= scaledBox.min.y;

    model.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    this.scene.add(model);
    this.glbGroup = model;
    this.glbAnimations = gltf.animations || [];
    if (this.glbAnimations.length > 0) {
      this.glbMixer = new THREE.AnimationMixer(model);
    }
  }

  renderAt(timeSec: number, durationSec: number, config: Scene3DConfig): void {
    this.applyTheme(config.stageTheme);

    const safeDur = Math.max(0.1, durationSec);
    const progress = Math.max(0, Math.min(1, timeSec / safeDur));
    const animTime = timeSec * (config.animationSpeed || 1);

    if (config.mode === 'glb' && config.glbUrl && this.glbGroup) {
      this.rig.root.visible = false;
      this.stickman2DMesh.visible = false;
      this.glbGroup.visible = true;
      this.groundSketchMesh.visible = false;
      this.propMesh.visible = false;
      if (this.glbMixer && this.glbAnimations.length > 0) {
        const idx = Math.min(config.glbAnimationIndex || 0, this.glbAnimations.length - 1);
        const clip = this.glbAnimations[idx];
        const action = this.glbMixer.clipAction(clip);
        if (!action.isRunning()) {
          this.glbMixer.stopAllAction();
          action.play();
        }
        this.glbMixer.setTime(animTime % Math.max(0.01, clip.duration));
      }
    } else {
      if (this.glbGroup) this.glbGroup.visible = false;
      this.rig.root.visible = false; // Procedural 3D mannequin mesh is hidden
      this.stickman2DMesh.visible = true; // Authentic 2D Cartoon Character is shown

      const animType = config.cartoonAnimType ?? 'articulated';

      if (animType === 'photo-cutout') {
        // Fallback to static cutout photo with cartoon squash & stretch kinematics
        const isPaperSketch =
          config.stageTheme === 'paper-sketch' || config.stageTheme === 'light-studio';
        const targetTex = isPaperSketch
          ? cachedStickmanOriginalTex || cachedStickmanCutoutTex || getStickmanPlaceholderTexture()
          : cachedStickmanCutoutTex || cachedStickmanOriginalTex || getStickmanPlaceholderTexture();

        if (this.stickman2DMat.map !== targetTex) {
          this.stickman2DMat.map = targetTex;
          this.stickman2DMat.needsUpdate = true;
        }

        let bounceY = 0;
        let scaleX = 1.0;
        let scaleY = 1.0;
        let tiltZ = 0;
        let posX = 0;

        switch (config.pose) {
          case 'wave': {
            tiltZ = Math.sin(animTime * 5.5) * 0.045;
            bounceY = Math.abs(Math.sin(animTime * 5.5)) * 0.04;
            scaleY = 1.0 + Math.sin(animTime * 5.5) * 0.035;
            scaleX = 1.0 - Math.sin(animTime * 5.5) * 0.025;
            break;
          }
          case 'explain': {
            bounceY = Math.sin(animTime * 4.8) * 0.025;
            tiltZ = Math.sin(animTime * 3.2) * 0.028;
            scaleY = 1.0 + Math.sin(animTime * 4.8) * 0.028;
            scaleX = 1.0 - Math.sin(animTime * 4.8) * 0.02;
            break;
          }
          case 'think': {
            tiltZ = 0.048 + Math.sin(animTime * 2.2) * 0.022;
            bounceY = Math.sin(animTime * 2.4) * 0.018;
            scaleY = 1.0 + Math.sin(animTime * 2.4) * 0.015;
            scaleX = 1.0 - Math.sin(animTime * 2.4) * 0.012;
            break;
          }
          case 'shock': {
            const jitterX = Math.sin(animTime * 45) * 0.018;
            posX = jitterX;
            bounceY = Math.abs(Math.sin(animTime * 8.5)) * 0.085;
            scaleY = 1.08 + Math.sin(animTime * 14) * 0.045;
            scaleX = 0.93 - Math.sin(animTime * 14) * 0.035;
            tiltZ = Math.sin(animTime * 28) * 0.02;
            break;
          }
          case 'point': {
            tiltZ = -0.035 + Math.sin(animTime * 3.0) * 0.012;
            bounceY = Math.sin(animTime * 4.0) * 0.02;
            scaleY = 1.0 + Math.sin(animTime * 4.0) * 0.018;
            scaleX = 1.0 - Math.sin(animTime * 4.0) * 0.014;
            break;
          }
          case 'walk': {
            bounceY = Math.abs(Math.sin(animTime * 7.0)) * 0.06;
            tiltZ = Math.sin(animTime * 3.5) * 0.052;
            scaleX = 1.0 + Math.sin(animTime * 7.0) * 0.03;
            scaleY = 1.0 - Math.sin(animTime * 7.0) * 0.03;
            break;
          }
          case 'idle':
          default: {
            bounceY = Math.sin(animTime * 3.5) * 0.015;
            scaleY = 1.0 + Math.sin(animTime * 3.5) * 0.018;
            scaleX = 1.0 - Math.sin(animTime * 3.5) * 0.014;
            tiltZ = Math.sin(animTime * 1.8) * 0.012;
            break;
          }
        }

        this.stickman2DMesh.position.set(posX, Math.max(0, bounceY), 0.02);
        this.stickman2DMesh.scale.set(1.793 * scaleX, scaleY, 1);
        this.stickman2DMesh.rotation.z = tiltZ;
      } else {
        // Articulated 2D Cartoon Engine (Living, expressive, articulated character)
        if (this.stickmanCtx) {
          renderArticulatedStickman2D(
            this.stickmanCtx,
            1024,
            1024,
            config.pose,
            animTime,
            config
          );
          this.stickmanTex.needsUpdate = true;
        }
        if (this.stickman2DMat.map !== this.stickmanTex) {
          this.stickman2DMat.map = this.stickmanTex;
          this.stickman2DMat.needsUpdate = true;
        }

        this.stickman2DMesh.position.set(0, 0, 0.02);
        this.stickman2DMesh.scale.set(1, 1, 1);
        this.stickman2DMesh.rotation.z = 0;
      }

      // Render Storytelling Prop (Illustrations & Visual Story Elements)
      const effectiveProp: StoryProp3D =
        config.storyProp ??
        (config.pose === 'think'
          ? 'thought-question'
          : config.pose === 'shock'
          ? 'comic-shock'
          : config.pose === 'explain'
          ? 'idea-bulb'
          : 'none');

      if (effectiveProp !== 'none') {
        this.propMesh.visible = true;
        renderStoryPropCanvas(effectiveProp, animTime, this.propCanvas);
        this.propTexture.needsUpdate = true;

        if (effectiveProp === 'comic-shock') {
          // Dynamic comic speed lines bursting behind the character!
          this.propMesh.position.set(0, 1.25, -0.15);
          this.propMesh.scale.set(2.4, 2.4, 1);
        } else if (effectiveProp === 'thought-question' || effectiveProp === 'idea-bulb') {
          this.propMesh.position.set(0.68, 1.82 + Math.sin(animTime * 3.5) * 0.035, 0.15);
          this.propMesh.scale.set(1.2, 1.2, 1);
        } else {
          this.propMesh.position.set(0.78, 1.48 + Math.sin(animTime * 3.0) * 0.035, 0.15);
          this.propMesh.scale.set(1.2, 1.2, 1);
        }
        this.propMesh.lookAt(this.camera.position);
      } else {
        this.propMesh.visible = false;
      }
    }

    const badgeText = (config.factBadgeText || '').trim();
    if (badgeText) {
      if (badgeText !== this.currentBadgeText) {
        this.currentBadgeText = badgeText;
        const mat = this.badgeMesh.material as THREE.MeshBasicMaterial;
        mat.map?.dispose();
        mat.map = createFactBadgeTexture(badgeText);
        mat.needsUpdate = true;
      }
      this.badgeMesh.visible = true;
      this.badgeMesh.position.set(-0.15, 2.38 + Math.sin(timeSec * 2.5) * 0.035, 0);
      this.badgeMesh.lookAt(this.camera.position);
    } else {
      this.badgeMesh.visible = false;
    }

    const lookTarget = new THREE.Vector3(0, 1.25, 0);
    const themeObj = THEME_PALETTES[config.stageTheme] || THEME_PALETTES['paper-sketch'];

    switch (config.cameraPreset) {
      case 'orbit': {
        const angle = -0.45 + progress * Math.PI * 0.9;
        this.camera.position.set(Math.sin(angle) * 3.5, 1.5, Math.cos(angle) * 3.5);
        break;
      }
      case 'zoom-in': {
        const z = 3.9 - progress * 1.35;
        this.camera.position.set(0.12, 1.32 - progress * 0.06, z);
        break;
      }
      case 'low-angle': {
        this.camera.position.set(Math.sin(progress * 0.6) * 0.6, 0.76, 3.1);
        lookTarget.y = 1.32;
        break;
      }
      case 'pan': {
        const x = -0.75 + progress * 1.5;
        this.camera.position.set(x, 1.35, 3.4);
        break;
      }
      case 'presenter':
      default: {
        if (themeObj.isCartoon) {
          // Stable, beautifully framed 2D explainer camera shot (Kok Bisa style)
          this.camera.position.set(0.12, 1.26, 3.25);
          lookTarget.set(0.12, 1.18, 0);
        } else {
          this.camera.position.set(
            Math.sin(timeSec * 0.8) * 0.14,
            1.36 + Math.cos(timeSec * 0.7) * 0.04,
            3.45
          );
        }
        break;
      }
    }
    this.camera.lookAt(lookTarget);

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    const mat = this.badgeMesh.material as THREE.MeshBasicMaterial;
    mat.map?.dispose();
    this.propTexture.dispose();
    this.stickmanTex.dispose();
    this.stickman2DMesh.geometry.dispose();
    this.stickman2DMat.dispose();
    this.renderer.dispose();
  }
}

/**
 * Generates a static preview thumbnail DataURL for a 3D Stickman clip on the timeline.
 */
export function create3DClipThumbnail(config: Scene3DConfig): string {
  const tempRenderer = new Scene3DRenderer(240, 135);
  try {
    tempRenderer.renderAt(0.4, 5, config);
    return tempRenderer.getCanvas().toDataURL('image/jpeg', 0.8);
  } finally {
    tempRenderer.dispose();
  }
}
