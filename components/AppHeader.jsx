import { router } from "expo-router";
import {
    Bell,
    ChevronDown,
    LogOut,
    Moon,
    Sun,
    User,
} from "lucide-react-native";
import { useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Image,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function AppHeader({
  user,
  onLogout,
  onToggleTheme,
  theme = "light",
  notifications = [],
  hasUnread = false,
}) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const toggleNotif = () => {
    setNotifOpen(!notifOpen);
    Animated.timing(fadeAnim, {
      toValue: notifOpen ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  return (
    <SafeAreaView style={styles.headerWrapper}>
      <View style={styles.headerRow}>
        {/* Brand */}
        <TouchableOpacity onPress={() => router.push("/")} style={styles.brandBox}>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.brandText}>SplitEase</Text>
        </TouchableOpacity>

        {/* Right Controls */}
        <View style={styles.rightRow}>
          {/* Notifications */}
          <Pressable onPress={toggleNotif} style={styles.iconButton}>
            <Bell size={20} color="#475569" />
            {hasUnread && <View style={styles.unreadDot} />}
          </Pressable>

          {/* Theme Switch */}
          <Pressable onPress={onToggleTheme} style={styles.iconButton}>
            {theme === "dark" ? (
              <Sun size={20} color="#475569" />
            ) : (
              <Moon size={20} color="#475569" />
            )}
          </Pressable>

          {/* Avatar + Menu */}
          <View>
            <Pressable onPress={() => setMenuOpen(!menuOpen)} style={styles.profileButton}>
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatar} />
              ) : (
                <User size={22} color="#475569" />
              )}
              <ChevronDown size={16} color="#475569" />
            </Pressable>

            {/* Profile Menu */}
            {menuOpen && (
              <View style={styles.dropdownMenu}>
                <TouchableOpacity
                  onPress={() => {
                    setMenuOpen(false);
                    router.push("/profile");
                  }}
                >
                  <Text style={styles.menuItem}>Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                >
                  <Text style={[styles.menuItem, { color: "#dc2626" }]}>
                    <LogOut size={14} /> Logout
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Notifications Popup */}
      {notifOpen && (
        <Animated.View style={[styles.notificationBox, { opacity: fadeAnim }]}>
          <Text style={styles.notifTitle}>Notifications</Text>

          {notifications.length === 0 ? (
            <Text style={styles.noNotifText}>No new notifications</Text>
          ) : (
            notifications.slice(0, 5).map((n, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => {
                  setNotifOpen(false);
                  router.push(n.link || "/dashboard");
                }}
                style={styles.notifItem}
              >
                <Text style={styles.notifMessage}>{n.message}</Text>
                <Text style={styles.notifDate}>
                  {new Date(n.createdAt).toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: "white",
    width: "100%",
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
  },
  brandBox: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerLogo: {
    width: 28,
    height: 28,
    borderRadius: 7,
    marginRight: 8,
  },
  brandText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#4f46e5",
  },
  rightRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    padding: 8,
    marginRight: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    backgroundColor: "red",
    borderRadius: 50,
    position: "absolute",
    top: 6,
    right: 6,
  },
  profileButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 4,
  },
  dropdownMenu: {
    position: "absolute",
    top: 36,
    right: 0,
    width: 150,
    backgroundColor: "white",
    borderRadius: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
  },

  // Notifications Panel
  notificationBox: {
    position: "absolute",
    right: 16,
    top: 90,
    width: width * 0.8,
    backgroundColor: "white",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  noNotifText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    paddingVertical: 20,
  },
  notifItem: {
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 10,
  },
  notifMessage: {
    fontSize: 14,
    fontWeight: "500",
  },
  notifDate: {
    fontSize: 12,
    color: "#94a3b8",
  },
});
