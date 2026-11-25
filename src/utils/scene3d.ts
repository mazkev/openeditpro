import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Scene3DConfig, StageTheme3D, StickmanPose } from '../types/editor';

interface StickmanRig {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
  bodyMaterial: THREE.MeshStandardMaterial;
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
    bg: 0xe2e8f0,
    fog: 0xe2e8f0,
    floor: 0xf1f5f9,
    grid: 0xcbd5e1,
    rim: 0x60a5fa,
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

function createLimbMesh(
  radiusTop: number,
  radiusBottom: number,
  length: number,
  material: THREE.Material
): THREE.Mesh {
  const geo = new THREE.CapsuleGeometry(
    (radiusTop + radiusBottom) / 2,
    Math.max(0.05, length - (radiusTop + radiusBottom)),
    8,
    16
  );
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = -length / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildStickmanRig(colorHex: string): StickmanRig {
  const root = new THREE.Group();

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.35,
    metalness: 0.08,
  });

  const eyeColor =
    colorHex.toLowerCase() === '#1e293b' || colorHex.toLowerCase() === '#000000'
      ? 0x38bdf8
      : 0x0f172a;
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: eyeColor,
    roughness: 0.2,
    emissive: colorHex.toLowerCase() === '#1e293b' ? 0x0ea5e9 : 0x000000,
    emissiveIntensity: 0.6,
  });

  // Hips (pelvis center at y = 0.95)
  const hips = new THREE.Group();
  hips.position.y = 0.95;
  root.add(hips);

  const pelvisMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 16, 16),
    bodyMaterial
  );
  pelvisMesh.castShadow = true;
  hips.add(pelvisMesh);

  // Torso
  const torso = new THREE.Group();
  hips.add(torso);

  const spineGeo = new THREE.CapsuleGeometry(0.085, 0.45, 8, 16);
  const spineMesh = new THREE.Mesh(spineGeo, bodyMaterial);
  spineMesh.position.y = 0.3;
  spineMesh.castShadow = true;
  torso.add(spineMesh);

  // Head
  const head = new THREE.Group();
  head.position.y = 0.64;
  torso.add(head);

  const headMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 24, 24),
    bodyMaterial
  );
  headMesh.position.y = 0.18;
  headMesh.castShadow = true;
  head.add(headMesh);

  // Expressive Eyes
  const eyeGeo = new THREE.SphereGeometry(0.036, 12, 12);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
  leftEye.position.set(-0.085, 0.2, 0.21);
  leftEye.scale.set(1, 1.35, 0.6);
  head.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
  rightEye.position.set(0.085, 0.2, 0.21);
  rightEye.scale.set(1, 1.35, 0.6);
  head.add(rightEye);

  // Left Arm
  const leftShoulder = new THREE.Group();
  leftShoulder.position.set(-0.16, 0.52, 0);
  torso.add(leftShoulder);
  leftShoulder.add(createLimbMesh(0.05, 0.045, 0.34, bodyMaterial));

  const leftElbow = new THREE.Group();
  leftElbow.position.y = -0.34;
  leftShoulder.add(leftElbow);
  leftElbow.add(createLimbMesh(0.045, 0.04, 0.32, bodyMaterial));

  const leftHand = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 12, 12),
    bodyMaterial
  );
  leftHand.position.y = -0.34;
  leftHand.castShadow = true;
  leftElbow.add(leftHand);

  // Right Arm
  const rightShoulder = new THREE.Group();
  rightShoulder.position.set(0.16, 0.52, 0);
  torso.add(rightShoulder);
  rightShoulder.add(createLimbMesh(0.05, 0.045, 0.34, bodyMaterial));

  const rightElbow = new THREE.Group();
  rightElbow.position.y = -0.34;
  rightShoulder.add(rightElbow);
  rightElbow.add(createLimbMesh(0.045, 0.04, 0.32, bodyMaterial));

  const rightHand = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 12, 12),
    bodyMaterial
  );
  rightHand.position.y = -0.34;
  rightHand.castShadow = true;
  rightElbow.add(rightHand);

  // Left Leg
  const leftHip = new THREE.Group();
  leftHip.position.set(-0.11, -0.02, 0);
  hips.add(leftHip);
  leftHip.add(createLimbMesh(0.058, 0.05, 0.44, bodyMaterial));

  const leftKnee = new THREE.Group();
  leftKnee.position.y = -0.44;
  leftHip.add(leftKnee);
  leftKnee.add(createLimbMesh(0.05, 0.045, 0.44, bodyMaterial));

  const leftFoot = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.055, 0.1, 6, 12),
    bodyMaterial
  );
  leftFoot.rotation.x = Math.PI / 2;
  leftFoot.position.set(0, -0.45, 0.05);
  leftFoot.castShadow = true;
  leftKnee.add(leftFoot);

  // Right Leg
  const rightHip = new THREE.Group();
  rightHip.position.set(0.11, -0.02, 0);
  hips.add(rightHip);
  rightHip.add(createLimbMesh(0.058, 0.05, 0.44, bodyMaterial));

  const rightKnee = new THREE.Group();
  rightKnee.position.y = -0.44;
  rightHip.add(rightKnee);
  rightKnee.add(createLimbMesh(0.05, 0.045, 0.44, bodyMaterial));

  const rightFoot = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.055, 0.1, 6, 12),
    bodyMaterial
  );
  rightFoot.rotation.x = Math.PI / 2;
  rightFoot.position.set(0, -0.45, 0.05);
  rightFoot.castShadow = true;
  rightKnee.add(rightFoot);

  return {
    root,
    hips,
    torso,
    head,
    leftEye,
    rightEye,
    leftShoulder,
    leftElbow,
    rightShoulder,
    rightElbow,
    leftHip,
    leftKnee,
    rightHip,
    rightKnee,
    bodyMaterial,
  };
}

