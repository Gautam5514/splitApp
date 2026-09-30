import BottomSheet from "@/components/ui/BottomSheet";
import { PillButton, useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import PeoplePicker from "@/components/people/PeoplePicker";
import { Alert } from "@/lib/alert";
import { addPeopleToGroup, describeAddResult } from "@/lib/people";
import { Link2, UserPlus } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";

// "Add people" sheet on the group screen (creator only).
export default function AddPeopleSheet({ visible, groupId, onClose, onDone, onShareLink }) {
    const { colors, t } = useDesign();
    const [selected, setSelected] = useState([]);
    const [saving, setSaving] = useState(false);

    const close = () => { setSelected([]); onClose?.(); };
    const submit = async () => {
        if (!selected.length) return;
        try {
            setSaving(true);
            const result = await addPeopleToGroup(groupId, selected);
            Alert.alert("Done", describeAddResult(result));
            onDone?.(result);
            close();
        } catch (err) {
            Alert.alert("Couldn't add people", err?.response?.data?.message || "Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <BottomSheet visible={visible} onClose={close} backgroundColor={colors.background}
            header={<Text style={{ fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: 12 }}>Add people</Text>}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 1 }}>
                <PeoplePicker groupId={groupId} selected={selected} onChange={setSelected} />
            </ScrollView>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                {onShareLink ? (
                    <PillButton variant="secondary" label="Link" icon={<Link2 size={16} color={colors.text} />} onPress={() => { close(); onShareLink(); }} />
                ) : null}
                <PillButton variant="primary" style={{ flex: 1 }} loading={saving} disabled={!selected.length}
                    icon={<UserPlus size={16} color={t.onInk} />} label={selected.length ? `Add ${selected.length}` : "Add"} onPress={submit} />
            </View>
        </BottomSheet>
    );
}
