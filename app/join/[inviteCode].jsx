import { Loader } from "@/components/Loader";
import { Block, IconCircle, PillButton, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { AlertCircle, CheckCircle2, LogIn, RefreshCw, Users } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function JoinGroupScreen() {
    const { inviteCode } = useLocalSearchParams();
    const { token, loading: authLoading } = useAuth();
    const { colors } = useDesign();
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
            // Approval-required group: a join request was filed instead.
            if (res.status === 202 || res.data?.pending) {
                setStatus("requested");
                return;
            }
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
                httpStatus === 410
                    ? "This invite link has expired. Ask the group creator to share a new one."
                    : httpStatus === 404
                    ? "This invite link is invalid or has been reset."
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
            <Block style={styles.card}>
                {(status === "loading" || status === "joining") && (
                    <>
                        <Loader size={48} />
                        <Text style={styles.title}>Joining group…</Text>
                        <Text style={styles.subtitle}>Hang tight while we add you in.</Text>
                    </>
                )}

                {status === "success" && (
                    <>
                        <IconCircle size={64} tint={colors.successLight}>
                            <CheckCircle2 size={32} color={colors.success} />
                        </IconCircle>
                        <Text style={styles.title}>You{"'"}re in!</Text>
                        <Text style={styles.subtitle}>Taking you to the group…</Text>
                    </>
                )}

                {status === "requested" && (
                    <>
                        <IconCircle size={64} tint={colors.primaryLight}>
                            <Users size={32} color={colors.primary} />
                        </IconCircle>
                        <Text style={styles.title}>Request sent</Text>
                        <Text style={styles.subtitle}>
                            This group needs the creator{"'"}s approval. You{"'"}ll get a notification once you{"'"}re added.
                        </Text>
                        <PillButton label="Go home" onPress={() => router.replace("/(tabs)/home")} style={styles.fullBtn} />
                    </>
                )}

                {status === "unauthenticated" && (
                    <>
                        <IconCircle size={64} tint={colors.primaryLight}>
                            <Users size={32} color={colors.primary} />
                        </IconCircle>
                        <Text style={styles.title}>Sign in to join</Text>
                        <Text style={styles.subtitle}>
                            Log in or create an account to join this group. We{"'"}ll bring you right back.
                        </Text>
                        <PillButton
                            label="Sign in"
                            onPress={goToLogin}
                            icon={<LogIn size={16} color={colors.onPrimary} />}
                            style={styles.fullBtn}
                        />
                    </>
                )}

                {status === "error" && (
                    <>
                        <IconCircle size={64} tint={colors.errorLight}>
                            <AlertCircle size={32} color={colors.error} />
                        </IconCircle>
                        <Text style={styles.title}>Couldn{"'"}t join</Text>
                        <Text style={styles.subtitle}>{errorMsg}</Text>
                        <View style={styles.errorActions}>
                            <PillButton
                                label="Retry"
                                variant="secondary"
                                onPress={join}
                                icon={<RefreshCw size={15} color={colors.text} />}
                                style={styles.flexBtn}
                            />
                            <PillButton
                                label="Go home"
                                onPress={() => router.replace("/(tabs)/home")}
                                style={styles.flexBtn}
                            />
                        </View>
                    </>
                )}
            </Block>
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
        marginHorizontal: 0,
        marginBottom: 0,
        padding: 28,
        alignItems: "center",
        gap: 12,
    },
    title: { fontSize: 20, fontWeight: "800", color: colors.text, textAlign: "center" },
    subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
    fullBtn: { alignSelf: "stretch", marginTop: 8 },
    errorActions: { flexDirection: "row", gap: 10, alignSelf: "stretch", marginTop: 8 },
    flexBtn: { flex: 1 },
});
