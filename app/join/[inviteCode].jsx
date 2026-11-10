import { Loader } from "@/components/Loader";
import { Block, IconCircle, PillButton, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { normalizeInviteCode } from "@/lib/inviteCode";
import { clearPendingInvite, savePendingInvite } from "@/lib/pendingInvite";
import { router, useLocalSearchParams } from "expo-router";
import { AlertCircle, CheckCircle2, Clock, KeyRound, LogIn, RefreshCw, ShieldCheck, UserPlus, Users } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Opened by an invite link (https://.../join/CODE or splitapp://join/CODE), the
// Play Store install referrer, or the "Join with code" screen. Shows which
// group the invite is for, then joins - or asks the user to sign in first and
// brings them back here afterwards (lib/pendingInvite.js).

const TYPE_LABEL = { trip: "Trip", roommate: "Roommates", business: "Business", general: "Group" };
const goHome = () => router.replace("/(tabs)/home");

export default function JoinGroupScreen() {
    const params = useLocalSearchParams();
    const rawCode = String(params.inviteCode || "");
    const code = normalizeInviteCode(rawCode) || rawCode;
    const { token, loading: authLoading } = useAuth();
    const { colors } = useDesign();
    const styles = getStyles(colors);

    // preview: loading | ready | invalid | expired | error
    const [preview, setPreview] = useState({ state: "loading", data: null });
    // flow: checking | signin | joining | joined | already | requested | failed
    const [flow, setFlow] = useState("checking");
    const [errorMsg, setErrorMsg] = useState("");
    const joinStarted = useRef(false);

    const loadPreview = useCallback(async () => {
        setPreview({ state: "loading", data: null });
        try {
            const { data } = await api.get(`/groups/invite/${encodeURIComponent(code)}`);
            setPreview({ state: "ready", data });
        } catch (err) {
            const status = err?.response?.status;
            if (status === 404) setPreview({ state: "invalid", data: null });
            else if (status === 410) setPreview({ state: "expired", data: null });
            // Offline / rate limited: still let the join itself try.
            else setPreview({ state: "error", data: null });
        }
    }, [code]);

    useEffect(() => { if (code) loadPreview(); }, [code, loadPreview]);

    const join = useCallback(async () => {
        if (!code || joinStarted.current) return;
        joinStarted.current = true;
        setFlow("joining");
        try {
            const res = await api.post(`/groups/join/${encodeURIComponent(code)}`);
            clearPendingInvite();
            const groupId = res.data?.group?._id;
            if (res.status === 202 || res.data?.status === "requested" || res.data?.pending) {
                setFlow("requested");
                return;
            }
            const already = !!res.data?.alreadyMember;
            setFlow(already ? "already" : "joined");
            setTimeout(() => router.replace(groupId ? `/groups/${groupId}` : "/(tabs)/home"), already ? 700 : 1200);
        } catch (err) {
            joinStarted.current = false;
            const status = err?.response?.status;
            if (status === 401) {
                await savePendingInvite(code);
                setFlow("signin");
                return;
            }
            if (status === 410) setPreview((p) => ({ ...p, state: "expired" }));
            else if (status === 404) setPreview((p) => ({ ...p, state: "invalid" }));
            setErrorMsg(err?.response?.data?.message || (status ? "Something went wrong. Please try again." : "You seem to be offline. Check your connection and try again."));
            setFlow("failed");
        }
    }, [code]);

    // Once we know the invite and whether the user is signed in, act.
    useEffect(() => {
        if (!code || authLoading || preview.state === "loading") return;
        if (preview.state === "invalid" || preview.state === "expired") return;
        if (joinStarted.current || flow !== "checking") return;
        if (!token) {
            savePendingInvite(code);
            setFlow("signin");
            return;
        }
        join();
    }, [code, authLoading, token, preview.state, flow, join]);

    // Signed in while this screen was open (e.g. came back from login).
    useEffect(() => {
        if (token && flow === "signin") setFlow("checking");
    }, [token, flow]);

    const retry = () => {
        setErrorMsg("");
        setFlow("checking");
        loadPreview();
    };

    const g = preview.data?.group;
    const dead = preview.state === "invalid" || preview.state === "expired";

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <Block style={styles.card}>
                    {/* What the invite is for */}
                    <View style={styles.header}>
                        <Text style={styles.eyebrow}>{dead ? "INVITE LINK" : "YOU'RE INVITED"}</Text>
                        {preview.state === "loading" ? (
                            <View style={styles.skeletonWrap}>
                                <View style={[styles.skeleton, { width: "65%", height: 20 }]} />
                                <View style={[styles.skeleton, { width: "45%", height: 14 }]} />
                            </View>
                        ) : g ? (
                            <View style={styles.groupRow}>
                                <View style={styles.groupIcon}>
                                    {g.photo ? <Image source={{ uri: g.photo }} style={styles.groupPhoto} /> : <Users size={24} color={colors.primary} />}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.groupName} numberOfLines={2}>{g.name}</Text>
                                    <Text style={styles.groupMeta} numberOfLines={2}>
                                        {preview.data.invitedBy ? `Invited by ${preview.data.invitedBy} · ` : ""}
                                        {TYPE_LABEL[g.type] || "Group"} · {g.memberCount} member{g.memberCount === 1 ? "" : "s"}
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <Text style={styles.groupName}>{dead ? "This link can't be used" : "Join a group on SplitEase"}</Text>
                        )}
                        {g?.completed && !dead && (
                            <View style={styles.noteRow}>
                                <CheckCircle2 size={14} color={colors.primary} />
                                <Text style={styles.note}>This group has been marked as completed.</Text>
                            </View>
                        )}
                        {preview.data?.joinApproval && !dead && (
                            <View style={styles.noteRow}>
                                <ShieldCheck size={14} color={colors.primary} />
                                <Text style={styles.note}>The group creator approves new members.</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.body}>
                        {dead && (
                            <State colors={colors} styles={styles} tone="error" Icon={preview.state === "expired" ? Clock : AlertCircle}
                                title={preview.state === "expired" ? "This invite has expired" : "This invite isn't valid"}
                                text={preview.state === "expired"
                                    ? "Invite links stop working after a while for safety. Ask the person who invited you for a new one."
                                    : "It may have been reset by the group creator, or mistyped. Ask for a new link or code."}>
                                <PillButton label="Enter a code instead" onPress={() => router.replace("/join")}
                                    icon={<KeyRound size={16} color={colors.onPrimary} />} style={styles.fullBtn} />
                                <PillButton label="Go home" variant="secondary" onPress={goHome} style={styles.fullBtn} />
                            </State>
                        )}

                        {!dead && (flow === "checking" || flow === "joining") && (
                            <View style={styles.center}>
                                <Loader size={44} />
                                <Text style={styles.title}>{flow === "joining" ? "Adding you to the group…" : "Checking your invite…"}</Text>
                            </View>
                        )}

                        {!dead && flow === "signin" && (
                            <State colors={colors} styles={styles} tone="primary" Icon={LogIn} title="Sign in to join"
                                text="Use your SplitEase account, or create one for free. You'll come straight back to this group.">
                                <PillButton label="Sign in" onPress={() => router.replace("/auth/login")}
                                    icon={<LogIn size={16} color={colors.onPrimary} />} style={styles.fullBtn} />
                                <PillButton label="Create a free account" variant="secondary" onPress={() => router.replace("/auth/register")}
                                    icon={<UserPlus size={16} color={colors.text} />} style={styles.fullBtn} />
                            </State>
                        )}

                        {flow === "joined" && (
                            <State colors={colors} styles={styles} tone="success" Icon={CheckCircle2} title="You're in!" text="Taking you to the group…" />
                        )}
                        {flow === "already" && (
                            <State colors={colors} styles={styles} tone="success" Icon={CheckCircle2} title="You're already in this group" text="Opening it for you…" />
                        )}
                        {flow === "requested" && (
                            <State colors={colors} styles={styles} tone="primary" Icon={Clock} title="Request sent"
                                text="The group creator approves new members. You'll get a notification as soon as you're added.">
                                <PillButton label="Go home" onPress={goHome} style={styles.fullBtn} />
                            </State>
                        )}
                        {!dead && flow === "failed" && (
                            <State colors={colors} styles={styles} tone="error" Icon={AlertCircle} title="Couldn't join" text={errorMsg}>
                                <View style={styles.row}>
                                    <PillButton label="Try again" variant="secondary" onPress={retry}
                                        icon={<RefreshCw size={15} color={colors.text} />} style={styles.flexBtn} />
                                    <PillButton label="Go home" onPress={goHome} style={styles.flexBtn} />
                                </View>
                            </State>
                        )}
                    </View>
                </Block>

                {!!code && (
                    <Text style={styles.footer}>
                        Invite code <Text style={styles.code}>{code}</Text>
                    </Text>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function State({ colors, styles, tone, Icon, title, text, children }) {
    const tint = tone === "success" ? colors.successLight : tone === "error" ? colors.errorLight : colors.primaryLight;
    const fg = tone === "success" ? colors.success : tone === "error" ? colors.error : colors.primary;
    return (
        <View style={styles.center}>
            <IconCircle size={60} tint={tint}>
                <Icon size={28} color={fg} />
            </IconCircle>
            <Text style={styles.title}>{title}</Text>
            {!!text && <Text style={styles.subtitle}>{text}</Text>}
            {children}
        </View>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 20 },
    card: { width: "100%", maxWidth: 400, marginHorizontal: 0, marginBottom: 0, padding: 0, overflow: "hidden" },
    header: { padding: 22, gap: 10 },
    eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 1.4, color: colors.textSecondary },
    skeletonWrap: { gap: 8, marginTop: 2 },
    skeleton: { borderRadius: 6, backgroundColor: colors.border, opacity: 0.8 },
    groupRow: { flexDirection: "row", alignItems: "center", gap: 14 },
    groupIcon: {
        width: 56, height: 56, borderRadius: 16, overflow: "hidden",
        backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center",
    },
    groupPhoto: { width: 56, height: 56 },
    groupName: { fontSize: 19, fontWeight: "800", color: colors.text },
    groupMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    noteRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    note: { fontSize: 12, color: colors.textSecondary },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    body: { padding: 22 },
    center: { alignItems: "center", gap: 10 },
    title: { fontSize: 19, fontWeight: "800", color: colors.text, textAlign: "center", marginTop: 4 },
    subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
    fullBtn: { alignSelf: "stretch", marginTop: 6 },
    row: { flexDirection: "row", gap: 10, alignSelf: "stretch", marginTop: 6 },
    flexBtn: { flex: 1 },
    footer: { marginTop: 16, fontSize: 12, color: colors.textSecondary, textAlign: "center" },
    code: { fontWeight: "800", letterSpacing: 1.5, color: colors.text },
});
