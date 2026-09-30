// Smoke test: every main screen mounts with realistic API data and logs no
// React errors (missing styles, bad props, crashes). Keeps layout refactors safe.
const mockGroup = { _id: "g1", name: "Goa", members: [{ _id: "u1", name: "A", email: "a@x.com" }], createdBy: { _id: "u1" }, groupType: "trip" };
jest.mock("@/context/AuthContext", () => ({ useAuth: () => ({ logout: jest.fn(), token: "t", loading: false, user: { email: "a@x.com" } }) }));
jest.mock("@/context/NotificationContext", () => ({ useNotifications: () => ({ notifications: [], unreadCount: 0, markAllAsRead: jest.fn(), markAsRead: jest.fn(), refresh: jest.fn() }) }));
jest.mock("@/lib/api", () => {
  const get = jest.fn((url) => {
    if (url === "/groups") return Promise.resolve({ data: Array.from({ length: 5 }, (_, i) => ({
      _id: `g${i}`, name: `Trip ${i}`, icon: i % 2 ? "plane" : null, isCompleted: false, createdBy: { _id: "u1" },
      members: [{ _id: "u1", name: "A", email: "a@x.com" }, { _id: "u2", name: "B", email: "b@x.com", photoURL: "https://x/y.png" }],
    })) });
    if (url.startsWith("/groups/")) return Promise.resolve({ data: { _id: "g1", name: "Goa", members: [{ _id: "u1", name: "A", email: "a@x.com" }], createdBy: { _id: "u1" } } });
    if (url.startsWith("/expenses/settle")) return Promise.resolve({ data: [] });
    if (url.startsWith("/expenses/")) return Promise.resolve({ data: [] });
    if (url.startsWith("/balances/")) return Promise.resolve({ data: { balances: [], suggestions: [] } });
    if (url.startsWith("/notepads/")) return Promise.resolve({ data: [] });
    if (url === "/users/analytics") return Promise.resolve({ data: { monthlySummary: { totalSpent: 0 }, categoryBreakdown: [{ category: "food", amount: 10 }] } });
    if (url === "/referrals/me") return Promise.resolve({ data: { coins: 5, referralCode: "ABC", invited: [], unlockedItems: [], eliteClub: { tier: { name: "x", perks: [] }, allTiers: [], coinsToNext: 0 } } });
    return Promise.resolve({ data: { _id: "u1", name: "A", email: "a@x.com", items: [] } });
  });
  return { api: { get, post: jest.fn(() => Promise.resolve({ data: {} })), put: jest.fn(() => Promise.resolve({ data: {} })), delete: jest.fn(() => Promise.resolve({ data: {} })), defaults: { headers: { common: {} } } }, setAuthToken: jest.fn() };
});
jest.mock("@/lib/pushNotifications", () => ({ unregisterPushNotifications: jest.fn(async () => {}), registerForPushNotificationsAsync: jest.fn(async () => null) }));
jest.mock("expo-notifications", () => ({}));
jest.mock("firebase/auth", () => ({
  sendPasswordResetEmail: jest.fn(), signInWithEmailAndPassword: jest.fn(), signInWithCustomToken: jest.fn(),
  GoogleAuthProvider: { credential: jest.fn() }, signInWithCredential: jest.fn(), onAuthStateChanged: jest.fn(() => () => {}),
}));
jest.mock("@/lib/googleAuth", () => ({ useGoogleAuth: () => ({ signInWithGoogle: jest.fn(), loading: false, ready: true, promptAsync: jest.fn(), request: {} }) }));
jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: { configure: jest.fn(), hasPlayServices: jest.fn(), signIn: jest.fn(), signOut: jest.fn() },
  statusCodes: {}, isSuccessResponse: jest.fn(), isErrorWithCode: jest.fn(),
}), { virtual: true });
jest.mock("@/lib/homeScreenWidget", () => ({ syncBalanceWidget: jest.fn(async () => {}), promptAddBalanceWidget: jest.fn(async () => {}) }));
jest.mock("@/lib/firebaseClient", () => ({ auth: { currentUser: null } }));
jest.mock("@/lib/socket", () => { const s = { on: jest.fn(), off: jest.fn(), emit: jest.fn(), connected: true }; return { __esModule: true, default: s, connectSocket: jest.fn(() => s) }; });
jest.mock("expo-router", () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }), useLocalSearchParams: () => ({ id: "g1" }), useFocusEffect: jest.fn(), Link: ({ children }) => children }));
jest.mock("@react-navigation/native", () => ({ useIsFocused: () => true, useFocusEffect: jest.fn() }));
jest.mock("@react-native-async-storage/async-storage", () => ({ getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}), removeItem: jest.fn(async () => {}) }));
jest.mock("react-native-safe-area-context", () => { const { View } = require("react-native"); return { SafeAreaView: View, SafeAreaProvider: View, useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }; });
jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: { All: "All", Images: "Images" },
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true })),
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
}));
jest.mock("expo-blur", () => { const { View } = require("react-native"); return { BlurView: View }; });

