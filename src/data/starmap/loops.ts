/**
 * Starmap loop / subloop registry — issues #17 #18.
 */

import type { LoopDef, LoopId } from '../../engine/types-entities.js';

function stub(
  id: LoopId,
  name: string,
  kind: LoopDef['kind'],
  description: string,
  extra: Partial<LoopDef> = {}
): LoopDef {
  return {
    id,
    name,
    kind,
    description,
    advancement: extra.advancement ?? [
      {
        id: `${id}_ADV_TODO`,
        type: 'advancement',
        description: 'Stub — fill when loop is piloted',
        kind: 'manual_todo'
      }
    ],
    setback: extra.setback ?? [
      {
        id: `${id}_SET_TODO`,
        type: 'setback',
        description: 'Stub — fill when loop is piloted',
        kind: 'manual_todo'
      }
    ],
    exampleVerbs: extra.exampleVerbs ?? ['Show up', 'Listen', 'Ask'],
    exampleNouns: extra.exampleNouns ?? ['Favor', 'Door', 'Rumor'],
    entityId: extra.entityId,
    parentLoopId: extra.parentLoopId
  };
}

const TEMPLATES: LoopDef[] = [
  stub('LOOP_TMPL_STREET', 'Street-level orbit', 'template', 'Civilians and fringe — presence, grievance, occasional leverage.'),
  stub('LOOP_TMPL_GRASSROOTS', 'Grassroots campaign orbit', 'template', 'Doors, lists, precinct math, small money, volunteer spine.'),
  stub('LOOP_TMPL_LOCAL', 'Local power orbit', 'template', 'Courthouse, school board, chamber, local media.'),
  stub('LOOP_TMPL_LEGE_STAFF', 'Capitol staff orbit', 'template', 'Aides, clerks, drafters — permanent government.'),
  stub('LOOP_TMPL_LEGE', 'Legislative peer orbit', 'template', 'Members, chairs, freshmen, firebrands.'),
  stub('LOOP_TMPL_LEADERSHIP', 'Leadership orbit', 'template', 'Speaker, Lt. Gov, whips, calendar — fifth floor.'),
  stub('LOOP_TMPL_STATEWIDE', 'Statewide executive orbit', 'template', "Governor's row, statewide offices, party."),
  stub('LOOP_TMPL_FEDERAL', 'Federal / lobby / media orbit', 'template', 'DC-adjacent, dark money, Tribune row, wildcards.'),
  stub('LOOP_TMPL_PROCEDURAL', 'Procedural force orbit', 'template', 'Vacancies, maps, specials, hearings — system as actor.')
];

const WAITING: LoopDef[] = [
  stub('LOOP_WAITING_PERENNIAL', 'Perennial candidate', 'waiting', 'Keep the list warm until the next filing.', {
    exampleVerbs: ['Work the list', 'Attend the funeral', 'Bank a favor'],
    exampleNouns: ['Rolodex', 'Casserole', 'Yard sign cache']
  }),
  stub('LOOP_WAITING_ADVOCATE', 'Issue advocate', 'waiting', 'The candidate lost; the organization did not.', {
    exampleVerbs: ['Host a forum', 'Draft the brief', 'Recruit chapters']
  }),
  stub('LOOP_WAITING_STAFFER', 'Capitol staffer', 'waiting', 'Two years inside learning the levers.', {
    exampleVerbs: ['Carry the bag', 'Brief the member', 'Work the desk']
  }),
  stub('LOOP_WAITING_HOME', 'Go home a while', 'waiting', 'Fence, Friday games, let the mailers fade.', {
    exampleVerbs: ['Coach', 'Mend fence', 'Stay quiet']
  }),
  stub('LOOP_WAITING_EXMEMBER', 'Ex-member', 'waiting', 'Title still warm; doors still open; no vote.', {
    exampleVerbs: ['Lunch the lobby', 'Advise a freshman', 'Test the waters']
  })
];

