// Locks in the safe-area spacing math for the device classes we ship to.
// If someone changes the tab bar size, these numbers must be updated on purpose.
let mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => mockInsets,
}));

const {
  TAB_BAR_HEIGHT,
  tabBarBottomOffset,
  useTabBarLayout,
  useTabScreenBottomPadding,
  useBottomSpacing,
  useModalBackdropPadding,
} = require("../useSafeSpacing");

const DEVICES = {
  // iPhone 15 Pro: Dynamic Island + home indicator
  iphone: { top: 59, bottom: 34, left: 0, right: 0 },
  // Android, edge-to-edge with 3-button navigation
  android3Button: { top: 24, bottom: 48, left: 0, right: 0 },
  // Older Android / iPhone SE: no bottom inset at all
  noInset: { top: 20, bottom: 0, left: 0, right: 0 },
};

describe.each(Object.entries(DEVICES))("%s", (_name, insets) => {
  beforeEach(() => { mockInsets = insets; });

  test("tab screen content always clears the floating tab bar with room to spare", () => {
    const barTop = tabBarBottomOffset(insets) + TAB_BAR_HEIGHT;
    expect(useTabScreenBottomPadding()).toBeGreaterThanOrEqual(barTop + 24);
  });

  test("tab bar never sits inside the system gesture / nav area", () => {
    expect(useTabBarLayout().barBottom).toBeGreaterThanOrEqual(insets.bottom + 8);
  });

  test("stack screen / sticky footer padding includes the bottom inset", () => {
    expect(useBottomSpacing(16)).toBe(insets.bottom + 16);
  });

  test("modal backdrop keeps cards out of the notch and nav bar", () => {
    const p = useModalBackdropPadding(20);
    expect(p.paddingTop).toBe(insets.top + 20);
    expect(p.paddingBottom).toBe(insets.bottom + 20);
  });
});

test("iPhone numbers", () => {
  mockInsets = DEVICES.iphone;
  // Bar floats 14pt above the home indicator (34pt inset).
  expect(useTabBarLayout().barBottom).toBe(48);
  // 48 (bar bottom) + 58 (bar) + 32 (breathing room)
  expect(useTabScreenBottomPadding()).toBe(138);
});