const TR = require("react-test-renderer");
const React = require("react");
const SCREENS = {
  home: "../../app/(tabs)/home", profile: "../../app/(tabs)/profile", chat: "../../app/(tabs)/chat", trips: "../../app/(tabs)/trips",
  settings: "../../app/settings", profileEdit: "../../app/profile-edit", appearance: "../../app/appearance", rewards: "../../app/rewards",
  createGroup: "../../app/create-group", breakdown: "../../app/expense-breakdown", ai: "../../app/ai-chat",
  group: "../../app/groups/[id]", contact: "../../app/info/contact", help: "../../app/info/help-center", how: "../../app/info/how-it-works",
  pricing: "../../app/info/pricing", offer: "../../app/info/what-we-offer", terms: "../../app/info/terms", privacy: "../../app/info/privacy",
  login: "../../app/auth/login", register: "../../app/auth/register", onboarding: "../../app/onboarding", join: "../../app/join/[inviteCode]", contactInfo: "../../app/contact/[id]", modal: "../../app/modal",
};
test.each(Object.entries(SCREENS))("%s renders without errors", async (_n, path) => {
  const errors = [];
  const orig = console.error;
  console.error = (...a) => { const m = a.map((x) => (x && x.message) || String(x)).join(" "); if (!/act\(|not wrapped in act/.test(m)) errors.push(m); };
  let tree;
  try {
    const { ThemeProvider } = require("@/context/ThemeContext");
    const Screen = require(path).default;
    await TR.act(async () => { tree = TR.create(React.createElement(ThemeProvider, null, React.createElement(Screen))); });
    await TR.act(async () => { await new Promise((r) => setTimeout(r, 30)); });
  } catch (e) { errors.push("THROWN: " + (e.stack || e).toString().split("\n").slice(0, 4).join(" | ")); }
  console.error = orig;
  if (tree) TR.act(() => tree.unmount());
  expect(errors.slice(0, 3)).toEqual([]);
});
test.each(Object.entries(SCREENS))("%s renders without errors in DARK mode", async (_n, path) => {
  require("@react-native-async-storage/async-storage").getItem.mockImplementation(async (k) => (k === "user-theme" ? "dark" : null));
  const errors = [];
  const orig = console.error;
  console.error = (...a) => { const m = a.map((x) => (x && x.message) || String(x)).join(" "); if (!/act\(|not wrapped in act/.test(m)) errors.push(m); };
  let tree;
  try {
    const { ThemeProvider } = require("@/context/ThemeContext");
    const Screen = require(path).default;
    await TR.act(async () => { tree = TR.create(React.createElement(ThemeProvider, null, React.createElement(Screen))); });
    await TR.act(async () => { await new Promise((r) => setTimeout(r, 30)); });
  } catch (e) { errors.push("THROWN: " + (e.stack || e).toString().split("\n").slice(0, 4).join(" | ")); }
  console.error = orig;
  if (tree) TR.act(() => tree.unmount());
  require("@react-native-async-storage/async-storage").getItem.mockImplementation(async () => null);
  expect(errors.slice(0, 3)).toEqual([]);
});

test("home: minimal group rows — max 4 groups, no member-count/role tags, 3 faces + '+N' when >4 members", async () => {
  const api = require("@/lib/api").api;
  const members = Array.from({ length: 6 }, (_, i) => ({ _id: `m${i}`, name: `Member${i}`, email: `m${i}@x.com` }));
  api.get.mockImplementation((url) => {
    if (url === "/groups") return Promise.resolve({ data: Array.from({ length: 5 }, (_, i) => ({
      _id: `g${i}`, name: `Trip ${i}`, isCompleted: false, createdBy: { _id: "u1" },
      photo: i === 0 ? { url: "https://res.cloudinary.com/x/group.png" } : undefined,
      members: i === 1 ? members.slice(0, 4) : members,
    })) });
    return Promise.resolve({ data: { _id: "u1", name: "A", email: "a@x.com" } });
  });
  const { ThemeProvider } = require("@/context/ThemeContext");
  const Home = require("../../app/(tabs)/home").default;
  let tree;
  await TR.act(async () => { tree = TR.create(React.createElement(ThemeProvider, null, React.createElement(Home))); });
  await TR.act(async () => { await new Promise((r) => setTimeout(r, 30)); });
  const text = JSON.stringify(tree.toJSON());
  expect(text).toContain("Trip 0");
  expect(text).toContain("Trip 3");
  expect(text).not.toContain("Trip 4");           // capped at 4
  expect(text).toContain("View all");
  expect(text).not.toMatch(/\d+ members?\b/);     // no member-count tag
  expect(text).not.toContain("Admin");
  expect(text).not.toContain("\"Member\"");
  expect(text).toContain("+3");                   // 6 members -> 3 faces + "+3"
  expect(text).toContain("https://res.cloudinary.com/x/group.png"); // group photo used as avatar
  const openButtons = tree.root.findAll((n) => n.props.accessibilityLabel === "Open Trip 1" && n.props.onPress);
  expect(openButtons.length).toBeGreaterThanOrEqual(2); // row + arrow button
  TR.act(() => tree.unmount());
});

describe("floating tab bar", () => {
  jest.mock("expo-haptics", () => ({ selectionAsync: jest.fn(async () => {}) }));
  const make = (index) => ({
    state: { index, routes: [{ name: "home" }, { name: "trips" }, { name: "chat" }, { name: "profile" }] },
    navigation: { navigate: jest.fn() },
  });
  test.each(["light", "dark"])("renders AI orb, 3 tabs and '+' in %s mode, and navigates", async (mode) => {
    const { ThemeProvider } = require("@/context/ThemeContext");
    const { CustomTabBar } = require("../../app/(tabs)/_layout");
    const AsyncStorage = require("@react-native-async-storage/async-storage");
    AsyncStorage.getItem.mockImplementation(async (k) => (k === "user-theme" ? mode : null));
    const props = make(2); // chat active
    let tree;
    await TR.act(async () => {
      tree = TR.create(React.createElement(ThemeProvider, null, React.createElement(CustomTabBar, props)));
    });
    await TR.act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    // Theme-aware glass: dark smoked pill vs light frosted pill
    const pillBg = JSON.stringify(tree.toJSON()).includes(mode === "dark" ? "rgba(22,22,26,0.72)" : "rgba(255,255,255,0.78)");
    expect(pillBg).toBe(true);
    const byLabel = (l) => tree.root.find((n) => n.props.accessibilityLabel === l && typeof n.props.onPress === "function");
    for (const l of ["SplitEase AI assistant", "Home", "Chats", "Profile", "Trips and groups"]) expect(byLabel(l)).toBeTruthy();
    // Order: Home, Chats, AI, Profile, then Groups (+)
    const order = tree.root
      .findAll((n) => typeof n.props.onPress === "function" && n.props.accessibilityRole === "button" && typeof n.type !== "string")
      .map((n) => n.props.accessibilityLabel)
      .filter((l, i, arr) => l && arr.indexOf(l) === i);
    expect(order).toEqual(["Home", "Chats", "SplitEase AI assistant", "Profile", "Trips and groups"]);
    // AI uses the same button style as the tabs (no special gradient)
    expect(JSON.stringify(tree.toJSON())).not.toContain("ExpoLinearGradient");
    expect(byLabel("Chats").props.accessibilityState).toEqual({ selected: true });
    expect(byLabel("Home").props.accessibilityState).toEqual({ selected: false });
    await TR.act(async () => { byLabel("Profile").props.onPress(); });
    expect(props.navigation.navigate).toHaveBeenCalledWith("profile");
    await TR.act(async () => { byLabel("Trips and groups").props.onPress(); });
    expect(props.navigation.navigate).toHaveBeenCalledWith("trips");
    await TR.act(async () => { byLabel("SplitEase AI assistant").props.onPress(); });
    expect(require("expo-router").router.push).toHaveBeenCalledWith("/ai-chat");
    AsyncStorage.getItem.mockImplementation(async () => null);
    TR.act(() => tree.unmount());
  });
});

describe("Messages screen", () => {
  const setup = async (mode) => {
    const AsyncStorage = require("@react-native-async-storage/async-storage");
    AsyncStorage.getItem.mockImplementation(async (k) => (k === "user-theme" ? mode : null));
    const api = require("@/lib/api").api;
    api.get.mockImplementation((url) => {
      if (url === "/chat/my-contacts") return Promise.resolve({ data: { items: [
        { _id: "c1", name: "Jack King", email: "jack@x.com", lastMessage: "Type....", lastMessageAt: new Date().toISOString(), unread: 8 },
        { _id: "c2", name: "Michael", email: "mike@x.com", lastMessage: "Is the apartment still available?", lastMessageAt: new Date().toISOString(), unread: 0 },
      ] } });
      if (url === "/groups") return Promise.resolve({ data: [
        { _id: "g1", name: "Goa Trip", isCompleted: false, members: [{ _id: "u1", name: "A" }, { _id: "u2", name: "B" }] },
        { _id: "g2", name: "Old Flat", isCompleted: true, members: [{ _id: "u1", name: "A" }] },
      ] });
      return Promise.resolve({ data: {} });
    });
    const { ThemeProvider } = require("@/context/ThemeContext");
    const Chat = require("../../app/(tabs)/chat").default;
    let tree;
    await TR.act(async () => { tree = TR.create(React.createElement(ThemeProvider, null, React.createElement(Chat))); });
    await TR.act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    return { tree, AsyncStorage };
  };
  const { Text: RNText } = require("react-native");
  const flat = (c) => (Array.isArray(c) ? c.map(flat).join("") : typeof c === "string" || typeof c === "number" ? String(c) : "");
  const txt = (tree) => tree.root.findAllByType(RNText).map((n) => flat(n.props.children)).join(" | ");
  const press = async (tree, pred) => { const n = tree.root.find((x) => pred(x) && typeof x.props.onPress === "function"); await TR.act(async () => { n.props.onPress(); }); };

  test.each(["light", "dark"])("%s: header, rounded Chats/Groups pills, search + pen next to search", async (mode) => {
    const { tree, AsyncStorage } = await setup(mode);
    const t = txt(tree);
    for (const s of ["Messages", "Chats", "Groups", "Jack King", "Michael", "Type....", "8"]) expect(t).toContain(s);
    // Active pill ("Chats") uses the ink colour for the theme; inactive does not
    const ink = mode === "dark" ? "#FFFFFF" : "#141414";
    const tabs = tree.root.findAll((n) => n.props.accessibilityRole === "tab" && typeof n.props.onPress === "function");
    const styleOf = (n) => Object.assign({}, ...[n.props.style].flat(3).filter(Boolean));
    const chatsTab = tabs.find((n) => n.props.accessibilityState?.selected);
    expect(styleOf(chatsTab).backgroundColor).toBe(ink);
    expect(styleOf(chatsTab).borderRadius).toBe(19);
    // Both options live in ONE control inside the header, next to the "Messages" title
    const header = tree.root.findAll((n) => n.findAll((c) => c.props.children === "Messages").length > 0 && n.findAll((c) => c.props.accessibilityRole === "tablist").length > 0);
    expect(header.length).toBeGreaterThan(0);
    const tablist = tree.root.find((n) => n.props.accessibilityRole === "tablist");
    const tabLabels = tablist.findAll((n) => n.props.children === "Chats" || n.props.children === "Groups").map((n) => n.props.children);
    expect([...new Set(tabLabels)].sort()).toEqual(["Chats", "Groups"]);
    expect(tabs.some((n) => !n.props.accessibilityState?.selected && styleOf(n).backgroundColor !== ink)).toBe(true);
    // Round header actions exist
    expect(tree.root.findAll((n) => n.props.accessibilityLabel === "Start a new chat").length).toBeGreaterThan(0);
    // Only the pen (new chat) button in the header — no separate group button
    expect(tree.root.findAll((n) => n.props.accessibilityLabel === "Create a new group").length).toBe(0);

    // No filter button any more; the pen (new chat) sits right next to the search pill
    expect(tree.root.findAll((n) => /only$/.test(n.props.accessibilityLabel || "")).length).toBe(0);
    const searchRow = tree.root.findAll((n) => n.findAll((c) => c.props.accessibilityLabel === "Search chats").length > 0 && n.findAll((c) => c.props.accessibilityLabel === "Start a new chat").length > 0);
    expect(searchRow.length).toBeGreaterThan(0);

    // Search
    const input = tree.root.find((n) => n.props.accessibilityLabel === "Search chats" && n.props.onChangeText);
    await TR.act(async () => { input.props.onChangeText("mich"); });
    expect(txt(tree)).not.toContain("Jack King");
    expect(txt(tree)).toContain("Michael");
    await TR.act(async () => { input.props.onChangeText(""); });

    // Switch to Groups + active-only filter
    await press(tree, (n) => n.props.accessibilityRole === "tab" && !n.props.accessibilityState?.selected);
    expect(txt(tree)).toContain("Goa Trip");
    expect(txt(tree)).toContain("Old Flat"); // all groups listed (no hidden filter)

    AsyncStorage.getItem.mockImplementation(async () => null);
    TR.act(() => tree.unmount());
  });
});

describe("1:1 chat screen", () => {
  test("header has no call/video, ticks reflect sent/delivered/seen, live 'seen' turns ticks blue, send is optimistic", async () => {
    const api = require("@/lib/api").api;
    const socketMod = require("@/lib/socket").default;
    const handlers = {};
    socketMod.on.mockImplementation((ev, fn) => { handlers[ev] = fn; });
    const now = Date.now();
    const iso = (m) => new Date(now - m * 60000).toISOString();
    api.get.mockImplementation((url) => {
      if (url === "/users/me") return Promise.resolve({ data: { _id: "me", name: "Me" } });
      if (url.startsWith("/chat/messages/")) return Promise.resolve({ data: [
        { _id: "m1", conversationId: "cv", sender: "me", text: "Hi! Is it still available", createdAt: iso(60), seenBy: ["me", "f1"], deliveredTo: ["f1"] },
        { _id: "m2", conversationId: "cv", sender: "f1", text: "Yes, it's still available!", createdAt: iso(40), seenBy: ["f1"] },
        { _id: "m3", conversationId: "cv", sender: "me", text: "Delivered one", createdAt: iso(20), seenBy: ["me"], deliveredTo: ["f1"] },
        { _id: "m4", conversationId: "cv", sender: "me", text: "Sure", createdAt: iso(1), seenBy: ["me"], deliveredTo: [] },
      ] });
      return Promise.resolve({ data: {} });
    });
    let resolvePost;
    api.post.mockImplementation((url) => {
      if (url === "/chat/conversation") return Promise.resolve({ data: { _id: "cv" } });
      if (url === "/chat/message") return new Promise((r) => { resolvePost = r; });
      return Promise.resolve({ data: {} });
    });

    const { ThemeProvider } = require("@/context/ThemeContext");
    const ChatWindow = require("../../components/chat/ChatWindow").default;
    const friend = { _id: "f1", name: "Jack King", email: "jack@x.com", isOnline: true };
    let tree;
    await TR.act(async () => { tree = TR.create(React.createElement(ThemeProvider, null, React.createElement(ChatWindow, { activeFriend: friend, onBack: jest.fn() }))); });
    await TR.act(async () => { await new Promise((r) => setTimeout(r, 30)); });

    const labels = () => tree.root.findAll((n) => typeof n.props.accessibilityLabel === "string").map((n) => n.props.accessibilityLabel);
    const all = labels().join("|");
    expect(all).not.toMatch(/\bcall\b|video call|voice call/i);
    expect(tree.root.findAll((n) => n.props.children === "Online").length).toBeGreaterThan(0);
    expect(all).toContain("Seen");
    expect(all).toContain("Delivered");
    expect(all).toContain("Sent");

    // Friend opens the chat → server emits messagesSeen → everything of mine turns blue
    await TR.act(async () => { handlers.messagesSeen({ conversationId: "cv", seenBy: "f1" }); });
    const after = labels();
    expect(after.filter((l) => l === "Sent" || l === "Delivered").length).toBe(0);
    expect(after.filter((l) => l === "Seen").length).toBeGreaterThanOrEqual(2);

    // Optimistic send: clock appears before the server answers, then single tick
    const input = tree.root.find((n) => n.props.accessibilityLabel === "Message" && n.props.onChangeText);
    await TR.act(async () => { input.props.onChangeText("New one"); });
    const send = tree.root.find((n) => n.props.accessibilityLabel === "Send message" && typeof n.props.onPress === "function");
    await TR.act(async () => { send.props.onPress(); });
    expect(labels()).toContain("Sending");
    await TR.act(async () => { resolvePost({ data: { data: { _id: "m5", conversationId: "cv", sender: "me", text: "New one", createdAt: new Date().toISOString(), seenBy: ["me"], deliveredTo: [] } } }); });
    expect(labels()).not.toContain("Sending");
    expect(labels()).toContain("Sent");

    // Ticks + time live INSIDE the bubble (WhatsApp style), not below it
    const Bubble = require("../../components/chat/Bubble").default;
    const MessageTicks = require("../../components/chat/MessageStatus").default;
    const bubbles = tree.root.findAllByType(Bubble);
    expect(bubbles.length).toBe(5);
    const mineBubbles = bubbles.filter((b) => b.props.status);
    expect(mineBubbles.length).toBe(4);
    for (const b of mineBubbles) expect(b.findAllByType(MessageTicks).length).toBe(1);
    expect(tree.root.findAllByType(MessageTicks).length).toBe(4); // none outside bubbles

    // Camera: take a photo → preview → send uploads it
    const picker = require("expo-image-picker");
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true });
    picker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [{ uri: "file:///photo.jpg", fileName: "IMG_1.jpg" }] });
    global.fetch = jest.fn(async () => ({ blob: async () => ({ type: "image/jpeg" }) }));
    global.FileReader = class { readAsDataURL() { this.result = "data:image/jpeg;base64,AAAA"; setTimeout(() => this.onloadend && this.onloadend(), 0); } };
    const cam = tree.root.find((n) => n.props.accessibilityLabel === "Take a photo" && typeof n.props.onPress === "function");
    await TR.act(async () => { await cam.props.onPress(); });
    expect(picker.launchCameraAsync).toHaveBeenCalled();
    expect(tree.root.findAll((n) => n.props.children === "IMG_1.jpg").length).toBeGreaterThan(0);
    const send2 = tree.root.find((n) => n.props.accessibilityLabel === "Send message" && typeof n.props.onPress === "function");
    await TR.act(async () => { send2.props.onPress(); });
    await TR.act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    const lastCall = api.post.mock.calls.filter((c) => c[0] === "/chat/message").pop();
    expect(lastCall[1].file).toMatch(/^data:image\/jpeg;base64,/);

    socketMod.on.mockImplementation(() => {});
    TR.act(() => tree.unmount());
  });

  test("camera permission denied → friendly alert, nothing attached", async () => {
    const picker = require("expo-image-picker");
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    picker.launchCameraAsync.mockClear();
    const AlertMod = require("@/lib/alert").default;
    const alertSpy = jest.spyOn(AlertMod, "alert").mockImplementation(() => {});
    const { ThemeProvider } = require("@/context/ThemeContext");
    const ChatInput = require("../../components/chat/ChatInput").default;
    let tree;
    await TR.act(async () => { tree = TR.create(React.createElement(ThemeProvider, null, React.createElement(ChatInput, { conversationId: "cv", meId: "me", onSend: jest.fn() }))); });
    const cam = tree.root.find((n) => n.props.accessibilityLabel === "Take a photo" && typeof n.props.onPress === "function");
    await TR.act(async () => { await cam.props.onPress(); });
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith("Camera access needed", expect.any(String), expect.any(Array));
    alertSpy.mockRestore();
    TR.act(() => tree.unmount());
  });
});

