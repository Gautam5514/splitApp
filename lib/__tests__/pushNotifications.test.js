// Covers the app-only push notification redesign (task #10): the Android
// notification channels lib/pushNotifications.js sets up client-side, which
// the backend (backend/controllers/notificationController.js) then routes
// pushes into via channelId. Also covers token sync/unregister.
//
// Platform.OS needs to differ per test (android vs. web), so each test uses
// jest.isolateModules + jest.doMock to get a fresh module instance with its
// own Platform mock rather than one shared, test-order-dependent import.

jest.mock("@/lib/api", () => ({ api: { post: jest.fn(), delete: jest.fn() } }));

const mockSetChannel = jest.fn(async () => {});
const mockGetPermissions = jest.fn(async () => ({ status: "granted" }));
const mockRequestPermissions = jest.fn(async () => ({ status: "granted" }));
const mockGetExpoPushToken = jest.fn(async () => ({ data: "ExponentPushToken[abc123]" }));
const mockSetHandler = jest.fn();

jest.mock("expo-notifications", () => ({
  setNotificationHandler: (...a) => mockSetHandler(...a),
  setNotificationChannelAsync: (...a) => mockSetChannel(...a),
  getPermissionsAsync: (...a) => mockGetPermissions(...a),
  requestPermissionsAsync: (...a) => mockRequestPermissions(...a),
  getExpoPushTokenAsync: (...a) => mockGetExpoPushToken(...a),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3 },
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: "test-project-id" } } } },
}));

const mockGetItem = jest.fn(async () => null);
const mockSetItem = jest.fn(async () => {});
const mockDeleteItem = jest.fn(async () => {});
jest.mock("expo-secure-store", () => ({
  getItemAsync: (...a) => mockGetItem(...a),
  setItemAsync: (...a) => mockSetItem(...a),
  deleteItemAsync: (...a) => mockDeleteItem(...a),
}));

// Both mocks are re-declared on every call (not just the one under test) so
// that no test can leak its `doMock` override into a later, unrelated test -
// `jest.doMock` registrations are NOT scoped by `isolateModules` (that only
// resets the module instance cache, not the mock-factory registry), so
// leaving either mock implicit here would make test order matter.
function loadModuleAsPlatform(os, { projectId = "test-project-id" } = {}) {
  let mod, api;
  jest.isolateModules(() => {
    jest.doMock("react-native", () => ({ Platform: { OS: os } }));
    jest.doMock("expo-constants", () => ({
      __esModule: true,
      default: { expoConfig: { extra: projectId ? { eas: { projectId } } : {} } },
    }));
    mod = require("../pushNotifications");
    // `isolateModules` gives this whole require tree - including the mocked
    // "@/lib/api" - its own fresh registry, so a `require("@/lib/api")` done
    // OUTSIDE this callback would return a different jest.fn() than the one
    // pushNotifications.js actually called. Grab it from inside instead.
    api = require("@/lib/api").api;
  });
  return { ...mod, api };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetPermissions.mockResolvedValue({ status: "granted" });
  mockRequestPermissions.mockResolvedValue({ status: "granted" });
  mockGetExpoPushToken.mockResolvedValue({ data: "ExponentPushToken[abc123]" });
  mockGetItem.mockResolvedValue(null);
});

