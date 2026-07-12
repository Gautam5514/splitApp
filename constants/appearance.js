// Display catalog for the in-app theme store. Item ids and costs must stay in
// sync with backend/config/storeConfig.js — the server is the source of truth
// for prices and always re-validates them on purchase.

// Free accent colors. `primary` is used in light mode, `primaryDark` is the
// brighter variant used in dark mode (matching the stock indigo pairing).
export const ACCENT_PRESETS = [
    { id: "default", name: "Default Indigo", primary: "#6366F1", primaryDark: "#818CF8" },
    { id: "emerald-zen", name: "Emerald Zen", primary: "#10B981", primaryDark: "#34D399" },
    { id: "midnight-nebula", name: "Midnight Nebula", primary: "#D946EF", primaryDark: "#E879F9" },
    { id: "sunset-glow", name: "Sunset Glow", primary: "#F97316", primaryDark: "#FB923C" },
    { id: "ocean-frost", name: "Ocean Frost", primary: "#06B6D4", primaryDark: "#22D3EE" },
    { id: "rose-bloom", name: "Rose Bloom", primary: "#F43F5E", primaryDark: "#FB7185" },
];

// Premium dark palettes bought once with coins (owned forever). Applying one
// switches the app to dark mode; in light mode only its accent carries over.
export const PREMIUM_THEMES = [
    { id: "glass", name: "Aurora Glass", desc: "Frosted glass over deep night blue", cost: 1000, primary: "#38BDF8", bg: "#060A14", card: "rgba(255,255,255,0.07)", border: "rgba(255,255,255,0.16)" },
    { id: "midnight-black", name: "Midnight Black", desc: "Pure black, cyan accents", cost: 200, primary: "#22D3EE", bg: "#030303", card: "#111111", border: "#27272A" },
    { id: "royal-amethyst", name: "Royal Amethyst", desc: "Deep violet, regal glow", cost: 450, primary: "#A855F7", bg: "#0B0613", card: "#160D24", border: "#2C1B45" },
    { id: "emerald-noir", name: "Emerald Noir", desc: "Dark forest, mint accents", cost: 550, primary: "#34D399", bg: "#04120C", card: "#0B2015", border: "#16382A" },
    { id: "crimson-velvet", name: "Crimson Velvet", desc: "Moody red, velvet depth", cost: 600, primary: "#FB7185", bg: "#140408", card: "#220A10", border: "#3D1520" },
    { id: "aurum-gold", name: "Aurum Gold", desc: "Black and gold, pure luxury", cost: 700, primary: "#F59E0B", bg: "#100C02", card: "#1D1607", border: "#38290E" },
];

// Premium fonts. Purchases unlock account-wide; today they render on the
// SplitEase web app (the mobile app does not bundle these font files yet).
export const STORE_FONTS = [
    { id: "poppins", name: "Poppins", desc: "Rounded & friendly", cost: 100 },
    { id: "nunito", name: "Nunito", desc: "Soft & highly readable", cost: 100 },
    { id: "dm-sans", name: "DM Sans", desc: "Minimal & geometric", cost: 120 },
    { id: "jakarta", name: "Plus Jakarta Sans", desc: "Premium & professional", cost: 150 },
    { id: "outfit", name: "Outfit", desc: "Bold & contemporary", cost: 150 },
];
