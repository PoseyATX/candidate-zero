/**
 * Starmap orbits — interconnection graph (#17/#18).
 * Every entity has degree ≥ 1. T0–2 dense; cross-tier connectors explicit.
 */

import type { OrbitDef, OrbitStrength } from '../../engine/types-entities.js';
import { ALL_ENTITY_IDS } from './entities.js';

function o(
  id: string,
  from: string,
  to: string,
  strength: OrbitStrength,
  flavorText: string,
  extra: Partial<OrbitDef> = {}
): OrbitDef {
  return { id, from, to, strength, flavorText, ...extra };
}

/** Dense grassroots / local cluster. */
const CORE: OrbitDef[] = [
  // Precinct chair pilot hub
  o('ORB_PRECINCT_PLAYER', 'ENT_PRECINCT_CHAIR', 'ENT_HOUSE_CANDIDATE', 'strong', 'Chairs bank candidates — or they do not.'),
  o('ORB_PLAYER_PRECINCT', 'ENT_HOUSE_CANDIDATE', 'ENT_PRECINCT_CHAIR', 'strong', 'You need their porch more than they need your stump.'),
  o('ORB_PRECINCT_COUNTY', 'ENT_PRECINCT_CHAIR', 'ENT_COUNTY_PARTY_EXEC', 'strong', 'County apparatus runs through precincts.'),
  o('ORB_COUNTY_PRECINCT', 'ENT_COUNTY_PARTY_EXEC', 'ENT_PRECINCT_CHAIR', 'strong', 'Exec committee counts chairs.'),
  o('ORB_PRECINCT_CLUB', 'ENT_PRECINCT_CHAIR', 'ENT_CLUB_LEADER', 'medium', 'Club presidents and chairs trade lists.'),
  o('ORB_PRECINCT_CAPTAIN', 'ENT_PRECINCT_CHAIR', 'ENT_CANVASS_CAPTAIN', 'medium', 'Field needs the map the chair already has.'),
  o('ORB_CAPTAIN_PLAYER', 'ENT_CANVASS_CAPTAIN', 'ENT_HOUSE_CANDIDATE', 'strong', 'Field spine of the campaign.'),
  o('ORB_PLAYER_CAPTAIN', 'ENT_HOUSE_CANDIDATE', 'ENT_CANVASS_CAPTAIN', 'strong', 'Promote her or hire her.'),
  o('ORB_CLUB_PLAYER', 'ENT_CLUB_LEADER', 'ENT_HOUSE_CANDIDATE', 'medium', 'Straw math and roster access.'),
  o('ORB_PLAYER_CLUB', 'ENT_HOUSE_CANDIDATE', 'ENT_CLUB_LEADER', 'medium', 'Speak the club; pack the straw.'),
  o('ORB_FIELD_PLAYER', 'ENT_FIELD_ORGANIZER', 'ENT_HOUSE_CANDIDATE', 'medium', 'Metrics and turf.'),
  o('ORB_VOL_CAPTAIN', 'ENT_VOL_COORD', 'ENT_CANVASS_CAPTAIN', 'medium', 'Volunteers become captains.'),
  o('ORB_INTERN_STAFF', 'ENT_INTERN', 'ENT_CAMPAIGN_STAFFER', 'weak', 'Interns who stay become staff.'),
  o('ORB_DONOR_PLAYER', 'ENT_SMALL_DONOR', 'ENT_HOUSE_CANDIDATE', 'medium', 'Small dollars compound.'),
  o('ORB_PETITION_PLAYER', 'ENT_PETITION_COLLECTOR', 'ENT_HOUSE_CANDIDATE', 'medium', 'Labor ballot path.'),
  o('ORB_BLOGGER_EDITOR', 'ENT_LOCAL_BLOGGER', 'ENT_LOCAL_EDITOR', 'weak', 'Amateur press feeds the weekly.'),
  // Street ↔ grassroots
  o('ORB_WALKER_PLAYER', 'ENT_BLOCK_WALKER', 'ENT_HOUSE_CANDIDATE', 'medium', 'Doors are the spine.'),
  o('ORB_PLAYER_WALKER', 'ENT_HOUSE_CANDIDATE', 'ENT_BLOCK_WALKER', 'medium', 'You are one of them until you are not.'),
  o('ORB_CONST_PLAYER', 'ENT_CONSTITUENT', 'ENT_HOUSE_CANDIDATE', 'medium', 'Casework demand; town-hall heat.'),
  o('ORB_UNION_RANK_PRES', 'ENT_UNION_RANK', 'ENT_UNION_LOCAL_PRES', 'strong', 'Rank-and-file to local leadership.'),
  o('ORB_UNION_PLAYER', 'ENT_UNION_LOCAL_PRES', 'ENT_HOUSE_CANDIDATE', 'medium', 'Endorsement and volunteers.'),
  o('ORB_FLOCK_FAITH', 'ENT_CHURCH_FLOCK', 'ENT_FAITH_LEADER', 'strong', 'Flock follows the pulpit.'),
  o('ORB_FAITH_PLAYER', 'ENT_FAITH_LEADER', 'ENT_HOUSE_CANDIDATE', 'medium', 'Corridor and moral weight.'),
  o('ORB_BAR_BIZ', 'ENT_BAR_OWNER', 'ENT_LOCAL_BIZ_PAC', 'medium', 'Small business money pools up.'),
  o('ORB_BIZ_PLAYER', 'ENT_LOCAL_BIZ_PAC', 'ENT_HOUSE_CANDIDATE', 'medium', 'Checks with expectations.'),
  o('ORB_CHAMBER_BIZ', 'ENT_CHAMBER_EXEC', 'ENT_LOCAL_BIZ_PAC', 'medium', 'Chamber and PAC overlap.'),
  o('ORB_CHAMBER_PLAYER', 'ENT_CHAMBER_EXEC', 'ENT_HOUSE_CANDIDATE', 'weak', 'Rubber-chicken circuit.'),
  o('ORB_EDITOR_PLAYER', 'ENT_LOCAL_EDITOR', 'ENT_HOUSE_CANDIDATE', 'medium', 'Fair shake or page six.'),
  o('ORB_RADIO_PLAYER', 'ENT_RADIO_HOST', 'ENT_HOUSE_CANDIDATE', 'medium', 'Drive time is scale.'),
  o('ORB_SCHOOL_CONST', 'ENT_SCHOOL_BOARD', 'ENT_CONSTITUENT', 'medium', 'Parents are voters.'),
  o('ORB_CITY_PLAYER', 'ENT_CITY_COUNCIL', 'ENT_HOUSE_CANDIDATE', 'medium', 'Local title, statewide ambition.'),
  o('ORB_JUDGE_PLAYER', 'ENT_COUNTY_JUDGE', 'ENT_HOUSE_CANDIDATE', 'strong', 'Heaviest local nod.'),
  o('ORB_RIVAL_PLAYER', 'ENT_PRIMARY_RIVAL', 'ENT_HOUSE_CANDIDATE', 'strong', 'Zero-sum primary.'),
  o('ORB_PLAYER_RIVAL', 'ENT_HOUSE_CANDIDATE', 'ENT_PRIMARY_RIVAL', 'strong', 'You are their problem.'),
  o('ORB_ORG_PLAYER', 'ENT_COMMUNITY_ORG', 'ENT_HOUSE_CANDIDATE', 'medium', 'Coalition glue.'),
  o('ORB_STUDENT_ORG', 'ENT_STUDENT_ACTIVIST', 'ENT_COMMUNITY_ORG', 'weak', 'Campus feeds nonprofits.'),
  o('ORB_VET_PLAYER', 'ENT_RETIRED_VET', 'ENT_HOUSE_CANDIDATE', 'weak', 'Halls and honor culture.'),
  o('ORB_RANCHER_PLAYER', 'ENT_RANCHER', 'ENT_HOUSE_CANDIDATE', 'weak', 'Ag politics is local.'),
  o('ORB_ROUGH_PLAYER', 'ENT_ROUGHNECK', 'ENT_HOUSE_CANDIDATE', 'weak', 'Energy jobs as message.'),
  o('ORB_BORDER_PLAYER', 'ENT_BORDER_RESIDENT', 'ENT_HOUSE_CANDIDATE', 'weak', 'Distance politics.'),
  o('ORB_STEPS_PLAYER', 'ENT_SOUTH_STEPS_ACTIVIST', 'ENT_HOUSE_CANDIDATE', 'weak', 'Capitol steps as stage.'),
  o('ORB_TROLL_MEDIA', 'ENT_SOCIAL_TROLL', 'ENT_LOCAL_EDITOR', 'weak', 'Viral becomes print.'),
  o('ORB_STAFF_PLAYER', 'ENT_CAMPAIGN_STAFFER', 'ENT_HOUSE_CANDIDATE', 'medium', 'Labor of the campaign.'),
  o('ORB_COUNTY_JUDGE_LINK', 'ENT_COUNTY_PARTY_EXEC', 'ENT_COUNTY_JUDGE', 'medium', 'Party and courthouse.'),
  o('ORB_JUDGE_DEAN', 'ENT_COUNTY_JUDGE', 'ENT_DEAN', 'weak', 'Local power respects institutional memory.')
];

