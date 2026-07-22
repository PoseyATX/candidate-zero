/**
 * Starmap entity catalog — exhaustive list from issue #17.
 * Every political actor role is a row. Playable loops come later; pilot is Precinct Chair.
 */

import type { EntityCluster, EntityDef, EntityTier, LoopId } from '../../engine/types-entities.js';

function e(
  id: string,
  name: string,
  tier: EntityTier,
  cluster: EntityCluster,
  flavor: string,
  primaryLoopId: LoopId,
  opts: { allyId?: string; subloopIds?: LoopId[]; tags?: string[] } = {}
): EntityDef {
  return {
    id,
    name,
    tier,
    cluster,
    flavor,
    primaryLoopId,
    subloopIds: opts.subloopIds ?? [],
    allyId: opts.allyId,
    tags: opts.tags
  };
}

/** Player-as-candidate node for orbit targets. */
const PLAYER: EntityDef = e(
  'ENT_HOUSE_CANDIDATE',
  'State House candidate (you)',
  1,
  'grassroots',
  'Candidate Zero — no money, no name, no blessing. The climb starts at the courthouse door.',
  'LOOP_TMPL_GRASSROOTS',
  { tags: ['player'] }
);

const TIER0: EntityDef[] = [
  e('ENT_SOUTH_STEPS_ACTIVIST', 'Homeless activist (South Steps)', 0, 'street', 'Rants on the Capitol steps. Presence without a PAC.', 'LOOP_ENT_SOUTH_STEPS_ACTIVIST'),
  e('ENT_BLOCK_WALKER', 'Precinct-level block walker', 0, 'street', 'Boots, clipboard, dogs, heat.', 'LOOP_ENT_BLOCK_WALKER'),
  e('ENT_CONSTITUENT', 'Disgruntled constituent', 0, 'street', 'Casework demand; town-hall ambush potential.', 'LOOP_ENT_CONSTITUENT'),
  e('ENT_BAR_OWNER', 'Local bar owner / small-business donor', 0, 'street', 'Small check, big room, strings optional.', 'LOOP_ENT_BAR_OWNER'),
  e('ENT_CHURCH_FLOCK', "Church congregation / pastor's flock", 0, 'street', 'Sunday presence; directory potential.', 'LOOP_ENT_CHURCH_FLOCK'),
  e('ENT_UNION_RANK', 'Union rank-and-file worker', 0, 'street', 'Plant gate, shift change, solidarity.', 'LOOP_ENT_UNION_RANK'),
  e('ENT_STUDENT_ACTIVIST', 'College student activist', 0, 'street', 'Campus energy; purity tests included.', 'LOOP_ENT_STUDENT_ACTIVIST'),
  e('ENT_RETIRED_VET', 'Retired veteran on fixed income', 0, 'street', 'Halls culture; honor; fixed income.', 'LOOP_ENT_RETIRED_VET'),
  e('ENT_BORDER_RESIDENT', 'Border community resident', 0, 'street', 'Distance, scrutiny, real stakes.', 'LOOP_ENT_BORDER_RESIDENT'),
  e('ENT_ROUGHNECK', 'Oil field worker / roughneck', 0, 'street', 'Boom, bust, regulation talk.', 'LOOP_ENT_ROUGHNECK'),
  e('ENT_RANCHER', 'Rancher / farmer facing regulation', 0, 'street', 'Water, land, ag exemption orthodoxy.', 'LOOP_ENT_RANCHER'),
  e('ENT_SOCIAL_TROLL', 'Social media troll / anonymous influencer', 0, 'street', 'Reach without a name; oppo surface.', 'LOOP_ENT_SOCIAL_TROLL')
];