describe("contact info page", () => {
  test("shows stats, shared media (+N), info and groups in common; tile opens viewer; group opens group", async () => {
    const api = require("@/lib/api").api;
    const router = require("expo-router");
    router.useLocalSearchParams = () => ({ id: "f1", conversationId: "cv", name: "Khadija", imageUrl: "https://x/k.jpg", isOnline: "true" });
    const media = Array.from({ length: 6 }, (_, i) => ({ _id: `md${i}`, url: `https://res.cloudinary.com/demo/image/upload/p${i}.jpg`, type: i === 1 ? "video" : "image" }));
    api.get.mockImplementation((url) => {
      if (url === "/chat/contact/f1") return Promise.resolve({ data: { _id: "f1", name: "Khadija Dubois", email: "k@x.com", mobile: "+12-6541-1234", city: "Paris", memberSince: "2025-02-01T00:00:00Z" } });
      if (url === "/chat/conversation/cv/summary") return Promise.resolve({ data: { messageCount: 12145, mediaCount: 45, media, commonGroups: [{ _id: "g1", name: "Goa Trip", memberCount: 4 }] } });
      return Promise.resolve({ data: {} });
    });
    const { ThemeProvider } = require("@/context/ThemeContext");
    const Page = require("../../app/contact/[id]").default;
    let tree;
    await TR.act(async () => { tree = TR.create(React.createElement(ThemeProvider, null, React.createElement(Page))); });
    await TR.act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    const { Text: RNText } = require("react-native");
    const flat = (c) => (Array.isArray(c) ? c.map(flat).join("") : typeof c === "string" || typeof c === "number" ? String(c) : "");
    const text = tree.root.findAllByType(RNText).map((n) => flat(n.props.children)).join(" | ");
    for (const s of ["Khadija Dubois", "+12-6541-1234", "Messages", "12,145", "Media", "45", "Media and photos", "+42", "Paris", "1 group in common", "Goa Trip"]) {
      expect(text).toContain(s);
    }
    const byLabel = (l) => tree.root.findAll((n) => n.props.accessibilityLabel === l && typeof n.props.onPress === "function")[0];
    await TR.act(async () => { byLabel("Photo").props.onPress(); });
    const { Modal } = require("react-native");
    expect(tree.root.findAllByType(Modal).some((m) => m.props.visible && m.props.transparent)).toBe(true);
    await TR.act(async () => { byLabel("Close photo").props.onPress(); });
    await TR.act(async () => { byLabel("Open Goa Trip").props.onPress(); });
    expect(router.router.push).toHaveBeenCalledWith({ pathname: "/groups/[id]", params: { id: "g1" } });
    TR.act(() => tree.unmount());
    router.useLocalSearchParams = () => ({ id: "g1" });
  });

  test("tapping the friend's photo/name in the chat header opens their contact page", async () => {
    const api = require("@/lib/api").api;
    const router = require("expo-router");
    api.get.mockImplementation((url) => Promise.resolve({ data: url === "/users/me" ? { _id: "me" } : [] }));
    api.post.mockImplementation((url) => Promise.resolve({ data: url === "/chat/conversation" ? { _id: "cv" } : {} }));
    const { ThemeProvider } = require("@/context/ThemeContext");
    const ChatWindow = require("../../components/chat/ChatWindow").default;
    let tree;
    await TR.act(async () => { tree = TR.create(React.createElement(ThemeProvider, null, React.createElement(ChatWindow, { activeFriend: { _id: "f1", name: "Jack", email: "j@x.com" }, onBack: jest.fn() }))); });
    await TR.act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    router.router.push.mockClear();
    const tap = tree.root.find((n) => n.props.accessibilityLabel === "View Jack's info" && typeof n.props.onPress === "function");
    await TR.act(async () => { tap.props.onPress(); });
    expect(router.router.push).toHaveBeenCalledWith(expect.objectContaining({ pathname: "/contact/[id]", params: expect.objectContaining({ id: "f1", conversationId: "cv" }) }));
    TR.act(() => tree.unmount());
  });
});

