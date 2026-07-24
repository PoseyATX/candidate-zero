/**
 * Nameplate draft → opening kit.
 * Persona already injects signature via SIGNATURE_BY_PERSONA in createCampaign.
 * Issue + region add a few themed ids into the physical starter pile.
 * Keep sparse: ballot-access density still dominates STARTER_DECK_IDS.
 */

import type { SetupSelection } from './setup.js';

/** Extra card ids granted by issue pick (beyond universal starter). */
export const ISSUE_STARTER_IDS: Record<string, string[]> = {
  taxes: ['PL08'],
  water: ['PL08'],
  schools: ['PL13'],
  teacherpay: ['PL13', 'PL16'],
  border: ['PL10'],
  hospitals: ['PL13'],
  land: ['PL08'],
  tolls: ['PL10'],
  'ag-subsidies': ['PL08'],
  corruption: ['PL10'],
  broadband: ['PL16'],
  'bail-reform': ['PL10'],
  'mental-health': ['PL13'],
  veterans: ['PL13'],
  grid: ['PL08'],
  'payday-lending': ['PL10'],
  vouchers: ['PL13'],
  'election-integrity': ['PL10']
};

/** Light region seasoning — one field-adjacent id when it exists. */
export const REGION_STARTER_IDS: Record<string, string[]> = {
  east: ['PL01'],
  valley: ['PL16'],
  hill: ['PL08'],
  panhandle: ['PL01'],
  metro: ['PL10'],
  gulf: ['PL16'],
  west: ['PL01']
};

/** Deduped extras to inject after STARTER_DECK_IDS + signature. */
export function kitIdsForSetup(setup: SetupSelection): string[] {
  const out: string[] = [];
  for (const id of ISSUE_STARTER_IDS[setup.issueId] ?? []) out.push(id);
  for (const id of REGION_STARTER_IDS[setup.regionId] ?? []) out.push(id);
  return [...new Set(out)];
}