/** Cross-tier connectors (upward gravity). */
const CROSS: OrbitDef[] = [
  o('ORB_PLAYER_AIDE', 'ENT_HOUSE_CANDIDATE', 'ENT_LEGISLATIVE_AIDE', 'medium', 'Win and hire — or lose and become one.'),
  o('ORB_AIDE_MEMBER', 'ENT_LEGISLATIVE_AIDE', 'ENT_STATE_REP', 'strong', 'Staff orbit the member.'),
  o('ORB_AIDE_FRESH', 'ENT_LEGISLATIVE_AIDE', 'ENT_FRESHMAN_MEMBER', 'strong', 'Freshmen need staff more.'),
  o('ORB_CLERK_CHAIR', 'ENT_COMMITTEE_CLERK', 'ENT_COMMITTEE_CHAIR', 'strong', 'Clerk makes the hearing real.'),
  o('ORB_DRAFT_CHAIR', 'ENT_BILL_DRAFTER', 'ENT_COMMITTEE_CHAIR', 'medium', 'Language is power.'),
  o('ORB_LOBBY_MEMBER', 'ENT_JUNIOR_LOBBYIST', 'ENT_STATE_REP', 'medium', 'Access on a budget.'),
  o('ORB_PRESS_MEMBER', 'ENT_PRESS_SECRETARY', 'ENT_STATE_REP', 'medium', 'Message or mess.'),
  o('ORB_MEMBER_SPEAKER', 'ENT_STATE_REP', 'ENT_SPEAKER', 'medium', 'Calendar and favor.'),
  o('ORB_FRESH_SPEAKER', 'ENT_FRESHMAN_MEMBER', 'ENT_SPEAKER', 'weak', 'Freshmen ask; Speaker decides.'),
  o('ORB_MEMBER_WHIP', 'ENT_STATE_REP', 'ENT_WHIP', 'medium', 'Vote math.'),
  o('ORB_SENATE_LT', 'ENT_STATE_SENATOR', 'ENT_LT_GOV', 'strong', 'Senate gravity.'),
  o('ORB_CHAIR_CAL', 'ENT_COMMITTEE_CHAIR', 'ENT_CALENDAR_MEMBER', 'medium', 'Voted out still needs a slot.'),
  o('ORB_SPEAKER_GOV', 'ENT_SPEAKER', 'ENT_GOVERNOR', 'medium', 'Fifth floor to first floor.'),
  o('ORB_LT_GOV', 'ENT_LT_GOV', 'ENT_GOVERNOR', 'medium', 'Statewide cohabitation.'),
  o('ORB_PARTY_STATE', 'ENT_STATE_PARTY_CHAIR', 'ENT_HOUSE_CANDIDATE', 'medium', 'Primary rules and lists.'),
  o('ORB_BUNDLER_PLAYER', 'ENT_BUNDLER', 'ENT_HOUSE_CANDIDATE', 'medium', 'Money with a folder.'),
  o('ORB_CORP_SPEAKER', 'ENT_CORP_LOBBYIST', 'ENT_SPEAKER', 'medium', 'Access at the top.'),
  o('ORB_TRIBUNE_PLAYER', 'ENT_TRIBUNE', 'ENT_HOUSE_CANDIDATE', 'weak', 'Statewide story risk/reward.'),
  o('ORB_US_HOUSE_PLAYER', 'ENT_US_HOUSE', 'ENT_HOUSE_CANDIDATE', 'weak', 'Federal adjacency.'),
  o('ORB_SLATE_PLAYER', 'ENT_SLATE_MAKER', 'ENT_HOUSE_CANDIDATE', 'medium', 'Printed card politics.'),
  o('ORB_CABINET_PLAYER', 'ENT_KITCHEN_CABINET', 'ENT_HOUSE_CANDIDATE', 'strong', 'Inner circle.'),
  o('ORB_DEAN_MEMBER', 'ENT_DEAN', 'ENT_STATE_REP', 'medium', 'Institutional memory.'),
  o('ORB_ELEVATOR_ALL', 'ENT_ELEVATOR_OP', 'ENT_SPEAKER', 'weak', 'Sees everyone going up.'),
  o('ORB_SGT_FLOOR', 'ENT_SERGEANT_ARMS', 'ENT_STATE_REP', 'weak', 'Access and order.'),
  o('ORB_PARL_SPEAKER', 'ENT_PARLIAMENTARIAN', 'ENT_SPEAKER', 'strong', 'Procedure is leadership.'),
  o('ORB_PARL_STAFF', 'ENT_PARL_STAFF', 'ENT_PARLIAMENTARIAN', 'strong', 'Office behind the title.'),
  o('ORB_MAJ_SPEAKER', 'ENT_MAJORITY_LEADER', 'ENT_SPEAKER', 'strong', 'Floor management chain.'),
  o('ORB_MIN_CAUCUS', 'ENT_MINORITY_LEADER', 'ENT_CAUCUS_CHAIR', 'medium', 'Opposition message.'),
  o('ORB_WHIP_MAJ', 'ENT_WHIP', 'ENT_MAJORITY_LEADER', 'strong', 'Counts for leadership.'),
  o('ORB_INCUMBENT_PLAYER', 'ENT_DISTRICT_INCUMBENT', 'ENT_HOUSE_CANDIDATE', 'strong', 'You are the challenger or the seat.'),
  o('ORB_SWING_WHIP', 'ENT_SWING_MEMBER', 'ENT_WHIP', 'medium', 'Votes leadership needs.'),
  o('ORB_FIRE_MEDIA', 'ENT_FIREBRAND', 'ENT_TRIBUNE', 'medium', 'Clips travel.'),
  o('ORB_RANK_CHAIR', 'ENT_RANKING_MEMBER', 'ENT_COMMITTEE_CHAIR', 'medium', 'Minority vs majority on committee.'),
  o('ORB_AG_GOV', 'ENT_AG', 'ENT_GOVERNOR', 'medium', 'Statewide executive row.'),
  o('ORB_COMPT_GOV', 'ENT_COMPTROLLER', 'ENT_GOVERNOR', 'medium', 'Fiscal gravity.'),
  o('ORB_LAND_GOV', 'ENT_LAND_COMM', 'ENT_GOVERNOR', 'weak', 'Statewide brand.'),
  o('ORB_AGCOMM_RANCHER', 'ENT_AG_COMM', 'ENT_RANCHER', 'medium', 'Ag politics.'),
  o('ORB_RRC_ROUGH', 'ENT_RAILROAD_COMM', 'ENT_ROUGHNECK', 'medium', 'Energy reality.'),
  o('ORB_ELDER_DEAN', 'ENT_ELDER_STATESMAN', 'ENT_DEAN', 'medium', 'Memory without a vote / with a vote.'),
  o('ORB_NATL_PARTY', 'ENT_NATL_COMMITTEE', 'ENT_STATE_PARTY_CHAIR', 'medium', 'National-state party link.'),
  o('ORB_FORMER_PLAYER', 'ENT_FORMER_STATEWIDE', 'ENT_HOUSE_CANDIDATE', 'weak', 'Unfinished business mentors or haunts.'),
  o('ORB_US_SENATE_GOV', 'ENT_US_SENATE', 'ENT_GOVERNOR', 'medium', 'Statewide federal vs state.'),
  o('ORB_ADVOCACY_PLAYER', 'ENT_ADVOCACY_HEAD', 'ENT_HOUSE_CANDIDATE', 'weak', 'Movement brand.'),
  o('ORB_JUDGE_PLAYER', 'ENT_JUDGE', 'ENT_HOUSE_CANDIDATE', 'weak', 'Different clock, adjacent power.'),
  o('ORB_JANITOR_ELEVATOR', 'ENT_CAPITOL_JANITOR', 'ENT_ELEVATOR_OP', 'weak', 'After-hours building.'),
  o('ORB_SCANDAL_RIVAL', 'ENT_SCANDAL_EXMEMBER', 'ENT_PRIMARY_RIVAL', 'weak', 'Cautionary oppo material.'),
  o('ORB_FINANCE_PLAYER', 'ENT_FINANCE_CHAIR', 'ENT_HOUSE_CANDIDATE', 'medium', 'Weekly money when warm.'),
  o('ORB_FEED_PLAYER', 'ENT_FEED_STORE', 'ENT_HOUSE_CANDIDATE', 'weak', 'Unofficial county senate.'),
  o('ORB_RIVAL_STAFF', 'ENT_RIVAL_STAFFER', 'ENT_PRIMARY_RIVAL', 'strong', 'Disgruntled from their camp.'),
  o('ORB_RIVAL_STAFF_PLAYER', 'ENT_RIVAL_STAFFER', 'ENT_HOUSE_CANDIDATE', 'medium', 'Folder or plant.')
];