describe("New chat sheet (pen icon on Messages)", () => {
  const { Text: RNText } = require("react-native");
  const flat = (c) => (Array.isArray(c) ? c.map(flat).join("") : typeof c === "string" || typeof c === "number" ? String(c) : "");
  const txt = (tree) => tree.root.findAllByType(RNText).map((n) => flat(n.props.children)).join(" | ");
  const mount = async () => {
    const { ThemeProvider } = require("@/context/ThemeContext");
    const NewChatModal = require("../../components/chat/NewChatModal").default;
    const onClose = jest.fn();
    let tree;
    await TR.act(async () => { tree = TR.create(React.createElement(ThemeProvider, null, React.createElement(NewChatModal, { visible: true, onClose }))); });
    const input = tree.root.find((n) => n.props.accessibilityLabel === "Name or email" && n.props.onChangeText);
    const type = async (v) => { await TR.act(async () => { input.props.onChangeText(v); }); await TR.act(async () => { await new Promise((r) => setTimeout(r, 350)); }); };
    const btn = (l) => tree.root.findAll((n) => n.props.accessibilityLabel === l && typeof n.props.onPress === "function")[0];
    return { tree, onClose, type, btn };
  };

  test("pen button on Messages opens it", async () => {
    const { ThemeProvider } = require("@/context/ThemeContext");
    const Chat = require("../../app/(tabs)/chat").default;
    let tree;
    await TR.act(async () => { tree = TR.create(React.createElement(ThemeProvider, null, React.createElement(Chat))); });
    const pen = tree.root.find((n) => n.props.accessibilityLabel === "Start a new chat" && typeof n.props.onPress === "function");
    await TR.act(async () => { pen.props.onPress(); });
    const { Modal } = require("react-native");
    expect(tree.root.findAllByType(Modal).some((m) => m.props.visible && txt(tree).includes("New chat"))).toBe(true);
    TR.act(() => tree.unmount());
  });

  test("typing a name shows people; tapping one opens the chat", async () => {
    const api = require("@/lib/api").api;
    api.get.mockImplementation((url, cfg) => Promise.resolve({ data: { items: url === "/users" && cfg?.params?.q === "jac" ? [{ _id: "u9", name: "Jack King", email: "jack@x.com" }] : [] } }));
    const router = require("expo-router").router;
    router.push.mockClear();
    const { tree, onClose, type, btn } = await mount();
    await type("jac");
    expect(txt(tree)).toContain("Jack King");
    await TR.act(async () => { btn("Chat with Jack King").props.onPress(); });
    expect(onClose).toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith(expect.objectContaining({ pathname: "/chat/[id]", params: expect.objectContaining({ id: "u9", email: "jack@x.com" }) }));
    TR.act(() => tree.unmount());
  });

  test("full email → Start chat; unknown email → invite instead", async () => {
    const api = require("@/lib/api").api;
    api.get.mockImplementation((url, cfg) => Promise.resolve({ data: { items: cfg?.params?.q === "mike@x.com" ? [{ _id: "u2", name: "Mike", email: "mike@x.com" }] : [] } }));
    const router = require("expo-router").router;
    router.push.mockClear();
    let m = await mount();
    expect(m.btn("Start chat").props.disabled).toBe(true); // nothing typed yet
    await m.type("mike@x.com");
    expect(m.btn("Start chat").props.disabled).toBe(false);
    await TR.act(async () => { await m.btn("Start chat").props.onPress(); });
    expect(router.push).toHaveBeenCalledWith(expect.objectContaining({ params: expect.objectContaining({ id: "u2" }) }));
    TR.act(() => m.tree.unmount());

    m = await mount();
    await m.type("ghost@x.com");
    await TR.act(async () => { await m.btn("Start chat").props.onPress(); });
    expect(txt(m.tree)).toContain("ghost@x.com isn't on SplitEase yet");
    const { Share } = require("react-native");
    const shareSpy = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" });
    await TR.act(async () => { await m.btn("Invite to SplitEase").props.onPress(); });
    expect(shareSpy).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("SplitEase") }));
    shareSpy.mockRestore();
    TR.act(() => m.tree.unmount());
  });
});

