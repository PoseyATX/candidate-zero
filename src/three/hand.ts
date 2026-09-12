/**
 * CANDIDATE ZERO — hand layout.
 *
 * Pure geometry: given a card's index and how many are held, where does it sit
 * and how is it turned. Cards fan on an arc at the near edge of the table and
 * lean back toward the player, so the faces read from the camera without the
 * camera having to move.
 */

import * as THREE from 'three';
import { CARD_WIDTH } from './cards.js';

/** Near edge of the felt, where a hand rests. */
export const HAND_Z = 6.4;
export const HAND_Y = 0.7;

/** Cards overlap past this many, rather than running off the table. */
const MAX_SPAN = 25;

/**
 * A phone is not a short desktop. The table is 46 units wide and a portrait
 * frustum simply cannot hold that, so the scene reflows: the precincts stack
 * into a narrow column and the hand pulls in rather than running off both
 * edges. Layout asks this; nothing else in the scene needs to know.
 */
export function isNarrow(): boolean {
  return typeof window !== 'undefined' && window.innerWidth / Math.max(1, window.innerHeight) < 0.85;
}

export interface Pose {
  pos: THREE.Vector3;
  rot: THREE.Euler;
}

export function handPose(index: number, count: number, lifted: boolean): Pose {
  const n = Math.max(1, count);
  const span = isNarrow() ? 12.5 : MAX_SPAN;
  const gap = Math.min(CARD_WIDTH * 1.12, span / n);
  const width = gap * (n - 1);
  const x = -width / 2 + index * gap;

  // arc: middle of the hand is nearest the player and highest
  const centered = n === 1 ? 0 : (index - (n - 1) / 2) / ((n - 1) / 2);
  const dip = Math.pow(centered, 2);

  const pos = new THREE.Vector3(
    x,
    HAND_Y + (lifted ? 2.4 : 0) - dip * 0.24,
    HAND_Z + dip * 1.5 - (lifted ? 2.0 : 0)
  );

  // laid back toward the player, fanned outward from the middle
  const rot = new THREE.Euler(
    -Math.PI / 2 + (lifted ? 0.92 : 0.46),
    0,
    -centered * (lifted ? 0.04 : 0.16)
  );

  return { pos, rot };
}

/** Where a card goes to resolve — under the lamp, dead center. */
export function playPose(): Pose {
  return {
    pos: new THREE.Vector3(0, 1.6, 0.5),
    rot: new THREE.Euler(-Math.PI / 2 + 0.32, 0, 0)
  };
}

/** Off to the right, face down: the discard. */
export function discardPose(): Pose {
  return {
    pos: new THREE.Vector3(17.5, 0.3, 8.5),
    rot: new THREE.Euler(-Math.PI / 2, Math.PI, -0.22)
  };
}

/** The draw pile, left of the hand. */
export function drawPose(): Pose {
  return {
    pos: new THREE.Vector3(-17.5, 0.3, 8.5),
    rot: new THREE.Euler(-Math.PI / 2, Math.PI, 0.18)
  };
}

/** Draft offers float above the table, facing the camera squarely. */
export function draftPose(index: number, count: number): Pose {
  const gap = 3.6;
  const x = -(gap * (count - 1)) / 2 + index * gap;
  return {
    pos: new THREE.Vector3(x, 7.5, 3.5),
    rot: new THREE.Euler(-0.5, 0, 0)
  };
}
