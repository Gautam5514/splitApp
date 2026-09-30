import { Animated, Keyboard, Modal, Platform, Text } from "react-native";
import TR from "react-test-renderer";
import React from "react";

jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));

// Capture keyboard listeners so the test can "open" the keyboard.
const listeners = {};
beforeEach(() => {
  for (const k of Object.keys(listeners)) delete listeners[k];
  jest.spyOn(Keyboard, "addListener").mockImplementation((evt, fn) => { listeners[evt] = fn; return { remove: jest.fn() }; });
  jest.spyOn(Keyboard, "dismiss").mockImplementation(() => {});
  jest.spyOn(Animated, "timing").mockImplementation((value, cfg) => ({ start: (cb) => { value.setValue(cfg.toValue); cb && cb({ finished: true }); } }));
  jest.spyOn(Animated, "spring").mockImplementation((value, cfg) => ({ start: (cb) => { value.setValue(cfg.toValue); cb && cb({ finished: true }); } }));
});
afterEach(() => jest.restoreAllMocks());

const show = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
const hide = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
const flatStyle = (s) => Object.assign({}, ...[s].flat(5).filter(Boolean));
const numeric = (v) => (v && typeof v.__getValue === "function" ? v.__getValue() : v);

describe("BottomSheet + keyboard", () => {
  const BottomSheet = require("../ui/BottomSheet").default;
  const mount = async (props = {}) => {
    let tree;
    const onClose = jest.fn();
    await TR.act(async () => {
      tree = TR.create(
        React.createElement(BottomSheet, { visible: true, onClose, backgroundColor: "#fff", ...props }, React.createElement(Text, null, "content"))
      );
    });
    const modal = tree.root.findByType(Modal);
    await TR.act(async () => { modal.props.onShow?.(); });
    return { tree, onClose, modal };
  };
  const anchorPad = (tree) => {
    const st = tree.root.findAll((n) => n.props.style && flatStyle(n.props.style).justifyContent === "flex-end").map((n) => flatStyle(n.props.style))[0];
    return numeric(st.paddingBottom);
  };
  const sheetStyle = (tree) =>
    tree.root.findAll((n) => n.props.style && flatStyle(n.props.style).borderTopLeftRadius === 28).map((n) => flatStyle(n.props.style))[0];

  test("keyboard opens → sheet lifts by exactly the keyboard height and shrinks to fit; closes → back down", async () => {
    const { tree } = await mount();
    expect(anchorPad(tree)).toBe(0);
    const maxBefore = sheetStyle(tree).maxHeight;

    await TR.act(async () => { listeners[show]({ endCoordinates: { height: 336 }, duration: 250 }); });
    expect(anchorPad(tree)).toBe(336);
    expect(sheetStyle(tree).maxHeight).toBe(maxBefore - 336);
    expect(sheetStyle(tree).paddingBottom).toBe(12); // home-indicator padding not doubled under the keyboard

    await TR.act(async () => { listeners[hide]({ duration: 250 }); });
    expect(anchorPad(tree)).toBe(0);
    expect(sheetStyle(tree).paddingBottom).toBe(34 + 16);
    TR.act(() => tree.unmount());
  });

  test("tap outside and Android back both close (and hide the keyboard)", async () => {
    const { tree, onClose, modal } = await mount();
    const backdrop = tree.root.find((n) => n.props.accessibilityLabel === "Close" && typeof n.props.onPress === "function");
    await TR.act(async () => { backdrop.props.onPress(); });
    await TR.act(async () => { modal.props.onRequestClose(); });
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(Keyboard.dismiss).toHaveBeenCalled();
    TR.act(() => tree.unmount());
  });

  test("onOpened fires after the open animation; hiding plays the close animation then unmounts", async () => {
    const onOpened = jest.fn();
    let tree;
    await TR.act(async () => { tree = TR.create(React.createElement(BottomSheet, { visible: true, onClose: jest.fn(), onOpened }, React.createElement(Text, null, "x"))); });
    await TR.act(async () => { tree.root.findByType(Modal).props.onShow(); });
    expect(onOpened).toHaveBeenCalledTimes(1);
    await TR.act(async () => { tree.update(React.createElement(BottomSheet, { visible: false, onClose: jest.fn(), onOpened }, React.createElement(Text, null, "x"))); });
    expect(tree.root.findAllByType(Modal).length).toBe(0);
    TR.act(() => tree.unmount());
  });
});

describe("centred popups with inputs lift above the keyboard", () => {
  jest.doMock("@/context/ThemeContext", () => ({ useTheme: () => ({ colors: { card: "#fff", border: "#eee", text: "#111", textSecondary: "#666", primary: "#6366F1", placeholder: "#999", background: "#F9FAFB", primaryLight: "#E0E7FF" }, theme: "light" }) }));
  const overlayPad = (tree) => {
    const n = tree.root.findAll((x) => x.props.style && flatStyle(x.props.style).justifyContent === "center" && flatStyle(x.props.style).paddingTop !== undefined)[0];
    return numeric(flatStyle(n.props.style).paddingBottom);
  };
  test("New Notepad popup moves up by the keyboard height", async () => {
    const CreateNotepadModal = require("../Notepad/CreateNotepadModal").default;
    let tree;
    await TR.act(async () => { tree = TR.create(React.createElement(CreateNotepadModal, { isOpen: true, onConfirm: jest.fn(), onCancel: jest.fn(), creating: false })); });
    const before = overlayPad(tree);
    await TR.act(async () => { listeners[show]({ endCoordinates: { height: 300 } }); });
    expect(overlayPad(tree)).toBe(before + 300);
    await TR.act(async () => { listeners[hide]({}); });
    expect(overlayPad(tree)).toBe(before);
    TR.act(() => tree.unmount());
  });
});
