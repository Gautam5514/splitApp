import { Github, Linkedin, Mail } from "lucide-react-native";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function AppFooter() {
  return (
    <View style={styles.footer}>
      {/* Brand */}
      <View style={styles.brandBox}>
        <Text style={styles.brand}>SplitEase</Text>
        <Text style={styles.tagline}>
          Simplifying group expenses & shared moments 💸
        </Text>
        <Text style={styles.copy}>© {new Date().getFullYear()} SplitEase</Text>
      </View>

      {/* Navigation */}
      <View style={styles.linksRow}>
        {["About", "Team", "Privacy", "Terms", "Contact"].map((t) => (
          <TouchableOpacity key={t} onPress={() => {}}>
            <Text style={styles.link}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Social */}
      <View style={styles.socialRow}>
        <TouchableOpacity onPress={() => Linking.openURL("mailto:softgpt9299@gmail.com")}>
          <Mail size={18} color="#64748B" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => Linking.openURL("https://github.com")}>
          <Github size={18} color="#64748B" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => Linking.openURL("https://linkedin.com")}>
          <Linkedin size={18} color="#64748B" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    width: "100%",
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "white",
  },
  brandBox: {
    alignItems: "center",
    marginBottom: 16,
  },
  brand: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  tagline: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  copy: {
    fontSize: 12,
    marginTop: 4,
    color: "#94A3B8",
  },
  linksRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  link: {
    marginHorizontal: 8,
    fontSize: 13,
    color: "#64748B",
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 2,
  },
});
