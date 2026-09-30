import PendingInvitesList from "@/components/invites/PendingInvitesList";
import { ScreenHeader, useDesign } from "@/components/ui/Design";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function InvitesScreen() {
    const { colors } = useDesign();
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
            <ScreenHeader back title="Group invites" subtitle="You join only when you accept" />
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                <PendingInvitesList />
            </ScrollView>
        </SafeAreaView>
    );
}
