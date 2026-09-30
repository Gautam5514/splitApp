import { Block, PillButton, SectionLabel, useDesign } from "@/components/ui/Design";
import { RowListSkeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { PlusCircle } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
    StyleSheet,
    View,
} from "react-native";
import { Text } from "@/components/ui/Typography";
import AddStepForm from "./AddStepForm";
import CreateNotepadModal from "./CreateNotepadModal";
import NotepadItem from "./NotepadItem";

export default function NotepadSection({ groupId }) {
    const { colors, t } = useDesign();
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [notepads, setNotepads] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const styles = getStyles(colors);

    const fetchNotepads = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/notepads/${groupId}`);
            setNotepads(res.data || []);
        } catch (e) {
            console.error("Failed to load notepads");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (groupId) fetchNotepads();
    }, [groupId]);

    const handleCreateNotepad = async (title) => {
        if (!title) return;
        try {
            setCreating(true);
            const res = await api.post("/notepads", { groupId, title });
            setNotepads((prev) => [...prev, res.data]);
            setIsModalOpen(false);
        } catch (e) {
            console.error("Failed to create notepad");
        } finally {
            setCreating(false);
        }
    };

    const handleAddStep = async (notepadId, step) => {
        try {
            const res = await api.post(`/notepads/${notepadId}/steps`, step);
            setNotepads((prev) =>
                prev.map((np) => (np._id === notepadId ? res.data : np))
            );
        } catch (e) {
            console.error("Failed to add step");
        }
    };

    const handleDeleteStep = async () => {
        console.log("Delete step feature is coming soon!");
    };

    if (loading) {
        return (
            <View style={{ paddingTop: 12 }}>
                <RowListSkeleton count={4} />
            </View>
        );
    }

    return (
        <>
            <CreateNotepadModal
                isOpen={isModalOpen}
                onConfirm={handleCreateNotepad}
                onCancel={() => setIsModalOpen(false)}
                creating={creating}
            />

            <SectionLabel
                right={
                    <PillButton
                        variant="primary"
                        label="New Notepad"
                        onPress={() => setIsModalOpen(true)}
                        icon={<PlusCircle size={16} color={t.onInk} />}
                        style={styles.newButton}
                        textStyle={styles.newButtonText}
                    />
                }
            >
                Group Notepads
            </SectionLabel>

            {notepads.length === 0 ? (
                <Block>
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyTitle}>No Notepads Yet</Text>
                        <Text style={styles.emptyText}>
                            Click &apos;New Notepad&apos; to start planning!
                        </Text>
                    </View>
                </Block>
            ) : (
                notepads.map((notepad) => (
                    <Block key={notepad._id}>
                        <Text style={styles.notepadTitle}>{notepad.title}</Text>

                        {notepad.steps.length > 0 && (
                            <View style={styles.stepsList}>
                                {notepad.steps.map((step) => (
                                    <NotepadItem
                                        key={step._id}
                                        step={step}
                                        onDelete={() => handleDeleteStep(notepad._id, step._id)}
                                    />
                                ))}
                            </View>
                        )}

                        <AddStepForm
                            onAdd={(step) => handleAddStep(notepad._id, step)}
                        />
                    </Block>
                ))
            )}
        </>
    );
}

const getStyles = (colors) => StyleSheet.create({
    loadingContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 80,
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    newButton: {
        height: 40,
        paddingHorizontal: 14,
    },
    newButtonText: {
        fontSize: 14,
    },
    emptyContainer: {
        alignItems: "center",
        paddingVertical: 40,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 4,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    notepadTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 12,
    },
    stepsList: {
        gap: 6,
        marginBottom: 12,
    },
});
