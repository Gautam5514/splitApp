import { directStatus, groupStatus } from "../chat/MessageStatus";
import { endsRun } from "../chat/chatUi";

describe("1:1 ticks", () => {
  const other = "u2";
  test("temp / sending → clock", () => {
    expect(directStatus({ _id: "temp-1" }, other)).toBe("sending");
    expect(directStatus({ _id: "x", status: "sending" }, other)).toBe("sending");
  });
  test("saved, not delivered → single grey", () => {
    expect(directStatus({ _id: "m1", seenBy: ["u1"], deliveredTo: [] }, other)).toBe("sent");
    expect(directStatus({ _id: "m1", seenBy: ["u1"] }, other)).toBe("sent"); // legacy message, no deliveredTo field
  });
  test("delivered → double grey", () => {
    expect(directStatus({ _id: "m1", seenBy: ["u1"], deliveredTo: ["u2"] }, other)).toBe("delivered");
  });
  test("seen → double blue (populated or raw ids)", () => {
    expect(directStatus({ _id: "m1", seenBy: ["u1", "u2"], deliveredTo: [] }, other)).toBe("seen");
    expect(directStatus({ _id: "m1", seenBy: [{ _id: "u2" }] }, other)).toBe("seen");
  });
});

describe("group ticks", () => {
  const members = ["me", "a", "b"];
  test("nobody else seen → single", () => expect(groupStatus({ _id: "m", seenBy: ["me"] }, members, "me")).toBe("sent"));
  test("some seen → double grey", () => expect(groupStatus({ _id: "m", seenBy: ["me", "a"] }, members, "me")).toBe("delivered"));
  test("all seen → double blue", () => expect(groupStatus({ _id: "m", seenBy: ["me", "a", "b"] }, members, "me")).toBe("seen"));
});

describe("time shown once per run", () => {
  const t = (min) => new Date(2026, 0, 1, 12, min).toISOString();
  test("same sender within 5 min → same run", () => {
    expect(endsRun({ sender: "a", createdAt: t(0) }, { sender: "a", createdAt: t(3) })).toBe(false);
  });
  test("different sender / long gap / newest → run ends", () => {
    expect(endsRun({ sender: "a", createdAt: t(0) }, { sender: "b", createdAt: t(1) })).toBe(true);
    expect(endsRun({ sender: "a", createdAt: t(0) }, { sender: "a", createdAt: t(10) })).toBe(true);
    expect(endsRun({ sender: "a", createdAt: t(0) }, undefined)).toBe(true);
  });
});
