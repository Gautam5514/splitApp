import {
  Home, Plane, Briefcase, LayoutGrid,
  FileText, Utensils, Bus, BedDouble, ShoppingBag, CreditCard,
  KeyRound, ShoppingCart, Zap, Sofa, Ticket, Fuel, Handshake, Package,
} from "lucide-react-native";

// Keep keys in sync with backend/utils/groupPresets.js and frontend/lib/groupPresets.js.

export const GROUP_TYPES = {
  roommate: {
    key: "roommate",
    label: "Roommates",
    tagline: "Rent, bills, groceries - month after month",
    Icon: Home,
    icon: "home",
    accent: ["#F97316", "#C2410C"],
    palette: ["#FDBA74", "#F97316", "#C2410C"], // 3D tile: light, mid, dark
    glow: "rgba(249,115,22,0.45)",
    namePlaceholder: "e.g. Flat 302",
    suggestedName: "Our Flat",
    categories: ["rent", "groceries", "utilities", "household", "food", "general"],
  },
  trip: {
    key: "trip",
    label: "Trip",
    tagline: "Budget, dates and split-as-you-go",
    Icon: Plane,
    icon: "plane",
    accent: ["#3B82F6", "#4338CA"],
    palette: ["#7DD3FC", "#3B82F6", "#4338CA"], // 3D tile: light, mid, dark
    glow: "rgba(59,130,246,0.45)",
    namePlaceholder: "e.g. Goa Trip",
    suggestedName: null,
    categories: ["food", "travel", "stay", "activities", "shopping", "fuel", "general"],
  },
  business: {
    key: "business",
    label: "Business",
    tagline: "Partners, receipts and clean reports",
    Icon: Briefcase,
    icon: "briefcase",
    accent: ["#0D9488", "#134E4A"],
    palette: ["#5EEAD4", "#0D9488", "#134E4A"], // 3D tile: light, mid, dark
    glow: "rgba(13,148,136,0.45)",
    namePlaceholder: "e.g. Delhi Client Visit",
    suggestedName: null,
    categories: ["travel", "stay", "client", "supplies", "fuel", "food", "general"],
  },
  general: {
    key: "general",
    label: "Other",
    tagline: "Anything else you share",
    Icon: LayoutGrid,
    icon: null,
    accent: ["#C026D3", "#6B21A8"],
    palette: ["#F0ABFC", "#C026D3", "#6B21A8"], // 3D tile: light, mid, dark
    glow: "rgba(192,38,211,0.45)",
    namePlaceholder: "e.g. Office Lunch",
    suggestedName: null,
    categories: ["general", "food", "travel", "stay", "shopping", "bills"],
  },
};

export const PRIMARY_GROUP_TYPES = ["roommate", "trip", "business"];

export const groupTypeMeta = (type) => GROUP_TYPES[type] || GROUP_TYPES.general;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const suggestGroupName = (type) => {
  if (type === "trip") {
    const d = new Date();
    return `Trip - ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }
  return GROUP_TYPES[type]?.suggestedName || "";
};

export const CATEGORIES = {
  general: { label: "General", Icon: FileText },
  food: { label: "Food", Icon: Utensils },
  travel: { label: "Travel", Icon: Bus },
  stay: { label: "Stay", Icon: BedDouble },
  shopping: { label: "Shopping", Icon: ShoppingBag },
  bills: { label: "Bills", Icon: CreditCard },
  rent: { label: "Rent", Icon: KeyRound },
  groceries: { label: "Groceries", Icon: ShoppingCart },
  utilities: { label: "Utilities", Icon: Zap },
  household: { label: "Household", Icon: Sofa },
  activities: { label: "Activities", Icon: Ticket },
  fuel: { label: "Fuel", Icon: Fuel },
  client: { label: "Client", Icon: Handshake },
  supplies: { label: "Supplies", Icon: Package },
};

export const categoryMeta = (key) => CATEGORIES[key] || CATEGORIES.general;

export const categoriesForGroup = (group) => {
  const list = group?.settings?.categories?.length
    ? group.settings.categories
    : groupTypeMeta(group?.groupType).categories;
  return list.filter((c) => CATEGORIES[c]);
};

export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "THB", "SGD", "JPY", "AUD", "CAD", "NPR", "LKR", "MYR", "IDR", "VND"];

const SYMBOLS = { INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥" };

// "₹1,234" / "THB 1,234.50". Hermes' Intl support varies, so format by hand.
export const formatMoney = (amount, currency = "INR") => {
  const n = Number(amount);
  const v = Number.isFinite(n) ? n : 0;
  const abs = Math.abs(v);
  const decimals = currency === "INR" ? 0 : 2;
  const fixed = abs.toFixed(decimals);
  const [int, frac] = fixed.split(".");
  const grouped = currency === "INR"
    ? int.replace(/(\d)(?=(\d\d)+\d$)/g, "$1,")
    : int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sym = SYMBOLS[currency];
  const body = `${grouped}${frac && Number(frac) ? `.${frac}` : ""}`;
  return `${v < 0 ? "-" : ""}${sym ? sym : `${currency} `}${body}`;
};