const ELECTED: LoopDef[] = [
  stub('LOOP_ELECTED_SESSION', 'Legislative session', 'elected', 'Bill pipeline, casework, fifth floor.', {
    exampleVerbs: ['File', 'Refer', 'Whip', 'Casework']
  }),
  stub('LOOP_ELECTED_REELECTION', 'Reelection cycle', 'elected', 'Defend the seat as incumbent.', {
    exampleVerbs: ['Bank GOTV', 'Call chairs', 'Raise early']
  }),
  stub('LOOP_ELECTED_HIGHER_SENATE', 'Senate exploratory', 'higher_office', 'Fork toward the other chamber.'),
  stub('LOOP_ELECTED_HIGHER_STATEWIDE', 'Statewide exploratory', 'higher_office', "Fork toward Governor's row.")
];

/** Pilot: Precinct Chair — real advancement conditions. */
const PILOT_PRECINCT: LoopDef = {
  id: 'LOOP_ENT_PRECINCT_CHAIR',
  name: 'Precinct Chair network',
  kind: 'entity_primary',
  entityId: 'ENT_PRECINCT_CHAIR',
  description:
    'Court chairs, bank porch endorsements, warm the precinct graph. Advancement opens MV01.',
  advancement: [
    {
      id: 'ADV_PRECINCT_WARM_2',
      type: 'advancement',
      description: 'Two warm Precinct Chair allies (AL01 count ≥ 2).',
      kind: 'warm_ally_gte',
      params: { allyId: 'AL01', n: 2 },
      movementTarget: 'ENT_PRECINCT_CHAIR'
    },
    {
      id: 'ADV_PRECINCT_ENDORSE',
      type: 'advancement',
      description: 'endorsePts ≥ 2 and at least one warm AL01.',
      kind: 'endorse_gte',
      params: { n: 2, requireAlly: 'AL01' },
      movementTarget: 'ENT_PRECINCT_CHAIR'
    }
  ],
  setback: [
    {
      id: 'SET_PRECINCT_HIT',
      type: 'setback',
      description: 'Three hit pieces while on the chair circuit.',
      kind: 'hit_pieces_gte',
      params: { n: 3 },
      residue: ['scar_chair_circuit']
    }
  ],
  exampleVerbs: ['Kitchen-table meeting', 'Court the chairs', 'Call in the precinct network'],
  exampleNouns: ['Porch', 'Pie', 'Precinct map', "Club president's number"]
};

const PILOT_SUB: LoopDef[] = [
  stub('LOOP_SUB_PRECINCT_PORCH', 'Porch circuit', 'entity_sub', 'One chair at a time.', {
    parentLoopId: 'LOOP_ENT_PRECINCT_CHAIR',
    entityId: 'ENT_PRECINCT_CHAIR',
    exampleVerbs: ['Bring pie', 'Leave early', 'Ask for the club list']
  }),
  stub('LOOP_SUB_PRECINCT_CLUB', 'Club math', 'entity_sub', 'Straw polls and club presidents.', {
    parentLoopId: 'LOOP_ENT_PRECINCT_CHAIR',
    entityId: 'ENT_PRECINCT_CHAIR',
    exampleVerbs: ['Pack the straw', 'Speak the club']
  })
];

function entLoop(suffix: string, name: string, description: string, entityId: string): LoopDef {
  return stub(`LOOP_ENT_${suffix}`, name, 'entity_primary', description, { entityId });
}

