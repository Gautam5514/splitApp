import React from "react";
import TR from "react-test-renderer";
import { StyleSheet, Text as RNText, TextInput as RNTextInput } from "react-native";
import { Text, TextInput, setAppFontsReady } from "../ui/Typography";
import { FONTS, fontFamilyFor } from "../../constants/typography";

const styleOf = (tree, type) => StyleSheet.flatten(tree.root.findByType(type).props.style);

describe("one font system", () => {
  test("weights map to Plus Jakarta Sans, bold (700+) to Bricolage Grotesque", () => {
    expect(fontFamilyFor(undefined)).toBe(FONTS.regular);
    expect(fontFamilyFor("300")).toBe(FONTS.light);
    expect(fontFamilyFor("500")).toBe(FONTS.medium);
    expect(fontFamilyFor("600")).toBe(FONTS.semibold);
    expect(fontFamilyFor("700")).toBe("BricolageGrotesque_700Bold");
    expect(fontFamilyFor("bold")).toBe("BricolageGrotesque_700Bold");
    expect(fontFamilyFor("800")).toBe("BricolageGrotesque_800ExtraBold");
    expect(fontFamilyFor("900")).toBe("BricolageGrotesque_800ExtraBold");
    expect(fontFamilyFor("400", "italic")).toBe(FONTS.italic);
  });

  test("app <Text> applies the family from style arrays and clears fake bold", () => {
    setAppFontsReady(true);
    let tree;
    TR.act(() => { tree = TR.create(<Text style={[{ fontSize: 16 }, { fontWeight: "800" }]}>Hi</Text>); });
    const s = styleOf(tree, RNText);
    expect(s).toMatchObject({ fontSize: 16, fontFamily: "BricolageGrotesque_800ExtraBold", fontWeight: "normal" });
    TR.act(() => tree.unmount());
  });

  test("TextInput gets the body font; an explicit custom family (e.g. monospace) is respected", () => {
    setAppFontsReady(true);
    let tree;
    TR.act(() => { tree = TR.create(<TextInput style={{ fontSize: 15 }} value="" />); });
    expect(styleOf(tree, RNTextInput).fontFamily).toBe("PlusJakartaSans_400Regular");
    TR.act(() => { tree.update(<Text style={{ fontFamily: "monospace", fontWeight: "700" }}>code</Text>); });
    expect(styleOf(tree, RNText)).toMatchObject({ fontFamily: "monospace", fontWeight: "700" });
    TR.act(() => tree.unmount());
  });

  test("if fonts failed to load, text falls back to the system font instead of erroring", () => {
    setAppFontsReady(false);
    let tree;
    TR.act(() => { tree = TR.create(<Text style={{ fontWeight: "700" }}>x</Text>); });
    expect(styleOf(tree, RNText).fontFamily).toBeUndefined();
    TR.act(() => tree.unmount());
  });
});