/** Procedural forces. */
const PROC: OrbitDef[] = [
  o('ORB_OPEN_INCUMBENT', 'ENT_OPEN_SEAT', 'ENT_DISTRICT_INCUMBENT', 'strong', 'Open seat means the incumbent is gone.'),
  o('ORB_OPEN_PLAYER', 'ENT_OPEN_SEAT', 'ENT_HOUSE_CANDIDATE', 'strong', 'Field floods; your odds change.'),
  o('ORB_VACANCY_SPECIAL', 'ENT_VACANCY', 'ENT_SPECIAL_ELECTION', 'strong', 'Empty desk starts the special clock.'),
  o('ORB_SPECIAL_PLAYER', 'ENT_SPECIAL_ELECTION', 'ENT_HOUSE_CANDIDATE', 'strong', 'Compressed campaign.'),
  o('ORB_MAP_PLAYER', 'ENT_REDISTRICTING', 'ENT_HOUSE_CANDIDATE', 'strong', 'Lines move under your feet.'),
  o('ORB_MAP_MEMBER', 'ENT_REDISTRICTING', 'ENT_STATE_REP', 'strong', 'Members live and die by maps.'),
  o('ORB_PAC_PLAYER', 'ENT_PAC', 'ENT_HOUSE_CANDIDATE', 'medium', 'Money with a string (OB1 path).'),
  o('ORB_PAC_BUNDLER', 'ENT_PAC', 'ENT_BUNDLER', 'medium', 'Dark money adjacency.'),
  o('ORB_VOTER_FILE_PLAYER', 'ENT_VOTER_FILE', 'ENT_HOUSE_CANDIDATE', 'medium', 'Asset A02/A01 path.'),
  o('ORB_HIT_PLAYER', 'ENT_HIT_PIECE', 'ENT_HOUSE_CANDIDATE', 'medium', 'Mail that lands.'),
  o('ORB_HIT_RIVAL', 'ENT_HIT_PIECE', 'ENT_PRIMARY_RIVAL', 'medium', 'Or lands on them.'),
  o('ORB_HEARING_CHAIR', 'ENT_COMMITTEE_HEARING', 'ENT_COMMITTEE_CHAIR', 'strong', 'Hearing is the chair\'s tool.'),
  o('ORB_HEARING_PLAYER', 'ENT_COMMITTEE_HEARING', 'ENT_HOUSE_CANDIDATE', 'medium', 'Session testimony path.'),
  o('ORB_SCANDAL_PLAYER', 'ENT_SCANDAL_FIGURE', 'ENT_HOUSE_CANDIDATE', 'medium', 'Name attached to a problem.')
];

