import React from "react";
import TR from "react-test-renderer";
jest.mock("expo-router", () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock("@react-native-async-storage/async-storage", () => ({ getItem: jest.fn(async () => null), setItem: jest.fn() }));
const { ThemeProvider } = require("@/context/ThemeContext");
const D = require("../ui/Design");

test("design primitives render and behave", async () => {
  const onPress = jest.fn(), onChange = jest.fn();
  let tree;
  await TR.act(async () => {
    tree = TR.create(
      <ThemeProvider>
        <D.ScreenHeader title="Settings" back />
        <D.PillInput placeholder="Search" accessibilityLabel="search" />
        <D.PillButton label="Save" onPress={onPress} />
        <D.Segmented options={[{ value: "a", label: "A" }, { value: "b", label: "B" }]} value="a" onChange={onChange} />
        <D.Block><D.ListRow title="Row" subtitle="Sub" chevron onPress={onPress} /></D.Block>
        <D.CountBadge value={120} />
      </ThemeProvider>
    );
  });
  const find = (l) => tree.root.findAll((n) => n.props.accessibilityLabel === l && typeof n.props.onPress === "function")[0];
  await TR.act(async () => { find("Back").props.onPress(); });
  expect(require("expo-router").router.back).toHaveBeenCalled();
  await TR.act(async () => { find("Save").props.onPress(); find("Row").props.onPress(); });
  expect(onPress).toHaveBeenCalledTimes(2);
  const tabB = tree.root.findAll((n) => n.props.accessibilityRole === "tab" && typeof n.props.onPress === "function").find((n) => !n.props.accessibilityState.selected);
  await TR.act(async () => { tabB.props.onPress(); });
  expect(onChange).toHaveBeenCalledWith("b");
  expect(JSON.stringify(tree.toJSON())).toContain("99+");
  TR.act(() => tree.unmount());
});
