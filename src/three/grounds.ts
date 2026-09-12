/**
 * CANDIDATE ZERO — the precincts, as plaques on the table.
 *
 * Field plays need a target, and a dropdown is not a target. These lie flat
 * across the middle of the felt: brass-edged plaques you put a card on. When
 * a field card is in your hand the open ones come up under the lamp and the
 * locked ones stay dark.
 */

import * as THREE from 'three';
import { paintGroundPlaque, type GroundPlaqueData } from './paint.js';
import { isNarrow } from './hand.js';
import { tween } from './tween.js';

const PLAQUE_W = 6.4;
const PLAQUE_D = 3.2;
export const GROUND_Z = -5.2;

export interface GroundHandle {
  group: THREE.Group;
  id: string;
  setData(data: GroundPlaqueData): void;
  setArmed(on: boolean): void;
  setHighlight(on: boolean): void;
  dispose(): void;
}

export function createGround(id: string, data: GroundPlaqueData): GroundHandle {
  const group = new THREE.Group();
  group.userData.pickId = `ground:${id}`;

  const tex = new THREE.CanvasTexture(paintGroundPlaque(data));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.82,
    metalness: 0.04
  });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(PLAQUE_W, 0.16, PLAQUE_D), [
    new THREE.MeshStandardMaterial({ color: '#6b5535', roughness: 0.6, metalness: 0.3 }),
    new THREE.MeshStandardMaterial({ color: '#6b5535', roughness: 0.6, metalness: 0.3 }),
    mat,
    new THREE.MeshStandardMaterial({ color: '#3a2e1e', roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: '#6b5535', roughness: 0.6, metalness: 0.3 }),
    new THREE.MeshStandardMaterial({ color: '#6b5535', roughness: 0.6, metalness: 0.3 })
  ]);
  plate.castShadow = true;
  plate.receiveShadow = true;
  group.add(plate);

  // the "put it here" ring, only lit while a field play is held
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(PLAQUE_W * 0.56, PLAQUE_W * 0.62, 48),
    new THREE.MeshBasicMaterial({
      color: '#e0c070',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.11;
  ring.scale.set(1, PLAQUE_D / PLAQUE_W, 1);
  group.add(ring);
  const ringMat = ring.material as THREE.MeshBasicMaterial;

  let armed = false;
  let hot = false;
  let currentTex = tex;

  function retarget(): void {
    const target = hot ? 0.95 : armed ? 0.4 : 0;
    tween({
      dur: 0.2,
      tag: `ground-glow:${id}`,
      step: t => {
        ringMat.opacity += (target - ringMat.opacity) * t;
      }
    });
  }

  return {
    group,
    id,
    setData(next: GroundPlaqueData) {
      const canvas = paintGroundPlaque(next);
      const nextTex = new THREE.CanvasTexture(canvas);
      nextTex.colorSpace = THREE.SRGBColorSpace;
      nextTex.anisotropy = 8;
      mat.map = nextTex;
      mat.needsUpdate = true;
      currentTex.dispose();
      currentTex = nextTex;
    },
    setArmed(on: boolean) {
      if (armed === on) return;
      armed = on;
      retarget();
      tween({
        dur: 0.28,
        tag: `ground-rise:${id}`,
        step: t => {
          const to = on ? 0.34 : 0;
          group.position.y += (to - group.position.y) * t;
        }
      });
    },
    setHighlight(on: boolean) {
      if (hot === on) return;
      hot = on;
      retarget();
    },
    dispose() {
      group.removeFromParent();
      currentTex.dispose();
      mat.dispose();
      ringMat.dispose();
    }
  };
}

/** Lay the plaques out in rows across the middle of the felt. */
export function groundPosition(index: number, count: number): THREE.Vector3 {
  // Portrait stacks them two abreast; a four-wide row is wider than a phone
  // frustum can hold and the outer plaques fall off the screen entirely.
  const perRow = isNarrow() ? 2 : count <= 4 ? count : Math.ceil(count / 2);
  const row = Math.floor(index / perRow);
  const col = index % perRow;
  const rows = Math.ceil(count / perRow);
  const gapX = PLAQUE_W + 0.9;
  const gapZ = PLAQUE_D + 1.1;
  const x = -(gapX * (perRow - 1)) / 2 + col * gapX;
  const z = GROUND_Z - (gapZ * (rows - 1)) / 2 + row * gapZ;
  return new THREE.Vector3(x, 0, z);
}
