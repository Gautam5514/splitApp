import { api } from "@/lib/api";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sends PeoplePicker selections to the group. Contacts may be added directly;
// everyone else gets an invite they must accept (decided by the server).
export async function addPeopleToGroup(groupId, selected) {
  const userIds = selected.filter((s) => s.kind === "user").map((s) => String(s.userId));
  const emails = selected.filter((s) => s.kind === "email").map((s) => s.email);
  const res = await api.post(`/groups/${groupId}/members`, { userIds, emails });
  return res.data;
}

// "2 added · 1 invite sent - they need to accept · 1 joining email sent"
export function describeAddResult({ added = 0, pending = 0, invited = 0 } = {}) {
  const parts = [];
  if (added) parts.push(`${added} added`);
  if (pending) parts.push(`${pending} invite${pending > 1 ? "s" : ""} sent - they need to accept`);
  if (invited) parts.push(`${invited} joining email${invited > 1 ? "s" : ""} sent`);
  return parts.join(" · ") || "No one new to add";
}

// Turns the create-flow share picks into defaultSplit weights. Only people who
// actually became members can be weighted (invites aren't members yet).
// `shares` is keyed by row key: "me" for the creator, "u:<userId>" for others.
export function sharesToWeights(group, shares, creatorId, fallback = 1) {
  const member = (m) => String(m?._id ?? m);
  return (group?.members || []).map((m) => {
    const id = member(m);
    const key = id === String(creatorId) ? "me" : `u:${id}`;
    return { userId: id, value: shares[key] ?? fallback };
  });
}

// Rows the split editors show: You first, then everyone picked. Email invites and
// people who still have to accept can't be weighted yet, so they are `locked`.
export function splitRows(people) {
  return [
    { key: "me", name: "You", sub: "Group creator", locked: false },
    ...people.map((p) => ({
      key: p.key,
      name: p.name,
      sub: p.kind === "email" ? "Gets a share once they join" : !p.direct ? "Gets a share once they accept" : p.sub,
      locked: p.kind === "email" || !p.direct,
    })),
  ];
}

// 100 split across keys, in whole hundredths so it always adds up to exactly 100.
export function evenPercents(keys) {
  const n = keys.length;
  if (!n) return {};
  const each = Math.floor(10000 / n);
  const out = {};
  keys.forEach((k, i) => { out[k] = (i === 0 ? each + (10000 - each * n) : each) / 100; });
  return out;
}

// Scales weights so they total exactly 100 (used when somebody couldn't be added).
export function normalizePercents(weights) {
  const total = weights.reduce((a, w) => a + w.value, 0);
  if (!(total > 0) || Math.abs(total - 100) < 0.01) return weights;
  const scaled = weights.map((w) => ({ ...w, value: Math.floor((w.value / total) * 10000) / 100 }));
  const drift = Math.round((100 - scaled.reduce((a, w) => a + w.value, 0)) * 100) / 100;
  scaled[0] = { ...scaled[0], value: Math.round((scaled[0].value + drift) * 100) / 100 };
  return scaled;
}