const TIER1: EntityDef[] = [
  e('ENT_INTERN', 'Intern (campaign or legislative)', 1, 'grassroots', 'Coffee, clips, future staffer seed.', 'LOOP_ENT_INTERN'),
  e('ENT_VOL_COORD', 'Volunteer coordinator', 1, 'grassroots', 'Lists, no-shows, logistics.', 'LOOP_ENT_VOL_COORD'),
  e('ENT_CANVASS_CAPTAIN', 'Canvass captain', 1, 'grassroots', 'Route book, field AP, map opinions.', 'LOOP_ENT_CANVASS_CAPTAIN', {
    allyId: 'AL09',
    tags: ['pilot']
  }),
  e('ENT_FIELD_ORGANIZER', 'Field organizer', 1, 'grassroots', 'Turf, turf wars, metrics.', 'LOOP_ENT_FIELD_ORGANIZER'),
  e('ENT_SMALL_DONOR', 'Small-dollar donor', 1, 'grassroots', 'List compound; fish-fry money.', 'LOOP_ENT_SMALL_DONOR'),
  e('ENT_PRECINCT_CHAIR', 'Precinct Chair', 1, 'grassroots', 'Key gatekeeper. Kitchen tables. Club numbers.', 'LOOP_ENT_PRECINCT_CHAIR', {
    allyId: 'AL01',
    subloopIds: ['LOOP_SUB_PRECINCT_PORCH', 'LOOP_SUB_PRECINCT_CLUB'],
    tags: ['pilot']
  }),
  e('ENT_COUNTY_PARTY_EXEC', 'County Party Executive Committee member', 1, 'grassroots', 'Rules, endorsements, county apparatus.', 'LOOP_ENT_COUNTY_PARTY_EXEC', {
    allyId: 'AL02',
    tags: ['pilot']
  }),
  e('ENT_CLUB_LEADER', 'Local activist club leader', 1, 'grassroots', 'Roster, straw polls, casseroles.', 'LOOP_ENT_CLUB_LEADER', {
    allyId: 'AL03',
    tags: ['pilot']
  }),
  e('ENT_PETITION_COLLECTOR', 'Petition signature collector', 1, 'grassroots', 'Sheets, challenges, rain.', 'LOOP_ENT_PETITION_COLLECTOR'),
  e('ENT_CAMPAIGN_STAFFER', 'Low-level campaign staffer', 1, 'grassroots', 'Clipboard, burnout, loyalty.', 'LOOP_ENT_CAMPAIGN_STAFFER'),
  e('ENT_LOCAL_BLOGGER', 'Local blog / newsletter writer', 1, 'grassroots', 'Reach without a filter.', 'LOOP_ENT_LOCAL_BLOGGER')
];

const TIER2: EntityDef[] = [
  e('ENT_CITY_COUNCIL', 'City Council member / Mayor', 2, 'local', 'Local ordinance power; name heat.', 'LOOP_ENT_CITY_COUNCIL'),
  e('ENT_COUNTY_JUDGE', 'County Commissioner / County Judge', 2, 'local', 'Heaviest local nod in many counties.', 'LOOP_ENT_COUNTY_JUDGE', {
    allyId: 'AL15',
    tags: ['pilot']
  }),
  e('ENT_SCHOOL_BOARD', 'School Board / Superintendent', 2, 'local', 'Parents, bonds, culture fights.', 'LOOP_ENT_SCHOOL_BOARD'),
  e('ENT_LOCAL_BIZ_PAC', 'Local business PAC', 2, 'local', 'Checks, expectations, rate talk.', 'LOOP_ENT_LOCAL_BIZ_PAC'),
  e('ENT_UNION_LOCAL_PRES', 'Union local president', 2, 'local', 'Endorsement, volunteers, plant gate.', 'LOOP_ENT_UNION_LOCAL_PRES', {
    tags: ['pilot']
  }),
  e('ENT_CHAMBER_EXEC', 'Chamber of Commerce executive', 2, 'local', 'Rubber chicken; reliable voters.', 'LOOP_ENT_CHAMBER_EXEC', {
    tags: ['pilot']
  }),
  e('ENT_LOCAL_EDITOR', 'Local newspaper editor / reporter', 2, 'local', 'Fair shake or page six.', 'LOOP_ENT_LOCAL_EDITOR', {
    allyId: 'AL04',
    tags: ['pilot']
  }),
  e('ENT_RADIO_HOST', 'Radio talk show host', 2, 'local', 'Drive time; discount; ambush.', 'LOOP_ENT_RADIO_HOST', {
    allyId: 'AL05',
    tags: ['pilot']
  }),
  e('ENT_FAITH_LEADER', 'Faith leader (pastor / mega-church)', 2, 'local', 'Corridor, directory, moral weight.', 'LOOP_ENT_FAITH_LEADER', {
    allyId: 'AL08',
    tags: ['pilot']
  }),
  e('ENT_COMMUNITY_ORG', 'Community organizer / nonprofit leader', 2, 'local', 'Coalition, grants, grassroots glue.', 'LOOP_ENT_COMMUNITY_ORG'),
  e('ENT_PRIMARY_RIVAL', 'Former opponent / primary rival', 2, 'local', 'Same ballot; zero-sum.', 'LOOP_ENT_PRIMARY_RIVAL')
];