/** Pilot 2: Canvass Captain — real advancement (AL09 / MV02). */
const PILOT_CAPTAIN: LoopDef = {
  id: 'LOOP_ENT_CANVASS_CAPTAIN',
  name: 'Canvass Captain field',
  kind: 'entity_primary',
  entityId: 'ENT_CANVASS_CAPTAIN',
  description:
    'Promote or hire a field spine (AL09). Advancement opens MV02 — run the turf plan.',
  advancement: [
    {
      id: 'ADV_CAPTAIN_WARM',
      type: 'advancement',
      description: 'Warm Canvass Captain / Field Director ally (AL09).',
      kind: 'has_ally',
      params: { allyId: 'AL09' },
      movementTarget: 'ENT_CANVASS_CAPTAIN'
    },
    {
      id: 'ADV_CAPTAIN_VOL_FIELD',
      type: 'advancement',
      description: 'volPool ≥ 3 and nameID ≥ 8 (field is real enough to need a plan).',
      kind: 'name_id_gte',
      params: { n: 8, requireVol: 3 },
      movementTarget: 'ENT_CANVASS_CAPTAIN'
    }
  ],
  setback: [
    {
      id: 'SET_CAPTAIN_FLAKE',
      type: 'setback',
      description: 'Field collapses under hit pieces.',
      kind: 'hit_pieces_gte',
      params: { n: 4 },
      residue: ['scar_field_flake']
    }
  ],
  exampleVerbs: ['Promote captain', 'Hire field director', 'Execute the turf plan'],
  exampleNouns: ['Route book', 'Walk list', 'Field AP', 'Turf map']
};

/** Pilot 3: County Judge — real advancement (AL15 / MV03). */
const PILOT_JUDGE: LoopDef = {
  id: 'LOOP_ENT_COUNTY_JUDGE',
  name: 'County Judge courthouse',
  kind: 'entity_primary',
  entityId: 'ENT_COUNTY_JUDGE',
  description:
    'Heaviest local nod. Court the judge (PL48) or bank enough weight to open the orbit. MV03 spends the nod.',
  advancement: [
    {
      id: 'ADV_JUDGE_ALLY',
      type: 'advancement',
      description: 'Warm County Judge ally (AL15).',
      kind: 'has_ally',
      params: { allyId: 'AL15' },
      movementTarget: 'ENT_COUNTY_JUDGE'
    },
    {
      id: 'ADV_JUDGE_WEIGHT',
      type: 'advancement',
      description: 'endorsePts ≥ 4 and nameID ≥ 16 (look like a winner before the nod).',
      kind: 'endorse_gte',
      params: { n: 4, requireName: 16 },
      movementTarget: 'ENT_COUNTY_JUDGE'
    }
  ],
  setback: [
    {
      id: 'SET_JUDGE_INDEPENDENCE',
      type: 'setback',
      description: 'Overplay the courthouse; independence reasserted.',
      kind: 'hit_pieces_gte',
      params: { n: 3 },
      residue: ['scar_judge_cold']
    }
  ],
  exampleVerbs: ['Court the County Judge', 'Spend the courthouse nod', 'Look like a winner'],
  exampleNouns: ['Courthouse', 'County nod', 'War chest optics']
};

/** Template pilots — County Party / Club / Editor / Faith (MV04–07). */
const PILOT_PARTY: LoopDef = {
  id: 'LOOP_ENT_COUNTY_PARTY_EXEC',
  name: 'County Party apparatus',
  kind: 'entity_primary',
  entityId: 'ENT_COUNTY_PARTY_EXEC',
  description: 'Chairwoman network and committee math. Opens MV04.',
  advancement: [
    {
      id: 'ADV_PARTY_ALLY',
      type: 'advancement',
      description: 'Warm County Chairwoman ally (AL02).',
      kind: 'has_ally',
      params: { allyId: 'AL02' },
      movementTarget: 'ENT_COUNTY_PARTY_EXEC'
    },
    {
      id: 'ADV_PARTY_CHAIRS',
      type: 'advancement',
      description: 'Three warm Precinct Chairs (AL01 count ≥ 3) — party notices the graph.',
      kind: 'warm_ally_gte',
      params: { allyId: 'AL01', n: 3 },
      movementTarget: 'ENT_COUNTY_PARTY_EXEC'
    }
  ],
  setback: [
    {
      id: 'SET_PARTY_SCANDAL',
      type: 'setback',
      description: 'Hit pieces sour the apparatus.',
      kind: 'hit_pieces_gte',
      params: { n: 4 },
      residue: ['scar_party_cold']
    }
  ],
  exampleVerbs: ['Call the Chairwoman', 'Work the committee', 'Spend party apparatus'],
  exampleNouns: ['County HQ', 'Voter file access', 'Endorsement slate']
};

