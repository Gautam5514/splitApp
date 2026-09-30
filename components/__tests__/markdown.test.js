import React from "react";
import TR from "react-test-renderer";
import { Text as RNText, StyleSheet } from "react-native";
import MarkdownText, { parseBlocks } from "../chat/MarkdownText";

const render = (md) => {
  let tree;
  TR.act(() => { tree = TR.create(<MarkdownText color="#111" mutedColor="#666" borderColor="#ddd" surfaceColor="#eee">{md}</MarkdownText>); });
  return tree;
};
const allText = (tree) => {
  const flat = (c) => (Array.isArray(c) ? c.map(flat).join("") : typeof c === "string" ? c : "");
  // outermost Text nodes only
  return tree.root.findAllByType(RNText).filter((n) => !n.parent || n.parent.type !== RNText).map((n) => {
    const walk = (x) => (typeof x === "string" ? x : Array.isArray(x) ? x.map(walk).join("") : x?.props?.children !== undefined ? walk(x.props.children) : "");
    return walk(n.props.children);
  }).join("\n");
};

test("no raw ** / ## / | markers reach the screen", () => {
  const md = "## Balances\n**Rahul** owes you **₹500** and *Priya* owes **₹250**.\n\n- **Goa Trip**: ₹1,200\n- Bhopal: `₹0`\n\n1. Pay Rahul\n2. Done\n\n| Name | Owes |\n|---|---|\n| Rahul | ₹500 |\n\nTip: ** stray marker";
  const out = allText(render(md));
  expect(out).not.toMatch(/\*\*|##|\|---/);
  expect(out).toContain("Balances");
  expect(out).toContain("Rahul owes you ₹500 and Priya owes ₹250.");
  expect(out).toContain("Goa Trip: ₹1,200");
  expect(out).toContain("Tip:  stray marker");
});

test("bold text is actually bold; bullets, numbers and tables become real blocks", () => {
  const tree = render("**Total:** ₹900\n- one\n- two\n1. first\n\n| A | B |\n|---|---|\n| x | y |");
  const bold = tree.root.findAllByType(RNText).filter((n) => StyleSheet.flatten(n.props.style)?.fontWeight === "700");
  expect(bold.some((n) => n.props.children?.[0] === "Total:" || JSON.stringify(n.props.children).includes("Total:"))).toBe(true);
  const blocks = parseBlocks("**Total:** ₹900\n- one\n- two\n1. first\n\n| A | B |\n|---|---|\n| x | y |");
  expect(blocks.map((b) => b.type)).toEqual(["p", "li", "li", "ol", "table"]);
  expect(blocks[4].rows).toEqual([["A", "B"], ["x", "y"]]); // separator row dropped
});

test("code blocks, headings and plain text", () => {
  expect(parseBlocks("# Title\n```\nconst a = 1;\n```\nplain").map((b) => b.type)).toEqual(["h", "code", "p"]);
  expect(allText(render("Just a normal answer."))).toBe("Just a normal answer.");
});
