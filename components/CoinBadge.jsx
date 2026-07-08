import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { router } from "expo-router";
import { Coins } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

// Live coin balance pill. Hidden until the balance loads to avoid layout flicker.
export default function CoinBadge() {
    const { colors } = useTheme();
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

    return (
        <TouchableOpacity
            style={styles.pill}
            onPress={() => router.push("/(tabs)/profile")}
            activeOpacity={0.8}
        >
            <Coins size={15} color="#B45309" />
            <Text style={styles.text}>{coins}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    pill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#FEF3C7",
        borderWidth: 1,
        borderColor: "#FCD34D",
    },
    text: {
        fontSize: 13,
        fontWeight: "800",
        color: "#92400E",
    },
});