const PILOT_CLUB: LoopDef = {
  id: 'LOOP_ENT_CLUB_LEADER',
  name: 'Club roster circuit',
  kind: 'entity_primary',
  entityId: 'ENT_CLUB_LEADER',
  description: 'Straw polls, casseroles, club presidents. Opens MV05.',
  advancement: [
    {
      id: 'ADV_CLUB_ALLY',
      type: 'advancement',
      description: 'Warm Club President ally (AL03).',
      kind: 'has_ally',
      params: { allyId: 'AL03' },
      movementTarget: 'ENT_CLUB_LEADER'
    },
    {
      id: 'ADV_CLUB_ENDORSE',
      type: 'advancement',
      description: 'endorsePts ≥ 3 (club circuit has already nodded).',
      kind: 'endorse_gte',
      params: { n: 3 },
      movementTarget: 'ENT_CLUB_LEADER'
    }
  ],
  setback: [
    {
      id: 'SET_CLUB_SNUB',
      type: 'setback',
      description: 'Too many hit pieces for the casserole table.',
      kind: 'hit_pieces_gte',
      params: { n: 3 },
      residue: ['scar_club_snub']
    }
  ],
  exampleVerbs: ['Pack the straw', 'Speak the club', 'Pull the roster'],
  exampleNouns: ['Club list', 'Straw poll', 'Casserole']
};

const PILOT_EDITOR: LoopDef = {
  id: 'LOOP_ENT_LOCAL_EDITOR',
  name: 'Newsroom fair shake',
  kind: 'entity_primary',
  entityId: 'ENT_LOCAL_EDITOR',
  description: 'Beat reporter / editor goodwill. Opens MV06.',
  advancement: [
    {
      id: 'ADV_EDITOR_ALLY',
      type: 'advancement',
      description: 'Warm Beat Reporter ally (AL04).',
      kind: 'has_ally',
      params: { allyId: 'AL04' },
      movementTarget: 'ENT_LOCAL_EDITOR'
    },
    {
      id: 'ADV_EDITOR_NAME',
      type: 'advancement',
      description: 'nameID ≥ 14 (the paper already spells your name).',
      kind: 'name_id_gte',
      params: { n: 14 },
      movementTarget: 'ENT_LOCAL_EDITOR'
    }
  ],
  setback: [
    {
      id: 'SET_EDITOR_HIT',
      type: 'setback',
      description: 'Hit pieces become the only story.',
      kind: 'hit_pieces_gte',
      params: { n: 3 },
      residue: ['scar_newsroom']
    }
  ],
  exampleVerbs: ['Coffee with the editor', 'Press release grind', 'Call in the fair shake'],
  exampleNouns: ['Page six', 'Above the fold', 'News peg']
};

const PILOT_FAITH: LoopDef = {
  id: 'LOOP_ENT_FAITH_LEADER',
  name: 'Corridor blessing',
  kind: 'entity_primary',
  entityId: 'ENT_FAITH_LEADER',
  description: 'Pastor / mega-church corridor. Opens MV07.',
  advancement: [
    {
      id: 'ADV_FAITH_ALLY',
      type: 'advancement',
      description: 'Warm Pastor ally (AL08).',
      kind: 'has_ally',
      params: { allyId: 'AL08' },
      movementTarget: 'ENT_FAITH_LEADER'
    },
    {
      id: 'ADV_FAITH_BACKER',
      type: 'advancement',
      description: 'B02 Sunday Congregation backer and nameID ≥ 10.',
      kind: 'name_id_gte',
      params: { n: 10, requireBacker: 'B02' },
      movementTarget: 'ENT_FAITH_LEADER'
    }
  ],
  setback: [
    {
      id: 'SET_FAITH_SCANDAL',
      type: 'setback',
      description: 'Scandal closes the corridor.',
      kind: 'hit_pieces_gte',
      params: { n: 3 },
      residue: ['scar_corridor']
    }
  ],
  exampleVerbs: ['Prayer breakfast', 'Open the corridor', 'Spend the blessing'],
  exampleNouns: ['Directory', 'Corridor', 'First Church']
};

