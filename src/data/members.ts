/**
 * CANDIDATE ZERO — The Members.
 *
 * A hundred and fifty people, of whom you will come to know maybe twenty.
 *
 * Until now a provision bought "+16 ayes." Sixteen of what? The number was the
 * whole representation: no names, no counties, nobody who wanted the thing, and
 * so nobody who could remember afterwards that you gave it to them or took it
 * away. Brammer's Fenstemaker did not run the building by having a majority. He
 * ran it by knowing what every single member needed, what each was frightened
 * of, and which of the two was load-bearing that week. Burka's Best & Worst
 * lists worked for thirty years on exactly the same principle: name the person,
 * say what they actually did.
 *
 * So the floor is people now. Each carries:
 *   - a **county**, mapped to one of the eight grounds, because where a member
 *     is from is most of what they are
 *   - a **want**, the issue that moves them, which is how your bill reaches them
 *   - a **price**, what it costs to bring them along when your language does not
 *     already do it for them
 *   - a **memory**, carried in legacy, of every time you delivered for their
 *     county or stripped something they were promised
 *
 * Voice rule, same as everywhere: nobody here is a demographic. They are a
 * pharmacist from a town with one pharmacy, a man who has chaired the same
 * subcommittee for eleven years and expects to be asked, a freshman who is
 * terrified and hiding it badly.
 */

import type { AttrId } from '../engine/types.js';

export interface MemberDef {
  id: string;
  /** How they are addressed on the floor and in the log. */
  name: string;
  /** Where they are from. Reads in the copy; the ground is the mechanism. */
  county: string;
  /** Ground id their county maps to. */
  ground: string;
  /** The issue that moves them. */
  wants: string;
  /** One line — who they are, not what they represent. */
  d: string;
  /** What it takes to work them when the bill does not already do it. */
  price: 'favor' | 'capital' | 'casework' | 'nothing';
  /** The attribute that opens them. */
  opensTo: AttrId;
  /** Baseline weight on a floor count. Chairs and deans carry more than one vote. */
  weight: number;
}

/**
 * Eighteen members you will actually come to know. Not a full chamber — the
 * ones whose names a freshman learns in the first session, because they are the
 * ones who can move something.
 */
