import { evenPercents, normalizePercents, sharesToWeights, splitRows } from "../people";

jest.mock("@/lib/api", () => ({ api: {} }));
const sum = (o) => Math.round(Object.values(o).reduce((a, b) => a + b, 0) * 100) / 100;

describe("evenPercents", () => {
  test.each([1, 2, 3, 6, 7, 9, 11])("%i people always total exactly 100", (n) => {
    const keys = Array.from({ length: n }, (_, i) => `k${i}`);
    expect(sum(evenPercents(keys))).toBe(100);
  });
  test("3 people: first gets the spare hundredth", () => {
    expect(evenPercents(["a", "b", "c"])).toEqual({ a: 33.34, b: 33.33, c: 33.33 });
  });
  test("nobody -> empty", () => expect(evenPercents([])).toEqual({}));
});

describe("normalizePercents", () => {
  test("already 100 is untouched", () => {
    const w = [{ userId: "a", value: 60 }, { userId: "b", value: 40 }];
    expect(normalizePercents(w)).toBe(w);
  });
  test("scales up/down to exactly 100", () => {
    const r = normalizePercents([{ userId: "a", value: 30 }, { userId: "b", value: 30 }, { userId: "c", value: 30 }]);
    expect(Math.round(r.reduce((a, w) => a + w.value, 0) * 100) / 100).toBe(100);
  });
  test("a lone person becomes 100", () => expect(normalizePercents([{ userId: "a", value: 40 }])).toEqual([{ userId: "a", value: 100 }]));
  test("all zero is left alone (server will reject)", () => {
    const w = [{ userId: "a", value: 0 }];
    expect(normalizePercents(w)).toBe(w);
  });
});

describe("sharesToWeights fallback", () => {
  const g = { members: [{ _id: "m" }, { _id: "a" }] };
  test("default fallback 1, percent fallback 0", () => {
    expect(sharesToWeights(g, {}, "m").map((w) => w.value)).toEqual([1, 1]);
    expect(sharesToWeights(g, { me: 70 }, "m", 0).map((w) => w.value)).toEqual([70, 0]);
  });
});

describe("splitRows", () => {
  test("You first; email and not-yet-accepted users are locked", () => {
    const rows = splitRows([
      { key: "u:a", kind: "user", name: "Ann", sub: "a@x", direct: true },
      { key: "u:b", kind: "user", name: "Bob", sub: "b@x", direct: false },
      { key: "e:c", kind: "email", name: "c@x", direct: false },
    ]);
    expect(rows.map((r) => [r.name, r.locked])).toEqual([["You", false], ["Ann", false], ["Bob", true], ["c@x", true]]);
  });
});