/** Slate-Maker — printed card half the primary votes from (AL16 / MV08). */
const PILOT_SLATE: LoopDef = {
  id: 'LOOP_ENT_SLATE_MAKER',
  name: 'Slate card print run',
  kind: 'entity_primary',
  entityId: 'ENT_SLATE_MAKER',
  description:
    'One man prints the card half the primary votes from. See him (PL22B) then spend the slate (MV08).',
  advancement: [
    {
      id: 'ADV_SLATE_ALLY',
      type: 'advancement',
      description: 'Warm Slate-Maker ally (AL16).',
      kind: 'has_ally',
      params: { allyId: 'AL16' },
      movementTarget: 'ENT_SLATE_MAKER'
    },
    {
      id: 'ADV_SLATE_PRICE',
      type: 'advancement',
      description: 'Slate-Maker\'s Price (OB3) already on the books.',
      kind: 'has_obl',
      params: { oblId: 'OB3' },
      movementTarget: 'ENT_SLATE_MAKER'
    },
    {
      id: 'ADV_SLATE_READY',
      type: 'advancement',
      description: 'Warm AL02 + endorse ≥ 2 + $≥1200 (Chairwoman path to the print shop).',
      kind: 'endorse_gte',
      params: { n: 2, requireAlly: 'AL02', requireCash: 1200 },
      movementTarget: 'ENT_SLATE_MAKER'
    }
  ],
  setback: [
    {
      id: 'SET_SLATE_SCANDAL',
      type: 'setback',
      description: 'Hit pieces make the printed card a liability.',
      kind: 'hit_pieces_gte',
      params: { n: 3 },
      residue: ['scar_slate_reversed']
    }
  ],
  exampleVerbs: ['See the Slate-Maker', 'Print the card', 'Spend the slate'],
  exampleNouns: ['Printed card', 'Marker', "Chairwoman's call"]
};

/** Finance Chair — call the book (AL10 / MV09). */
const PILOT_FINANCE: LoopDef = {
  id: 'LOOP_ENT_FINANCE_CHAIR',
  name: 'Finance Chair call sheet',
  kind: 'entity_primary',
  entityId: 'ENT_FINANCE_CHAIR',
  description: 'Someone who can dial money on a schedule. Opens MV09.',
  advancement: [
    {
      id: 'ADV_FINANCE_ALLY',
      type: 'advancement',
      description: 'Warm Finance Chair ally (AL10).',
      kind: 'has_ally',
      params: { allyId: 'AL10' },
      movementTarget: 'ENT_FINANCE_CHAIR'
    },
    {
      id: 'ADV_FINANCE_WAR_CHEST',
      type: 'advancement',
      description: 'endorse ≥ 1 + $≥1000 (war chest ready for a real finance chair).',
      kind: 'endorse_gte',
      params: { n: 1, requireCash: 1000 },
      movementTarget: 'ENT_FINANCE_CHAIR'
    }
  ],
  setback: [
    {
      id: 'SET_FINANCE_HIT',
      type: 'setback',
      description: 'Hit pieces dry the phones.',
      kind: 'hit_pieces_gte',
      params: { n: 3 },
      residue: ['scar_finance_cold']
    }
  ],
  exampleVerbs: ['Hire the Finance Chair', 'Call the book', 'Spend the list'],
  exampleNouns: ['Call sheet', 'Max-out', 'Bundler lunch']
};

