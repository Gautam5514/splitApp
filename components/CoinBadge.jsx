import CoinIcon from "@/components/icons/CoinIcon";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";
import { TouchableOpacity } from "react-native";

// The coin in the Home header: just the icon, opens Refer & earn (where the
// balance is shown). No number here, so the header stays compact.
export default function CoinBadge({ size = 34 }) {
    const { token } = useAuth();
    if (!token) return null;

    return (
        <TouchableOpacity
            onPress={() => router.push("/rewards")}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel="Coins and rewards"
        >
            <CoinIcon size={size} />
        </TouchableOpacity>
    );
}
