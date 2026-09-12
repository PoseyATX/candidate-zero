/**
 * CANDIDATE ZERO — the room.
 *
 * A committee hearing room after hours: a long table under one hanging lamp,
 * everything past the light falling off into the dark. The camera sits where
 * you sit — across the table, looking down at your own hand.
 *
 * Units: 1 = one inch of table, roughly. A card is 2.5 x 3.75.
 */

import * as THREE from 'three';
import { paintFelt, paintWood } from './paint.js';
import { stepTweens } from './tween.js';

export const TABLE_W = 46;
export const TABLE_D = 30;

export interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Everything that can be clicked registers here. */
  pickables: THREE.Object3D[];
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
  /** Called every frame, after tweens step. */
  onFrame: ((dt: number, elapsed: number) => void)[];
  dispose(): void;
}

function canvasTexture(canvas: HTMLCanvasElement, repeat = 1): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createStage(host: HTMLElement): Stage {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'none';

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0a0806');
  scene.fog = new THREE.Fog('#0a0806', 54, 110);

  // near at 0.1 with the table 27 units away threw away most of the depth
  // buffer's precision and made the printed card faces z-fight with their own
  // stock. Nothing in this scene is ever closer than a few units.
  const camera = new THREE.PerspectiveCamera(
    42,
    host.clientWidth / Math.max(1, host.clientHeight),
    2,
    200
  );
  camera.position.set(0, 21.5, 24);
  camera.lookAt(0, 0, -2.5);

  // ---- table -------------------------------------------------------------
  const felt = new THREE.Mesh(
    new THREE.PlaneGeometry(TABLE_W, TABLE_D),
    new THREE.MeshStandardMaterial({
      map: canvasTexture(paintFelt(), 3),
      roughness: 0.96,
      metalness: 0
    })
  );
  felt.rotation.x = -Math.PI / 2;
  felt.receiveShadow = true;
  scene.add(felt);

  const woodTex = canvasTexture(paintWood(), 2);
  const railMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    roughness: 0.55,
    metalness: 0.06
  });
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(TABLE_W + 7, 1.4, TABLE_D + 7),
    railMat
  );
  rail.position.y = -0.72;
  rail.receiveShadow = true;
  rail.castShadow = true;
  scene.add(rail);

  // brass inlay line where felt meets wood
  const inlay = new THREE.Mesh(
    new THREE.RingGeometry(0, 1, 4),
    new THREE.MeshBasicMaterial({ color: '#8a6a2f' })
  );
  inlay.visible = false;
  scene.add(inlay);

  // ---- the floor far below, so the table reads as furniture ---------------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: '#1a140e', roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -14;
  floor.receiveShadow = true;
  scene.add(floor);

  // ---- light -------------------------------------------------------------
  scene.add(new THREE.AmbientLight('#6d5f4a', 0.85));

  const lamp = new THREE.SpotLight('#ffd9a0', 520, 90, Math.PI / 4.2, 0.5, 1.5);
  lamp.position.set(0, 30, 4);
  lamp.target.position.set(0, 0, -2);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(2048, 2048);
  lamp.shadow.camera.near = 4;
  lamp.shadow.camera.far = 70;
  lamp.shadow.bias = -0.0012;
  scene.add(lamp);
  scene.add(lamp.target);

  // cool bounce from the windows behind, so the dark side isn't black
  const fill = new THREE.DirectionalLight('#7d94b8', 0.5);
  fill.position.set(-16, 12, -22);
  scene.add(fill);

  // warm rim from the hallway, camera side
  const rim = new THREE.PointLight('#c98a3a', 70, 60, 2);
  rim.position.set(14, 8, 22);
  scene.add(rim);

  // The hand sits at the near edge, past the lamp's throw. Without its own
  // light the cards you are actually reading are the darkest thing on screen.
  const readingLight = new THREE.SpotLight('#ffe6bd', 260, 46, Math.PI / 4.6, 0.7, 1.4);
  readingLight.position.set(0, 17, 20);
  readingLight.target.position.set(0, 0, 6.4);
  scene.add(readingLight);
  scene.add(readingLight.target);

  // the lamp's own fixture, visible at the top of frame
  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(4.2, 3.2, 28, 1, true),
    new THREE.MeshStandardMaterial({
      color: '#2a2018',
      roughness: 0.7,
      side: THREE.DoubleSide,
      emissive: '#3a2a14',
      emissiveIntensity: 0.4
    })
  );
  shade.position.set(0, 30.5, 4);
  scene.add(shade);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 16, 12),
    new THREE.MeshBasicMaterial({ color: '#ffdfae' })
  );
  bulb.position.set(0, 29.4, 4);
  scene.add(bulb);

  // ---- loop --------------------------------------------------------------
  const pickables: THREE.Object3D[] = [];
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-10, -10);
  const onFrame: ((dt: number, elapsed: number) => void)[] = [];

  const timer = new THREE.Timer();
  let narrow = false;
  let running = true;
  let elapsed = 0;

  function resize(): void {
    const w = host.clientWidth;
    const h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    // Portrait: wider lens, further back, and framed on the near half of the
    // table — the precincts stack into a column there (see hand.isNarrow).
    narrow = w / h < 0.85;
    camera.fov = narrow ? 60 : 42;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function frame(): void {
    if (!running) return;
    requestAnimationFrame(frame);
    timer.update();
    const dt = Math.min(0.05, timer.getDelta());
    elapsed += dt;
    stepTweens(dt);
    for (const fn of onFrame) fn(dt, elapsed);
    // a breath of drift, so a still frame is never truly still
    camera.position.x = Math.sin(elapsed * 0.12) * (narrow ? 0.18 : 0.45);
    camera.position.y = (narrow ? 23 : 21.5) + Math.sin(elapsed * 0.17) * 0.2;
    camera.position.z = narrow ? 25 : 24;
    // Portrait aims at the near half so the hand sits low in frame and the
    // precincts fill the middle, instead of everything bunching at the top.
    camera.lookAt(0, 0, narrow ? -1 : -2.5);
    renderer.render(scene, camera);
  }
  frame();

  return {
    renderer,
    scene,
    camera,
    pickables,
    raycaster,
    pointer,
    onFrame,
    dispose() {
      running = false;
      window.removeEventListener('resize', resize);
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}

/** Pointer → normalized device coords on the stage canvas. */
export function updatePointer(stage: Stage, ev: PointerEvent | MouseEvent): void {
  const rect = stage.renderer.domElement.getBoundingClientRect();
  stage.pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  stage.pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
}

/** First pickable under the pointer, walking up to the tagged ancestor. */
export function pick(stage: Stage): THREE.Object3D | null {
  stage.raycaster.setFromCamera(stage.pointer, stage.camera);
  const hits = stage.raycaster.intersectObjects(stage.pickables, true);
  for (const hit of hits) {
    let node: THREE.Object3D | null = hit.object;
    while (node) {
      if (node.userData.pickId) return node;
      node = node.parent;
    }
  }
  return null;
}
