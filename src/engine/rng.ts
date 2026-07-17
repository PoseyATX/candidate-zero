/**
 * CANDIDATE ZERO — Seeded RNG (mulberry32)
 * Matches the modular prototype's CZ.rng so replays and AC1 parity are possible.
 * Brutal and impartial: no pity, no soft floor. Seed only for reproducibility.
 */

export interface Rng {
  setSeed(n: number): void;
  getSeed(): number;
  next(): number;
  float(n: number): number;
  int(lo: number, hi: number): number;
  chance(p: number): boolean;
  pick<T>(arr: T[]): T | null;
  shuffle<T>(arr: T[]): T[];
}

export function createRng(seed?: number): Rng {
  let s = ((seed ?? (Date.now() ^ (Math.random() * 0x7fffffff))) >>> 0) || 1;

  function setSeed(n: number): void {
    s = (n >>> 0) || 1;
  }
  function getSeed(): number {
    return s;
  }
  function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function float(n: number): number {
    return next() * n;
  }
  function int(lo: number, hi: number): number {
    return lo + Math.floor(next() * (hi - lo + 1));
  }
  function chance(p: number): boolean {
    return next() < p;
  }
  function pick<T>(arr: T[]): T | null {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(next() * arr.length)] ?? null;
  }
  function shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  return { setSeed, getSeed, next, float, int, chance, pick, shuffle };
}

let defaultRng: Rng = createRng();

export function getRng(): Rng {
  return defaultRng;
}

export function setDefaultSeed(seed: number): void {
  defaultRng.setSeed(seed);
}

export function getDefaultSeed(): number {
  return defaultRng.getSeed();
}

export function useRng(rng: Rng): void {
  defaultRng = rng;
}

export function random(): number {
  return defaultRng.next();
}
