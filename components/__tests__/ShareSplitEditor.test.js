// "By shares" editor on the create-group screen + the helper that turns the
// picks into backend weights. RTL v14 render() is async: always await it.
import { cleanup, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import ShareSplitEditor, { MAX_SHARES } from "../people/ShareSplitEditor";
import { sharesToWeights } from "@/lib/people";

afterEach(async () => { await cleanup(); });

jest.mock("expo-haptics", () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));
jest.mock("@/lib/api", () => ({ api: {} }));
jest.mock("@/components/ui/Design", () => ({
  useDesign: () => ({
    colors: { text: "#111", textSecondary: "#666", background: "#fff" },
    t: { surface: "#fff", surfaceAlt: "#eee", outline: "#ddd", ink: "#000", onInk: "#fff" },
  }),
}));
jest.mock("@/components/ui/Typography", () => ({ Text: require("react-native").Text }));

const ann = { key: "u:a", kind: "user", userId: "a", name: "Ann", sub: "ann@x.com", direct: true };
const bob = { key: "u:b", kind: "user", userId: "b", name: "Bob", sub: "bob@x.com", direct: true };
const pendingUser = { key: "u:c", kind: "user", userId: "c", name: "Cara", sub: "c@x.com", direct: false };
const emailOnly = { key: "e:d@x.com", kind: "email", email: "d@x.com", name: "d@x.com", sub: "Joining invite by email", direct: false };

let latest;
function Harness({ people, initial = {} }) {
  const [shares, setShares] = useState(initial);
  latest = shares;
  return <ShareSplitEditor people={people} shares={shares} onChange={setShares} />;
}
const press = async (label) => { await fireEvent.press(screen.getByLabelText(label)); };

describe("ShareSplitEditor (app)", () => {
  test("lists You and each person by name, all at 1 share", async () => {
    await render(<Harness people={[ann, bob]} />);
    expect(screen.getByText("You")).toBeTruthy();
    expect(screen.getByText("Ann")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
    expect(screen.getByText("3 shares total")).toBeTruthy();
    expect(screen.getAllByText("33% of every bill")).toHaveLength(3);
  });

  test("only You: singular wording and 100%", async () => {
    await render(<Harness people={[]} />);
    expect(screen.getByText("1 share total")).toBeTruthy();
    expect(screen.getByText("100% of every bill")).toBeTruthy();
  });

  test("+ / - update shares and percentages", async () => {
    await render(<Harness people={[ann]} />);
    await press("More shares for Ann");
    await press("More shares for Ann");
    expect(screen.getByText("4 shares total")).toBeTruthy();
    expect(screen.getByText("75% of every bill")).toBeTruthy();
    await press("Fewer shares for Ann");
    expect(screen.getByText("3 shares total")).toBeTruthy();
    expect(latest["u:a"]).toBe(2);
  });

  test("never below 1", async () => {
    await render(<Harness people={[ann]} />);
    await press("Fewer shares for Ann"); // disabled -> no change
    expect(screen.getByText("2 shares total")).toBeTruthy();
    expect(latest["u:a"]).toBeUndefined();
  });

  test(`never above ${MAX_SHARES}`, async () => {
    await render(<Harness people={[ann]} initial={{ "u:a": MAX_SHARES }} />);
    await press("More shares for Ann");
    expect(latest["u:a"]).toBe(MAX_SHARES);
  });

  test("a bad stored value (0) is clamped to >= 1 on change", async () => {
    await render(<Harness people={[ann]} initial={{ "u:a": 0 }} />);
    await press("More shares for Ann");
    expect(latest["u:a"]).toBeGreaterThanOrEqual(1);
  });

  test("email invites and not-yet-accepted users are locked at 1 (no stepper)", async () => {
    await render(<Harness people={[ann, pendingUser, emailOnly]} />);
    expect(screen.getByText("Gets 1 share once they accept")).toBeTruthy();
    expect(screen.getByText("Gets 1 share once they join")).toBeTruthy();
    expect(screen.queryByLabelText("More shares for Cara")).toBeNull();
    expect(screen.queryByLabelText("More shares for d@x.com")).toBeNull();
    expect(screen.getByLabelText("More shares for Ann")).toBeTruthy();
    expect(screen.getByText("4 shares total")).toBeTruthy();
  });

  test("stale shares of a removed person are ignored", async () => {
    await render(<ShareSplitEditor people={[bob]} shares={{ "u:a": 9 }} onChange={() => {}} />);
    expect(screen.getByText("2 shares total")).toBeTruthy();
  });
});

describe("sharesToWeights (app)", () => {
  const group = { members: [{ _id: "me1" }, { _id: "a" }, { _id: "b" }] };
  test("creator via 'me', others via u:<id>, default 1", () => {
    expect(sharesToWeights(group, { me: 2, "u:a": 3 }, "me1")).toEqual([
      { userId: "me1", value: 2 }, { userId: "a", value: 3 }, { userId: "b", value: 1 },
    ]);
  });
  test("plain-id members, non-members ignored, empty group", () => {
    expect(sharesToWeights({ members: ["me1", "a"] }, { "u:ghost": 9 }, "me1")).toEqual([
      { userId: "me1", value: 1 }, { userId: "a", value: 1 },
    ]);
    expect(sharesToWeights(undefined, {}, "x")).toEqual([]);
  });
});