/** Radio Host — drive-time (AL05 / MV10). */
const PILOT_RADIO: LoopDef = {
  id: 'LOOP_ENT_RADIO_HOST',
  name: 'Drive-time slot',
  kind: 'entity_primary',
  entityId: 'ENT_RADIO_HOST',
  description: 'Open mic between farm reports and the noon news. Opens MV10.',
  advancement: [
    {
      id: 'ADV_RADIO_ALLY',
      type: 'advancement',
      description: 'Warm Drive-Time Host ally (AL05).',
      kind: 'has_ally',
      params: { allyId: 'AL05' },
      movementTarget: 'ENT_RADIO_HOST'
    },
    {
      id: 'ADV_RADIO_NAME',
      type: 'advancement',
      description: 'nameID ≥ 12 (already loud enough to book).',
      kind: 'name_id_gte',
      params: { n: 12 },
      movementTarget: 'ENT_RADIO_HOST'
    }
  ],
  setback: [
    {
      id: 'SET_RADIO_HIT',
      type: 'setback',
      description: 'Too many hit pieces for live radio.',
      kind: 'hit_pieces_gte',
      params: { n: 3 },
      residue: ['scar_radio_cold']
    }
  ],
  exampleVerbs: ['Book drive time', 'Take the call', 'Spend the slot'],
  exampleNouns: ['Open mic', 'Call screener', 'Farm report']
};

/** Junior Lobbyist — conscience + access (AL13 / MV11). */
const PILOT_LOBBY: LoopDef = {
  id: 'LOOP_ENT_JUNIOR_LOBBYIST',
  name: 'Lobbyist access map',
  kind: 'entity_primary',
  entityId: 'ENT_JUNIOR_LOBBYIST',
  description: 'Access on a budget — and a conscience that still works. Opens MV11.',
  advancement: [
    {
      id: 'ADV_LOBBY_ALLY',
      type: 'advancement',
      description: "Warm Lobbyist w/ a Conscience (AL13).",
      kind: 'has_ally',
      params: { allyId: 'AL13' },
      movementTarget: 'ENT_JUNIOR_LOBBYIST'
    },
    {
      id: 'ADV_LOBBY_PAC_STRING',
      type: 'advancement',
      description: 'PAC String (OB1) already on the books — they know your number.',
      kind: 'has_obl',
      params: { oblId: 'OB1' },
      movementTarget: 'ENT_JUNIOR_LOBBYIST'
    },
    {
      id: 'ADV_LOBBY_CASH_NAME',
      type: 'advancement',
      description: 'endorse ≥ 2 + $≥800 (you look like a bill that might move).',
      kind: 'endorse_gte',
      params: { n: 2, requireCash: 800 },
      movementTarget: 'ENT_JUNIOR_LOBBYIST'
    }
  ],
  setback: [
    {
      id: 'SET_LOBBY_HIT',
      type: 'setback',
      description: 'Hit pieces make quiet access radioactive.',
      kind: 'hit_pieces_gte',
      params: { n: 4 },
      residue: ['scar_lobby_cold']
    }
  ],
  exampleVerbs: ['Take the coffee', 'Read the map', 'Spend the intro'],
  exampleNouns: ['Access map', 'Retainer', 'Conscience']
};

/** Union local president — plant gate (MV12). */
const PILOT_UNION: LoopDef = {
  id: 'LOOP_ENT_UNION_LOCAL_PRES',
  name: 'Plant-gate endorsement',
  kind: 'entity_primary',
  entityId: 'ENT_UNION_LOCAL_PRES',
  description: 'Local president, shift change, hands that vote. Opens MV12.',
  advancement: [
    {
      id: 'ADV_UNION_FIELD',
      type: 'advancement',
      description: 'nameID ≥ 8 + volPool ≥ 4 (you look like a field campaign the hall can back).',
      kind: 'name_id_gte',
      params: { n: 8, requireVol: 4 },
      movementTarget: 'ENT_UNION_LOCAL_PRES'
    },
    {
      id: 'ADV_UNION_ENDORSE',
      type: 'advancement',
      description: 'endorsePts ≥ 3 (someone already nodded; the hall can second it).',
      kind: 'endorse_gte',
      params: { n: 3 },
      movementTarget: 'ENT_UNION_LOCAL_PRES'
    }
  ],
  setback: [
    {
      id: 'SET_UNION_HIT',
      type: 'setback',
      description: 'Hit pieces sour the hall.',
      kind: 'hit_pieces_gte',
      params: { n: 3 },
      residue: ['scar_union_cold']
    }
  ],
  exampleVerbs: ['Work the gate', 'Take the local', 'Spend the hall'],
  exampleNouns: ['Plant gate', 'Shift change', 'Union hall']
};

