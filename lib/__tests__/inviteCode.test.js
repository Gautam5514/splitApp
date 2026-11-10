import { appShareLink, normalizeInviteCode, parseScannedInvite, qrLink } from "../inviteCode";

describe("normalizeInviteCode", () => {
  test.each([
    ["K7M2QX", "K7M2QX"],
    ["k7m 2qx", "K7M2QX"],
    ["K7M-2QX", "K7M2QX"],
    ["https://split.elitecrew.online/join/K7M2QX", "K7M2QX"],
    ["splitapp://join/k7m2qx", "K7M2QX"],
    ['Join "Goa" on SplitEase to split expenses. Code: K7M2QX - or tap: https://split.elitecrew.online/join/K7M2QX', "K7M2QX"],
    ["https://split.elitecrew.online/join?code=K7M2QX", "K7M2QX"],
    ["7f39dc25c3109b3bc1446ae89ba181e1", "7f39dc25c3109b3bc1446ae89ba181e1"], // old long codes still work
  ])("%s -> %s", (input, out) => expect(normalizeInviteCode(input)).toBe(out));

  test.each(["", "   ", "hello", "K7M2Q", "<script>"])("rejects %p", (input) => expect(normalizeInviteCode(input)).toBe(""));
});


describe("parseScannedInvite (QR scanner)", () => {
  test.each([
    ["https://split.elitecrew.online/join/K7M2QX?via=qr", "K7M2QX"],
    ["https://split.elitecrew.online/join/k7m2qx", "K7M2QX"],
    ["splitapp://join/K7M2QX", "K7M2QX"],
    ["K7M2QX", "K7M2QX"],
    ["https://staging.example.com/join/K7M2QX", "K7M2QX", ["staging.example.com"]],
  ])("%s -> %s", (data, code, hosts = []) => expect(parseScannedInvite(data, hosts)).toEqual({ code }));

  test.each([
    "",
    "https://evil.example.com/join/K7M2QX", // someone else's site: refused, not guessed
    "https://split.elitecrew.online/dashboard",
    "upi://pay?pa=someone@okaxis",
    "WIFI:S:home;T:WPA;P:secret;;",
    "splitapp://auth",
  ])("refuses %p", (data) => expect(parseScannedInvite(data).error).toBeTruthy());
});

describe("share links", () => {
  const withLinks = { inviteCode: "K7M2QX", joinLink: "https://split.elitecrew.online/join/K7M2QX",
    links: { app: "https://split.elitecrew.online/join/K7M2QX?via=app", qr: "https://split.elitecrew.online/join/K7M2QX?via=qr" } };
  test("uses the API's ready-made links", () => {
    expect(appShareLink(withLinks)).toBe(withLinks.links.app);
    expect(qrLink(withLinks)).toBe(withLinks.links.qr);
  });
  test("works with an older API that only sends joinLink, or only the code", () => {
    expect(appShareLink({ joinLink: "https://split.elitecrew.online/join/K7M2QX" })).toBe("https://split.elitecrew.online/join/K7M2QX?via=app");
    expect(qrLink({ inviteCode: "K7M2QX" }, "https://split.elitecrew.online")).toBe("https://split.elitecrew.online/join/K7M2QX?via=qr");
    expect(appShareLink(null)).toBe("");
  });
});