describe("registerForPushNotificationsAsync - Android channel setup", () => {
  test("creates all 5 channels (alerts, expenses, settlements, groups, chat) with distinct config", async () => {
    const { registerForPushNotificationsAsync } = loadModuleAsPlatform("android");

    const token = await registerForPushNotificationsAsync();

    expect(token).toBe("ExponentPushToken[abc123]");
    const channelIds = mockSetChannel.mock.calls.map(([id]) => id);
    expect(channelIds).toEqual(["alerts", "expenses", "settlements", "groups", "chat"]);

    const byId = Object.fromEntries(mockSetChannel.mock.calls.map(([id, cfg]) => [id, cfg]));
    // Settlements are the highest-urgency category - money is on the line -
    // so they must use MAX importance, matching alerts.
    expect(byId.settlements.importance).toBe(5); // AndroidImportance.MAX
    expect(byId.expenses.importance).toBe(4); // HIGH
    expect(byId.groups.importance).toBe(3); // DEFAULT - least intrusive
    // Every channel routes through the same custom sound file the backend
    // expects to be audible (channelId dictates Android's actual sound choice).
    Object.values(byId).forEach((cfg) => expect(cfg.sound).toBe("notification.wav"));
  });

  test("does not touch Android channels on iOS or web", async () => {
    const ios = loadModuleAsPlatform("ios");
    await ios.registerForPushNotificationsAsync();
    expect(mockSetChannel).not.toHaveBeenCalled();

    jest.clearAllMocks();
    const web = loadModuleAsPlatform("web");
    const result = await web.registerForPushNotificationsAsync();
    expect(result).toBeNull();
    expect(mockSetChannel).not.toHaveBeenCalled();
    expect(mockGetPermissions).not.toHaveBeenCalled();
  });

  test("returns null and requests permission only when not already granted", async () => {
    mockGetPermissions.mockResolvedValueOnce({ status: "undetermined" });
    mockRequestPermissions.mockResolvedValueOnce({ status: "denied" });
    const { registerForPushNotificationsAsync } = loadModuleAsPlatform("android");

    const token = await registerForPushNotificationsAsync();

    expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
    expect(token).toBeNull();
  });

  test("skips the permission prompt entirely when already granted", async () => {
    const { registerForPushNotificationsAsync } = loadModuleAsPlatform("android");
    await registerForPushNotificationsAsync();
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  test("returns null when the EAS projectId is missing from app config", async () => {
    const { registerForPushNotificationsAsync } = loadModuleAsPlatform("android", { projectId: null });

    const token = await registerForPushNotificationsAsync();
    expect(token).toBeNull();
    expect(mockGetExpoPushToken).not.toHaveBeenCalled();
  });

  test("persists the token to SecureStore once obtained", async () => {
    const { registerForPushNotificationsAsync } = loadModuleAsPlatform("android");
    await registerForPushNotificationsAsync();
    expect(mockSetItem).toHaveBeenCalledWith("expo_push_token", "ExponentPushToken[abc123]");
  });
});

describe("syncPushTokenWithBackend", () => {
  test("posts the token + platform to the backend on first sync", async () => {
    const { syncPushTokenWithBackend, api } = loadModuleAsPlatform("android");

    await syncPushTokenWithBackend();

    expect(api.post).toHaveBeenCalledWith("/notifications/push-token", {
      expoPushToken: "ExponentPushToken[abc123]",
      platform: "android",
    });
    expect(mockSetItem).toHaveBeenCalledWith("expo_push_token_synced", "ExponentPushToken[abc123]");
  });

  test("skips the network call when this exact token was already synced", async () => {
    mockGetItem.mockImplementation(async (key) =>
      key === "expo_push_token_synced" ? "ExponentPushToken[abc123]" : null
    );
    const { syncPushTokenWithBackend, api } = loadModuleAsPlatform("android");

    await syncPushTokenWithBackend();

    expect(api.post).not.toHaveBeenCalled();
  });

  test("is a no-op on web", async () => {
    const { syncPushTokenWithBackend, api } = loadModuleAsPlatform("web");

    const result = await syncPushTokenWithBackend();
    expect(result).toBeNull();
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe("unregisterStoredPushToken (called on logout)", () => {
  test("deletes the token on the backend and clears both local keys", async () => {
    mockGetItem.mockResolvedValueOnce("ExponentPushToken[abc123]");
    const { unregisterStoredPushToken, api } = loadModuleAsPlatform("android");

    await unregisterStoredPushToken();

    expect(api.delete).toHaveBeenCalledWith("/notifications/push-token", {
      data: { expoPushToken: "ExponentPushToken[abc123]" },
    });
    expect(mockDeleteItem).toHaveBeenCalledWith("expo_push_token");
    expect(mockDeleteItem).toHaveBeenCalledWith("expo_push_token_synced");
  });

  test("still clears local keys even if the backend call fails (best-effort logout)", async () => {
    mockGetItem.mockResolvedValueOnce("ExponentPushToken[abc123]");
    const { unregisterStoredPushToken, api } = loadModuleAsPlatform("android");
    api.delete.mockRejectedValueOnce(new Error("network down"));

    await expect(unregisterStoredPushToken()).resolves.toBeUndefined();
    expect(mockDeleteItem).toHaveBeenCalledWith("expo_push_token");
  });

  test("does nothing when there's no stored token", async () => {
    mockGetItem.mockResolvedValueOnce(null);
    const { unregisterStoredPushToken, api } = loadModuleAsPlatform("android");

    await unregisterStoredPushToken();
    expect(api.delete).not.toHaveBeenCalled();
  });
});
