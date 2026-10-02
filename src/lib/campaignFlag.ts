// Is the map open in campaign mode? Read once from the URL, plus the one
// fact the layout and data modules need about the campaign (its moment) —
// kept tiny so they can consult it at module init without the campaign data.
import campaignsRaw from "../../data/campaigns.csv?raw";
import { parseCsvRows } from "./csv";

export const CAMPAIGN_ID = new URLSearchParams(window.location.search).get("campaign");
export const CAMPAIGN_MODE = CAMPAIGN_ID !== null;
/** The campaigns.csv row for this campaign (first row if the id is unknown). */
export const CAMPAIGN_ROW = (() => {
  const rows = parseCsvRows(campaignsRaw);
  return rows.find((r) => r.id === CAMPAIGN_ID) ?? rows[0];
})();
/** The moment-that-matters the campaign hangs off — also the id of its media bar. */
export const CAMPAIGN_MOMENT: string = CAMPAIGN_ROW?.moment ?? "";