const TIER3: EntityDef[] = [
  e('ENT_LEGISLATIVE_AIDE', 'Legislative Aide / Staffer', 3, 'lege_staff', 'Carries the bag; knows the schedule.', 'LOOP_TMPL_LEGE_STAFF'),
  e('ENT_COMMITTEE_CLERK', 'Committee Clerk', 3, 'lege_staff', 'Witness lists; hearing reality.', 'LOOP_TMPL_LEGE_STAFF'),
  e('ENT_ELEVATOR_OP', 'Capitol elevator operator / long-time staff', 3, 'lege_staff', 'Sees everyone; says little.', 'LOOP_TMPL_LEGE_STAFF'),
  e('ENT_SERGEANT_ARMS', 'Sergeant-at-Arms / Capitol security', 3, 'lege_staff', 'Doors, order, access.', 'LOOP_TMPL_LEGE_STAFF'),
  e('ENT_PARL_STAFF', "Parliamentarian's office staff", 3, 'lege_staff', 'Procedure without the title.', 'LOOP_TMPL_LEGE_STAFF'),
  e('ENT_BILL_DRAFTER', 'Bill drafter / Legislative Council attorney', 3, 'lege_staff', 'Words that become law.', 'LOOP_TMPL_LEGE_STAFF'),
  e('ENT_JUNIOR_LOBBYIST', 'Junior lobbyist', 3, 'lege_staff', 'Access on a budget.', 'LOOP_ENT_JUNIOR_LOBBYIST', {
    allyId: 'AL13',
    tags: ['pilot']
  }),
  e('ENT_PRESS_SECRETARY', 'Press Secretary', 3, 'lege_staff', 'Message discipline or disaster.', 'LOOP_TMPL_LEGE_STAFF')
];

const TIER4: EntityDef[] = [
  e('ENT_STATE_REP', 'State Representative (peer / rival)', 4, 'lege', 'Colleague or competitor on the floor.', 'LOOP_TMPL_LEGE'),
  e('ENT_STATE_SENATOR', 'State Senator', 4, 'lege', 'Other chamber; thirty-one matter.', 'LOOP_TMPL_LEGE'),
  e('ENT_COMMITTEE_CHAIR', 'Committee Chair', 4, 'lege', 'Hearings open when they open.', 'LOOP_TMPL_LEGE'),
  e('ENT_RANKING_MEMBER', 'Ranking Member', 4, 'lege', 'Minority power; record-building.', 'LOOP_TMPL_LEGE'),
  e('ENT_FRESHMAN_MEMBER', 'Freshman legislator', 4, 'lege', 'You, or someone like you, last cycle.', 'LOOP_TMPL_LEGE'),
  e('ENT_DISTRICT_INCUMBENT', 'Incumbent in district', 4, 'lege', 'War chest, name, twelve years of relationships.', 'LOOP_TMPL_LEGE'),
  e('ENT_SWING_MEMBER', 'Moderate / swing district member', 4, 'lege', 'Votes that leadership counts twice.', 'LOOP_TMPL_LEGE'),
  e('ENT_FIREBRAND', 'Firebrand / bomb-thrower', 4, 'lege', 'Clips travel; coalitions suffer.', 'LOOP_TMPL_LEGE')
];

