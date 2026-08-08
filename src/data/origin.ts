/**
 * CANDIDATE ZERO — where you came from, which is most of who you are.
 *
 * Picking a persona is picking a silhouette. This is the part that makes two
 * Blockwalkers different people: the trade you worked, the first time you stood
 * up in front of a room, and the thing in your past that a mail piece is going
 * to find in October.
 *
 * Every answer moves the root attributes, which are not decoration — engine/
 * play.ts turns each point above ten into +2.5 percentage points on any card
 * tagged with that attribute, and each point below ten into the same penalty.
 * A man who ran a delivery route for eleven years is genuinely better at doors
 * than a man who read code sections at the appraisal district, and worse in a
 * room with a chairman. That is the whole design: the biography IS the build,
 * and nobody has to look at a slider.
 *
 * Three questions, four answers each: 64 origins per persona, 256 in all, and
 * every one of them a sentence about a person rather than a stat line.
 *
 * The third question is the one that pays off latest. A skeleton is real from
 * week one — it starts you with exposure the opposition can work — and it is
 * chosen, which means the player is the one who decided what they can be hurt
 * with.
 */

import type { AttrId, Attrs, GameState } from '../engine/types.js';

export type AttrBoost = Partial<Attrs>;

export interface OriginAnswer {
  id: string;
  /** Short label on the card. */
  n: string;
  /** The scene. This is the part the player actually reads. */
  d: string;
  attrs: AttrBoost;
  /** Anything beyond attributes — a skeleton puts real exposure on the board. */
  apply?: (s: GameState) => void;
}

export interface OriginQuestion {
  id: string;
  /** The question, in the second person. */
  q: string;
  /** One line of framing under it. */
  hint: string;
  answers: OriginAnswer[];
}

export const ORIGIN_QUESTIONS: OriginQuestion[] = [
  {
    id: 'trade',
    q: 'Before any of this, you made a living',
    hint: 'Eleven years of something. It is still in your hands.',
    answers: [
      {
        id: 'route',
        n: 'Running a route',
        d: 'Forty stops between Lampasas and the county line, five days a week, for eleven years. You know every dog on that road and which screen doors stick.',
        attrs: { CLO: 3, DIP: -1 }
      },
      {
        id: 'counter',
        n: 'Behind a counter',
        d: 'Parts department. Two hundred people a week, and you remembered what most of them drove and which ones were good for it.',
        attrs: { CHA: 3, INK: -1 }
      },
      {
        id: 'office',
        n: 'In a county office',
        d: 'Appraisal district. You have explained the homestead exemption to people who were crying, and you have read the section of the code that governs it more than once.',
        attrs: { INK: 3, CHA: -1 }
      },
      {
        id: 'crew',
        n: 'On a crew',
        d: 'Rig floor, framing, or harvest — the work where somebody is always about to get hurt, and it is usually whoever is talking.',
        attrs: { CON: 3, DIP: -1 }
      }
    ]
  },
  {
    id: 'first',
    q: 'The first time you spoke in front of people',
    hint: 'It went one of four ways and you have been that person since.',
    answers: [
      {
        id: 'angry',
        n: 'You were angry',
        d: 'Commissioners’ court, three minutes on the clock, and you used every second. Your voice went at the end and not one person in that room looked away.',
        attrs: { CON: 2, CRA: -1 }
      },
      {
        id: 'cards',
        n: 'You brought cards',
        d: 'Index cards, in order, and you did not look up until the last one. It was not warm. It was also not wrong, and the reporter quoted it correctly.',
        attrs: { INK: 2, CHA: -1 }
      },
      {
        id: 'laugh',
        n: 'You made them laugh',
        d: 'You opened with the thing about the parking lot and had the whole room inside a minute. You have never been sure they heard the rest of it.',
        attrs: { CHA: 2, CON: -1 }
      },
      {
        id: 'handed',
        n: 'You got somebody else to do it',
        d: 'You wrote it, and you handed it to the woman they were actually going to listen to, and it passed eleven to nothing.',
        attrs: { DIP: 2, CLO: -1 }
      }
    ]
  },
  {
    id: 'skeleton',
    q: 'And there is one thing you would rather nobody went looking for',
    hint: 'They will find it in October. Choose which it is.',
    answers: [
      {
        id: 'bankruptcy',
        n: 'A bankruptcy',
        d: 'The store went under in ’11 and took the house with it. Public record, nine years old, and it will be on a mailer with your wife’s name spelled wrong.',
        attrs: { CRA: 2, CON: -1 },
        apply: s => {
          s.exposure += 0.2;
          s.sessionFlags = s.sessionFlags || {};
          s.sessionFlags.skeleton_bankruptcy = 1;
        }
      },
      {
        id: 'dwi',
        n: 'A bad night, a long time ago',
        d: 'One road, one deputy, nobody hurt. A photograph that has outlived nearly everyone who was there that night.',
        attrs: { CON: 2, DIP: -1 },
        apply: s => {
          s.exposure += 0.3;
          s.sessionFlags = s.sessionFlags || {};
          s.sessionFlags.skeleton_dwi = 1;
        }
      },
      {
        id: 'payroll',
        n: 'A relative on the county payroll',
        d: 'Your brother-in-law has run a road crew for the precinct for nine years. He is good at it. That is not going to be the part anybody prints.',
        attrs: { DIP: 2, CON: -1 },
        apply: s => {
          s.exposure += 0.2;
          s.sessionFlags = s.sessionFlags || {};
          s.sessionFlags.skeleton_payroll = 1;
        }
      },
      {
        id: 'crossover',
        n: 'You voted in the other primary',
        d: 'Twice. There were reasons both times and neither reason fits on a push card. In this state that is a fact with a serial number on it.',
        attrs: { CRA: 2, CON: -1 },
        apply: s => {
          s.exposure += 0.25;
          s.faces.T = Math.max(-50, (s.faces.T || 0) - 4);
          s.sessionFlags = s.sessionFlags || {};
          s.sessionFlags.skeleton_crossover = 1;
        }
      }
    ]
  }
];

export function getOriginQuestion(id: string): OriginQuestion | undefined {
  return ORIGIN_QUESTIONS.find(q => q.id === id);
}

/** Resolve an answer id against every question. Ids are unique across the set. */
export function getOriginAnswer(answerId: string): OriginAnswer | undefined {
  for (const q of ORIGIN_QUESTIONS) {
    const a = q.answers.find(x => x.id === answerId);
    if (a) return a;
  }
  return undefined;
}

/** The answers a filing carries, in question order, skipping anything unset. */
export function resolveOrigins(ids: readonly string[] | undefined): OriginAnswer[] {
  if (!ids?.length) return [];
  const out: OriginAnswer[] = [];
  for (const q of ORIGIN_QUESTIONS) {
    const picked = q.answers.find(a => ids.includes(a.id));
    if (picked) out.push(picked);
  }
  return out;
}

/** Every answer id, for validation. */
export const ALL_ORIGIN_ANSWER_IDS: string[] = ORIGIN_QUESTIONS.flatMap(q =>
  q.answers.map(a => a.id)
);

/**
 * What the origin does to the root attributes, without touching a GameState.
 * The filing screen shows this before you sign — see ui/nameplate-draft.ts.
 */
export function originAttrDelta(ids: readonly string[] | undefined): AttrBoost {
  const out: AttrBoost = {};
  for (const a of resolveOrigins(ids)) {
    for (const [k, v] of Object.entries(a.attrs)) {
      if (typeof v !== 'number') continue;
      const id = k as AttrId;
      out[id] = (out[id] ?? 0) + v;
    }
  }
  return out;
}
