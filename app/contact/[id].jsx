import { useTheme } from "@/context/ThemeContext";
import { R, tokens } from "@/constants/design";
import { getGroupIcon } from "@/lib/groupIcons";
import { api } from "@/lib/api";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
    Briefcase,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Mail,
    MapPin,
    Phone,
    Play,
    X,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
    Dimensions,
    FlatList,
    Image,
    Linking,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { Text } from "@/components/ui/Typography";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SCREEN_W = Dimensions.get("window").width;
const PAD = 16;
const AVATAR_COLORS = ["#14B8A6", "#10B981", "#0891B2", "#2563EB", "#6366F1", "#8B5CF6"];
const colorFor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
const clean = (v) => (v && v !== "undefined" && v !== "null" ? v : null);

// Cloudinary serves a poster frame for any video if you ask for a .jpg.
const thumbFor = (m) =>
    m.type === "video" ? m.url.replace("/video/upload/", "/video/upload/so_0/").replace(/\.\w+$/, ".jpg") : m.url;

/**
 * Contact info — opened by tapping the person's photo/name in a 1:1 chat.
 * Everything here is what BOTH people in the chat can see: the photos and
 * videos either of you sent, how many messages you've exchanged, and the
 * groups you're both in.
 */
export default function ContactInfoScreen() {
    const params = useLocalSearchParams();
    const userId = clean(params.id);
    const conversationId = clean(params.conversationId);
    const insets = useSafeAreaInsets();
    const { colors, theme } = useTheme();
    const isDark = theme === "dark";
    const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    const [contact, setContact] = useState({
        name: clean(params.name) || "",
        imageUrl: clean(params.imageUrl),
        email: clean(params.email),
    });
    const [summary, setSummary] = useState(null);
    const [viewer, setViewer] = useState(null); // media item being viewed
    const [showAllMedia, setShowAllMedia] = useState(false);
    const isOnline = params.isOnline === "true";

    useEffect(() => {
        if (userId) {
            api.get(`/chat/contact/${userId}`)
                .then((res) => setContact((c) => ({ ...c, ...res.data })))
                .catch(() => {});
        }
        if (conversationId) {
            api.get(`/chat/conversation/${conversationId}/summary`)
                .then((res) => setSummary(res.data))
                .catch(() => setSummary({ messageCount: 0, mediaCount: 0, media: [], commonGroups: [] }));
        }
    }, [userId, conversationId]);

    const media = summary?.media || [];
    const groups = summary?.commonGroups || [];
    const preview = media.slice(0, 4);
    const extra = Math.max((summary?.mediaCount || 0) - 3, 0);

    const openMedia = (m) => (m.type === "video" ? Linking.openURL(m.url) : setViewer(m));

    const infoRows = [
        contact.email && { icon: Mail, label: "Email", value: contact.email, onPress: () => Linking.openURL(`mailto:${contact.email}`) },
        contact.mobile && { icon: Phone, label: "Mobile", value: contact.mobile },
        contact.city && { icon: MapPin, label: "City", value: contact.city },
        contact.profession && { icon: Briefcase, label: "Profession", value: contact.profession },
        contact.memberSince && {
            icon: CalendarDays,
            label: "On SplitEase since",
            value: new Date(contact.memberSince).toLocaleDateString([], { month: "long", year: "numeric" }),
        },
    ].filter(Boolean);

    const fmt = (n) => (typeof n === "number" ? n.toLocaleString("en-IN") : "–");

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
                {/* ── Hero: blurred photo backdrop, avatar, name ─────────────── */}
                <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
                    {contact.imageUrl ? (
                        <Image source={{ uri: contact.imageUrl }} style={StyleSheet.absoluteFill} blurRadius={40} />
                    ) : (
                        <LinearGradient colors={[colorFor(contact.name), "#111827"]} style={StyleSheet.absoluteFill} />
                    )}
                    <LinearGradient
                        colors={["rgba(0,0,0,0.25)", "rgba(0,0,0,0.55)", colors.background]}
                        locations={[0, 0.7, 1]}
                        style={StyleSheet.absoluteFill}
                    />

                    <View style={styles.heroTop}>
                        <TouchableOpacity style={styles.glassBtn} onPress={() => router.back()} accessibilityLabel="Back">
                            <ChevronLeft size={22} color="#fff" strokeWidth={2.4} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        activeOpacity={0.9}
                        disabled={!contact.imageUrl}
                        onPress={() => setViewer({ url: contact.imageUrl, type: "image" })}
                        accessibilityLabel="View profile photo"
                    >
                        <View style={styles.avatarRing}>
                            {contact.imageUrl ? (
                                <Image source={{ uri: contact.imageUrl }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, { backgroundColor: colorFor(contact.name), alignItems: "center", justifyContent: "center" }]}>
                                    <Text style={styles.avatarText}>{contact.name?.charAt(0)?.toUpperCase() || "?"}</Text>
                                </View>
                            )}
                            {isOnline && <View style={styles.onlineDot} />}
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.name} numberOfLines={1}>{contact.name}</Text>
                    <Text style={styles.sub} numberOfLines={1}>{contact.mobile || contact.email || ""}</Text>
                    {contact.bio ? <Text style={styles.bio} numberOfLines={3}>{contact.bio}</Text> : null}
                </View>

                {/* ── Stats ──────────────────────────────────────────────────── */}
                <View style={styles.card}>
                    <View style={styles.statsRow}>
                        {[
                            { label: "Messages", value: fmt(summary?.messageCount) },
                            { label: "Groups", value: fmt(summary ? groups.length : undefined) },
                            { label: "Media", value: fmt(summary?.mediaCount) },
                        ].map((s) => (
                            <View key={s.label} style={styles.statTile}>
                                <Text style={styles.statLabel}>{s.label}</Text>
                                {summary ? (
                                    <Text style={styles.statValue}>{s.value}</Text>
                                ) : (
                                    <Skeleton width={34} height={20} radius={6} style={{ marginTop: 4 }} />
                                )}
                            </View>
                        ))}
                    </View>
                </View>

                {/* ── Media and photos (sent by either of you) ───────────────── */}
                <View style={styles.card}>
                    <TouchableOpacity
                        style={styles.cardHead}
                        onPress={() => media.length && setShowAllMedia(true)}
                        disabled={!media.length}
                        activeOpacity={0.7}
                        accessibilityLabel="See all media and photos"
                    >
                        <Text style={styles.cardTitle}>Media and photos</Text>
                        {media.length > 0 && <ChevronRight size={20} color={colors.textSecondary} />}
                    </TouchableOpacity>
                    {media.length ? (
                        <View style={styles.mediaStrip}>
                            {preview.map((m, i) => {
                                const isLast = i === 3 && extra > 0;
                                return (
                                    <TouchableOpacity
                                        key={m._id || i}
                                        style={styles.mediaTile}
                                        onPress={() => (isLast ? setShowAllMedia(true) : openMedia(m))}
                                        activeOpacity={0.85}
                                        accessibilityLabel={isLast ? `${extra} more` : m.type === "video" ? "Video" : "Photo"}
                                    >
                                        <Image source={{ uri: thumbFor(m) }} style={styles.mediaImg} />
                                        {m.type === "video" && !isLast && (
                                            <View style={styles.playBadge}><Play size={12} color="#fff" fill="#fff" /></View>
                                        )}
                                        {isLast && (
                                            <View style={styles.moreOverlay}>
                                                <Text style={styles.moreText}>+{extra}</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ) : summary ? (
                        <Text style={styles.emptyText}>Photos and videos you share in this chat will show up here.</Text>
                    ) : (
                        <View style={styles.mediaStrip}>
                            {[0, 1, 2, 3].map((i) => (
                                <View key={i} style={styles.mediaTile}><Skeleton width="100%" height="100%" radius={10} /></View>
                            ))}
                        </View>
                    )}
                </View>

                {/* ── Contact info ───────────────────────────────────────────── */}
                {infoRows.length > 0 && (
                    <View style={[styles.card, styles.listCard]}>
                        {infoRows.map((r, i) => {
                            const Icon = r.icon;
                            const Row = r.onPress ? TouchableOpacity : View;
                            return (
                                <Row key={r.label} style={[styles.row, i > 0 && styles.rowDivider]} onPress={r.onPress} activeOpacity={0.7}>
                                    <Icon size={20} color={colors.text} strokeWidth={1.9} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.rowLabel}>{r.label}</Text>
                                        <Text style={styles.rowValue} numberOfLines={2}>{r.value}</Text>
                                    </View>
                                </Row>
                            );
                        })}
                    </View>
                )}

                {/* ── Groups in common ───────────────────────────────────────── */}
                <View style={[styles.card, styles.listCard]}>
                    <View style={[styles.cardHead, styles.cardHeadInList]}>
                        <Text style={styles.cardTitle}>
                            {groups.length} group{groups.length !== 1 ? "s" : ""} in common
                        </Text>
                    </View>
                    {groups.length ? (
                        groups.map((g, i) => {
                            const GIcon = getGroupIcon(g.icon);
                            return (
                                <TouchableOpacity
                                    key={g._id}
                                    style={[styles.row, styles.rowDivider]}
                                    onPress={() => router.push({ pathname: "/groups/[id]", params: { id: g._id } })}
                                    activeOpacity={0.7}
                                    accessibilityLabel={`Open ${g.name}`}
                                >
                                    {g.photoUrl ? (
                                        <Image source={{ uri: g.photoUrl }} style={styles.groupAvatar} />
                                    ) : (
                                        <View style={[styles.groupAvatar, { backgroundColor: colorFor(g.name) }]}>
                                            {GIcon ? <GIcon size={18} color="#fff" /> : <Text style={styles.groupAvatarText}>{g.name?.charAt(0)?.toUpperCase()}</Text>}
                                        </View>
                                    )}
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.rowTitle} numberOfLines={1}>{g.name}</Text>
                                        <Text style={styles.rowLabel}>
                                            {g.memberCount} member{g.memberCount !== 1 ? "s" : ""}{g.isCompleted ? " · Completed" : ""}
                                        </Text>
                                    </View>
                                    <ChevronRight size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            );
                        })
                    ) : (
                        summary ? (
                        <Text style={[styles.emptyText, styles.emptyInList]}>No groups together yet.</Text>
                    ) : (
                        <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
                            <Skeleton width="60%" height={14} />
                            <Skeleton width="45%" height={14} />
                        </View>
                    )
                    )}
                </View>
            </ScrollView>

            {/* All media grid */}
            <Modal visible={showAllMedia} animationType="slide" onRequestClose={() => setShowAllMedia(false)}>
                <View style={[styles.gridScreen, { paddingTop: insets.top }]}>
                    <View style={styles.gridHeader}>
                        <TouchableOpacity style={styles.plainBtn} onPress={() => setShowAllMedia(false)} accessibilityLabel="Close">
                            <ChevronLeft size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.gridTitle}>Media and photos</Text>
                        <View style={styles.plainBtn} />
                    </View>
                    <FlatList
                        data={media}
                        numColumns={3}
                        keyExtractor={(m, i) => m._id || String(i)}
                        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.gridTile} onPress={() => openMedia(item)} activeOpacity={0.85}>
                                <Image source={{ uri: thumbFor(item) }} style={styles.mediaImg} />
                                {item.type === "video" && <View style={styles.playBadge}><Play size={12} color="#fff" fill="#fff" /></View>}
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>

            {/* Full-screen photo viewer */}
            <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
                <View style={styles.viewer}>
                    {viewer && <Image source={{ uri: viewer.url }} style={styles.viewerImg} resizeMode="contain" />}
                    <TouchableOpacity style={[styles.glassBtn, styles.viewerClose, { top: insets.top + 8 }]} onPress={() => setViewer(null)} accessibilityLabel="Close photo">
                        <X size={22} color="#fff" />
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
}

const TILE = (SCREEN_W - PAD * 2 - 24 - 6) / 4; // 4 tiles inside a card with 12px padding, 2px gaps
const GRID_TILE = (SCREEN_W - 4) / 3;

const getStyles = (colors, isDark) => {
    const t = tokens(colors, isDark);
    const surface = t.surface;
    const tile = t.surfaceAlt;
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },

        hero: { alignItems: "center", paddingBottom: 26, overflow: "hidden" },
        heroTop: { alignSelf: "stretch", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: PAD, marginBottom: 6 },
        glassBtn: {
            width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.18)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.25)",
        },
        avatarRing: { padding: 3, borderRadius: 64, backgroundColor: "rgba(255,255,255,0.25)" },
        avatar: { width: 116, height: 116, borderRadius: 58 },
        avatarText: { fontSize: 44, fontWeight: "700", color: "#fff" },
        onlineDot: {
            position: "absolute", right: 8, bottom: 8, width: 18, height: 18, borderRadius: 9,
            backgroundColor: "#10B981", borderWidth: 3, borderColor: "#fff",
        },
        name: { marginTop: 14, fontSize: 24, fontWeight: "600", color: "#fff", letterSpacing: -0.3, paddingHorizontal: 24 },
        sub: { marginTop: 4, fontSize: 14.5, color: "rgba(255,255,255,0.72)" },
        bio: { marginTop: 10, fontSize: 13.5, lineHeight: 19, color: "rgba(255,255,255,0.85)", textAlign: "center", paddingHorizontal: 36 },

        card: {
            marginHorizontal: PAD, marginBottom: 14, padding: 12, borderRadius: R.block,
            backgroundColor: surface, borderWidth: StyleSheet.hairlineWidth, borderColor: t.outline,
        },
        listCard: { paddingVertical: 4, paddingHorizontal: 0 },

        statsRow: { flexDirection: "row", gap: 8 },
        statTile: { flex: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12, backgroundColor: tile },
        statLabel: { fontSize: 13, color: colors.textSecondary },
        statValue: { marginTop: 6, fontSize: 21, fontWeight: "600", color: colors.text, letterSpacing: -0.3 },

        cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, paddingBottom: 12, paddingTop: 2 },
        cardHeadInList: { paddingHorizontal: PAD, paddingTop: 12, paddingBottom: 6 },
        cardTitle: { fontSize: 16, fontWeight: "600", color: colors.text },

        mediaStrip: { flexDirection: "row", gap: 2, borderRadius: 14, overflow: "hidden" },
        mediaTile: { width: TILE, height: TILE * 1.3, backgroundColor: tile, overflow: "hidden" },
        mediaImg: { width: "100%", height: "100%" },
        playBadge: {
            position: "absolute", left: 6, bottom: 6, width: 22, height: 22, borderRadius: 11,
            backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center",
        },
        moreOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
        moreText: { color: "#fff", fontSize: 22, fontWeight: "600" },

        row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: PAD, paddingVertical: 14 },
        rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.outline },
        rowTitle: { fontSize: 15.5, color: colors.text, fontWeight: "500" },
        rowLabel: { fontSize: 12.5, color: colors.textSecondary },
        rowValue: { fontSize: 15.5, color: colors.text, marginTop: 2 },
        groupAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", overflow: "hidden" },
        groupAvatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },

        emptyText: { fontSize: 13.5, color: colors.textSecondary, paddingHorizontal: 4, paddingBottom: 6 },
        emptyInList: { paddingHorizontal: PAD, paddingBottom: 14 },

        gridScreen: { flex: 1, backgroundColor: colors.background },
        gridHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 8 },
        plainBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
        gridTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
        gridTile: { width: GRID_TILE, height: GRID_TILE, margin: 0.66, backgroundColor: tile },

        viewer: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
        viewerImg: { width: "100%", height: "100%" },
        viewerClose: { position: "absolute", right: PAD },
    });
};
