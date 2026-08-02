/**
 * CANDIDATE ZERO — What your issue actually is, mechanically.
 *
 * Before this file, `state.issue` appeared in exactly one condition in the whole
 * codebase — a `show:` gate checking `s.issue === 'water'` on a single weather
 * event. Every other appearance was string interpolation into an epitaph. You
 * chose from eighteen issues at setup and received a noun for your tombstone.
 *
 * An issue is not a flavour label. It is a map of who cares, who fights you,
 * which room you end up in, and what the world might hand you if it breaks the
 * right way. Brammer's Fenstemaker knew every one of these boxes for every
 * member; that knowledge WAS the power. So:
 *
 *   grounds     — the turf that wants it. Rapport there is a vote.
 *   attrs       — what the work of it actually takes.
 *   committee   — the room it lives in. The Speaker's gift or his joke.
 *   opposition  — who shows up to kill it, by name, because in Austin it is
 *                 always a name and never an abstraction.
 *   openings    — what the world can put on the docket for you.
 *
 * Sources feeding the voice here: Brammer on the intimacy and exhaustion of the
 * building; Burka's decades of Best & Worst lists on who is actually effective
 * and why; Braddock on process as the real weapon; Erickson on the Panhandle's
 * arithmetic; McMurtry on what it costs a small town to lose its reason to
 * exist; Hollandsworth on the fact that every statewide story is somebody's
 * specific bad Tuesday.
 */

import type { AttrId } from '../engine/types.js';

export interface OpeningSeed {
  id: string;
  n: string;
  d: string;
  constituency: string[];
  opposition: string;
  weight: number;
  window?: number;
  /** The provision this becomes if you take it. */
  provision: {
    n: string;
    d: string;
    ayes: number;
    nays: number;
    heat: number;
    rewards?: string;
    angers?: string;
  };
}

export interface IssueProfile {
  id: string;
  /** Turf that rewards work on this issue. */
  grounds: string[];
  /** What the work takes. */
  attrs: AttrId[];
  /** Committee this bill belongs in. */
  committee: string;
  /** The named opposition. */
  opposition: string;
  /** One line the game can say about why this is hard. */
  hard: string;
  openings: OpeningSeed[];
}

/**
 * Eighteen issues, eighteen different fights.
 *
 * Not every issue needs the same number of openings — some are one enormous
 * recurring crisis (water, grid) and some are a slow grind of small ones
 * (corruption, bail). That asymmetry is the point.
 */