/** Chamber executive — rubber chicken (MV13). */
const PILOT_CHAMBER: LoopDef = {
  id: 'LOOP_ENT_CHAMBER_EXEC',
  name: 'Chamber rubber-chicken circuit',
  kind: 'entity_primary',
  entityId: 'ENT_CHAMBER_EXEC',
  description: 'Reliable voters and polite checks. Opens MV13.',
  advancement: [
    {
      id: 'ADV_CHAMBER_WAR_CHEST',
      type: 'advancement',
      description: 'endorse ≥ 2 + $≥1000 (you look fundable at the chicken dinner).',
      kind: 'endorse_gte',
      params: { n: 2, requireCash: 1000 },
      movementTarget: 'ENT_CHAMBER_EXEC'
    },
    {
      id: 'ADV_CHAMBER_NAME',
      type: 'advancement',
      description: 'nameID ≥ 14 (main street already knows the name).',
      kind: 'name_id_gte',
      params: { n: 14 },
      movementTarget: 'ENT_CHAMBER_EXEC'
    }
  ],
  setback: [
    {
      id: 'SET_CHAMBER_HIT',
      type: 'setback',
      description: 'Hit pieces cancel the chicken dinner.',
      kind: 'hit_pieces_gte',
      params: { n: 3 },
      residue: ['scar_chamber_cold']
    }
  ],
  exampleVerbs: ['Work the chamber', 'Eat the chicken', 'Spend main street'],
  exampleNouns: ['Rubber chicken', 'Chamber board', 'Main street']
};

/** Feed-Store Regulars — unofficial senate (AL07 / MV14). */
const PILOT_FEED: LoopDef = {
  id: 'LOOP_ENT_FEED_STORE',
  name: 'Feed-store bench',
  kind: 'entity_primary',
  entityId: 'ENT_FEED_STORE',
  description: 'Unofficial senate on the bench out front. Opens MV14.',
  advancement: [
    {
      id: 'ADV_FEED_ALLY',
      type: 'advancement',
      description: 'Warm Feed-Store Regulars ally (AL07).',
      kind: 'has_ally',
      params: { allyId: 'AL07' },
      movementTarget: 'ENT_FEED_STORE'
    },
    {
      id: 'ADV_FEED_CONTACTS',
      type: 'advancement',
      description: 'nameID ≥ 10 + volPool ≥ 2 (you have shown up enough for the bench to notice).',
      kind: 'name_id_gte',
      params: { n: 10, requireVol: 2 },
      movementTarget: 'ENT_FEED_STORE'
    }
  ],
  setback: [
    {
      id: 'SET_FEED_HIT',
      type: 'setback',
      description: 'Hit pieces and the bench goes quiet.',
      kind: 'hit_pieces_gte',
      params: { n: 3 },
      residue: ['scar_feed_cold']
    }
  ],
  exampleVerbs: ['Sit the bench', 'Buy a bag of feed', 'Spend the regulars'],
  exampleNouns: ['Feed store', 'Bench', 'County rumor']
};