const TIER5: EntityDef[] = [
  e('ENT_SPEAKER', 'House Speaker', 5, 'leadership', 'The calendar is theirs. Favor is currency.', 'LOOP_TMPL_LEADERSHIP'),
  e('ENT_LT_GOV', 'Lt. Governor / Senate President Pro Tempore', 5, 'leadership', 'Other chamber gravity.', 'LOOP_TMPL_LEADERSHIP'),
  e('ENT_MAJORITY_LEADER', 'Majority Leader', 5, 'leadership', 'Floor management; vote math.', 'LOOP_TMPL_LEADERSHIP'),
  e('ENT_MINORITY_LEADER', 'Minority Leader', 5, 'leadership', 'Opposition strategy; message.', 'LOOP_TMPL_LEADERSHIP'),
  e('ENT_WHIP', 'Whip', 5, 'leadership', 'Counts that decide third readings.', 'LOOP_TMPL_LEADERSHIP'),
  e('ENT_PARLIAMENTARIAN', 'Parliamentarian', 5, 'leadership', 'Procedure is power.', 'LOOP_TMPL_LEADERSHIP'),
  e('ENT_CALENDAR_MEMBER', 'Ethics / Calendar Committee member', 5, 'leadership', 'What the House even sees.', 'LOOP_TMPL_LEADERSHIP'),
  e('ENT_DEAN', 'Dean of the Lege (long-serving power)', 5, 'leadership', 'Institutional memory with a vote.', 'LOOP_TMPL_LEADERSHIP', { allyId: 'AL12' }),
  e('ENT_CAUCUS_CHAIR', 'Party Caucus Chair', 5, 'leadership', 'Message and discipline inside the caucus.', 'LOOP_TMPL_LEADERSHIP')
];

const TIER6: EntityDef[] = [
  e('ENT_GOVERNOR', 'Governor', 6, 'statewide', 'Veto pen; bully pulpit; appointments.', 'LOOP_TMPL_STATEWIDE'),
  e('ENT_AG', 'Attorney General', 6, 'statewide', 'Lawsuits as politics.', 'LOOP_TMPL_STATEWIDE'),
  e('ENT_COMPTROLLER', 'Comptroller', 6, 'statewide', 'Money estimates; fiscal gravity.', 'LOOP_TMPL_STATEWIDE'),
  e('ENT_LAND_COMM', 'Land Commissioner', 6, 'statewide', 'Land, veterans, coastal fights.', 'LOOP_TMPL_STATEWIDE'),
  e('ENT_AG_COMM', 'Agriculture Commissioner', 6, 'statewide', 'Ag brand; rural politics.', 'LOOP_TMPL_STATEWIDE'),
  e('ENT_RAILROAD_COMM', 'Railroad Commission member', 6, 'statewide', 'Oil and gas reality.', 'LOOP_TMPL_STATEWIDE'),
  e('ENT_ELDER_STATESMAN', 'Retired Governor / Elder Statesman', 6, 'statewide', 'Name without office; still weight.', 'LOOP_TMPL_STATEWIDE'),
  e('ENT_STATE_PARTY_CHAIR', 'State Party Chair', 6, 'statewide', 'Lists, money, primary rules.', 'LOOP_TMPL_STATEWIDE'),
  e('ENT_NATL_COMMITTEE', 'National Committeeman / woman', 6, 'statewide', 'National party interface.', 'LOOP_TMPL_STATEWIDE'),
  e('ENT_FORMER_STATEWIDE', 'Former statewide candidate', 6, 'statewide', 'Scars, list, unfinished business.', 'LOOP_TMPL_STATEWIDE')
];