export const ISSUE_PROFILES: Record<string, IssueProfile> = {
  water: {
    id: 'water',
    grounds: ['GR02', 'GR07'],
    attrs: ['CRA', 'INK'],
    committee: 'AG',
    opposition: 'the downstream river authority',
    hard: 'Everybody agrees about water until you say whose.',
    openings: [
      {
        id: 'OP_WATER_FLOOD',
        n: 'Drainage district authority after the flood',
        d: 'Thirty inches in four days and the creek took the low road through town, the way everyone knew it would and nobody had authority to prevent.',
        constituency: ['GR08', 'GR07'],
        opposition: 'the developers who platted the low ground',
        weight: 2,
        window: 4,
        provision: {
          n: 'Drainage district with condemnation authority',
          d: 'Lets the county buy out the worst lots instead of rebuilding them a fourth time.',
          ayes: 15, nays: 10, heat: 3,
          rewards: 'GR08',
          angers: 'the developers who platted the low ground'
        }
      },
      {
        id: 'OP_WATER_DROUGHT',
        n: 'Emergency groundwater district authority',
        d: 'Third year of the drought and the district well is pulling sand. The 1930s answer was to carve the Highland Lakes out of the hills; the modern one is a rule nobody wants to sign.',
        constituency: ['GR02', 'GR07'],
        opposition: 'the downstream river authority',
        weight: 3,
        window: 4,
        provision: {
          n: 'Curtailment authority in declared drought',
          d: 'Lets the district shut off junior rights before senior ones. Every rancher upstream reads it twice.',
          ayes: 14,
          nays: 9,
          heat: 2,
          rewards: 'GR02',
          angers: 'the downstream river authority'
        }
      },
      {
        id: 'OP_WATER_LAKE',
        n: 'Lake-level compact for the reservoir counties',
        d: 'Lake Country watched the boat ramps end in dry gravel two summers running. The marinas are a tax base that can leave.',
        constituency: ['GR07', 'GR03'],
        opposition: 'the municipal utility districts',
        weight: 2,
        provision: {
          n: 'Minimum pool guarantee',
          d: 'Holds a floor in the reservoir through August. The cities downstream will pay for it and know it.',
          ayes: 11,
          nays: 12,
          heat: 3,
          rewards: 'GR07',
          angers: 'the municipal utility districts'
        }
      }
    ]
  },

  grid: {
    id: 'grid',
    grounds: ['GR02', 'GR05', 'GR03'],
    attrs: ['CRA', 'CON'],
    committee: 'CA',
    opposition: 'the generators and their rate consultants',
    hard: 'Everyone remembers the freeze. Nobody agrees who pays to prevent the next one.',
    openings: [
      {
        id: 'OP_GRID_COOLING',
        n: 'Cooling centers and a load-shed exemption',
        d: 'A hundred and nine for ten days. The people who die in a heat dome die alone, indoors, with the power off for eleven hours.',
        constituency: ['GR08', 'GR01'],
        opposition: 'the load-shed protocol nobody wants to own',
        weight: 2,
        window: 3,
        provision: {
          n: 'Medically-necessary load-shed exemption registry',
          d: 'A list the utility must not cut. Small, cheap, and somebody has to keep it accurate.',
          ayes: 13, nays: 6, heat: 2,
          rewards: 'GR08',
          angers: 'the load-shed protocol nobody wants to own'
        }
      },
      {
        id: 'OP_GRID_WEATHERIZE',
        n: 'Weatherization mandate with actual teeth',
        d: 'The last freeze is a campaign memorial in every barn with a generator in it. The word "voluntary" is doing enormous work in current law.',
        constituency: ['GR02', 'GR05', 'GR03'],
        opposition: 'the generators and their rate consultants',
        weight: 3,
        window: 5,
        provision: {
          n: 'Mandatory weatherization with penalty schedule',
          d: 'Fines that exceed the cost of compliance, which is the only kind that has ever worked.',
          ayes: 18,
          nays: 14,
          heat: 4,
          rewards: 'GR05',
          angers: 'the generators and their rate consultants'
        }
      },
      {
        id: 'OP_GRID_INTERCONNECT',
        n: 'Study of a limited DC tie',
        d: 'Saying the word "interconnect" out loud in this building is a career event. A study is how you say it without saying it.',
        constituency: ['GR03'],
        opposition: 'forty years of Texas grid independence',
        weight: 1,
        window: 3,
        provision: {
          n: 'Interim study on a limited DC tie',
          d: 'Commissions a report. Costs nothing, changes nothing, and marks you forever as the member who asked.',
          ayes: 6,
          nays: 3,
          heat: 5,
          angers: 'forty years of Texas grid independence'
        }
      }
    ]
  },

  'ag-subsidies': {
    id: 'ag-subsidies',
    grounds: ['GR02', 'GR06'],
    attrs: ['CHA', 'DIP'],
    committee: 'AG',
    opposition: 'the crop insurance underwriters',
    hard: 'One hailstorm from foreclosure, every year, and the arithmetic never improves.',
    openings: [
      {
        id: 'OP_AG_FAIRGROUNDS',
        n: 'Fairgrounds and youth livestock capital',
        d: 'The county fair is the only week all year the whole county is in one place. The barn roof is from 1974 and the show ring floods.',
        constituency: ['GR02', 'GR06'],
        opposition: 'the comptroller, who calls it a local expense',
        weight: 1,
        provision: {
          n: 'Matching grant for county fairground capital',
          d: 'Small money, enormous locally. The kind of line item that keeps a member in office for twenty years.',
          ayes: 18, nays: 4, heat: 1,
          rewards: 'GR02',
          angers: 'the comptroller, who calls it a local expense'
        }
      },
      {
        id: 'OP_AG_SCREWWORM',
        n: 'Livestock quarantine and indemnity authority',
        d: 'The screw worm crossed the river. Erickson could tell you what a Panhandle cattleman does when the vet says quarantine: he does the math on the whole herd before he answers.',
        constituency: ['GR02', 'GR06'],
        opposition: 'the feedlot consolidators',
        weight: 2,
        window: 4,
        provision: {
          n: 'Indemnity fund for quarantined herds',
          d: 'Pays the rancher who reports it instead of the one who hides it. That is the entire epidemiology of the thing.',
          ayes: 16,
          nays: 7,
          heat: 2,
          rewards: 'GR02',
          angers: 'the feedlot consolidators'
        }
      }
    ]
  },

  hospitals: {
    id: 'hospitals',
    grounds: ['GR02', 'GR06', 'GR08'],
    attrs: ['CON', 'DIP'],
    committee: 'CA',
    opposition: 'the regional hospital system that bought the local one',
    hard: 'An OB desert is measured in ambulance miles, and the map only ever gets worse.',
    openings: [
      {
        id: 'OP_HOSP_OB',
        n: 'Obstetric access grant for counties with no delivery room',
        d: 'A hundred and sixty miles to deliver a baby. McMurtry wrote about towns losing the reason they existed; this is what it looks like on a Tuesday.',
        constituency: ['GR02', 'GR06', 'GR08'],
        opposition: 'the regional hospital system that bought the local one',
        weight: 3,
        window: 5,
        provision: {
          n: 'Standing OB grant with a staffing floor',
          d: 'Money with a condition attached, because the last three grants were absorbed and the ward still closed.',
          ayes: 19,
          nays: 8,
          heat: 3,
          rewards: 'GR08',
          angers: 'the regional hospital system that bought the local one'
        }
      }
    ]
  },

  schools: {
    id: 'schools',
    grounds: ['GR04', 'GR03', 'GR08'],
    attrs: ['INK', 'CON'],
    committee: 'UA',
    opposition: 'the recapture formula and everyone it feeds',
    hard: 'The formula is understood by nine people and four of them are lobbyists.',
    openings: [
      {
        id: 'OP_SCHOOL_LIBRARY',
        n: 'Who decides what is on the shelf',
        d: 'Four hours of public comment, the same eleven people, and a librarian on a $41,000 salary being called things in a school cafeteria.',
        constituency: ['GR04', 'GR01'],
        opposition: 'whichever side of the room you did not stand with',
        weight: 3,
        window: 3,
        provision: {
          n: 'Local review standard with a named process',
          d: 'Does not decide the fight. Decides who has to show up and sign their name to decide it.',
          ayes: 12, nays: 12, heat: 5,
          rewards: 'GR04',
          angers: 'whichever side of the room you did not stand with'
        }
      },
      {
        id: 'OP_SCHOOL_FACILITIES',
        n: 'Facilities allotment for small districts',
        d: 'The high school roof is older than the principal. Friday nights are the last civic institution in three counties and the bleachers are condemned.',
        constituency: ['GR04', 'GR08'],
        opposition: 'the recapture formula and everyone it feeds',
        weight: 2,
        window: 4,
        provision: {
          n: 'Facilities allotment, districts under 1,600 ADA',
          d: 'Narrow enough to pass, which means narrow enough that the district next door gets nothing.',
          ayes: 13,
          nays: 10,
          heat: 2,
          rewards: 'GR04',
          angers: 'the recapture formula and everyone it feeds'
        }
      }
    ]
  },

  teacherpay: {
    id: 'teacherpay',
    grounds: ['GR04', 'GR08', 'GR01'],
    attrs: ['CHA', 'CON'],
    committee: 'UA',
    opposition: 'the comptroller\'s fiscal note',
    hard: 'The room already agrees with you. Agreement is not a vote.',
    openings: [
      {
        id: 'OP_TEACH_STIPEND',
        n: 'Rural retention stipend',
        d: 'Twenty years in a classroom and a second job at the feed store. Everybody claps for teachers in April and finds the money in May.',
        constituency: ['GR04', 'GR08'],
        opposition: "the comptroller's fiscal note",
        weight: 2,
        provision: {
          n: 'Retention stipend, hardship-designated campuses',
          d: 'Targeted, so it survives the fiscal note. Targeted, so most teachers do not get it.',
          ayes: 15,
          nays: 9,
          heat: 2,
          rewards: 'GR08',
          angers: "the comptroller's fiscal note"
        }
      }
    ]
  },

  taxes: {
    id: 'taxes',
    grounds: ['GR03', 'GR01'],
    attrs: ['CRA', 'INK'],
    committee: 'CA',
    opposition: 'the appraisal district and every entity it funds',
    hard: 'Everyone wants relief. Nobody wants the service cut that pays for it.',
    openings: [
      {
        id: 'OP_TAX_SEVERANCE',
        n: 'Severance revenue for the county roads it broke',
        d: 'The Permian checkbooks opened and so did the caliche. Ninety thousand pounds a load on a road built for a school bus.',
        constituency: ['GR02', 'GR05'],
        opposition: 'the operators, who will note they already pay severance',
        weight: 2,
        provision: {
          n: 'County road reimbursement from severance receipts',
          d: 'Sends a slice back to the counties actually carrying the trucks. Everyone agrees until the formula.',
          ayes: 15, nays: 11, heat: 3,
          rewards: 'GR02',
          angers: 'the operators, who will note they already pay severance'
        }
      },
      {
        id: 'OP_TAX_APPRAISAL',
        n: 'Appraisal cap for homesteads over 65',
        d: 'A widow on a fixed income in a house her husband built, priced out by what the neighbours paid for theirs.',
        constituency: ['GR01', 'GR03'],
        opposition: 'the appraisal district and every entity it funds',
        weight: 2,
        provision: {
          n: 'Freeze on over-65 homestead appraisals',
          d: 'Popular to the point of unanimity, and it shifts the burden onto the young family two streets over.',
          ayes: 20,
          nays: 6,
          heat: 3,
          rewards: 'GR01',
          angers: 'the appraisal district and every entity it funds'
        }
      }
    ]
  },

  land: {
    id: 'land',
    grounds: ['GR02', 'GR07'],
    attrs: ['INK', 'CON'],
    committee: 'AG',
    opposition: 'the pipeline right-of-way agents',
    hard: 'A ranch gate is not a negotiating position to a common carrier.',
    openings: [
      {
        id: 'OP_LAND_CONDEMN',
        n: 'Condemnation notice and appraisal reform',
        d: 'The right-of-way man comes with a number and a deadline and the confidence of somebody who has never lost. Six generations on that section and the letter gives you thirty days.',
        constituency: ['GR02', 'GR07'],
        opposition: 'the pipeline right-of-way agents',
        weight: 3,
        window: 4,
        provision: {
          n: 'Bona fide offer standard with fee-shifting',
          d: 'Makes the condemnor pay your lawyer when their first offer was insulting. Suddenly the first offer improves.',
          ayes: 17,
          nays: 11,
          heat: 4,
          rewards: 'GR02',
          angers: 'the pipeline right-of-way agents'
        }
      }
    ]
  },

  broadband: {
    id: 'broadband',
    grounds: ['GR02', 'GR03'],
    attrs: ['CRA', 'DIP'],
    committee: 'CA',
    opposition: 'the incumbent carriers',
    hard: 'The maps the carriers filed say you already have it. You do not.',
    openings: [
      {
        id: 'OP_BB_MAPS',
        n: 'Challenge process for carrier coverage maps',
        d: 'Kids doing homework in the church parking lot for the wifi, in a county the map colours as fully served.',
        constituency: ['GR02', 'GR04'],
        opposition: 'the incumbent carriers',
        weight: 2,
        provision: {
          n: 'County-initiated map challenge with burden on the carrier',
          d: 'Moves who has to prove it. That single reversal is the whole bill.',
          ayes: 14,
          nays: 8,
          heat: 2,
          rewards: 'GR02',
          angers: 'the incumbent carriers'
        }
      }
    ]
  },

  veterans: {
    id: 'veterans',
    grounds: ['GR06', 'GR02'],
    attrs: ['CHA', 'DIP'],
    committee: 'CR',
    opposition: 'the federal VA waiting list nobody in Austin controls',
    hard: 'Every name on the Legion hall list is known personally by somebody who will ask you about it.',
    openings: [
      {
        id: 'OP_VET_COURT',
        n: 'Veterans treatment court in the rural districts',
        d: 'The Legion hall knows every name. So does the sheriff, and he would rather not book any of them again.',
        constituency: ['GR06', 'GR02'],
        opposition: 'the district attorneys association',
        weight: 2,
        provision: {
          n: 'Rural veterans court with diversion authority',
          d: 'Judges get a door other than the unit. The DAs lose leverage they had grown used to.',
          ayes: 15,
          nays: 9,
          heat: 2,
          rewards: 'GR06',
          angers: 'the district attorneys association'
        }
      }
    ]
  },

  'mental-health': {
    id: 'mental-health',
    grounds: ['GR08', 'GR01', 'GR06'],
    attrs: ['CON', 'DIP'],
    committee: 'CR',
    opposition: 'the county judge who does not want the cost shifted home',
    hard: 'The sheriff runs the largest psychiatric facility in three counties. It is his jail, and he says so himself.',
    openings: [
      {
        id: 'OP_MH_BEDS',
        n: 'Crisis stabilization beds outside the jail',
        d: 'Hollandsworth could write the whole thing from one night in intake. Everybody in the building agrees, right up until the fiscal note.',
        constituency: ['GR08', 'GR01'],
        opposition: 'the county judge who does not want the cost shifted home',
        weight: 3,
        window: 5,
        provision: {
          n: 'Regional crisis beds with state share',
          d: 'The state pays most of it, which is the only version any county will accept.',
          ayes: 16,
          nays: 10,
          heat: 3,
          rewards: 'GR08',
          angers: 'the county judge who does not want the cost shifted home'
        }
      }
    ]
  },

  'bail-reform': {
    id: 'bail-reform',
    grounds: ['GR08', 'GR01'],
    attrs: ['INK', 'CON'],
    committee: 'CR',
    opposition: 'the bail bond association',
    hard: 'The unit is the county\'s biggest employer and its heaviest silence.',
    openings: [
      {
        id: 'OP_BAIL_DATA',
        n: 'Pretrial detention reporting requirement',
        d: 'Nobody can tell you how many people are in that jail tonight who are only there because they are poor. That is not an accident of recordkeeping.',
        constituency: ['GR08'],
        opposition: 'the bail bond association',
        weight: 2,
        provision: {
          n: 'Monthly pretrial population reporting',
          d: 'Only a data requirement. Data requirements are how every real reform in this state started.',
          ayes: 12,
          nays: 11,
          heat: 3,
          rewards: 'GR08',
          angers: 'the bail bond association'
        }
      }
    ]
  },

  'payday-lending': {
    id: 'payday-lending',
    grounds: ['GR05', 'GR08'],
    attrs: ['CON', 'CRA'],
    committee: 'CA',
    opposition: 'the credit access businesses and their model ordinance',
    hard: 'Four storefronts at the plant gate at 400% APR, and the math preys on shift workers by design.',
    openings: [
      {
        id: 'OP_LAYOFF_NOTICE',
        n: 'Notice and retraining when the plant goes',
        d: 'Four hundred jobs gone by Friday, announced Thursday. The men at the gate found out from the local news van.',
        constituency: ['GR05', 'GR08'],
        opposition: 'the parent company, headquartered elsewhere',
        weight: 2,
        window: 4,
        provision: {
          n: 'Ninety-day notice and a retraining draw',
          d: 'Will not save the plant. Buys four hundred families a quarter to find the next thing.',
          ayes: 16, nays: 9, heat: 3,
          rewards: 'GR05',
          angers: 'the parent company, headquartered elsewhere'
        }
      },
      {
        id: 'OP_PAYDAY_ROLLOVER',
        n: 'Rollover limit at the plant gate',
        d: 'The loan is not the trap. The eighth renewal of the same loan is the trap, and it is the entire business model.',
        constituency: ['GR05', 'GR08'],
        opposition: 'the credit access businesses and their model ordinance',
        weight: 2,
        provision: {
          n: 'Cap on consecutive renewals',
          d: 'Four rollovers and the balance amortizes. The storefronts will tell you this ends credit for working people.',
          ayes: 13,
          nays: 12,
          heat: 4,
          rewards: 'GR05',
          angers: 'the credit access businesses and their model ordinance'
        }
      }
    ]
  },

  corruption: {
    id: 'corruption',
    grounds: ['GR01', 'GR08'],
    attrs: ['INK', 'CON'],
    committee: 'EL',
    opposition: "the commissioners' court and forty years of family business",
    hard: 'Naming it takes nerve, and the courthouse remembers names.',
    openings: [
      {
        id: 'OP_CORR_DISCLOSE',
        n: 'Who paid for the whisper',
        d: 'Something ugly and unattributed makes the rounds at the coffee shops. Nobody signed it. Somebody paid for it.',
        constituency: ['GR01', 'GR03'],
        opposition: 'every consultant in Austin, quietly and effectively',
        weight: 2,
        provision: {
          n: 'Disclosure on independent political advertising',
          d: 'A name on the mailer. That is the whole bill, and it is the hardest one in this book to pass.',
          ayes: 11, nays: 13, heat: 4,
          rewards: 'GR01',
          angers: 'every consultant in Austin, quietly and effectively'
        }
      },
      {
        id: 'OP_CORR_BID',
        n: 'Competitive bidding threshold for county contracts',
        d: 'The road contract has gone to the same brother-in-law since Nixon. Everyone knows. Knowing has never once been the problem.',
        constituency: ['GR01', 'GR08'],
        opposition: "the commissioners' court and forty years of family business",
        weight: 3,
        window: 3,
        provision: {
          n: 'Lower bid threshold with conflict disclosure',
          d: 'Boring, procedural, and it ends a forty-year arrangement in one line.',
          ayes: 11,
          nays: 13,
          heat: 5,
          rewards: 'GR01',
          angers: "the commissioners' court and forty years of family business"
        }
      }
    ]
  },

  tolls: {
    id: 'tolls',
    grounds: ['GR03', 'GR05'],
    attrs: ['CRA', 'INK'],
    committee: 'CA',
    opposition: 'the toll authority bondholders',
    hard: 'They promised the tolls would come off when the road was paid. The road is paid.',
    openings: [
      {
        id: 'OP_TOLL_SUNSET',
        n: 'Sunset on retired toll debt',
        d: 'A promise made in a bond prospectus is the most durable kind of promise in Texas, and the least likely to be kept to you.',
        constituency: ['GR03', 'GR05'],
        opposition: 'the toll authority bondholders',
        weight: 3,
        provision: {
          n: 'Mandatory toll removal on debt retirement',
          d: 'Says the quiet part in statute. The authority will explain why the debt is never quite retired.',
          ayes: 16,
          nays: 12,
          heat: 4,
          rewards: 'GR03',
          angers: 'the toll authority bondholders'
        }
      }
    ]
  },

  vouchers: {
    id: 'vouchers',
    grounds: ['GR04', 'GR02'],
    attrs: ['CON', 'DIP'],
    committee: 'UA',
    opposition: 'whichever side you did not pick, permanently',
    hard: 'The church wants them. The small towns fear them — out there the district IS the town.',
    openings: [
      {
        id: 'OP_VOUCH_RURAL',
        n: 'Rural carve-out',
        d: 'A knife-edge. In a county with one district and no private school, a voucher is a subtraction and everybody can do that arithmetic.',
        constituency: ['GR02'],
        opposition: 'the statewide school choice coalition',
        weight: 3,
        window: 3,
        provision: {
          n: 'Exemption for counties under 20,000',
          d: 'Buys every rural member in the chamber and costs you the coalition that wrote the bill.',
          ayes: 22,
          nays: 18,
          heat: 5,
          rewards: 'GR02',
          angers: 'the statewide school choice coalition'
        }
      }
    ]
  },

  'election-integrity': {
    id: 'election-integrity',
    grounds: ['GR01', 'GR04'],
    attrs: ['INK', 'CRA'],
    committee: 'EL',
    opposition: 'the county clerks association, who are tired',
    hard: 'The clerk is honest, exhausted, and yelled at from both directions.',
    openings: [
      {
        id: 'OP_ELEC_MAPS',
        n: 'The mid-decade map',
        d: 'A rumor with a room number. Somewhere a consultant has already drawn it, and half the members in this chamber are in the wrong district in that draft.',
        constituency: ['GR01'],
        opposition: 'everyone whose seat improves under the new lines',
        weight: 3,
        window: 3,
        provision: {
          n: 'Public-notice requirement before map adoption',
          d: 'Cannot stop it. Makes them do it in daylight, which historically changes what they draw.',
          ayes: 10, nays: 14, heat: 5,
          rewards: 'GR01',
          angers: 'everyone whose seat improves under the new lines'
        }
      },
      {
        id: 'OP_ELEC_CLERK',
        n: 'Clerk staffing and equipment grant',
        d: 'The one thing both sides of this fight actually want is a county clerk who can afford enough people to do it right.',
        constituency: ['GR01', 'GR04'],
        opposition: 'both parties, for opposite reasons',
        weight: 2,
        provision: {
          n: 'Clerk operations grant, no procedural changes',
          d: 'Deliberately says nothing about the fight. That is why it can pass.',
          ayes: 14,
          nays: 9,
          heat: 2,
          rewards: 'GR01',
          angers: 'both parties, for opposite reasons'
        }
      }
    ]
  },

  border: {
    id: 'border',
    grounds: ['GR02', 'GR08', 'GR06'],
    attrs: ['CON', 'CRA'],
    committee: 'CR',
    opposition: 'the cost of anything that is actually federal',
    hard: 'Easy to shout about. Almost impossible to govern from Austin.',
    openings: [
      {
        id: 'OP_BORDER_REIMB',
        n: 'County reimbursement for enforcement costs',
        d: 'The sheriff of a county with nine deputies is running an operation the federal government walked away from, and paying for it out of the road and bridge fund.',
        constituency: ['GR02', 'GR06'],
        opposition: 'the cost of anything that is actually federal',
        weight: 2,
        provision: {
          n: 'Direct county reimbursement, capped',
          d: 'Pays the sheriff back. Does not solve anything, and the sheriff will take it anyway.',
          ayes: 17,
          nays: 10,
          heat: 3,
          rewards: 'GR06',
          angers: 'the cost of anything that is actually federal'
        }
      }
    ]
  }
};

export function issueProfile(id: string | null | undefined): IssueProfile | undefined {
  return id ? ISSUE_PROFILES[id] : undefined;
}

/** Every opening seed in the game, for lookup by id. */
export const OPENING_SEEDS: Record<string, OpeningSeed> = Object.fromEntries(
  Object.values(ISSUE_PROFILES).flatMap(p => p.openings.map(o => [o.id, o]))
);