describe("AI screen", () => {
  const { Text: RNText } = require("react-native");
  // walks nested elements too (AI answers are rich Markdown text)
  const flat = (c) => (Array.isArray(c) ? c.map(flat).join("") : typeof c === "string" || typeof c === "number" ? String(c) : c && c.props ? flat(c.props.children) : "");
  const txt = (tree) => tree.root.findAllByType(RNText).map((n) => flat(n.props.children)).join(" | ");
  const btn = (tree, l) => tree.root.findAll((n) => n.props.accessibilityLabel === l && typeof n.props.onPress === "function")[0];

  test("home = big 3D logo + chips + ready prompts + history; prompt asks AI with context; history saved and filterable", async () => {
    const AsyncStorage = require("@react-native-async-storage/async-storage");
    const store = {};
    AsyncStorage.getItem.mockImplementation(async (k) => store[k] ?? null);
    AsyncStorage.setItem.mockImplementation(async (k, v) => { store[k] = v; });
    const api = require("@/lib/api").api;
    api.get.mockImplementation(() => Promise.resolve({ data: { name: "Gautam Pandit" } }));
    api.post.mockImplementation(() => Promise.resolve({ data: { text: "Rahul owes you ₹500.", provider: "smart" } }));

    const { ThemeProvider } = require("@/context/ThemeContext");
    const Ai = require("../../app/ai-chat").default;
    const AI3DLogo = require("../../components/icons/AI3DLogo").default;
    let tree;
    await TR.act(async () => { tree = TR.create(React.createElement(ThemeProvider, null, React.createElement(Ai))); });
    await TR.act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    const t0 = txt(tree);
    // No greeting / no 4 cards any more
    expect(t0).not.toMatch(/Good (morning|afternoon|evening)|How can I help you/);
    expect(t0).not.toContain("Who owes whom");
    // One big 3D logo on the home
    expect(tree.root.findAllByType(AI3DLogo).some((n) => n.props.size >= 140)).toBe(true);
    for (const s of ["All", "Balances", "Spending", "Trips", "General", "History"]) expect(t0).toContain(s);
    // "All" shows 4 ready prompts (one per category); Balances shows its 3
    const askLabels = () => [...new Set(tree.root.findAll((n) => (n.props.accessibilityLabel || "").startsWith("Ask: ") && typeof n.props.onPress === "function").map((n) => n.props.accessibilityLabel))];
    expect(askLabels().length).toBe(4);
    const tabOf = (label) => tree.root.findAll((n) => n.props.accessibilityRole === "tab" && typeof n.props.onPress === "function").find((n) => n.findAll((c) => c.props.children === label).length);
    await TR.act(async () => { tabOf("Balances").props.onPress(); });
    expect(askLabels().length).toBe(3);
    const prompts = tree.root.findAll((n) => (n.props.accessibilityLabel || "").startsWith("Ask: ") && typeof n.props.onPress === "function");

    const askLabel = prompts[0].props.accessibilityLabel;
    const question = askLabel.replace(/^Ask: /, "");
    await TR.act(async () => { await prompts[0].props.onPress(); });
    const [, body] = api.post.mock.calls.pop();
    expect(body).toMatchObject({ prompt: question, provider: "gemini", history: [] });
    expect(txt(tree)).toContain("Rahul owes you ₹500.");
    expect(txt(tree)).toContain("SplitEase AI"); // AI turn header (name + time)
    expect(JSON.parse(store["ai-history-v1"])[0]).toMatchObject({ text: question, category: "balances" });

    // Follow-up sends the previous turns as context
    const input = tree.root.find((n) => n.props.accessibilityLabel === "Message SplitEase AI" && n.props.onChangeText);
    await TR.act(async () => { input.props.onChangeText("And in the Goa group?"); });
    await TR.act(async () => { await btn(tree, "Send").props.onPress(); });
    const [, body2] = api.post.mock.calls.pop();
    expect(body2.history).toEqual([
      { role: "user", content: question },
      { role: "ai", content: "Rahul owes you ₹500." },
    ]);

    // New chat → back to the home with history listed
    await TR.act(async () => { btn(tree, "New chat").props.onPress(); });
    expect(tree.root.findAll((n) => n.props.accessibilityLabel === `Ask again: ${question}`).length).toBeGreaterThan(0);
    const tabs = tree.root.findAll((n) => n.props.accessibilityRole === "tab" && typeof n.props.onPress === "function");
    const spendingTab = tabs.find((n) => n.findAll((c) => c.props.children === "Spending").length);
    await TR.act(async () => { spendingTab.props.onPress(); });
    expect(tree.root.findAll((n) => n.props.accessibilityLabel === `Ask again: ${question}`).length).toBe(0);
    await TR.act(async () => { btn(tree, "Clear history").props.onPress(); });
    expect(txt(tree)).toContain("Your recent questions will show up here");

    AsyncStorage.getItem.mockImplementation(async () => null);
    TR.act(() => tree.unmount());
  });
});

