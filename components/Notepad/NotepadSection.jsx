import { useTheme } from "@/context/ThemeContext";
import { Loader } from "@/components/Loader";
import { api } from "@/lib/api";
import { FileText, PlusCircle } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import AddStepForm from "./AddStepForm";
import CreateNotepadModal from "./CreateNotepadModal";
import NotepadItem from "./NotepadItem";

export default function NotepadSection({ groupId }) {
    const { colors } = useTheme();
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
            <View style={styles.loadingContainer}>
                <Loader size={48} />
                <Text style={styles.loadingText}>Loading Notepads...</Text>
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

            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <FileText size={22} color={colors.primary} />
                        <Text style={styles.headerTitle}>Group Notepads</Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => setIsModalOpen(true)}
                        style={styles.createButton}
                    >
                        <PlusCircle size={16} color="white" />
                        <Text style={styles.createButtonText}>New Notepad</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    {notepads.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyTitle}>No Notepads Yet</Text>
                            <Text style={styles.emptyText}>
                                Click &apos;New Notepad&apos; to start planning!
                            </Text>
                        </View>
                    ) : (
                        notepads.map((notepad) => (
                            <View key={notepad._id} style={styles.notepadCard}>
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
                            </View>
                        ))
                    )}
                </View>
            </View>
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
    container: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 20,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.primary,
    },
    createButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    createButtonText: {
        color: "white",
        fontSize: 14,
        fontWeight: "600",
    },
    content: {
        gap: 20,
    },
    emptyContainer: {
        alignItems: "center",
        paddingVertical: 64,
        borderWidth: 2,
        borderStyle: "dashed",
        borderColor: colors.border,
        borderRadius: 12,
        backgroundColor: colors.background, // Or subtle shift
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
    notepadCard: {
        backgroundColor: colors.inputBackground, // Slightly different background for card
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    notepadTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 16,
    },
    stepsList: {
        gap: 12,
        marginBottom: 16,
    },
});
