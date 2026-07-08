import { StyleSheet, Text, View } from "react-native";

export default function Footer() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>© {new Date().getFullYear()} SplitEase</Text>
      <Text style={styles.sub}>Made with ❤️ for travelers.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 25,
    alignItems: "center",
    backgroundColor: "white",
  },
  text: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  sub: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
  },
});
