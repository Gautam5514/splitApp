// Autopilot client rules: approval guards, payloads, money, tip links.
import { approvedStepIds, autopilotPromptFrom, editChanges, errText, fillTemplate, isDeletePlan, isStalled, money, planTotal, runPayload, TEMPLATES, typedDecision, uuid } from "../autopilot";

const waiting = (steps, extra = {}) => ({ status: "waiting_approval", writesEnabled: true, plan: { steps }, ...extra });
const expense = (amountMinor) => ({ id: "step_1", type: "create_expense", requiresApproval: true, payload: { amountMinor, currency: "INR" } });

test("typed yes approves small plans; no rejects; deletes and big amounts need the button", () => {
  expect(typedDecision(waiting([expense(120000)]), "haan")).toEqual({ decision: "approve" });
  expect(typedDecision(waiting([expense(120000)]), "nahi")).toEqual({ decision: "reject" });
  expect(typedDecision(waiting([expense(6000000)]), "yes").blocked).toMatch(/large amount/);
  expect(typedDecision(waiting([{ id: "s", type: "delete_group", requiresApproval: true, payload: {} }]), "ok").blocked).toMatch(/Delete permanently/);
  expect(typedDecision(waiting([expense(100)], { writesEnabled: false }), "yes")).toBeNull();
  expect(typedDecision({ status: "completed" }, "yes")).toBeNull();
  expect(typedDecision(waiting([expense(100)]), "dinner 300 paid by me")).toBeNull();
});
test("plan helpers", () => {
  const run = waiting([expense(1000), { id: "r", type: "read_summary", requiresApproval: false, payload: {} }, expense(500)]);
  expect(planTotal(run)).toBe(1500);
  expect(approvedStepIds(run)).toEqual(["step_1", "step_1"]);
  expect(isDeletePlan(run)).toBe(false);
  expect(isStalled({ status: "running", stale: true })).toBe(true);
  expect(isStalled({ status: "running", updatedAt: new Date(Date.now() - 5 * 60_000).toISOString() })).toBe(true);
  expect(isStalled({ status: "completed", updatedAt: "2020-01-01" })).toBe(false);
});
test("payloads pad short chip labels and carry continuation fields", () => {
  const p = runPayload("Go", { groupId: "g1", parentRunId: "r1", reuse: true, edits: [{ action: 0, amount: "50" }] });
  expect(p).toMatchObject({ message: "Use Go", groupId: "g1", parentRunId: "r1", reuse: true, edits: [{ action: 0, amount: "50" }] });
  expect(p.requestKey).toMatch(/^[0-9a-f-]{36}$/);
  expect(runPayload("Dinner 300").groupId).toBeNull();
  expect(uuid()).not.toBe(uuid());
});
test("starter prompts are short, unique and name the group you're working in", () => {
  const items = TEMPLATES.flatMap((c) => c.items);
  expect(new Set(items.map((i) => i.key)).size).toBe(items.length);
  for (const i of items) expect(fillTemplate(i.text, "Flat 302").length).toBeLessThanOrEqual(80);
  expect(fillTemplate("Add Sneha to {group}", "Flat 302")).toBe("Add Sneha to Flat 302");
  expect(fillTemplate("Add Sneha to {group}")).toBe("Add Sneha to Goa Trip");
});
test("money is formatted the Indian way", () => {
  expect(money(150000000)).toBe("₹15,00,000");
  expect(money(12345)).toBe("₹123.45");
});
test("friendly errors", () => {
  expect(errText({ response: { status: 429 } })).toMatch(/a little fast/);
  expect(errText({ response: { data: { code: "AUTOPILOT_DISABLED" } } })).toMatch(/switched off/);
  expect(errText({ response: { status: 400, data: { message: "Use a positive amount." } } })).toBe("Use a positive amount.");
  expect(errText({})).toMatch(/couldn't reach/);
});
test("tip links become an Autopilot draft", () => {
  expect(autopilotPromptFrom("/dashboard?autopilot=1&prompt=Create%20group%20Puri%20Trip%2C%20budget%2030000")).toBe("Create group Puri Trip, budget 30000");
  expect(autopilotPromptFrom("/dashboard?autopilot=1")).toBe("");
  expect(autopilotPromptFrom("/groups/123")).toBeNull();
  expect(autopilotPromptFrom(undefined)).toBeNull();
});
test("edit sheet sends only what changed", () => {
  const step = { payload: { name: "Dinner", amountMinor: 300000, splitType: "equal", splits: [{ memberId: "a", name: "You" }, { memberId: "b", name: "Aman" }], roster: [{ memberId: "a", name: "You" }, { memberId: "b", name: "Aman" }, { memberId: "c", name: "Rahul" }] } };
  expect(editChanges(step, { title: "Dinner", amount: "3000", chosen: new Set(["a", "b"]) }).changes).toEqual({});
  expect(editChanges(step, { title: "Team dinner", amount: "4500", chosen: new Set(["a", "b", "c"]) }).changes).toEqual({ title: "Team dinner", amount: "4500", excluded: [] });
  expect(editChanges(step, { title: "Dinner", amount: "-1", chosen: new Set(["a"]) }).valid).toBe(false);
});
