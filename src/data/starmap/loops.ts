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

const T0_T2_NAMED: LoopDef[] = [
  PILOT_PRECINCT,
  ...PILOT_SUB,
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
  entLoop('CANVASS_CAPTAIN', 'Canvass captain', 'Route book, field AP.', 'ENT_CANVASS_CAPTAIN'),
  entLoop('FIELD_ORGANIZER', 'Field organizer', 'Turf, metrics.', 'ENT_FIELD_ORGANIZER'),
  entLoop('SMALL_DONOR', 'Small-dollar donor', 'List compound, fish-fry money.', 'ENT_SMALL_DONOR'),
  entLoop('COUNTY_PARTY_EXEC', 'County party exec', 'Committee, rules, endorsement math.', 'ENT_COUNTY_PARTY_EXEC'),
  entLoop('CLUB_LEADER', 'Activist club leader', 'Roster, straw, casserole.', 'ENT_CLUB_LEADER'),
  entLoop('PETITION_COLLECTOR', 'Petition collector', 'Sheets, challenges, rain.', 'ENT_PETITION_COLLECTOR'),
  entLoop('CAMPAIGN_STAFFER', 'Campaign staffer', 'Clipboard, burnout, loyalty.', 'ENT_CAMPAIGN_STAFFER'),
  entLoop('LOCAL_BLOGGER', 'Local blog / newsletter', 'Reach without filter.', 'ENT_LOCAL_BLOGGER'),
  entLoop('CITY_COUNCIL', 'City council / mayor', 'Local ordinance, name heat.', 'ENT_CITY_COUNCIL'),
  entLoop('COUNTY_JUDGE', 'County commissioner / judge', 'Heaviest local nod.', 'ENT_COUNTY_JUDGE'),
  entLoop('SCHOOL_BOARD', 'School board / superintendent', 'Parents, bonds, culture.', 'ENT_SCHOOL_BOARD'),
  entLoop('LOCAL_BIZ_PAC', 'Local business PAC', 'Checks and expectations.', 'ENT_LOCAL_BIZ_PAC'),
  entLoop('UNION_LOCAL_PRES', 'Union local president', 'Endorsement, volunteers.', 'ENT_UNION_LOCAL_PRES'),
  entLoop('CHAMBER_EXEC', 'Chamber executive', 'Rubber chicken, reliable voters.', 'ENT_CHAMBER_EXEC'),
  entLoop('LOCAL_EDITOR', 'Local editor / reporter', 'Fair shake or page six.', 'ENT_LOCAL_EDITOR'),
  entLoop('RADIO_HOST', 'Radio talk host', 'Drive time, ambush.', 'ENT_RADIO_HOST'),
  entLoop('FAITH_LEADER', 'Faith leader', 'Corridor, directory, moral weight.', 'ENT_FAITH_LEADER'),
  entLoop('COMMUNITY_ORG', 'Community organizer', 'Nonprofit, coalition.', 'ENT_COMMUNITY_ORG'),
  entLoop('PRIMARY_RIVAL', 'Primary rival', 'Same ballot, zero-sum.', 'ENT_PRIMARY_RIVAL')
];

export const LOOPS: Record<string, LoopDef> = Object.fromEntries(
  [...TEMPLATES, ...WAITING, ...ELECTED, ...T0_T2_NAMED].map(l => [l.id, l])
);

export const ALL_LOOP_IDS = Object.keys(LOOPS);

export function getLoop(id: string): LoopDef | undefined {
  return LOOPS[id];
}
