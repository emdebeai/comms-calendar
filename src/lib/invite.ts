// Client side of the QR invite flow (see server/invites.ts). A redeemed
// one-time token becomes a DEVICE PASS in localStorage, tying this browser to
// the email that requested it. No AI anywhere; the only network hop is /api.

export interface DevicePass {
  email: string;
  redeemedAt: string;
}

const KEY = "cc-invite-pass";

export function getDevicePass(): DevicePass | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as DevicePass;
    return p.email ? p : null;
  } catch {
    return null;
  }
}

/** Request an invite link for an email. While email sending is stubbed the
 *  API returns the link directly (stub: true) so the flow can be tested. */
export async function requestInvite(
  email: string,
): Promise<{ sent: boolean; link?: string; stub?: boolean }> {
  const res = await fetch("/api/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "request", email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `API returned ${res.status}`);
  return data;
}

/** Redeem a ?invite= token — burns it server-side; stores the device pass. */
export async function redeemInviteToken(token: string): Promise<DevicePass> {
  const res = await fetch("/api/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "redeem", token }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `API returned ${res.status}`);
  const pass: DevicePass = { email: data.email, redeemedAt: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify(pass));
  return pass;
}
