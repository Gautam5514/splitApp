/** Which group Autopilot works in. "All groups" lets a request name or create one. */
import BottomSheet from "@/components/ui/BottomSheet";
import { useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { R } from "@/constants/design";
import { Check, Layers } from "lucide-react-native";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import GroupTypeIcon from "@/components/group/GroupTypeIcon";

export default function GroupPickerSheet({ visible, groups, value, onChange, onClose }) {
    const { colors, t } = useDesign();
    const s = getStyles(colors, t);
    const options = [null, ...groups];
    return (
        <BottomSheet visible={visible} onClose={onClose} backgroundColor={colors.background}>
            <ScrollView contentContainerStyle={s.body}>
                <Text style={s.heading}>Work in</Text>
                {options.map((g) => {
                    const id = g?._id || "";
                    const selected = id === value;
                    return (
                        <TouchableOpacity key={id || "all"} onPress={() => { onChange(id); onClose(); }} activeOpacity={0.75} style={[s.row, selected && { backgroundColor: t.fillStrong }]} accessibilityRole="button" accessibilityState={{ selected }}>
                            {g ? <GroupTypeIcon type={g.groupType} size={34} /> : <View style={s.allIcon}><Layers size={17} color={colors.textSecondary} /></View>}
                            <View style={{ flex: 1 }}>
                                <Text style={s.name} numberOfLines={1}>{g ? g.name : "All groups"}</Text>
                                <Text style={s.meta} numberOfLines={1}>{g ? `${g.groupType ? g.groupType[0].toUpperCase() + g.groupType.slice(1) : "Group"} · ${g.settings?.currency || "INR"}` : "Or start a new one"}</Text>
                            </View>
                            {selected && <Check size={18} color={colors.text} />}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </BottomSheet>
    );
}

const getStyles = (colors, t) => StyleSheet.create({
    body: { paddingHorizontal: 12, paddingBottom: 24 },
    heading: { fontSize: 18, fontWeight: "700", color: colors.text, marginHorizontal: 8, marginBottom: 8 },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 10, paddingVertical: 10, borderRadius: R.tile },
    allIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: t.fillStrong },
    name: { fontSize: 15, fontWeight: "600", color: colors.text },
    meta: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
});