const T0_T2_NAMED: LoopDef[] = [
  PILOT_PRECINCT,
  ...PILOT_SUB,
  PILOT_CAPTAIN,
  PILOT_JUDGE,
  PILOT_PARTY,
  PILOT_CLUB,
  PILOT_EDITOR,
  PILOT_FAITH,
  PILOT_SLATE,
  PILOT_FINANCE,
  PILOT_RADIO,
  PILOT_LOBBY,
  PILOT_UNION,
  PILOT_CHAMBER,
  PILOT_FEED,
  entLoop('SOUTH_STEPS_ACTIVIST', 'South Steps rant', 'Presence, grievance, viral clip risk.', 'ENT_SOUTH_STEPS_ACTIVIST'),
  entLoop('BLOCK_WALKER', 'Block walker', 'Doors, heat, dogs, clipboards.', 'ENT_BLOCK_WALKER'),
  entLoop('CONSTITUENT', 'Disgruntled constituent', 'Casework demand, town hall ambush.', 'ENT_CONSTITUENT'),
  entLoop('BAR_OWNER', 'Bar owner donor', 'Small check, big room.', 'ENT_BAR_OWNER'),
  entLoop('CHURCH_FLOCK', 'Congregation flock', 'Sunday presence, directory.', 'ENT_CHURCH_FLOCK'),
  entLoop('UNION_RANK', 'Union rank-and-file', 'Plant gate, shift change.', 'ENT_UNION_RANK'),
  entLoop('STUDENT_ACTIVIST', 'Student activist', 'Campus, petitions, purity tests.', 'ENT_STUDENT_ACTIVIST'),
  entLoop('RETIRED_VET', 'Retired veteran', 'Halls, fixed income, honor.', 'ENT_RETIRED_VET'),
  entLoop('BORDER_RESIDENT', 'Border community', 'Distance, scrutiny, real stakes.', 'ENT_BORDER_RESIDENT'),
  entLoop('ROUGHNECK', 'Oil field roughneck', 'Boom, bust, regulation.', 'ENT_ROUGHNECK'),
  entLoop('RANCHER', 'Rancher / farmer', 'Water, land, ag exemption.', 'ENT_RANCHER'),
  entLoop('SOCIAL_TROLL', 'Anonymous influencer', 'Reach without name.', 'ENT_SOCIAL_TROLL'),
  entLoop('INTERN', 'Intern', 'Coffee, clips, future staffer seed.', 'ENT_INTERN'),
  entLoop('VOL_COORD', 'Volunteer coordinator', 'Lists, no-shows, logistics.', 'ENT_VOL_COORD'),
  // CANVASS_CAPTAIN + COUNTY_JUDGE: real pilot loops above (not stubs)
  entLoop('FIELD_ORGANIZER', 'Field organizer', 'Turf, metrics.', 'ENT_FIELD_ORGANIZER'),
  entLoop('SMALL_DONOR', 'Small-dollar donor', 'List compound, fish-fry money.', 'ENT_SMALL_DONOR'),
  // COUNTY_PARTY / CLUB / LOCAL_EDITOR / FAITH: real pilot loops above
  entLoop('PETITION_COLLECTOR', 'Petition collector', 'Sheets, challenges, rain.', 'ENT_PETITION_COLLECTOR'),
  entLoop('CAMPAIGN_STAFFER', 'Campaign staffer', 'Clipboard, burnout, loyalty.', 'ENT_CAMPAIGN_STAFFER'),
  entLoop('LOCAL_BLOGGER', 'Local blog / newsletter', 'Reach without filter.', 'ENT_LOCAL_BLOGGER'),
  entLoop('CITY_COUNCIL', 'City council / mayor', 'Local ordinance, name heat.', 'ENT_CITY_COUNCIL'),
  entLoop('SCHOOL_BOARD', 'School board / superintendent', 'Parents, bonds, culture.', 'ENT_SCHOOL_BOARD'),
  entLoop('LOCAL_BIZ_PAC', 'Local business PAC', 'Checks and expectations.', 'ENT_LOCAL_BIZ_PAC'),
  // UNION_LOCAL_PRES / CHAMBER_EXEC / FEED_STORE: real pilot loops above (MV12–14)
  // RADIO_HOST: real pilot loop above (MV10)
  entLoop('COMMUNITY_ORG', 'Community organizer', 'Nonprofit, coalition.', 'ENT_COMMUNITY_ORG'),
  entLoop('PRIMARY_RIVAL', 'Primary rival', 'Same ballot, zero-sum.', 'ENT_PRIMARY_RIVAL')
  // FINANCE_CHAIR / JUNIOR_LOBBYIST: real pilot loops above (MV09 / MV11)
];

export const LOOPS: Record<string, LoopDef> = Object.fromEntries(
  [...TEMPLATES, ...WAITING, ...ELECTED, ...T0_T2_NAMED].map(l => [l.id, l])
);

export const ALL_LOOP_IDS = Object.keys(LOOPS);

export function getLoop(id: string): LoopDef | undefined {
  return LOOPS[id];
}
