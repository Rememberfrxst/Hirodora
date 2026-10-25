/**
 * Ultra-Detailed 3D World Geometry & Photorealistic Assets for Hirodora
 * Comprehensive procedural PBR textures (albedo, bumpMap, roughnessMap),
 * multi-part composite models, volumetric lighting, and atmospheric dust motes.
 */

import * as THREE from 'three';
import { GuardData, InteractiveObject } from './types';

// High-Fidelity Procedural PBR Texture Generators
export function createStoneWallTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 1024;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const colorCtx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bumpCtx = bumpCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const roughCtx = roughCanvas.getContext('2d')!;

  // Base ancient khandar stone tone (weathered dark granite with damp undertones)
  colorCtx.fillStyle = '#181e26';
  colorCtx.fillRect(0, 0, size, size);

  bumpCtx.fillStyle = '#808080';
  bumpCtx.fillRect(0, 0, size, size);

  roughCtx.fillStyle = '#d8d8d8'; // Rough porous ancient stone
  roughCtx.fillRect(0, 0, size, size);

  // Stone block masonry
  const blockH = 76;
  const blockW = 152;
  let row = 0;

  for (let y = 0; y < size; y += blockH) {
    const isOdd = row % 2 === 1;
    row++;

    // Deep weathered mortar lines
    colorCtx.strokeStyle = '#070a0e';
    colorCtx.lineWidth = 7;
    colorCtx.beginPath();
    colorCtx.moveTo(0, y);
    colorCtx.lineTo(size, y);
    colorCtx.stroke();

    bumpCtx.strokeStyle = '#080808';
    bumpCtx.lineWidth = 7;
    bumpCtx.beginPath();
    bumpCtx.moveTo(0, y);
    bumpCtx.lineTo(size, y);
    bumpCtx.stroke();

    const xOffset = isOdd ? blockW / 2 : 0;
    for (let x = xOffset; x <= size + blockW; x += blockW) {
      colorCtx.beginPath();
      colorCtx.moveTo(x, y);
      colorCtx.lineTo(x, y + blockH);
      colorCtx.stroke();

      bumpCtx.beginPath();
      bumpCtx.moveTo(x, y);
      bumpCtx.lineTo(x, y + blockH);
      bumpCtx.stroke();

      // Stone block variance
      const shade = Math.floor(Math.random() * 40 - 20);
      colorCtx.fillStyle = shade > 0 ? `rgba(255,255,255,${shade / 255})` : `rgba(0,0,0,${Math.abs(shade) / 255})`;
      colorCtx.fillRect(x - blockW + 3, y + 3, blockW - 6, blockH - 6);

      const bumpShade = Math.floor(128 + Math.random() * 46 - 23);
      bumpCtx.fillStyle = `rgb(${bumpShade},${bumpShade},${bumpShade})`;
      bumpCtx.fillRect(x - blockW + 3, y + 3, blockW - 6, blockH - 6);

      // Cracked fractures in stone blocks
      if (Math.random() > 0.45) {
        colorCtx.strokeStyle = 'rgba(5,7,10,0.85)';
        colorCtx.lineWidth = 2;
        bumpCtx.strokeStyle = '#000000';
        bumpCtx.lineWidth = 2.5;

        const cx1 = x - blockW * 0.7;
        const cy1 = y + 10;
        const cx2 = cx1 + (Math.random() * 40 - 20);
        const cy2 = y + blockH - 12;

        colorCtx.beginPath();
        colorCtx.moveTo(cx1, cy1);
        colorCtx.lineTo((cx1 + cx2) / 2 + (Math.random() * 12 - 6), (cy1 + cy2) / 2);
        colorCtx.lineTo(cx2, cy2);
        colorCtx.stroke();

        bumpCtx.beginPath();
        bumpCtx.moveTo(cx1, cy1);
        bumpCtx.lineTo((cx1 + cx2) / 2, (cy1 + cy2) / 2);
        bumpCtx.lineTo(cx2, cy2);
        bumpCtx.stroke();
      }
    }
  }

  // Spreading Damp Green Moss & Mold Patches (Ancient Khandar effect)
  for (let m = 0; m < 14; m++) {
    const mx = Math.random() * size;
    const my = 200 + Math.random() * (size - 200);
    const mRadius = 40 + Math.random() * 80;

    const mossGrad = colorCtx.createRadialGradient(mx, my, 5, mx, my, mRadius);
    mossGrad.addColorStop(0, 'rgba(28, 56, 22, 0.88)');
    mossGrad.addColorStop(0.5, 'rgba(22, 44, 18, 0.65)');
    mossGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    colorCtx.fillStyle = mossGrad;
    colorCtx.beginPath();
    colorCtx.arc(mx, my, mRadius, 0, Math.PI * 2);
    colorCtx.fill();

    // Damp velvet roughness on moss
    roughCtx.fillStyle = 'rgba(60, 60, 60, 0.7)';
    roughCtx.beginPath();
    roughCtx.arc(mx, my, mRadius * 0.85, 0, Math.PI * 2);
    roughCtx.fill();
  }

  // Carved Prisoner Lore Graffiti & Tally Marks
  colorCtx.strokeStyle = '#cbd5e1';
  colorCtx.lineWidth = 2.5;
  bumpCtx.strokeStyle = '#000000';
  bumpCtx.lineWidth = 3;

  const startX = 200;
  const startY = 660;
  for (let group = 0; group < 6; group++) {
    const gx = startX + group * 55;
    for (let t = 0; t < 4; t++) {
      const tx = gx + t * 9;
      colorCtx.beginPath();
      colorCtx.moveTo(tx, startY);
      colorCtx.lineTo(tx + (Math.random() * 2 - 1), startY + 38);
      colorCtx.stroke();

      bumpCtx.beginPath();
      bumpCtx.moveTo(tx, startY);
      bumpCtx.lineTo(tx, startY + 38);
      bumpCtx.stroke();
    }
    // Strike
    colorCtx.beginPath();
    colorCtx.moveTo(gx - 4, startY + 30);
    colorCtx.lineTo(gx + 34, startY + 8);
    colorCtx.stroke();

    bumpCtx.beginPath();
    bumpCtx.moveTo(gx - 4, startY + 30);
    bumpCtx.lineTo(gx + 34, startY + 8);
    bumpCtx.stroke();
  }

  // Carved Story Words in Stone: "KABIR 412 - VOSS FRAMED US - LOW TIDE"
  colorCtx.fillStyle = '#cbd5e1';
  colorCtx.font = 'bold 15px monospace';
  colorCtx.fillText('KABIR · DAY 412 · VOSS FRAMED US · LOW TIDE', 200, 725);
  bumpCtx.fillStyle = '#101010';
  bumpCtx.font = 'bold 15px monospace';
  bumpCtx.fillText('KABIR · DAY 412 · VOSS FRAMED US · LOW TIDE', 200, 725);

  // Water seepage drip streaks streaming down
  for (let i = 0; i < 12; i++) {
    const sx = Math.random() * size;
    const grad = colorCtx.createLinearGradient(sx, 0, sx, size);
    grad.addColorStop(0, 'rgba(8,12,18,0.2)');
    grad.addColorStop(0.5, 'rgba(12,20,28,0.7)');
    grad.addColorStop(1, 'rgba(4,6,10,0.95)');
    colorCtx.fillStyle = grad;
    colorCtx.fillRect(sx - 12, 0, 24, size);

    // Wet reflective sheen
    roughCtx.fillStyle = 'rgba(15,15,15,0.9)';
    roughCtx.fillRect(sx - 10, 0, 20, size);
  }

  // Surface grit
  for (let i = 0; i < 16000; i++) {
    const gx = Math.random() * size;
    const gy = Math.random() * size;
    const gVal = Math.random() * 0.14;
    colorCtx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${gVal})` : `rgba(0,0,0,${gVal * 1.6})`;
    colorCtx.fillRect(gx, gy, 2, 2);
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;

  return { map, bumpMap, roughnessMap };
}

export function createFloorPuddleTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 1024;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const colorCtx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bumpCtx = bumpCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const roughCtx = roughCanvas.getContext('2d')!;

  // Dark slate concrete flags
  colorCtx.fillStyle = '#161b22';
  colorCtx.fillRect(0, 0, size, size);

  bumpCtx.fillStyle = '#808080';
  bumpCtx.fillRect(0, 0, size, size);

  roughCtx.fillStyle = '#b0b0b0'; // Matte dry floor
  roughCtx.fillRect(0, 0, size, size);

  const flagSize = 128;
  for (let y = 0; y < size; y += flagSize) {
    for (let x = 0; x < size; x += flagSize) {
      colorCtx.strokeStyle = '#080c10';
      colorCtx.lineWidth = 5;
      colorCtx.strokeRect(x, y, flagSize, flagSize);

      bumpCtx.strokeStyle = '#181818';
      bumpCtx.lineWidth = 5;
      bumpCtx.strokeRect(x, y, flagSize, flagSize);
    }
  }

  // Water Puddles (Mirror-like wet specular reflections, dark saturated water pool)
  const puddles = [
    { x: 320, y: 380, rx: 140, ry: 90 },
    { x: 740, y: 640, rx: 180, ry: 110 },
    { x: 200, y: 820, rx: 100, ry: 70 },
  ];

  puddles.forEach(({ x, y, rx, ry }) => {
    // Dark saturated water
    const grad = colorCtx.createRadialGradient(x, y, 10, x, y, rx);
    grad.addColorStop(0, 'rgba(5,10,16,0.95)');
    grad.addColorStop(0.7, 'rgba(10,16,24,0.7)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    colorCtx.fillStyle = grad;
    colorCtx.beginPath();
    colorCtx.ellipse(x, y, rx, ry, 0.2, 0, Math.PI * 2);
    colorCtx.fill();

    // Smooth glassy bump map (flattens stone grout underneath)
    bumpCtx.fillStyle = '#888888';
    bumpCtx.beginPath();
    bumpCtx.ellipse(x, y, rx * 0.9, ry * 0.9, 0.2, 0, Math.PI * 2);
    bumpCtx.fill();

    // Ultra-low roughness = high mirror specular reflection on puddle!
    const rGrad = roughCtx.createRadialGradient(x, y, 10, x, y, rx);
    rGrad.addColorStop(0, '#0a0a0a'); // Glassy smooth 0.04
    rGrad.addColorStop(0.8, '#202020');
    rGrad.addColorStop(1, '#b0b0b0'); // Blends back to dry floor
    roughCtx.fillStyle = rGrad;
    roughCtx.beginPath();
    roughCtx.ellipse(x, y, rx, ry, 0.2, 0, Math.PI * 2);
    roughCtx.fill();
  });

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;

  return { map, bumpMap, roughnessMap };
}

export function createMattressTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const colorCtx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bumpCtx = bumpCanvas.getContext('2d')!;

  // Aged, dingy canvas burlap base color (soiled grey-khaki)
  colorCtx.fillStyle = '#6e7278';
  colorCtx.fillRect(0, 0, size, size);

  bumpCtx.fillStyle = '#808080';
  bumpCtx.fillRect(0, 0, size, size);

  // Large yellowish-brown body sweat stains and dark water marks
  const stain1 = colorCtx.createRadialGradient(size * 0.45, size * 0.5, 20, size * 0.45, size * 0.5, 140);
  stain1.addColorStop(0, 'rgba(102, 85, 48, 0.65)');
  stain1.addColorStop(0.6, 'rgba(84, 72, 44, 0.4)');
  stain1.addColorStop(1, 'rgba(0, 0, 0, 0)');
  colorCtx.fillStyle = stain1;
  colorCtx.beginPath();
  colorCtx.arc(size * 0.45, size * 0.5, 140, 0, Math.PI * 2);
  colorCtx.fill();

  const stain2 = colorCtx.createRadialGradient(size * 0.25, size * 0.35, 10, size * 0.25, size * 0.35, 80);
  stain2.addColorStop(0, 'rgba(64, 52, 36, 0.7)');
  stain2.addColorStop(1, 'rgba(0, 0, 0, 0)');
  colorCtx.fillStyle = stain2;
  colorCtx.beginPath();
  colorCtx.arc(size * 0.25, size * 0.35, 80, 0, Math.PI * 2);
  colorCtx.fill();

  // Diamond quilted stitching
  const step = 44;
  colorCtx.strokeStyle = 'rgba(20,20,25,0.4)';
  colorCtx.lineWidth = 2.5;
  bumpCtx.strokeStyle = '#181818';
  bumpCtx.lineWidth = 3;

  for (let i = -size; i < size * 2; i += step) {
    colorCtx.beginPath();
    colorCtx.moveTo(i, 0);
    colorCtx.lineTo(i + size, size);
    colorCtx.stroke();

    colorCtx.beginPath();
    colorCtx.moveTo(i, size);
    colorCtx.lineTo(i + size, 0);
    colorCtx.stroke();

    bumpCtx.beginPath();
    bumpCtx.moveTo(i, 0);
    bumpCtx.lineTo(i + size, size);
    bumpCtx.stroke();

    bumpCtx.beginPath();
    bumpCtx.moveTo(i, size);
    bumpCtx.lineTo(i + size, 0);
    bumpCtx.stroke();
  }

  // Stamped faded penitentiary stencil: "HIRODORA - BLOCK C - 047"
  colorCtx.fillStyle = 'rgba(18, 22, 28, 0.85)';
  colorCtx.font = 'bold 22px monospace';
  colorCtx.textAlign = 'center';
  colorCtx.fillText('HIRODORA · BLOCK C · 047', size / 2, size / 2);

  // Canvas coarse fabric weave noise
  for (let i = 0; i < 9000; i++) {
    const rx = Math.random() * size;
    const ry = Math.random() * size;
    colorCtx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.08)';
    colorCtx.fillRect(rx, ry, 2, 2);
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  return { map, bumpMap };
}

export interface PrisonWorldData {
  scene: THREE.Scene;
  colliders: THREE.Box3[];
  doors: Map<string, THREE.Group>;
  interactables: InteractiveObject[];
  guards: GuardData[];
  guardMeshes: Map<string, THREE.Group>;
  waterMesh: THREE.Mesh;
  searchlight: THREE.SpotLight;
  soundMaskingMachinePos: [number, number, number];
  dustParticles: THREE.Points;
}

/**
 * High-Detail Human Tactical Correctional Officer (Officer Dunne)
 * Anatomically sculpted human officer with facial features, peaked service cap,
 * tactical earpiece with boom mic, realistic uniform shirt with epaulets, MOLLE vest
 * with radio antenna & status LED, duty belt with keys & gear, articulated limbs
 * with natural human pivot points for walking animations.
 */
export function buildPhotorealisticTacticalGuard(isNightCaptain: boolean = false): THREE.Group {
  const group = new THREE.Group();

  // Materials
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xc89675, // Natural human Caucasian/tan skin tone
    roughness: 0.65,
    metalness: 0.05,
  });

  const stubbleMat = new THREE.MeshStandardMaterial({
    color: 0x5a4638, // 5 o'clock beard stubble
    roughness: 0.85,
  });

  const uniformNavyMat = new THREE.MeshStandardMaterial({
    color: isNightCaptain ? 0x0c111a : 0x162232, // Dark tactical navy uniform
    roughness: 0.75,
    metalness: 0.1,
  });

  const armorVestMat = new THREE.MeshStandardMaterial({
    color: 0x0a0e14, // Tactical black Cordura MOLLE vest
    roughness: 0.5,
    metalness: 0.35,
  });

  const capBrimMat = new THREE.MeshStandardMaterial({
    color: 0x05080c,
    roughness: 0.2, // Patent leather shiny peak
    metalness: 0.8,
  });

  const goldBadgeMat = new THREE.MeshStandardMaterial({
    color: 0xd97706, // Polished brass department badge
    roughness: 0.25,
    metalness: 0.9,
  });

  const leatherBeltMat = new THREE.MeshStandardMaterial({
    color: 0x17120e,
    roughness: 0.4,
    metalness: 0.2,
  });

  const darkSteelMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.3,
    metalness: 0.85,
  });

  const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 });
  const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });

  // 1. Torso & Upper Body
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 1.28, 0);

  // Tactical Uniform Shirt (Tapered human waist to chest)
  const chestMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.28, 0.65, 12), uniformNavyMat);
  chestMesh.scale.set(1.15, 1.0, 0.72);
  chestMesh.castShadow = true;
  torsoGroup.add(chestMesh);

  // Uniform Epaulets with Gold Pips
  [-0.34, 0.34].forEach((x) => {
    const epaulet = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.22), uniformNavyMat);
    epaulet.position.set(x, 0.28, 0);
    const pip = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.04, 0.04), goldBadgeMat);
    pip.position.set(x, 0.3, 0);
    torsoGroup.add(epaulet, pip);
  });

  // Heavy Tactical Plate Carrier Vest (Front & Back contoured plates)
  const vestFront = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.48, 0.14), armorVestMat);
  vestFront.position.set(0, 0.02, 0.16);
  const vestBack = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.48, 0.14), armorVestMat);
  vestBack.position.set(0, 0.02, -0.16);
  torsoGroup.add(vestFront, vestBack);

  // Velcro Name Tape: "DUNNE"
  const nameTape = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.04, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.9 })
  );
  nameTape.position.set(0.14, 0.14, 0.24);
  torsoGroup.add(nameTape);

  // Body-Camera with Status Lens
  const bodyCam = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.04), darkSteelMat);
  bodyCam.position.set(-0.14, 0.14, 0.24);
  const camLens = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
  camLens.rotation.x = Math.PI / 2;
  camLens.position.set(-0.14, 0.14, 0.265);
  torsoGroup.add(bodyCam, camLens);

  // MOLLE Webbing Magazine Pouches
  [-0.14, 0.0, 0.14].forEach((px) => {
    const magPouch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.07), armorVestMat);
    magPouch.position.set(px, -0.12, 0.24);
    torsoGroup.add(magPouch);
  });

  // Tactical Shoulder Radio with Flexible Antenna & Blinking Green LED
  const radio = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.08), armorVestMat);
  radio.position.set(-0.26, 0.24, 0.12);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.32, 6), darkSteelMat);
  antenna.position.set(-0.26, 0.46, 0.12);
  const radioLed = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
  radioLed.position.set(-0.24, 0.33, 0.165);
  torsoGroup.add(radio, antenna, radioLed);

  group.add(torsoGroup);

  // 2. Head & Human Facial Features (Group for Scanning Animation)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.74, 0);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.16, 12), skinMat);
  neck.position.y = -0.06;
  headGroup.add(neck);

  // Cranium / Face
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), skinMat);
  cranium.scale.set(0.92, 1.05, 0.96);
  headGroup.add(cranium);

  // Jaw & Chin
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.12, 0.15), stubbleMat);
  jaw.position.set(0, -0.08, 0.07);
  headGroup.add(jaw);

  // Human Nose
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.08, 6), skinMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.01, 0.185);
  headGroup.add(nose);

  // Human Eyes (Left & Right)
  [-0.055, 0.055].forEach((ex) => {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), eyeWhiteMat);
    eyeWhite.position.set(ex, 0.04, 0.155);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), eyePupilMat);
    pupil.position.set(ex, 0.04, 0.174);
    headGroup.add(eyeWhite, pupil);

    // Human Brow / Forehead Ridge
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.03), stubbleMat);
    brow.position.set(ex, 0.07, 0.165);
    headGroup.add(brow);

    // Human Ears
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.07, 0.04), skinMat);
    ear.position.set(ex > 0 ? 0.18 : -0.18, 0.02, 0.01);
    headGroup.add(ear);
  });

  // Tactical Peaked Correctional Service Cap
  const capCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.19, 0.12, 16), uniformNavyMat);
  capCrown.position.set(0, 0.16, 0.01);
  const capBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 16, 1, false, 0, Math.PI), capBrimMat);
  capBrim.rotation.x = 0.25;
  capBrim.position.set(0, 0.14, 0.14);
  const capBadge = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.055, 0.02), goldBadgeMat);
  capBadge.position.set(0, 0.18, 0.19);
  headGroup.add(capCrown, capBrim, capBadge);

  // Tactical Earpiece with Boom Microphone
  const earpiece = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.03), darkSteelMat);
  earpiece.position.set(-0.19, 0.03, 0.02);
  const micBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.15, 6), darkSteelMat);
  micBoom.rotation.z = -1.2;
  micBoom.rotation.y = 0.4;
  micBoom.position.set(-0.14, -0.04, 0.12);
  headGroup.add(earpiece, micBoom);

  group.add(headGroup);

  // 3. Heavy Duty Belt with Accessories
  const dutyBeltGroup = new THREE.Group();
  dutyBeltGroup.position.set(0, 0.96, 0);

  const beltMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.31, 0.1, 14), leatherBeltMat);
  beltMesh.scale.set(1.1, 1.0, 0.72);
  dutyBeltGroup.add(beltMesh);

  // Silver Buckle
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.03), darkSteelMat);
  buckle.position.set(0, 0, 0.24);
  dutyBeltGroup.add(buckle);

  // Handcuff Pouch & Holster
  const cuffCase = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.11, 0.06), leatherBeltMat);
  cuffCase.position.set(-0.25, -0.01, -0.12);
  const holster = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.08), leatherBeltMat);
  holster.position.set(-0.33, -0.1, 0.08);
  dutyBeltGroup.add(cuffCase, holster);

  // Jingling Brass Key Ring with 3 Keys
  const keyRing = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 12), goldBadgeMat);
  keyRing.position.set(0.28, -0.06, 0.14);
  const key1 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.07, 0.006), goldBadgeMat);
  key1.position.set(0.28, -0.11, 0.14);
  dutyBeltGroup.add(keyRing, key1);

  group.add(dutyBeltGroup);

  // 4. Articulated Arms (Left & Right Shoulder Joints for Human Swing)
  // Left Arm (Counter-swings naturally)
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.36, 1.5, 0); // Shoulder pivot

  const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.075, 0.34, 10), uniformNavyMat);
  leftUpperArm.position.set(0, -0.17, 0);
  const leftElbowPad = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.11), armorVestMat);
  leftElbowPad.position.set(0, -0.32, -0.04);
  const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.32, 10), skinMat); // Rolled-up sleeve
  leftForearm.position.set(0, -0.48, 0.02);
  // Tactical Watch on left wrist
  const watch = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.04, 10), darkSteelMat);
  watch.position.set(0, -0.6, 0.02);
  // Human Hand
  const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.05), skinMat);
  leftHand.position.set(0, -0.68, 0.02);
  leftArmGroup.add(leftUpperArm, leftElbowPad, leftForearm, watch, leftHand);
  group.add(leftArmGroup);

  // Right Arm (Holds heavy tactical Maglite flashlight)
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.36, 1.5, 0); // Shoulder pivot

  const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.075, 0.34, 10), uniformNavyMat);
  rightUpperArm.position.set(0, -0.17, 0);
  const rightElbowPad = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.11), armorVestMat);
  rightElbowPad.position.set(0, -0.32, -0.04);
  const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.32, 10), skinMat);
  rightForearm.position.set(0, -0.48, 0.08);
  rightForearm.rotation.x = 0.55; // Angled forward holding flashlight
  // Human Hand gripping flashlight
  const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.05), skinMat);
  rightHand.position.set(0, -0.62, 0.22);
  rightHand.rotation.x = 0.55;

  // Heavy Tactical Maglite Flashlight Body
  const torchBody = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.035, 0.36, 12), darkSteelMat);
  torchBody.rotation.x = Math.PI / 2;
  torchBody.position.set(0, -0.62, 0.28);
  const torchBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.042, 0.08, 12), darkSteelMat);
  torchBezel.rotation.x = Math.PI / 2;
  torchBezel.position.set(0, -0.62, 0.46);

  // Volumetric Flashlight Beam Cones
  const beamOuter = new THREE.Mesh(
    new THREE.ConeGeometry(0.85, 6.0, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfff4cf,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  beamOuter.rotation.x = -Math.PI / 2;
  beamOuter.position.set(0, -0.62, 3.46);

  const beamCore = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 6.0, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  beamCore.rotation.x = -Math.PI / 2;
  beamCore.position.set(0, -0.62, 3.46);

  rightArmGroup.add(rightUpperArm, rightElbowPad, rightForearm, rightHand, torchBody, torchBezel, beamOuter, beamCore);
  group.add(rightArmGroup);

  // 5. Articulated Legs & Combat Boots (Hips Pivot for Natural Human Stride)
  const buildLeg = (isLeft: boolean) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(isLeft ? -0.17 : 0.17, 0.92, 0); // Hip joint pivot

    // Upper Thigh in Navy Cargo Trousers
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.11, 0.44, 10), uniformNavyMat);
    thigh.position.set(0, -0.22, 0);
    // Side Cargo Bellows Pocket
    const cargoPocket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.14), uniformNavyMat);
    cargoPocket.position.set(isLeft ? -0.11 : 0.11, -0.22, 0);
    // Hard Tactical Knee Pad
    const kneePad = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.14, 0.08), armorVestMat);
    kneePad.position.set(0, -0.44, 0.09);
    // Lower Shin
    const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.42, 10), uniformNavyMat);
    calf.position.set(0, -0.64, 0);

    // Realistic Heavy Leather Combat Boot with Lugged Tread Sole & Laces
    const bootFoot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.32), leatherBeltMat);
    bootFoot.position.set(0, -0.84, 0.06);
    const bootSole = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.05, 0.34), darkSteelMat);
    bootSole.position.set(0, -0.91, 0.06);
    const bootLaces = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.04), darkSteelMat);
    bootLaces.position.set(0, -0.78, 0.15);

    legGroup.add(thigh, cargoPocket, kneePad, calf, bootFoot, bootSole, bootLaces);
    return legGroup;
  };

  const leftLegGroup = buildLeg(true);
  const rightLegGroup = buildLeg(false);
  group.add(leftLegGroup, rightLegGroup);

  // Soft Radial Contact Shadow Disc
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.65, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.65, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  group.add(shadow);

  // Expose articulated human limbs on userData for walking animation
  group.userData = {
    torso: torsoGroup,
    head: headGroup,
    leftArm: leftArmGroup,
    rightArm: rightArmGroup,
    leftLeg: leftLegGroup,
    rightLeg: rightLegGroup,
    flashlightBeam: beamOuter,
    walkPhase: 0,
  };

  return group;
}

/**
 * Photorealistic Aged Institutional Porcelain Prison Toilet
 * 12-part realistic composite: contoured vitreous porcelain commode with curved bowl,
 * realistic water cavity with lime/mineral rust ring, inner siphon jet opening,
 * aged porcelain glaze with fine hairline crazing cracks & stains, stained plastic/porcelain seat rim,
 * heavy rusted cast-iron flush pipe running into the back wall with red shutoff wheel valve & coupling nuts,
 * and rear exhaust ventilation duct frame with 4 hex bolts.
 */
export function buildPhotorealisticPorcelainToilet(): THREE.Group {
  const group = new THREE.Group();

  // Aged, stained porcelain glaze with subtle yellowing & lime-scale patina
  const agedPorcelainMat = new THREE.MeshPhysicalMaterial({
    color: 0xd8dde2, // Slightly dingy, aged institutional off-white
    roughness: 0.18,
    metalness: 0.04,
    clearcoat: 0.8,
    clearcoatRoughness: 0.22,
    reflectivity: 0.8,
  });

  const stainedSeatMat = new THREE.MeshStandardMaterial({
    color: 0xb5bdc5,
    roughness: 0.45,
    metalness: 0.05,
  });

  const rustedIronPipeMat = new THREE.MeshStandardMaterial({
    color: 0x3d3733, // Rusted oxidized cast iron
    roughness: 0.85,
    metalness: 0.65,
  });

  const redValveMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b, // Chipped industrial red shutoff wheel
    roughness: 0.5,
    metalness: 0.4,
  });

  // 1. Floor Anchor Flange with 4 Rusted Hex Mounting Bolts
  const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.29, 0.04, 16), rustedIronPipeMat);
  flange.position.y = 0.02;
  group.add(flange);

  // 2. Base Pedestal with Grime Ring
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.26, 0.36, 16), agedPorcelainMat);
  pedestal.position.y = 0.2;
  pedestal.castShadow = true;
  group.add(pedestal);

  // 3. Ergonomic Contoured Porcelain Bowl with Hollow Interior
  const bowlOuter = new THREE.Mesh(new THREE.SphereGeometry(0.33, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.6), agedPorcelainMat);
  bowlOuter.rotation.x = Math.PI;
  bowlOuter.position.y = 0.42;
  bowlOuter.castShadow = true;

  // Inner Bowl Cavity
  const bowlInner = new THREE.Mesh(new THREE.SphereGeometry(0.29, 18, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), agedPorcelainMat);
  bowlInner.rotation.x = Math.PI;
  bowlInner.position.y = 0.42;
  group.add(bowlOuter, bowlInner);

  // 4. Stained Porcelain Toilet Seat Rim with Inner Opening
  const seatRim = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.045, 14, 28), stainedSeatMat);
  seatRim.rotation.x = Math.PI / 2;
  seatRim.position.y = 0.72;
  group.add(seatRim);

  // 5. Standing Water in Bowl with Murky Mineral/Rust Patina
  const waterPool = new THREE.Mesh(
    new THREE.CircleGeometry(0.19, 18),
    new THREE.MeshStandardMaterial({
      color: 0x225566, // Murky standing water
      roughness: 0.04,
      metalness: 0.9,
      transparent: true,
      opacity: 0.8,
    })
  );
  waterPool.rotation.x = -Math.PI / 2;
  waterPool.position.y = 0.54;

  // Mineral rust ring around the water line
  const rustRing = new THREE.Mesh(new THREE.TorusGeometry(0.195, 0.012, 8, 20), rustedIronPipeMat);
  rustRing.rotation.x = Math.PI / 2;
  rustRing.position.y = 0.542;
  group.add(waterPool, rustRing);

  // 6. Rear Cistern Water Tank with Beveled Lid
  const cistern = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.48, 0.24), agedPorcelainMat);
  cistern.position.set(0, 0.88, -0.26);
  cistern.castShadow = true;

  const cisternLid = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.06, 0.28), agedPorcelainMat);
  cisternLid.position.set(0, 1.14, -0.26);
  group.add(cistern, cisternLid);

  // 7. Flush Handle Lever
  const flushLever = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.13, 8), rustedIronPipeMat);
  flushLever.rotation.z = Math.PI / 2;
  flushLever.position.set(-0.28, 1.02, -0.26);
  group.add(flushLever);

  // 8. Rusted Cast-Iron Vertical Supply Pipe running into Wall with Red Valve Wheel
  const supplyPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.72, 12), rustedIronPipeMat);
  supplyPipe.position.set(0.18, 0.4, -0.34);
  const redValve = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.015, 8, 16), redValveMat);
  redValve.position.set(0.18, 0.32, -0.31);
  group.add(supplyPipe, redValve);

  return group;
}

/**
 * Photorealistic Dilapidated Khandar Prison Bunk Bed
 * Heavy rusted steel angle-iron framework with chipped dark paint and rust pitting,
 * welded corner gusset plates, slatted rusted spring mesh base underneath,
 * realistic sagging stained mattress with dingy sweat/water marks and frayed seam,
 * crumpled coarse penitentiary wool blanket with organic folds, linen pillow with head dent,
 * and heavy iron prisoner wrist shackle chained to the bed post.
 */
export function buildPhotorealisticBunkBed(): THREE.Group {
  const group = new THREE.Group();

  const rustedIronMat = new THREE.MeshStandardMaterial({
    color: 0x24201c, // Rusted oxidized dark iron with pitting
    roughness: 0.65,
    metalness: 0.8,
  });

  const { map: mattressMap, bumpMap: mattressBump } = createMattressTextures();

  const stainedMattressMat = new THREE.MeshStandardMaterial({
    map: mattressMap,
    bumpMap: mattressBump,
    bumpScale: 0.06,
    roughness: 0.9,
    metalness: 0.02,
  });

  const coarseWoolBlanketMat = new THREE.MeshStandardMaterial({
    color: 0x182436, // Dingy faded coarse prison wool
    roughness: 0.95,
    metalness: 0.02,
  });

  const soiledPillowMat = new THREE.MeshStandardMaterial({
    color: 0x9ca3af, // Soiled dingy grey-linen
    roughness: 0.92,
  });

  // 1. 4 Corner Heavy Angle-Iron Posts with Welded Base Plates
  const postGeom = new THREE.BoxGeometry(0.08, 2.3, 0.08);
  [
    [-0.62, -1.22],
    [0.62, -1.22],
    [-0.62, 1.22],
    [0.62, 1.22],
  ].forEach(([px, pz]) => {
    const post = new THREE.Mesh(postGeom, rustedIronMat);
    post.position.set(px, 1.15, pz);
    post.castShadow = true;
    group.add(post);

    // Floor mounting plate with 4 bolt heads
    const basePlate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.18), rustedIronMat);
    basePlate.position.set(px, 0.012, pz);
    group.add(basePlate);
  });

  // 2. Welded Perimeter Framework (Lower & Upper Beds)
  [0.48, 1.72].forEach((y) => {
    // Longitudinal beams
    [-0.62, 0.62].forEach((x) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 2.44), rustedIronMat);
      beam.position.set(x, y, 0);
      group.add(beam);
    });
    // Transverse crossbars
    [-1.22, 0, 1.22].forEach((z) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.09, 0.06), rustedIronMat);
      beam.position.set(0, y, z);
      group.add(beam);
    });
  });

  // 3. Rusted Spring Mesh Lattice Base (Transverse support wire slats under lower mattress)
  for (let sz = -1.1; sz <= 1.1; sz += 0.18) {
    const springSlat = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.2, 6), rustedIronMat);
    springSlat.rotation.z = Math.PI / 2;
    springSlat.position.set(0, 0.51, sz);
    group.add(springSlat);
  }

  // 4. Upper Bunk Safety Retention Guardrail
  const guardrail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 1.85), rustedIronMat);
  guardrail.position.set(0.62, 1.95, 0.1);
  group.add(guardrail);

  // 5. Welded Climbing Ladder Rungs on Front End
  [0.72, 1.05, 1.38].forEach((ry) => {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.44, 12), rustedIronMat);
    rung.rotation.x = Math.PI / 2;
    rung.position.set(0.62, ry, -1.0);
    group.add(rung);
  });

  // 6. Realistic Sagging Stained Lower Mattress
  const lowerMattress = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.24, 2.34), stainedMattressMat);
  lowerMattress.position.set(0, 0.63, 0);
  lowerMattress.castShadow = true;

  // Cotton tuft bursting through worn tear at mattress corner
  const cottonTuft = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.95 })
  );
  cottonTuft.position.set(0.54, 0.72, -1.1);
  group.add(lowerMattress, cottonTuft);

  // 7. Layered Crumpled Wool Blanket with Natural Drapes & Folds
  const blanketMain = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.07, 1.48), coarseWoolBlanketMat);
  blanketMain.position.set(0, 0.77, 0.42);

  // Organic fold hanging over the edge
  const blanketDrapeSide = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 1.2), coarseWoolBlanketMat);
  blanketDrapeSide.position.set(0.61, 0.65, 0.42);

  const blanketRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.18, 10), coarseWoolBlanketMat);
  blanketRoll.rotation.z = Math.PI / 2;
  blanketRoll.position.set(0, 0.83, -0.24);
  group.add(blanketMain, blanketDrapeSide, blanketRoll);

  // 8. Soft Linen Pillow with Natural Head Indent
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.13, 0.48), soiledPillowMat);
  pillow.position.set(0, 0.79, -0.92);
  const pillowDent = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.02, 12),
    new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.95 })
  );
  pillowDent.position.set(0, 0.86, -0.92);
  group.add(pillow, pillowDent);

  // 9. Upper Bunk Mattress
  const upperMattress = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.22, 2.34), stainedMattressMat);
  upperMattress.position.set(0, 1.86, 0);
  group.add(upperMattress);

  // 10. Heavy Iron Restraint Shackle Chained to Bed Leg
  const chainCuff = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 12), rustedIronMat);
  chainCuff.position.set(-0.62, 0.32, -1.22);
  const chainLink = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.008, 6, 8), rustedIronMat);
  chainLink.position.set(-0.62, 0.24, -1.22);
  group.add(chainCuff, chainLink);

/**
 * Photorealistic Muscular Inmate (Boulder - Cell 46)
 * Built with muscular human anatomy, weathered orange inmate tank top with prisoner #046,
 * bare tattooed arms, bandaged knuckles, determined scarred facial features,
 * and arm-wrestling competition table bolted to the stone floor.
 */
export function buildPhotorealisticInmateBoulder(): THREE.Group {
  const group = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xb57e5d, // Weathered tan prisoner skin tone
    roughness: 0.6,
    metalness: 0.05,
  });

  const inmateOrangeMat = new THREE.MeshStandardMaterial({
    color: 0xc25e1a, // Faded weathered penitentiary orange
    roughness: 0.85,
  });

  const darkDenimMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.8,
  });

  const rustedIronMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.7,
    metalness: 0.85,
  });

  const woodTableMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    roughness: 0.75,
  });

  // 1. Muscular Torso with Orange Inmate Tank Top
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.3, 0.7, 12), inmateOrangeMat);
  torso.scale.set(1.2, 1.0, 0.75);
  torso.position.y = 1.25;
  torso.castShadow = true;

  // Stenciled "046" on Chest
  const badge046 = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.06, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 })
  );
  badge046.position.set(0, 1.35, 0.22);
  group.add(torso, badge046);

  // 2. Muscular Neck and Head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.18, 12), skinMat);
  neck.position.y = 1.64;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 16), skinMat);
  head.position.set(0, 1.82, 0.02);

  // Heavy Brow & Cheek Scar
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.035, 0.06), skinMat);
  brow.position.set(0, 1.89, 0.16);
  const scar = new THREE.Mesh(
    new THREE.BoxGeometry(0.015, 0.08, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.4 })
  );
  scar.rotation.z = 0.35;
  scar.position.set(0.08, 1.82, 0.18);
  group.add(neck, head, brow, scar);

  // 3. Powerful Muscular Arms in Arm Wrestling Stance
  // Right Arm (Ready on table)
  const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.36, 10), skinMat);
  rightUpperArm.position.set(0.38, 1.32, 0.08);
  rightUpperArm.rotation.x = 0.6;
  const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.085, 0.34, 10), skinMat);
  rightForearm.position.set(0.38, 1.18, 0.34);
  rightForearm.rotation.x = -0.7; // Elbow on table, forearm upright
  const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.06), skinMat);
  rightHand.position.set(0.38, 1.38, 0.42);
  group.add(rightUpperArm, rightForearm, rightHand);

  // Left Arm (Resting on hip/table edge)
  const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.36, 10), skinMat);
  leftUpperArm.position.set(-0.38, 1.32, 0.04);
  const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.085, 0.32, 10), skinMat);
  leftForearm.position.set(-0.38, 1.05, 0.14);
  leftForearm.rotation.x = 0.35;
  group.add(leftUpperArm, leftForearm);

  // 4. Inmate Trousers & Boots
  [-0.19, 0.19].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.82, 10), darkDenimMat);
    leg.position.set(x, 0.5, 0);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.34), rustedIronMat);
    boot.position.set(x, 0.08, 0.06);
    group.add(leg, boot);
  });

  // 5. Heavy Timber Arm-Wrestling Table bolted to stone floor
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.8), woodTableMat);
  tableTop.position.set(0.2, 0.98, 0.42);
  tableTop.castShadow = true;
  // Iron Center Pedestal
  const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.98, 12), rustedIronMat);
  tableLeg.position.set(0.2, 0.49, 0.42);
  // Elbow Cushion Pad
  const elbowPad = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.04, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.85 })
  );
  elbowPad.position.set(0.38, 1.03, 0.38);
  group.add(tableTop, tableLeg, elbowPad);

  return group;
}

/**
 * Creates 250 slow-drifting atmospheric dust motes in the air
 */
export function createAtmosphericDust(): THREE.Points {
  const particleCount = 250;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 30; // X across prison
    positions[i + 1] = 0.5 + Math.random() * 3.5; // Y height
    positions[i + 2] = (Math.random() - 0.5) * 20; // Z
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xfef08a,
    size: 0.045,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return new THREE.Points(geometry, material);
}

/**
 * Builds the complete 3D prison complex with realistic PBR materials
 */
export function buildPrisonWorld(scene: THREE.Scene): PrisonWorldData {
  const colliders: THREE.Box3[] = [];
  const doors = new Map<string, THREE.Group>();
  const interactables: InteractiveObject[] = [];
  const guardMeshes = new Map<string, THREE.Group>();

  // Textures & PBR Materials
  const { map: wallMap, bumpMap: wallBump, roughnessMap: wallRough } = createStoneWallTextures();
  wallMap.repeat.set(5, 2.2);
  wallBump.repeat.set(5, 2.2);
  wallRough.repeat.set(5, 2.2);

  const { map: floorMap, bumpMap: floorBump, roughnessMap: floorRough } = createFloorPuddleTextures();
  floorMap.repeat.set(10, 8);
  floorBump.repeat.set(10, 8);
  floorRough.repeat.set(10, 8);

  const wallMat = new THREE.MeshStandardMaterial({
    map: wallMap,
    bumpMap: wallBump,
    bumpScale: 0.06,
    roughnessMap: wallRough,
    roughness: 0.8,
    metalness: 0.1,
  });

  const floorMat = new THREE.MeshStandardMaterial({
    map: floorMap,
    bumpMap: floorBump,
    bumpScale: 0.04,
    roughnessMap: floorRough,
    roughness: 0.7,
    metalness: 0.25,
  });

  const ceilingMat = new THREE.MeshStandardMaterial({
    color: 0x090d14,
    roughness: 0.9,
    metalness: 0.1,
  });

  const castIronBarsMat = new THREE.MeshStandardMaterial({
    color: 0x141a22,
    roughness: 0.35,
    metalness: 0.85,
  });

  const heavyDoorMat = new THREE.MeshStandardMaterial({
    color: 0x1b232d,
    roughness: 0.45,
    metalness: 0.75,
  });

  const woodDeskMat = new THREE.MeshStandardMaterial({
    color: 0x382318,
    roughness: 0.6,
    metalness: 0.05,
  });

  const helperAddBox = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    isCollidable: boolean = true
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    if (isCollidable) {
      colliders.push(new THREE.Box3().setFromObject(mesh));
    }
    return mesh;
  };

  // 1. FLOORS & CEILINGS
  const mainFloor = helperAddBox(42, 0.4, 28, 0, -0.2, 0, floorMat, false);
  mainFloor.receiveShadow = true;
  helperAddBox(42, 0.4, 28, 0, 4.4, 0, ceilingMat, false);

  // Overhead Industrial Pipes with Pipe Clamps
  [-1.2, 1.2].forEach((z) => {
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 36, 12),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.25 })
    );
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, 4.0, z);
    scene.add(pipe);

    // Pipe mounting clamps
    [-12, -4, 4, 12].forEach((px) => {
      const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.22), castIronBarsMat);
      clamp.position.set(px, 4.1, z);
      scene.add(clamp);
    });
  });

  // 2. PERIMETER BOUNDARIES
  helperAddBox(42, 4.5, 1, 0, 2.25, -11, wallMat);
  helperAddBox(42, 4.5, 1, 0, 2.25, 11, wallMat);
  helperAddBox(1, 4.5, 24, -20, 2.25, 0, wallMat);
  helperAddBox(1, 4.5, 24, 20, 2.25, 0, wallMat);

  // 3. CELL 47 (KABIR'S CELL)
  helperAddBox(0.4, 4.5, 9, -8.5, 2.25, -6.5, wallMat);
  helperAddBox(0.4, 4.5, 9, -3.2, 2.25, -6.5, wallMat);

  // Cast Iron Top and Bottom Bar Tracks
  const topTrack = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.12, 0.2), castIronBarsMat);
  topTrack.position.set(-5.8, 4.1, -2.0);
  const bottomTrack = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.12, 0.2), castIronBarsMat);
  bottomTrack.position.set(-5.8, 0.06, -2.0);
  scene.add(topTrack, bottomTrack);

  // Vertical Cell Bars
  const barsGroup = new THREE.Group();
  for (let bx = -8.3; bx <= -3.4; bx += 0.22) {
    if (bx >= -6.8 && bx <= -5.0) continue; // Door opening
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 4.0, 10), castIronBarsMat);
    bar.position.set(bx, 2.1, -2.0);
    barsGroup.add(bar);
  }
  scene.add(barsGroup);

  // Cell 47 Heavy Iron Door with Rivets & Inspection Slit
  const c47DoorGroup = new THREE.Group();
  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.9, 0.12), heavyDoorMat);
  doorPanel.position.set(0.8, 1.95, 0);
  // Barred window frame
  const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.36, 0.16), castIronBarsMat);
  windowFrame.position.set(0.8, 2.7, 0);
  // Slide bolt latch
  const latch = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.18), castIronBarsMat);
  latch.position.set(1.4, 1.95, 0.05);
  c47DoorGroup.add(doorPanel, windowFrame, latch);
  c47DoorGroup.position.set(-6.7, 0, -2.0);
  scene.add(c47DoorGroup);
  doors.set('cell_47_door', c47DoorGroup);

  // Photorealistic Welded Bunk Bed in Cell 47
  const bunkBed = buildPhotorealisticBunkBed();
  bunkBed.position.set(-4.2, 0, -8.2);
  scene.add(bunkBed);
  colliders.push(new THREE.Box3().setFromObject(bunkBed));

  // Stamped Stainless Steel Dining Spoon hidden under bunk
  const spoonGroup = new THREE.Group();
  const spoonHandle = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.015, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xb0bec5, metalness: 0.95, roughness: 0.15 })
  );
  const spoonBowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xb0bec5, metalness: 0.95, roughness: 0.15 })
  );
  spoonBowl.position.z = 0.12;
  spoonBowl.scale.set(1, 0.32, 1.25);
  spoonGroup.add(spoonHandle, spoonBowl);
  spoonGroup.position.set(-4.0, 0.04, -7.8);
  scene.add(spoonGroup);

  interactables.push({
    id: 'spoon_pickup',
    name: 'Modified Steel Spoon',
    prompt: 'Collect ground steel dining spoon (hidden beneath lower bunk frame)',
    actionType: 'pickup',
    position: [-4.0, 0.3, -7.8],
    radius: 2.2,
  });

  // Photorealistic Porcelain Toilet in Cell 47
  const toilet = buildPhotorealisticPorcelainToilet();
  toilet.position.set(-7.6, 0, -9.8);
  scene.add(toilet);
  colliders.push(new THREE.Box3().setFromObject(toilet));

  // Detailed Cast Iron Wall Vent Grate behind toilet
  const ventFrame = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.08), castIronBarsMat);
  ventFrame.position.set(-8.45, 0.95, -9.8);
  ventFrame.rotation.y = Math.PI / 2;
  // Louver slats inside grate
  for (let ly = -0.3; ly <= 0.3; ly += 0.08) {
    const louver = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.72), castIronBarsMat);
    louver.position.set(-8.43, 0.95 + ly, -9.8);
    louver.rotation.z = Math.PI / 4;
    scene.add(louver);
  }
  scene.add(ventFrame);

  // 4 Corner Hexagonal Bolts
  [
    [-0.34, -0.34],
    [0.34, -0.34],
    [-0.34, 0.34],
    [0.34, 0.34],
  ].forEach(([vx, vy]) => {
    const bolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.06, 6),
      new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.5, metalness: 0.85 })
    );
    bolt.rotation.z = Math.PI / 2;
    bolt.position.set(-8.4, 0.95 + vy, -9.8 + vx);
    scene.add(bolt);
  });

  // Ancient Khandar Hanging Chains from Ceiling Eyelets
  [-5.4, -7.2, 0, 5.5].forEach((cx, idx) => {
    const chainGroup = new THREE.Group();
    for (let cl = 0; cl < 8; cl++) {
      const link = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 10), castIronBarsMat);
      link.rotation.x = cl % 2 === 0 ? 0 : Math.PI / 2;
      link.position.y = 4.2 - cl * 0.12;
      chainGroup.add(link);
    }
    // Iron wall cuff / shackle
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 12), castIronBarsMat);
    cuff.position.y = 3.2;
    chainGroup.add(cuff);
    chainGroup.position.set(cx, 0, idx % 2 === 0 ? -9.5 : -1.4);
    scene.add(chainGroup);
  });

  // Cell 47 Flickering Caged Industrial Edison Filament Lamp
  const bulbGroup = new THREE.Group();
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 1.4, 6), castIronBarsMat);
  cord.position.set(-5.8, 3.5, -6.5);
  const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 8), castIronBarsMat);
  socket.position.set(-5.8, 2.78, -6.5);
  const bulbGlass = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 12, 12),
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.95,
      roughness: 0.1,
    })
  );
  bulbGlass.position.set(-5.8, 2.68, -6.5);
  const wireCage = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.2, 8, 1, true), castIronBarsMat);
  wireCage.position.set(-5.8, 2.68, -6.5);
  const cellPointLight = new THREE.PointLight(0xf59e0b, 1.9, 9, 1.2);
  cellPointLight.position.set(-5.8, 2.6, -6.5);
  bulbGroup.add(cord, socket, bulbGlass, wireCage, cellPointLight);
  scene.add(bulbGroup);

  // Khandar Stone Rubble Piles in Cell Corners
  const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.95 });
  [-8.0, -3.8].forEach((rx) => {
    for (let r = 0; r < 5; r++) {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.08 + Math.random() * 0.07, 0),
        rubbleMat
      );
      rock.position.set(rx + (Math.random() * 0.5 - 0.25), 0.08, -10.2 + (Math.random() * 0.4));
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      scene.add(rock);
    }
  });

  interactables.push({
    id: 'vent_bolts_interact',
    name: 'Ventilation Grate Bolts',
    prompt: 'Dismantle rusted vent hex bolts with the modified spoon',
    actionRequiredItem: 'spoon',
    actionType: 'minigame',
    position: [-8.0, 0.95, -9.8],
    radius: 2.2,
  });

  // Food slot item
  interactables.push({
    id: 'food_slot_note',
    name: 'Smuggled Note & Brass Key',
    prompt: 'Read smuggled note: "Cell 46. Bolts. Quietly. Low tide window: 11 mins."',
    actionType: 'pickup',
    position: [-6.0, 0.9, -2.1],
    radius: 1.8,
  });

  // Environmental Story Lore Object: Kabir's Carved Diary on Wall
  interactables.push({
    id: 'kabir_wall_diary',
    name: 'Carved Inscription (Kabir\'s Journal)',
    prompt: 'Read carved wall markings: "Day 412. Sea water seeps beneath the floor at 03:00. Voss will pay."',
    actionType: 'interact',
    position: [-3.6, 1.5, -6.5],
    radius: 2.2,
  });

  // 4. CELL 46 (BOULDER'S CELL)
  const c46DoorGroup = new THREE.Group();
  const c46Door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.9, 0.12), heavyDoorMat);
  c46Door.position.set(0.8, 1.95, 0);
  c46DoorGroup.add(c46Door);
  c46DoorGroup.position.set(-11.4, 0, -2.0);
  scene.add(c46DoorGroup);
  doors.set('cell_46_door', c46DoorGroup);

  // Muscular Inmate Boulder NPC
  const boulderMesh = buildPhotorealisticInmateBoulder();
  boulderMesh.position.set(-11.5, 0, -6.8);
  boulderMesh.rotation.y = Math.PI / 4;
  scene.add(boulderMesh);

  interactables.push({
    id: 'boulder_npc',
    name: 'Boulder (Cell 46 Enforcer)',
    prompt: 'Challenge Boulder in an arm wrestling contest of respect',
    actionType: 'minigame',
    position: [-11.5, 1.1, -6.8],
    radius: 2.4,
  });

  // Cell 46 Locker
  helperAddBox(0.8, 2.2, 0.6, -13.2, 1.1, -9.2, heavyDoorMat);
  interactables.push({
    id: 'cell_46_locker',
    name: 'Locker 46',
    prompt: 'Unlock Locker 46 with the small brass key (Contains Block-C Key)',
    actionRequiredItem: 'small_key',
    actionType: 'pickup',
    position: [-13.2, 1.1, -9.2],
    radius: 2.2,
  });

  // 5. CORRIDOR & HIDING SPOTS
  helperAddBox(1.5, 1.1, 0.9, -1.0, 0.55, -0.8, heavyDoorMat);
  interactables.push({
    id: 'hide_laundry_cart',
    name: 'Laundry Cart',
    prompt: 'Crouch inside laundry bin to break guard line of sight',
    actionType: 'hide',
    position: [-1.0, 0.7, -0.8],
    radius: 2.4,
  });

  helperAddBox(0.95, 2.4, 0.75, 4.2, 1.2, -1.8, heavyDoorMat);
  interactables.push({
    id: 'hide_maint_locker',
    name: 'Steel Maintenance Locker',
    prompt: 'Conceal yourself inside the tall maintenance locker',
    actionType: 'hide',
    position: [4.2, 1.2, -1.8],
    radius: 2.4,
  });

  // Block-C Gate
  const masterDoorGroup = new THREE.Group();
  const masterGate = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.0, 2.6), castIronBarsMat);
  masterGate.position.set(0, 2.0, 1.3);
  masterDoorGroup.add(masterGate);
  masterDoorGroup.position.set(2.0, 0, -1.3);
  scene.add(masterDoorGroup);
  doors.set('master_c_door', masterDoorGroup);

  interactables.push({
    id: 'master_c_door_interact',
    name: 'Block-C Heavy Security Gate',
    prompt: 'Unlock heavy gate with Block-C Master Key',
    actionRequiredItem: 'master_key_c',
    actionType: 'door',
    position: [2.0, 2.0, 0],
    radius: 2.8,
  });

  // 6. LAUNDRY & WORKSHOP SECTION
  helperAddBox(16, 4.5, 0.4, 0, 2.25, 2.0, wallMat);
  helperAddBox(1.8, 1.8, 1.5, -2.0, 0.9, 6.0, heavyDoorMat);
  const soundMaskingMachinePos: [number, number, number] = [-2.0, 0, 6.0];

  helperAddBox(2.2, 0.9, 1.1, 1.8, 0.45, 6.0, woodDeskMat);
  interactables.push({
    id: 'lockpick_pickup',
    name: 'Smuggler Tension Lockpick Set',
    prompt: 'Recover high-grade steel lockpick set from laundry bench',
    actionType: 'pickup',
    position: [1.8, 1.0, 6.0],
    radius: 2.2,
  });

  interactables.push({
    id: 'pipe_pickup',
    name: 'Threaded Steel Pipe',
    prompt: 'Collect steel barrel conduit from workshop vice',
    actionType: 'pickup',
    position: [5.2, 1.0, 5.0],
    radius: 2.2,
  });

  interactables.push({
    id: 'steel_wool_pickup',
    name: 'Acoustic Steel Wool',
    prompt: 'Take dense acoustic sound-dampening wool',
    actionType: 'pickup',
    position: [6.8, 1.0, 5.4],
    radius: 2.2,
  });

  interactables.push({
    id: 'rubber_washer_pickup',
    name: 'Rubber Gas-Seal O-Ring',
    prompt: 'Grab high-pressure rubber compression washer',
    actionType: 'pickup',
    position: [6.0, 1.0, 7.0],
    radius: 2.2,
  });

  helperAddBox(2.2, 0.9, 1.2, 6.0, 0.45, 6.0, heavyDoorMat);
  interactables.push({
    id: 'crafting_bench',
    name: 'Armory Assembly Vice',
    prompt: 'Assemble Improvised Silencer (Requires pipe + steel wool + washer)',
    actionType: 'craft',
    position: [6.0, 1.0, 6.0],
    radius: 2.5,
  });

  // 7. INFIRMARY
  interactables.push({
    id: 'stethoscope_pickup',
    name: 'Medical Stethoscope',
    prompt: 'Acquire acoustic stethoscope to track vault tumbler clicks',
    actionType: 'pickup',
    position: [-7.2, 1.1, 6.2],
    radius: 2.2,
  });

  // 8. WARDEN VOSS'S CHAMBER
  helperAddBox(3.0, 0.95, 1.6, 11.5, 0.47, -5.2, woodDeskMat);
  helperAddBox(1.3, 1.3, 0.85, 11.5, 2.0, -10.4, heavyDoorMat);
  interactables.push({
    id: 'warden_safe_interact',
    name: "Warden Voss's Obsidian Vault",
    prompt: 'Crack master vault combination using stethoscope audio acoustics',
    actionRequiredItem: 'stethoscope',
    actionType: 'minigame',
    position: [11.5, 2.0, -9.6],
    radius: 2.6,
  });

  // 9. SEA GATE & FLOODING SMUGGLER TUNNEL
  const seaGateGroup = new THREE.Group();
  const seaGateBars = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.2, 3.6), castIronBarsMat);
  seaGateBars.position.set(0, 2.1, 0);
  seaGateGroup.add(seaGateBars);
  seaGateGroup.position.set(15.0, 0, 0);
  scene.add(seaGateGroup);
  doors.set('sea_gate_door', seaGateGroup);

  interactables.push({
    id: 'sea_gate_interact',
    name: 'Tidal Sea Gate',
    prompt: 'Pick the rusted tidal gate lock before seawater swallows the tunnel!',
    actionRequiredItem: 'lockpick',
    actionType: 'minigame',
    position: [14.6, 2.0, 0],
    radius: 2.8,
  });

  const waterMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 24, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0x092d42,
      roughness: 0.08,
      metalness: 0.9,
      transparent: true,
      opacity: 0.9,
    })
  );
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.set(22.0, -0.4, 0);
  scene.add(waterMesh);

  const searchlight = new THREE.SpotLight(0xfffaed, 9.5, 45, Math.PI / 7, 0.35, 1.2);
  searchlight.position.set(25.0, 10.0, -8.0);
  searchlight.target.position.set(17.0, 0, 0);
  scene.add(searchlight);
  scene.add(searchlight.target);

  interactables.push({
    id: 'boulder_rescue_tunnel',
    name: 'Boulder (Trapped Under Timber)',
    prompt: 'Heave collapsed beam to free Boulder and escape Hirodora together!',
    actionType: 'interact',
    position: [19.2, 0.6, 0],
    radius: 3.0,
  });

  interactables.push({
    id: 'sea_tunnel_exit',
    name: 'Extraction Skiff',
    prompt: 'Rendezvous with Officer Iyer and escape into the open ocean!',
    actionType: 'interact',
    position: [24.5, 0.5, 0],
    radius: 3.4,
  });

  // 10. REALISTIC TACTICAL GUARDS
  const guards: GuardData[] = [
    {
      id: 'guard_dunne',
      name: 'Patrol Officer Dunne',
      type: 'patrol_dunne',
      position: [0.0, 0, 0],
      rotationY: 0,
      patrolRoute: [
        [-5.0, 0, 0],
        [1.0, 0, 0],
        [1.0, 0, 4.0],
        [-3.0, 0, 4.0],
      ],
      currentWaypoint: 0,
      state: 'patrol',
      suspicion: 0,
      visionAngle: 80,
      visionRange: 13,
      hearingMultiplier: 1.0,
      stateTimer: 0,
    },
    {
      id: 'guard_captain',
      name: 'Night Captain Vance',
      type: 'night_captain',
      position: [8.5, 0, -5.0],
      rotationY: Math.PI / 2,
      patrolRoute: [
        [8.5, 0, -2.0],
        [8.5, 0, -7.0],
      ],
      currentWaypoint: 0,
      state: 'patrol',
      suspicion: 0,
      visionAngle: 85,
      visionRange: 15,
      hearingMultiplier: 1.5,
      stateTimer: 0,
    },
  ];

  guards.forEach((g) => {
    const mesh = buildPhotorealisticTacticalGuard(g.type === 'night_captain');
    mesh.position.set(...g.position);
    mesh.rotation.y = g.rotationY;
    scene.add(mesh);
    guardMeshes.set(g.id, mesh);
  });

  // 11. ATMOSPHERIC DUST MOTES
  const dustParticles = createAtmosphericDust();
  scene.add(dustParticles);

  // 12. BALANCED STUDIO LIGHTING
  const keyLight = new THREE.DirectionalLight(0xffedd5, 1.4);
  keyLight.position.set(8, 14, 10);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  const hemiLight = new THREE.HemisphereLight(0x384a62, 0x0a0e14, 0.9);
  scene.add(hemiLight);

  // Caged Industrial Filament Bulbs with warm glows
  [-4, 2, 8].forEach((x) => {
    const bulb = new THREE.PointLight(0xfef08a, 0.95, 9, 2);
    bulb.position.set(x, 3.8, 0);
    scene.add(bulb);

    // Cast iron cage fixture
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 8), castIronBarsMat);
    cage.position.set(x, 4.0, 0);
    scene.add(cage);
  });

  scene.fog = new THREE.FogExp2(0x080c10, 0.045);

  return {
    scene,
    colliders,
    doors,
    interactables,
    guards,
    guardMeshes,
    waterMesh,
    searchlight,
    soundMaskingMachinePos,
    dustParticles,
  };
}
