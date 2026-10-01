// Is the map open in campaign mode? Read once from the URL. Kept tiny and
// dependency-free so data modules (comms.ts) and the layout (scale.ts) can
// consult it at module init without importing the campaign data itself.
export const CAMPAIGN_ID = new URLSearchParams(window.location.search).get("campaign");
export const CAMPAIGN_MODE = CAMPAIGN_ID !== null;