const MANUAL = [...CORE, ...CROSS, ...PROC];

/**
 * Ensure every entity has ≥1 edge: attach weak ambient edge to player or
 * cluster hub if still orphan after manual edges.
 */
function ensureNoOrphans(edges: OrbitDef[]): OrbitDef[] {
  const degree = new Map<string, number>();
  for (const id of ALL_ENTITY_IDS) degree.set(id, 0);
  for (const edge of edges) {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  }
  const hubs: Record<string, string> = {
    street: 'ENT_HOUSE_CANDIDATE',
    grassroots: 'ENT_HOUSE_CANDIDATE',
    local: 'ENT_HOUSE_CANDIDATE',
    lege_staff: 'ENT_STATE_REP',
    lege: 'ENT_SPEAKER',
    leadership: 'ENT_SPEAKER',
    statewide: 'ENT_GOVERNOR',
    federal: 'ENT_HOUSE_CANDIDATE',
    procedural: 'ENT_HOUSE_CANDIDATE'
  };
  const extra: OrbitDef[] = [];
  // lazy import avoided — use entity list from ALL_ENTITY_IDS only
  for (const id of ALL_ENTITY_IDS) {
    if ((degree.get(id) ?? 0) > 0) continue;
    if (id === 'ENT_HOUSE_CANDIDATE') continue;
    const hub = 'ENT_HOUSE_CANDIDATE';
    extra.push(
      o(
        `ORB_AMBIENT_${id}`,
        id,
        hub,
        'weak',
        'Ambient starmap edge — fill with real orbit later.'
      )
    );
  }
  return [...edges, ...extra];
}

export const ORBITS: OrbitDef[] = ensureNoOrphans(MANUAL);

export const ALL_ORBIT_IDS = ORBITS.map(x => x.id);

export function orbitsFrom(id: string): OrbitDef[] {
  return ORBITS.filter(x => x.from === id);
}

export function orbitsTo(id: string): OrbitDef[] {
  return ORBITS.filter(x => x.to === id);
}