test("AI answer with markdown renders formatted (no raw ** on screen)", async () => {
  const AsyncStorage = require("@react-native-async-storage/async-storage");
  AsyncStorage.getItem.mockImplementation(async () => null);
  const api = require("@/lib/api").api;
  api.get.mockImplementation(() => Promise.resolve({ data: { name: "Gautam" } }));
  api.post.mockImplementation(() => Promise.resolve({ data: { text: "**Rahul** owes you **₹500**.\n\n- **Goa**: ₹1,200\n- Bhopal: ₹0", provider: "gemini" } }));
  const { ThemeProvider } = require("@/context/ThemeContext");
  const Ai = require("../../app/ai-chat").default;
  let tree;
  await TR.act(async () => { tree = TR.create(React.createElement(ThemeProvider, null, React.createElement(Ai))); });
  const card = tree.root.findAll((n) => n.props.accessibilityLabel === "Settle up" && typeof n.props.onPress === "function")[0];
  await TR.act(async () => { await card.props.onPress(); });
  const { Text: RNText } = require("react-native");
  const leaves = tree.root.findAllByType(RNText).map((n) => n.props.children).flat(5).filter((c) => typeof c === "string");
  expect(leaves.join("")).not.toContain("**");
  expect(leaves).toContain("Rahul");
  expect(leaves.join(" ")).toMatch(/·\s*Gemini/);
  TR.act(() => tree.unmount());
});