export const MEMBERS: MemberDef[] = [
  {
    id: 'M_COBB',
    name: 'Wendell Cobb',
    county: 'Nacogdoches',
    ground: 'GR02',
    wants: 'hospitals',
    d: 'Eleven years on the same subcommittee. Will help you and will expect to be asked properly, in person, before the hearing and not during it.',
    price: 'favor',
    opensTo: 'DIP',
    weight: 3
  },
  {
    id: 'M_ARREDONDO',
    name: 'Delia Arredondo',
    county: 'Hidalgo',
    ground: 'GR08',
    wants: 'hospitals',
    d: 'Ran a clinic before she ran for anything. Knows the ambulance mileage in her county from memory and will recite it at you.',
    price: 'nothing',
    opensTo: 'CON',
    weight: 2
  },
  {
    id: 'M_BRISCOE',
    name: 'Tolar Briscoe',
    county: 'Hockley',
    ground: 'GR02',
    wants: 'water',
    d: 'Third-generation cotton. Votes the district, says so out loud, and has never once pretended otherwise.',
    price: 'nothing',
    opensTo: 'CHA',
    weight: 2
  },
  {
    id: 'M_KETTERMAN',
    name: 'Ross Ketterman',
    county: 'Midland',
    ground: 'GR05',
    wants: 'grid',
    d: 'Oil money, engineering degree, genuinely reads the bills. The most dangerous kind of ally: he will find your drafting error and mention it kindly.',
    price: 'capital',
    opensTo: 'CRA',
    weight: 3
  },
  {
    id: 'M_FAIRWEATHER',
    name: 'Loyce Fairweather',
    county: 'Angelina',
    ground: 'GR04',
    wants: 'schools',
    d: 'Taught fourth grade for twenty-two years. Every superintendent in three counties has her cell number.',
    price: 'nothing',
    opensTo: 'CHA',
    weight: 2
  },
  {
    id: 'M_STROUD',
    name: 'Hollis Stroud',
    county: 'Harris',
    ground: 'GR03',
    wants: 'taxes',
    d: 'Suburban, careful, up by four points last cycle. Will be with you until the mail hits, then will not.',
    price: 'capital',
    opensTo: 'CRA',
    weight: 1
  },
  {
    id: 'M_YBARRA',
    name: 'Nando Ybarra',
    county: 'El Paso',
    ground: 'GR08',
    wants: 'border',
    d: 'Grew up on a street the maps call a colonia and he calls home. Has no patience left for people who visit for the photograph.',
    price: 'casework',
    opensTo: 'CON',
    weight: 2
  },
  {
    id: 'M_DEATHERAGE',
    name: 'June Deatherage',
    county: 'Wichita',
    ground: 'GR06',
    wants: 'veterans',
    d: 'Sheppard AFB is in her district and the Legion hall is her real office. Knows every name on the waiting list.',
    price: 'nothing',
    opensTo: 'CHA',
    weight: 2
  },
  {
    id: 'M_PRUITT',
    name: 'Ancil Pruitt',
    county: 'Cherokee',
    ground: 'GR04',
    wants: 'vouchers',
    d: 'Deacon, dairy, and a district where the school IS the town. Torn on this in a way he will not discuss on the record.',
    price: 'favor',
    opensTo: 'DIP',
    weight: 2
  },
  {
    id: 'M_LANDRY',
    name: 'Odette Landry',
    county: 'Jefferson',
    ground: 'GR05',
    wants: 'payday-lending',
    d: 'Refinery town, union household, four payday storefronts inside a mile of the plant gate. She has counted them.',
    price: 'nothing',
    opensTo: 'CON',
    weight: 2
  },
  {
    id: 'M_HAVERKAMP',
    name: 'Dell Haverkamp',
    county: 'Gillespie',
    ground: 'GR07',
    wants: 'land',
    d: 'Six generations on the same section. A right-of-way agent came to his gate once and he has been legislating about it ever since.',
    price: 'nothing',
    opensTo: 'CON',
    weight: 2
  },
  {
    id: 'M_OKONKWO',
    name: 'Priscilla Okonkwo',
    county: 'Fort Bend',
    ground: 'GR03',
    wants: 'broadband',
    d: 'Software before politics. Has personally driven the county roads with a signal meter and brought the printout to committee.',
    price: 'capital',
    opensTo: 'CRA',
    weight: 1
  },
  {
    id: 'M_TATUM',
    name: 'Bo Tatum',
    county: 'Bowie',
    ground: 'GR01',
    wants: 'corruption',
    d: 'Former DA who lost the county he prosecuted in and came back anyway. Nobody at that courthouse takes his call.',
    price: 'nothing',
    opensTo: 'INK',
    weight: 1
  },
  {
    id: 'M_VANCE',
    name: 'Lurleen Vance',
    county: 'Taylor',
    ground: 'GR01',
    wants: 'mental-health',
    d: 'Her brother is in the county jail because there was nowhere else at two in the morning. She says this in hearings, evenly.',
    price: 'nothing',
    opensTo: 'CON',
    weight: 2
  },
  {
    id: 'M_QUILLEN',
    name: 'Ferrell Quillen',
    county: 'Travis',
    ground: 'GR01',
    wants: 'election-integrity',
    d: 'Parliamentarian by temperament. Will explain why your motion is out of order before you finish making it, and be right.',
    price: 'favor',
    opensTo: 'INK',
    weight: 3
  },
  {
    id: 'M_MCCAULEY',
    name: 'Sudie McCauley',
    county: 'Hutchinson',
    ground: 'GR02',
    wants: 'ag-subsidies',
    d: 'Feedlot country. Does the arithmetic on the whole herd before she answers any question about livestock, and answers slowly.',
    price: 'nothing',
    opensTo: 'CHA',
    weight: 2
  },
  {
    id: 'M_BRAUNIG',
    name: 'Ort Braunig',
    county: 'Comal',
    ground: 'GR07',
    wants: 'water',
    d: 'Lake county, marina money, and a boat ramp that ended in dry gravel two summers running. Newly, loudly interested in hydrology.',
    price: 'capital',
    opensTo: 'CRA',
    weight: 1
  },
  {
    id: 'M_SEALS',
    name: 'Marvette Seals',
    county: 'Dallas',
    ground: 'GR08',
    wants: 'bail-reform',
    d: 'Freshman. Terrified, hiding it badly, and the only member who has actually read the pretrial numbers because nobody told her not to bother.',
    price: 'nothing',
    opensTo: 'INK',
    weight: 1
  }
];

export const MEMBER_BY_ID: Record<string, MemberDef> = Object.fromEntries(
  MEMBERS.map(m => [m.id, m])
);

/** Members a piece of language actually reaches: their county, or their want. */
export function membersReachedBy(opts: {
  serves?: string[];
  issueId?: string | null;
}): MemberDef[] {
  const serves = new Set(opts.serves ?? []);
  return MEMBERS.filter(
    m => serves.has(m.ground) || (!!opts.issueId && m.wants === opts.issueId)
  );
}
