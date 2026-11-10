const mockStore = {};
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(async (k, v) => { mockStore[k] = v; }),
  getItem: jest.fn(async (k) => mockStore[k] ?? null),
  removeItem: jest.fn(async (k) => { delete mockStore[k]; }),
}));
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({ router: { replace: (...a) => mockReplace(...a) } }));

const { savePendingInvite, takePendingInvite, redirectAfterAuth } = require("../pendingInvite");

beforeEach(() => { for (const k of Object.keys(mockStore)) delete mockStore[k]; mockReplace.mockClear(); jest.useRealTimers(); });

test("an invite opened before sign-in brings the user back to it, once", async () => {
  await savePendingInvite("k7m 2qx");
  await redirectAfterAuth();
  expect(mockReplace).toHaveBeenCalledWith("/join/K7M2QX");
  mockReplace.mockClear();
  await redirectAfterAuth();
  expect(mockReplace).toHaveBeenCalledWith("/(tabs)/home");
});

test("an invite older than a day is forgotten", async () => {
  mockStore.pendingInvite = JSON.stringify({ code: "K7M2QX", at: Date.now() - 25 * 60 * 60 * 1000 });
  expect(await takePendingInvite()).toBeNull();
});

test("the old plain-string format still works", async () => {
  mockStore.pendingInvite = "K7M2QX";
  expect(await takePendingInvite()).toBe("K7M2QX");
});

test("junk is never stored", async () => {
  await savePendingInvite("<script>");
  expect(mockStore.pendingInvite).toBeUndefined();
});
