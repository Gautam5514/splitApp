import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Coins } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ui/Typography";

// Live coin balance pill. Hidden until the balance loads to avoid layout flicker.
export default function CoinBadge() {
    const { token } = useAuth();
    const [coins, setCoins] = useState(null);

    useEffect(() => {
        if (!token) {
            setCoins(null);
            return;
        }
        let alive = true;
        api
            .get("/referrals/me")
            .then((res) => alive && setCoins(res.data?.coins ?? 0))
            .catch(() => alive && setCoins(null));
        return () => {
            alive = false;
        };
    }, [token]);

    if (coins == null) return null;

    // Keep the pill compact: show big balances as 2.4k / 1.2M instead of 2450.
    const label =
        coins >= 1_000_000 ? `${(coins / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
        : coins >= 1_000 ? `${(coins / 1_000).toFixed(1).replace(/\.0$/, "")}k`
        : `${coins}`;

    return (
        <TouchableOpacity
            onPress={() => router.push("/(tabs)/profile")}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${coins} coins`}
        >
            <LinearGradient
                colors={["#FDE68A", "#F59E0B", "#D97706"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pill}
            >
                {/* Glossy coin chip */}
                <View style={styles.coinChip}>
                    <Coins size={12} color="#FFFFFF" strokeWidth={2.4} />
                </View>
                <Text style={styles.text}>{label}</Text>
            </LinearGradient>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    pill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingLeft: 4,
        paddingRight: 12,
        height: 32,
        borderRadius: 16,
        // Warm gold glow so it reads as "premium" without a hard border.
        shadowColor: "#D97706",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
    },
    coinChip: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.28)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.5)",
    },
    text: {
        fontSize: 13.5,
        fontWeight: "800",
        color: "#FFFFFF",
        letterSpacing: 0.2,
        textShadowColor: "rgba(120,53,15,0.35)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
    },
});
