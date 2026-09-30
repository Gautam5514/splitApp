import React from "react";
import TR from "react-test-renderer";
import AI3DLogo from "../icons/AI3DLogo";

test("3D logo renders; several on screen never share gradient ids", () => {
  let tree;
  TR.act(() => { tree = TR.create(<>{[<AI3DLogo key="a" size={76} />, <AI3DLogo key="b" size={46} shadow={false} />]}</>); });
  const json = JSON.stringify(tree.toJSON());
  const ids = [...json.matchAll(/"name":"(body-[^"]+)"/g)].map((m) => m[1]);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.length).toBeGreaterThanOrEqual(2);
  TR.act(() => tree.unmount());
});
