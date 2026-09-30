import { useDesign } from "@/components/ui/Design";
import { Text } from "@/components/ui/Typography";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ModalScreen() {
  const { colors } = useDesign();
  const styles = getStyles(colors);
  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Text style={styles.text}>This is a modal screen</Text>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  text: { fontSize: 18, fontWeight: "600", color: colors.text },
});