describe("AI loading + 3D logo buttons", () => {
  test("while waiting: animated 3D thinking state with dots and elapsed time; gone when the answer arrives", async () => {
    jest.useFakeTimers();
    const AsyncStorage = require("@react-native-async-storage/async-storage");
    AsyncStorage.getItem.mockImplementation(async () => null);
    const api = require("@/lib/api").api;
    api.get.mockImplementation(() => Promise.resolve({ data: { name: "G" } }));
    let answer;
    api.post.mockImplementation(() => new Promise((r) => { answer = r; }));
    const { ThemeProvider } = require("@/context/ThemeContext");
    const Ai = require("../../app/ai-chat").default;
    let tree;
    await TR.act(async () => { tree = TR.create(React.createElement(ThemeProvider, null, React.createElement(Ai))); });
    const card = tree.root.findAll((n) => (n.props.accessibilityLabel || "").startsWith("Ask: ") && typeof n.props.onPress === "function")[0];
    await TR.act(async () => { card.props.onPress(); });
    const thinking = () => tree.root.findAll((n) => n.props.accessibilityLabel === "SplitEase AI is thinking");
    expect(thinking().length).toBeGreaterThan(0);
    const { Text: RNText } = require("react-native");
    const texts = () => tree.root.findAllByType(RNText).map((n) => [].concat(n.props.children).join("")).join("|");
    expect(texts()).toContain("Thinking…");
    await TR.act(async () => { jest.advanceTimersByTime(5000); });
    expect(texts()).toMatch(/5s/);
    expect(texts()).toContain("Crunching your numbers…");
    await TR.act(async () => { answer({ data: { text: "You spent ₹900.", provider: "smart" } }); });
    expect(thinking().length).toBe(0);
    jest.useRealTimers();
    TR.act(() => tree.unmount());
  });

  test("tab bar AI button is the 3D logo, same 48pt circle as the other buttons", async () => {
    const { ThemeProvider } = require("@/context/ThemeContext");
    const { CustomTabBar } = require("../../app/(tabs)/_layout");
    const AI3DLogo = require("../../components/icons/AI3DLogo").default;
    let tree;
    await TR.act(async () => {
      tree = TR.create(React.createElement(ThemeProvider, null, React.createElement(CustomTabBar, {
        state: { index: 0, routes: [{ name: "home" }, { name: "trips" }, { name: "chat" }, { name: "profile" }] },
        navigation: { navigate: jest.fn() },
      })));
    });
    const { StyleSheet } = require("react-native");
    const ai = tree.root.findAll((n) => n.props.accessibilityLabel === "SplitEase AI assistant" && typeof n.props.onPress === "function")[0];
    const home = tree.root.findAll((n) => n.props.accessibilityLabel === "Home" && typeof n.props.onPress === "function")[0];
    expect(ai.findAllByType(AI3DLogo).length).toBe(1);
    const size = (n) => { const s = StyleSheet.flatten(n.props.style); return [s.width, s.height, s.borderRadius]; };
    expect(size(ai)).toEqual(size(home));
    TR.act(() => tree.unmount());
  });
});
