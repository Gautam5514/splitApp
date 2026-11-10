import { applyAccent, normalizeAccent } from "@/lib/accent";

const base = { primary: "#141414", onPrimary: "#FFFFFF", tint: "#141414", tabIconSelected: "#141414", primaryLight: "x", text: "#111" };
const amethyst = { key: "royal-amethyst", name: "Royal Amethyst", colors: { light: "#6D28D9", dark: "#A78BFA" } };

describe("accent themes", () => {
    test("accepts the server shape and the stored shape; rejects junk", () => {
        expect(normalizeAccent(amethyst)).toEqual({ key: "royal-amethyst", name: "Royal Amethyst", light: "#6D28D9", dark: "#A78BFA" });
        expect(normalizeAccent({ key: "k", light: "#000000", dark: "#ffffff" })).toEqual({ key: "k", name: "", light: "#000000", dark: "#ffffff" });
        expect(normalizeAccent(null)).toBeNull();
        expect(normalizeAccent({ key: "k", light: "red", dark: "#ffffff" })).toBeNull();
        expect(normalizeAccent({ light: "#000000", dark: "#ffffff" })).toBeNull();
    });

    test("no accent leaves the palette untouched", () => {
        expect(applyAccent(base, null, "light")).toBe(base);
        expect(applyAccent(base, { key: "bad" }, "dark")).toBe(base);
    });

    test("recolours only the ink, per mode, with readable text on it", () => {
        const light = applyAccent(base, amethyst, "light");
        expect(light).toMatchObject({ primary: "#6D28D9", tint: "#6D28D9", tabIconSelected: "#6D28D9", onPrimary: "#FFFFFF", primaryLight: "rgba(109,40,217,0.1)", text: "#111" });
        const dark = applyAccent(base, amethyst, "dark");
        expect(dark).toMatchObject({ primary: "#A78BFA", onPrimary: "#141414", primaryLight: "rgba(167,139,250,0.16)" });
    });
});
