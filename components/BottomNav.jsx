import { router, usePathname } from "expo-router";
import { Home, PlusCircle, Split } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function BottomNav() {
  const path = usePathname();

  return (
    <View style={styles.navWrapper}>
      <NavItem
        active={path === "/dashboard"}
        icon={<Home size={22} color={path === "/dashboard" ? "#4F46E5" : "#64748B"} />}
        label="Home"
        onPress={() => router.push("/dashboard")}
      />

      <NavItem
        active={path === "/create-group"}
        icon={<PlusCircle size={22} color={path === "/create-group" ? "#4F46E5" : "#64748B"} />}
        label="Group"
        onPress={() => router.push("/create-group")}
      />

      <NavItem
        active={path === "/split"}
        icon={<Split size={22} color={path === "/split" ? "#4F46E5" : "#64748B"} />}
        label="Split"
        onPress={() => router.push("/split")}
      />
    </View>
  );
}

function NavItem({ icon, label, active, onPress }) {
  return (
    <TouchableOpacity style={styles.navItem} onPress={onPress}>
      {icon}
      <Text style={[styles.navLabel, active && { color: "#4F46E5", fontWeight: "700" }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  navWrapper: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "white",
  },
  navItem: {
    justifyContent: "center",
    alignItems: "center",
  },
  navLabel: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748B",
  },
});
