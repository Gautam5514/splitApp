import { PillInput, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { api } from "@/lib/api";
import { EMAIL_RE } from "@/lib/people";
import { Check, Mail, Plus, Search, ShieldCheck, UserRoundPlus, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, TouchableOpacity, View } from "react-native";

const PALETTE = ["#0891B2", "#0D9488", "#7C3AED", "#DB2777", "#EA580C", "#2563EB"];
const tint = (name = "") => PALETTE[(name.charCodeAt(0) || 0) % PALETTE.length];

/**
 * Safe "add people" picker (same rules as web):
 *  - a name searches ONLY people you already know (shared group / chat)
 *  - a full email looks up that one person (masked email) -> they get an invite
 *  - an unknown email gets a joining email
 *
 * Controlled: `selected` = [{ key, kind: "user"|"email", userId?, email?, name, sub, direct }].
 * Renders plain Views (no ScrollView) so it can live inside a parent scroller.
 */
export default function PeoplePicker({ groupId, selected, onChange, autoFocus = false }) {
    const { colors, t } = useDesign();
    const styles = getStyles(colors, t);
    const [query, setQuery] = useState("");
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [lookup, setLookup] = useState(null);
    const [failed, setFailed] = useState({});
    const reqId = useRef(0);

    const trimmed = query.trim();
    const isEmail = EMAIL_RE.test(trimmed);

    useEffect(() => {
        const id = ++reqId.current;
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await api.get("/users/contacts", { params: { q: trimmed, excludeGroupId: groupId || undefined } });
                if (id === reqId.current) setContacts(res.data || []);
            } catch {
                if (id === reqId.current) setContacts([]);
            } finally {
                if (id === reqId.current) setLoading(false);
            }
        }, 250);
        return () => clearTimeout(timer);
    }, [trimmed, groupId]);

    useEffect(() => {
        if (!isEmail) { setLookup(null); return; }
        const email = trimmed.toLowerCase();
        if (contacts.some((c) => c.email?.toLowerCase() === email)) { setLookup(null); return; }
        let cancelled = false;
        setLookup({ status: "loading" });
        const timer = setTimeout(async () => {
            try {
                const res = await api.get("/users/lookup", { params: { email } });
                if (!cancelled) setLookup(res.data?.found ? { status: "found", user: res.data.user } : { status: "none" });
            } catch (err) {
                if (!cancelled) setLookup({ status: "error", message: err?.response?.data?.message });
            }
        }, 350);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [isEmail, trimmed, contacts]);

    const isSelected = (key) => selected.some((s) => s.key === key);
    const toggle = (item) => onChange(isSelected(item.key) ? selected.filter((s) => s.key !== item.key) : [...selected, item]);

    const addLookup = () => {
        if (lookup?.status === "found") {
            const u = lookup.user;
            const item = { key: `u:${u._id}`, kind: "user", userId: u._id, name: u.name, sub: u.maskedEmail || u.email, direct: !!u.isContact, photoURL: u.photoURL };
            if (!isSelected(item.key)) onChange([...selected, item]);
        } else if (lookup?.status === "none") {
            const email = trimmed.toLowerCase();
            const item = { key: `e:${email}`, kind: "email", email, name: email, sub: "Joining invite by email", direct: false };
            if (!isSelected(item.key)) onChange([...selected, item]);
        }
        setQuery("");
    };

    // Photo when it loads, the initial otherwise - never a broken image.
    const avatar = (name, photoURL) =>
        photoURL && !failed[photoURL] ? (
            <Image source={{ uri: photoURL }} style={[styles.avatar, { backgroundColor: t.surfaceAlt }]}
                onError={() => setFailed((f) => ({ ...f, [photoURL]: true }))} />
        ) : (
            <View style={[styles.avatar, { backgroundColor: tint(name) }]}>
                <Text style={[styles.avatarText, { color: "#fff" }]}>{(name || "?").charAt(0).toUpperCase()}</Text>
            </View>
        );

    return (
        <View style={styles.wrap}>
            <PillInput
                icon={<Search size={17} color={colors.textSecondary} />}
                value={query}
                onChangeText={setQuery}
                placeholder="Friend's name, or a full email"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoFocus={autoFocus}
                returnKeyType="done"
                onSubmitEditing={() => isEmail && lookup && lookup.status !== "loading" && addLookup()}
                trailing={loading ? <ActivityIndicator size="small" color={colors.textSecondary} /> : null}
            />

            {isEmail && lookup ? (
                <View style={[styles.lookupBox, { borderColor: t.outline }]}>
                    {lookup.status === "loading" && <Text style={styles.muted}>Looking up…</Text>}
                    {lookup.status === "error" && <Text style={[styles.muted, { color: colors.error }]}>{lookup.message || "Couldn't look that up right now."}</Text>}
                    {lookup.status === "found" && (
                        <TouchableOpacity style={styles.row} onPress={addLookup} activeOpacity={0.75}>
                            {avatar(lookup.user.name, lookup.user.photoURL)}
                            <View style={styles.rowText}>
                                <Text style={styles.name} numberOfLines={1}>{lookup.user.name}</Text>
                                <Text style={styles.sub} numberOfLines={1}>{lookup.user.email}</Text>
                            </View>
                            <View style={styles.inviteTag}>
                                <UserRoundPlus size={14} color={colors.primary} />
                                <Text style={[styles.inviteTagText, { color: colors.primary }]}>{lookup.user.isContact ? "Add" : "Invite"}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    {lookup.status === "none" && (
                        <TouchableOpacity style={styles.row} onPress={addLookup} activeOpacity={0.75}>
                            <View style={[styles.avatar, { backgroundColor: t.surfaceAlt }]}><Mail size={15} color={colors.textSecondary} /></View>
                            <View style={styles.rowText}>
                                <Text style={styles.name} numberOfLines={1}>{trimmed.toLowerCase()}</Text>
                                <Text style={styles.sub}>Send a joining invite by email</Text>
                            </View>
                            <Plus size={16} color={colors.primary} />
                        </TouchableOpacity>
                    )}
                </View>
            ) : null}

            {contacts.length > 0 ? (
                <View>
                    <Text style={styles.label}>{trimmed ? "Your contacts" : "People you know"}</Text>
                    {contacts.slice(0, 12).map((u) => {
                        const item = { key: `u:${u._id}`, kind: "user", userId: u._id, name: u.name, sub: u.email, direct: true, photoURL: u.photoURL };
                        const on = isSelected(item.key);
                        return (
                            <TouchableOpacity key={u._id} style={styles.row} onPress={() => toggle(item)} activeOpacity={0.75}
                                accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                                {avatar(u.name, u.photoURL)}
                                <View style={styles.rowText}>
                                    <Text style={styles.name} numberOfLines={1}>{u.name}</Text>
                                    <Text style={styles.sub} numberOfLines={1}>{u.email}</Text>
                                </View>
                                <View style={[styles.check, on ? { backgroundColor: t.ink, borderColor: t.ink } : { borderColor: t.outline }]}>
                                    {on && <Check size={13} color={t.onInk} strokeWidth={3} />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ) : !loading && !isEmail ? (
                <Text style={styles.muted}>
                    {trimmed ? "No contact with that name. For someone new, type their full email." : "Type a full email to add someone new, or share the invite link."}
                </Text>
            ) : null}

            {selected.length > 0 && (
                <View>
                    <Text style={styles.label}>Adding ({selected.length})</Text>
                    <View style={styles.chips}>
                        {selected.map((s) => (
                            <View key={s.key} style={[styles.chip, { backgroundColor: t.surfaceAlt }]}>
                                <Text style={styles.chipText} numberOfLines={1}>{s.name}{s.direct ? "" : " · invite"}</Text>
                                <TouchableOpacity onPress={() => onChange(selected.filter((x) => x.key !== s.key))} hitSlop={8} accessibilityLabel={`Remove ${s.name}`}>
                                    <X size={13} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            <View style={styles.note}>
                <ShieldCheck size={13} color={colors.primary} />
                <Text style={[styles.muted, { flex: 1 }]}>
                    People you don&apos;t share a group or chat with get an invite and join only if they accept.
                </Text>
            </View>
        </View>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    wrap: { gap: 14 },
    lookupBox: { borderWidth: 1, borderStyle: "dashed", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6 },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
    rowText: { flex: 1, minWidth: 0 },
    name: { fontSize: 15, fontWeight: "600", color: colors.text },
    sub: { fontSize: 12.5, color: colors.textSecondary, marginTop: 1 },
    avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 14, fontWeight: "700" },
    check: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
    label: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
    muted: { fontSize: 12.5, color: colors.textSecondary },
    inviteTag: { flexDirection: "row", alignItems: "center", gap: 4 },
    inviteTagText: { fontSize: 13, fontWeight: "700" },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 12, paddingRight: 8, paddingVertical: 7, borderRadius: 999, maxWidth: "100%" },
    chipText: { fontSize: 12.5, fontWeight: "600", color: colors.text, flexShrink: 1 },
    note: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
});
