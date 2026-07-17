import { useAuth } from "@/context/AuthContext";
import { Loader } from "@/components/Loader";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { AlertCircle, CheckCircle2, LogIn, RefreshCw, Users } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function JoinGroupScreen() {
    const { inviteCode } = useLocalSearchParams();
    const { token, loading: authLoading } = useAuth();
    const { colors } = useTheme();
    const styles = getStyles(colors);

    // loading | joining | success | error | unauthenticated
    const [status, setStatus] = useState("loading");
    const [errorMsg, setErrorMsg] = useState("");

    const join = useCallback(async () => {
        if (!inviteCode) return;
        setStatus("joining");
        try {
            const res = await api.post(`/groups/join/${inviteCode}`);
            const groupId = res.data?.group?._id;
            setStatus("success");
            setTimeout(() => {
                router.replace(groupId ? `/groups/${groupId}` : "/(tabs)/home");
            }, 1200);
        } catch (err) {
            const httpStatus = err?.response?.status;
            const msg = err?.response?.data?.message || "";

            if (httpStatus === 401) {
                await AsyncStorage.setItem("pendingInvite", String(inviteCode));
                setStatus("unauthenticated");
                return;
            }
            if (
                httpStatus === 200 ||
                msg.toLowerCase().includes("already") ||
                msg.toLowerCase().includes("member")
            ) {
                const groupId = err?.response?.data?.group?._id;
                setStatus("success");
                setTimeout(() => {
                    router.replace(groupId ? `/groups/${groupId}` : "/(tabs)/home");
                }, 1000);
                return;
            }
            setErrorMsg(
                httpStatus === 404
                    ? "This invite link is invalid or has expired."
                    : msg || "Something went wrong. Please try again."
            );
            setStatus("error");
        }
    }, [inviteCode]);

    useEffect(() => {
        if (authLoading) return;
        if (!token) {
            AsyncStorage.setItem("pendingInvite", String(inviteCode || ""));
            setStatus("unauthenticated");
            return;
        }
        join();
    }, [authLoading, token, inviteCode, join]);

    const goToLogin = () => router.replace("/auth/login");

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.card}>
                {(status === "loading" || status === "joining") && (
                    <>
                        <Loader size={48} />
                        <Text style={styles.title}>Joining group…</Text>
                        <Text style={styles.subtitle}>Hang tight while we add you in.</Text>
                    </>
                )}

                {status === "success" && (
                    <>
                        <View style={[styles.iconCircle, { backgroundColor: colors.successLight }]}>
                            <CheckCircle2 size={32} color={colors.success} />
                        </View>
                        <Text style={styles.title}>You{"'"}re in!</Text>
                        <Text style={styles.subtitle}>Taking you to the group…</Text>
                    </>
                )}

                {status === "unauthenticated" && (
                    <>
                        <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                            <Users size={32} color={colors.primary} />
                        </View>
                        <Text style={styles.title}>Sign in to join</Text>
                        <Text style={styles.subtitle}>
                            Log in or create an account to join this group. We{"'"}ll bring you right back.
                        </Text>
                        <TouchableOpacity style={styles.primaryBtn} onPress={goToLogin} activeOpacity={0.85}>
                            <LogIn size={16} color="#FFFFFF" />
                            <Text style={styles.primaryBtnText}>Sign in</Text>
                        </TouchableOpacity>
                    </>
                )}

                {status === "error" && (
                    <>
                        <View style={[styles.iconCircle, { backgroundColor: colors.errorLight }]}>
                            <AlertCircle size={32} color={colors.error} />
                        </View>
                        <Text style={styles.title}>Couldn{"'"}t join</Text>
                        <Text style={styles.subtitle}>{errorMsg}</Text>
                        <View style={styles.errorActions}>
                            <TouchableOpacity style={styles.secondaryBtn} onPress={join} activeOpacity={0.85}>
                                <RefreshCw size={15} color={colors.text} />
                                <Text style={styles.secondaryBtnText}>Retry</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.primaryBtn}
                                onPress={() => router.replace("/(tabs)/home")}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.primaryBtnText}>Go home</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    card: {
        width: "100%",
        maxWidth: 380,
        backgroundColor: colors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 28,
        alignItems: "center",
        gap: 12,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: "center",
        alignItems: "center",
    },
    title: { fontSize: 20, fontWeight: "800", color: colors.text, textAlign: "center" },
    subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
    primaryBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 13,
        borderRadius: 14,
        marginTop: 8,
    },
    primaryBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
    secondaryBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 20,
        paddingVertical: 13,
        borderRadius: 14,
        marginTop: 8,
    },
    secondaryBtnText: { fontSize: 15, fontWeight: "700", color: colors.text },
    errorActions: { flexDirection: "row", gap: 10 },
});
