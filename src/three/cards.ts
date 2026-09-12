/**
 * CANDIDATE ZERO — a card as a physical object.
 *
 * Rounded stock with real thickness and a bevelled edge, a painted face, a
 * sealed back. It has weight: it lifts off the felt when you reach for it,
 * tilts toward the lamp, and lands with a settle. None of that is decoration —
 * it is how the player knows what is pickable and what has already been spent.
 */

import * as THREE from 'three';
import { CARD_H, CARD_W, RISK_COLOR, paintCardBack, paintCardFace, type CardFaceData } from './paint.js';
import { easeOutBack, easeOutCubic, tween } from './tween.js';

export const CARD_WIDTH = 3.1;
export const CARD_HEIGHT = CARD_WIDTH * (CARD_H / CARD_W); // hard 2:3
export const CARD_THICK = 0.06;

let backTexture: THREE.CanvasTexture | null = null;
let stockGeometry: THREE.ExtrudeGeometry | null = null;

function sharedBackTexture(): THREE.CanvasTexture {
  if (!backTexture) {
    backTexture = new THREE.CanvasTexture(paintCardBack());
    backTexture.colorSpace = THREE.SRGBColorSpace;
    backTexture.anisotropy = 8;
  }
  return backTexture;
}

/** Rounded-rect card stock, extruded. Built once and shared by every card. */
function sharedStock(): THREE.ExtrudeGeometry {
  if (stockGeometry) return stockGeometry;
  const w = CARD_WIDTH;
  const h = CARD_HEIGHT;
  const r = 0.14;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);

  stockGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: CARD_THICK,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
    curveSegments: 8
  });
  stockGeometry.translate(0, 0, -CARD_THICK / 2);
  return stockGeometry;
}

export interface CardHandle {
  group: THREE.Group;
  /** Repaint the face in place — cheap enough to do on every state change. */
  setFace(data: CardFaceData): void;
  setHighlight(on: boolean): void;
  setSelected(on: boolean): void;
  /** Animate to a pose. Returns when it lands. */
  moveTo(
    pos: THREE.Vector3,
    rot: THREE.Euler,
    opts?: { dur?: number; delay?: number; arc?: number; ease?: (t: number) => number }
  ): Promise<void>;
  flash(color: string): void;
  dispose(): void;
}

export function createCard(id: string, data: CardFaceData): CardHandle {
  const group = new THREE.Group();
  group.userData.pickId = id;

  const faceCanvas = paintCardFace(data);
  const faceTex = new THREE.CanvasTexture(faceCanvas);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  faceTex.anisotropy = 8;

  // polygonOffset pushes the stock a hair back in depth so the printed face
  // always wins. Without it the extruded cap and the face plane z-fight at
  // table distance and the card renders as blank stock.
  const edgeMat = new THREE.MeshStandardMaterial({
    color: '#cdbf9f',
    roughness: 0.88,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
  });
  const stock = new THREE.Mesh(sharedStock(), edgeMat);
  stock.castShadow = true;
  stock.receiveShadow = true;
  group.add(stock);

  const faceMat = new THREE.MeshStandardMaterial({
    map: faceTex,
    roughness: 0.72,
    metalness: 0
  });
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(CARD_WIDTH - 0.02, CARD_HEIGHT - 0.02),
    faceMat
  );
  face.position.z = CARD_THICK / 2 + 0.02;
  group.add(face);

  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(CARD_WIDTH - 0.02, CARD_HEIGHT - 0.02),
    new THREE.MeshStandardMaterial({ map: sharedBackTexture(), roughness: 0.8 })
  );
  back.position.z = -CARD_THICK / 2 - 0.02;
  back.rotation.y = Math.PI;
  group.add(back);

  // hover glow — a rim of light on the stock edge, not an outline sprite
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(CARD_WIDTH + 0.34, CARD_HEIGHT + 0.34),
    new THREE.MeshBasicMaterial({
      color: RISK_COLOR[data.risk] ?? '#8a6a2f',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  glow.position.z = -CARD_THICK / 2 - 0.02;
  group.add(glow);
  const glowMat = glow.material as THREE.MeshBasicMaterial;

  let highlighted = false;
  let selected = false;
  let currentFaceTex = faceTex;

  function applyGlow(): void {
    const target = selected ? 0.62 : highlighted ? 0.34 : 0;
    tween({
      dur: 0.18,
      tag: `glow:${id}:${group.uuid}`,
      step: t => {
        glowMat.opacity += (target - glowMat.opacity) * t;
      }
    });
  }

  return {
    group,
    setFace(next: CardFaceData) {
      const canvas = paintCardFace(next);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      faceMat.map = tex;
      faceMat.needsUpdate = true;
      currentFaceTex.dispose();
      currentFaceTex = tex;
      glowMat.color.set(RISK_COLOR[next.risk] ?? '#8a6a2f');
    },
    setHighlight(on: boolean) {
      if (highlighted === on) return;
      highlighted = on;
      applyGlow();
    },
    setSelected(on: boolean) {
      if (selected === on) return;
      selected = on;
      applyGlow();
    },
    moveTo(pos, rot, opts = {}) {
      const dur = opts.dur ?? 0.42;
      const from = group.position.clone();
      const fromRot = new THREE.Euler().copy(group.rotation);
      const arc = opts.arc ?? 0;
      return new Promise(resolve => {
        tween({
          dur,
          delay: opts.delay ?? 0,
          ease: opts.ease ?? easeOutCubic,
          tag: `move:${group.uuid}`,
          step: t => {
            group.position.lerpVectors(from, pos, t);
            // a card thrown across a table rises before it lands
            group.position.y += Math.sin(t * Math.PI) * arc;
            group.rotation.set(
              fromRot.x + (rot.x - fromRot.x) * t,
              fromRot.y + (rot.y - fromRot.y) * t,
              fromRot.z + (rot.z - fromRot.z) * t
            );
          },
          done: () => resolve()
        });
      });
    },
    flash(color: string) {
      glowMat.color.set(color);
      glowMat.opacity = 0.95;
      tween({
        dur: 0.7,
        tag: `flash:${group.uuid}`,
        step: t => {
          glowMat.opacity = 0.95 * (1 - t);
        },
        done: () => {
          glowMat.color.set(RISK_COLOR[data.risk] ?? '#8a6a2f');
          applyGlow();
        }
      });
    },
    dispose() {
      group.removeFromParent();
      currentFaceTex.dispose();
      faceMat.dispose();
      glowMat.dispose();
      edgeMat.dispose();
      (back.material as THREE.Material).dispose();
      (face.geometry as THREE.BufferGeometry).dispose();
      (back.geometry as THREE.BufferGeometry).dispose();
      (glow.geometry as THREE.BufferGeometry).dispose();
    }
  };
}

/** The pop a card makes when it is dealt into the hand. */
export function dealIn(card: CardHandle, pos: THREE.Vector3, rot: THREE.Euler, delay: number): Promise<void> {
  card.group.position.set(pos.x + 8, pos.y + 3, pos.z + 10);
  card.group.rotation.set(-Math.PI / 2.1, 0.5, 0.9);
  card.group.scale.setScalar(0.85);
  tween({
    dur: 0.5,
    delay,
    ease: easeOutBack,
    step: t => card.group.scale.setScalar(0.85 + 0.15 * t)
  });
  return card.moveTo(pos, rot, { dur: 0.5, delay, arc: 1.2 });
}
