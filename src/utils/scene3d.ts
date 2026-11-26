import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type {
  SarungPattern,
  Scene3DConfig,
  StageTheme3D,
  StickmanPose,
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
  { bg: number; fog: number; floor: number; grid: number; rim: number; key: number }
> = {
  'dark-studio': {
    bg: 0x0b1120,
    fog: 0x0b1120,
    floor: 0x111827,
    grid: 0x1e293b,
    rim: 0x38bdf8,
    key: 0xffffff,
  },
  'neon-cyber': {
    bg: 0x130f2e,
    fog: 0x130f2e,
    floor: 0x1a143d,
    grid: 0x7c3aed,
    rim: 0x22d3ee,
    key: 0xf8fafc,
  },
  'light-studio': {
    bg: 0xf8fafc,
    fog: 0xf8fafc,
    floor: 0xf1f5f9,
    grid: 0xd1d5db,
    rim: 0x64748b,
    key: 0xffffff,
  },
  'warm-sunset': {
    bg: 0x2a1205,
    fog: 0x2a1205,
    floor: 0x3b1808,
    grid: 0x9a3412,
    rim: 0xfbbf24,
    key: 0xfff7ed,
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

function applyStickmanPose(rig: StickmanRig, pose: StickmanPose, t: number) {
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

  const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  grad.addColorStop(0, 'rgba(139, 92, 246, 0.95)');
  grad.addColorStop(1, 'rgba(6, 182, 212, 0.95)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(16, 20, canvas.width - 32, canvas.height - 40, 32);
  ctx.fill();

  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 54px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 8;
  ctx.fillText(text.toUpperCase().slice(0, 26), canvas.width / 2, canvas.height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Deterministic Three.js 3D Studio Renderer shared by PreviewPlayer and Mediabunny MP4 Export.
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
  private rig: StickmanRig;
  private badgeMesh: THREE.Mesh;
  private currentBadgeText = '';
  private currentTheme: StageTheme3D = 'dark-studio';
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
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    this.camera.position.set(0, 1.35, 3.6);

    // 3-Point Studio Lighting
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 0.9);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xffffff, 1.85);
    this.keyLight.position.set(2.5, 4.5, 3.5);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
    this.rimLight.position.set(-2.5, 3.0, -3.0);
    this.scene.add(this.rimLight);

    // Studio Floor & Glowing Podium Ring
    const floorGeo = new THREE.CircleGeometry(10, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.85,
      metalness: 0.05,
    });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    this.gridHelper = new THREE.GridHelper(12, 24, 0x1e293b, 0x1e293b);
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

    // Procedural 3D Stickman
    this.rig = buildStickmanRig('#f8fafc');
    this.scene.add(this.rig.root);

    // Floating 3D Fact Badge
    const badgeGeo = new THREE.PlaneGeometry(1.75, 0.44);
    const badgeMat = new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
    this.badgeMesh.position.set(0, 2.38, 0);
    this.badgeMesh.visible = false;
    this.scene.add(this.badgeMesh);

    this.applyTheme('dark-studio');
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
    const p = THEME_PALETTES[theme] || THEME_PALETTES['dark-studio'];
    this.scene.background = new THREE.Color(p.bg);
    this.scene.fog = new THREE.Fog(p.fog, 6, 15);
    (this.floorMesh.material as THREE.MeshStandardMaterial).color.setHex(p.floor);
    this.rimLight.color.setHex(p.rim);
    this.keyLight.color.setHex(p.key);
    (this.podiumRing.material as THREE.MeshBasicMaterial).color.setHex(p.rim);
    this.scene.remove(this.gridHelper);
    this.gridHelper = new THREE.GridHelper(12, 24, p.grid, p.grid);
    this.gridHelper.position.y = 0.002;
    this.scene.add(this.gridHelper);
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
      this.glbGroup.visible = true;
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
      this.rig.root.visible = true;
      const col = config.characterColor || '#f8fafc';
      this.rig.bodyMaterial.color.set(col);
      const isDark = col.toLowerCase() === '#1e293b' || col.toLowerCase() === '#000000';
      this.rig.outlineMaterial.color.setHex(isDark ? 0x38bdf8 : 0x0f172a);

      const isBlangkon = (config.characterStyle ?? 'blangkon') === 'blangkon';
      this.rig.blangkonGroup.visible = isBlangkon;
      this.rig.sarungGroup.visible = isBlangkon;

      if (isBlangkon) {
        const pattern = config.sarungPattern || 'plaid-red';
        const sarungTex = getSarungTexture(pattern);
        if (this.rig.sarungMaterial.map !== sarungTex) {
          this.rig.sarungMaterial.map = sarungTex;
          this.rig.sarungMaterial.needsUpdate = true;
          this.rig.sarungKnotMaterial.map = sarungTex;
          this.rig.sarungKnotMaterial.needsUpdate = true;
        }
      }

      applyStickmanPose(this.rig, config.pose, animTime);
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
      this.badgeMesh.position.y = 2.38 + Math.sin(timeSec * 2.5) * 0.035;
      this.badgeMesh.lookAt(this.camera.position);
    } else {
      this.badgeMesh.visible = false;
    }

    const lookTarget = new THREE.Vector3(0, 1.25, 0);
    switch (config.cameraPreset) {
      case 'orbit': {
        const angle = -0.45 + progress * Math.PI * 0.9;
        this.camera.position.set(Math.sin(angle) * 3.5, 1.5, Math.cos(angle) * 3.5);
        break;
      }
      case 'zoom-in': {
        const z = 4.0 - progress * 1.45;
        this.camera.position.set(0.15, 1.38 - progress * 0.08, z);
        break;
      }
      case 'low-angle': {
        this.camera.position.set(Math.sin(progress * 0.6) * 0.7, 0.72, 3.15);
        lookTarget.y = 1.35;
        break;
      }
      case 'pan': {
        const x = -0.85 + progress * 1.7;
        this.camera.position.set(x, 1.4, 3.5);
        break;
      }
      case 'presenter':
      default: {
        this.camera.position.set(
          Math.sin(timeSec * 0.8) * 0.14,
          1.36 + Math.cos(timeSec * 0.7) * 0.04,
          3.45
        );
        break;
      }
    }
    this.camera.lookAt(lookTarget);

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    const mat = this.badgeMesh.material as THREE.MeshBasicMaterial;
    mat.map?.dispose();
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