function applyStickmanPose(rig: StickmanRig, pose: StickmanPose, t: number) {
  // Reset transforms before applying pose
  rig.root.position.set(0, 0, 0);
  rig.root.rotation.set(0, 0, 0);
  rig.hips.position.set(0, 0.95, 0);
  rig.hips.rotation.set(0, 0, 0);
  rig.torso.rotation.set(0, 0, 0);
  rig.head.rotation.set(0, 0, 0);
  rig.leftEye.scale.set(1, 1.35, 0.6);
  rig.rightEye.scale.set(1, 1.35, 0.6);
  rig.leftShoulder.rotation.set(0, 0, 0.12);
  rig.leftElbow.rotation.set(-0.2, 0, 0);
  rig.rightShoulder.rotation.set(0, 0, -0.12);
  rig.rightElbow.rotation.set(-0.2, 0, 0);
  rig.leftHip.rotation.set(0, 0, 0.03);
  rig.leftKnee.rotation.set(0, 0, 0);
  rig.rightHip.rotation.set(0, 0, -0.03);
  rig.rightKnee.rotation.set(0, 0, 0);

  switch (pose) {
    case 'explain': {
      // Energetic presenter talking & gesturing
      const bob = Math.abs(Math.sin(t * 4.5)) * 0.03;
      rig.hips.position.y = 0.95 + bob;
      rig.torso.rotation.y = Math.sin(t * 2.2) * 0.12;
      rig.head.rotation.y = Math.sin(t * 2.2 + 0.5) * 0.14;
      rig.head.rotation.x = Math.sin(t * 4.5) * 0.06;

      rig.leftShoulder.rotation.set(-0.7 + Math.sin(t * 5) * 0.25, 0, 0.35);
      rig.leftElbow.rotation.set(-1.1 + Math.cos(t * 5) * 0.25, 0, 0);

      rig.rightShoulder.rotation.set(-0.8 + Math.cos(t * 4.5) * 0.25, 0, -0.35);
      rig.rightElbow.rotation.set(-1.15 + Math.sin(t * 4.5) * 0.25, 0, 0);
      break;
    }

    case 'think': {
      // Hand on chin, head tilted curiously
      rig.torso.rotation.z = -0.06;
      rig.torso.rotation.y = -0.15;
      rig.head.rotation.z = 0.15 + Math.sin(t * 1.8) * 0.05;
      rig.head.rotation.x = -0.08;
      // Squinted thoughtful eyes
      rig.leftEye.scale.set(1, 0.75, 0.6);
      rig.rightEye.scale.set(1.1, 1.4, 0.6);

      // Right hand raised to chin
      rig.rightShoulder.rotation.set(-1.35, -0.3, -0.15);
      rig.rightElbow.rotation.set(-1.65, 0, 0.35);

      // Left arm crossed across waist
      rig.leftShoulder.rotation.set(-0.5, 0.4, 0.15);
      rig.leftElbow.rotation.set(-1.3, 0, -0.5);
      break;
    }

    case 'shock': {
      // Mindblown jump + wide eyes + hands raised
      const jump = Math.max(0, Math.sin(t * 6)) * 0.22;
      rig.hips.position.y = 0.95 + jump;
      rig.torso.rotation.x = -0.15;
      rig.head.rotation.x = -0.2;
      rig.leftEye.scale.set(1.35, 1.8, 0.6);
      rig.rightEye.scale.set(1.35, 1.8, 0.6);

      rig.leftShoulder.rotation.set(-2.3 + Math.sin(t * 8) * 0.15, 0, 0.55);
      rig.leftElbow.rotation.set(-0.6, 0, 0);
      rig.rightShoulder.rotation.set(-2.3 + Math.cos(t * 8) * 0.15, 0, -0.55);
      rig.rightElbow.rotation.set(-0.6, 0, 0);

      rig.leftHip.rotation.x = -jump * 1.2;
      rig.leftKnee.rotation.x = jump * 2.2;
      rig.rightHip.rotation.x = -jump * 1.2;
      rig.rightKnee.rotation.x = jump * 2.2;
      break;
    }

    case 'point': {
      // Pointing upward/sideways toward fact text
      rig.torso.rotation.y = -0.2;
      rig.head.rotation.y = 0.18;
      rig.head.rotation.x = -0.15 + Math.sin(t * 3) * 0.05;

      rig.rightShoulder.rotation.set(-2.15 + Math.sin(t * 4) * 0.1, 0, -0.45);
      rig.rightElbow.rotation.set(-0.25, 0, 0);

      rig.leftShoulder.rotation.set(-0.25, 0, 0.35);
      rig.leftElbow.rotation.set(-0.9, 0, 0);
      break;
    }

    case 'wave': {
      // Friendly wave for intro / outro
      rig.hips.position.y = 0.95 + Math.sin(t * 3) * 0.025;
      rig.head.rotation.z = Math.sin(t * 3) * 0.08;
      rig.rightShoulder.rotation.set(-2.4, 0, -0.4 + Math.sin(t * 8) * 0.28);
      rig.rightElbow.rotation.set(-0.55 + Math.sin(t * 8) * 0.25, 0, 0);
      rig.leftShoulder.rotation.set(0, 0, 0.2);
      break;
    }

    case 'walk': {
      // Smooth walk cycle in place
      const phase = t * 5.5;
      const swing = Math.sin(phase);
      const lift = Math.abs(Math.cos(phase));
      rig.hips.position.y = 0.93 + lift * 0.04;
      rig.torso.rotation.y = -swing * 0.12;
      rig.head.rotation.y = swing * 0.08;

      rig.leftHip.rotation.x = swing * 0.55;
      rig.leftKnee.rotation.x = Math.max(0, -swing) * 0.75;
      rig.rightHip.rotation.x = -swing * 0.55;
      rig.rightKnee.rotation.x = Math.max(0, swing) * 0.75;

      rig.leftShoulder.rotation.x = -swing * 0.45;
      rig.leftElbow.rotation.x = -0.45;
      rig.rightShoulder.rotation.x = swing * 0.45;
      rig.rightElbow.rotation.x = -0.45;
      break;
    }

    case 'idle':
    default: {
      // Gentle breathing & nod
      rig.hips.position.y = 0.95 + Math.sin(t * 2.2) * 0.015;
      rig.head.rotation.x = Math.sin(t * 2.2) * 0.04;
      rig.leftShoulder.rotation.set(0, 0, 0.14 + Math.sin(t * 2.2) * 0.03);
      rig.rightShoulder.rotation.set(0, 0, -0.14 - Math.sin(t * 2.2) * 0.03);
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

  // Pill background
  const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  grad.addColorStop(0, 'rgba(139, 92, 246, 0.92)');
  grad.addColorStop(1, 'rgba(6, 182, 212, 0.92)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(16, 20, canvas.width - 32, canvas.height - 40, 32);
  ctx.fill();

  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
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
    this.renderer.toneMappingExposure = 1.1;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    this.camera.position.set(0, 1.35, 3.6);

    // 3-Point Studio Lighting
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 0.85);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    this.keyLight.position.set(2.5, 4.5, 3.5);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0x38bdf8, 1.6);
    this.rimLight.position.set(-2.5, 3.0, -3.0);
    this.scene.add(this.rimLight);

    // Studio Floor & Glowing Podium Ring
    const floorGeo = new THREE.CircleGeometry(10, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.75,
      metalness: 0.1,
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
        opacity: 0.75,
      })
    );
    this.podiumRing.rotation.x = -Math.PI / 2;
    this.podiumRing.position.y = 0.004;
    this.scene.add(this.podiumRing);

    // Procedural Stickman
    this.rig = buildStickmanRig('#f8fafc');
    this.scene.add(this.rig.root);

    // Floating 3D Fact Badge
    const badgeGeo = new THREE.PlaneGeometry(1.7, 0.42);
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

    // Auto-normalize size to ~1.8m height and center on floor
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

    // Character mode (Stickman vs uploaded GLB)
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
      this.rig.bodyMaterial.color.set(config.characterColor || '#f8fafc');
      applyStickmanPose(this.rig, config.pose, animTime);
    }

    // Floating 3D Fact Badge
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

    // Camera animation preset
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