const TIER7: EntityDef[] = [
  e('ENT_US_HOUSE', 'U.S. Representative', 7, 'federal', 'Federal seat adjacent to your district.', 'LOOP_TMPL_FEDERAL'),
  e('ENT_US_SENATE', 'U.S. Senator', 7, 'federal', 'Statewide federal gravity.', 'LOOP_TMPL_FEDERAL'),
  e('ENT_CORP_LOBBYIST', 'Corporate lobbyist (oil/gas, tech, etc.)', 7, 'federal', 'Access, retainers, bill language.', 'LOOP_TMPL_FEDERAL'),
  e('ENT_BUNDLER', 'Big donor / bundler / dark money operative', 7, 'federal', 'Money that arrives with a folder.', 'LOOP_TMPL_FEDERAL'),
  e('ENT_TRIBUNE', 'Texas Tribune / major media reporter', 7, 'federal', 'Statewide story potential.', 'LOOP_TMPL_FEDERAL'),
  e('ENT_ADVOCACY_HEAD', 'Advocacy org head / thought leader', 7, 'federal', 'Movement or establishment brand.', 'LOOP_TMPL_FEDERAL'),
  e('ENT_JUDGE', 'Judge / prosecutor / regent', 7, 'federal', 'Adjacent power with different clocks.', 'LOOP_TMPL_FEDERAL', { allyId: 'AL06' }),
  e('ENT_CAPITOL_JANITOR', 'Capitol janitor (wildcard)', 7, 'federal', 'Sees the building after hours.', 'LOOP_TMPL_FEDERAL', { tags: ['wildcard'] }),
  e('ENT_SCANDAL_EXMEMBER', 'Scandal-plagued ex-member (wildcard)', 7, 'federal', 'Cautionary tale; oppo raw material.', 'LOOP_TMPL_FEDERAL', { tags: ['wildcard'] }),
  e('ENT_SLATE_MAKER', 'The Slate-Maker', 7, 'federal', 'Prints the card half the primary votes from.', 'LOOP_ENT_SLATE_MAKER', {
    allyId: 'AL16',
    tags: ['pilot']
  }),
  e('ENT_KITCHEN_CABINET', 'Kitchen Cabinet', 7, 'federal', 'Inner circle; extra draws; debate prep.', 'LOOP_TMPL_FEDERAL', { allyId: 'AL11' }),
  e('ENT_FINANCE_CHAIR', 'Finance Chair', 7, 'federal', 'Weekly money when warm; call the book once.', 'LOOP_ENT_FINANCE_CHAIR', {
    allyId: 'AL10',
    tags: ['pilot']
  }),
  e('ENT_FEED_STORE', 'Feed-Store Regulars', 7, 'federal', 'Unofficial senate on the bench.', 'LOOP_ENT_FEED_STORE', {
    allyId: 'AL07',
    tags: ['pilot']
  }),
  e('ENT_RIVAL_STAFFER', "Rival's disgruntled staffer", 7, 'federal', 'Folder potential; plant risk.', 'LOOP_TMPL_FEDERAL', { allyId: 'AL14' })
];

const PROCEDURAL: EntityDef[] = [
  e('ENT_OPEN_SEAT', 'Open Seat', 8, 'procedural', 'Incumbent retired or vacated — field floods.', 'LOOP_TMPL_PROCEDURAL', { tags: ['procedural'] }),
  e('ENT_VACANCY', 'Vacancy', 8, 'procedural', 'Mid-term empty desk; special election clock.', 'LOOP_TMPL_PROCEDURAL', { tags: ['procedural'] }),
  e('ENT_SPECIAL_ELECTION', 'Special Election', 8, 'procedural', 'Compressed campaign; different math.', 'LOOP_TMPL_PROCEDURAL', { tags: ['procedural'] }),
  e('ENT_REDISTRICTING', 'Redistricting Map', 8, 'procedural', 'Lines move; careers end or begin.', 'LOOP_TMPL_PROCEDURAL', { tags: ['procedural'] }),
  e('ENT_PAC', 'PAC (generic)', 8, 'procedural', 'Money with a string.', 'LOOP_TMPL_PROCEDURAL', { tags: ['procedural'] }),
  e('ENT_VOTER_FILE', 'Voter File', 8, 'procedural', 'Asset and weapon.', 'LOOP_TMPL_PROCEDURAL', { tags: ['procedural'] }),
  e('ENT_HIT_PIECE', 'Hit Piece', 8, 'procedural', 'Mail that lands or slides off.', 'LOOP_TMPL_PROCEDURAL', { tags: ['procedural'] }),
  e('ENT_COMMITTEE_HEARING', 'Committee Hearing', 8, 'procedural', 'Record, witnesses, vote-out.', 'LOOP_TMPL_PROCEDURAL', { tags: ['procedural'] }),
  e('ENT_SCANDAL_FIGURE', 'Scandal Figure', 8, 'procedural', 'Name attached to a problem.', 'LOOP_TMPL_PROCEDURAL', { tags: ['procedural'] })
];

const ALL: EntityDef[] = [
  PLAYER,
  ...TIER0,
  ...TIER1,
  ...TIER2,
  ...TIER3,
  ...TIER4,
  ...TIER5,
  ...TIER6,
  ...TIER7,
  ...PROCEDURAL
];

export const ENTITIES: Record<string, EntityDef> = Object.fromEntries(ALL.map(x => [x.id, x]));

export const ALL_ENTITY_IDS = Object.keys(ENTITIES);

export function getEntityDef(id: string): EntityDef | undefined {
  return ENTITIES[id];
}

export function listEntitiesByTier(tier: EntityTier): EntityDef[] {
  return ALL.filter(x => x.tier === tier);
}
