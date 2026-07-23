/**
 * Anvil-inspired ports for Candidate Zero (MIT — see NOTICE.md).
 * Presentation + agent observation only. Rules stay in src/engine.
 */

export { colorFromPath, greyboxSvg, labelFromPath } from './greybox.js';
export {
  CARD_ART_PATH,
  cardArtBaseUrl,
  cardArtPlateHtml,
  cardArtRelPath,
  cardArtUrl,
  clearMissingCardArt,
  isSafeCardArtUrl,
  missingCardArt,
  noteMissing,
  resolveCardArt,
  type CardArtHandle
} from './cardAssets.js';
export {
  observeCampaign,
  observeCampaignDiff,
  type CampaignObserveDiff,
  type CampaignObserveSnapshot
} from './observe.js';
