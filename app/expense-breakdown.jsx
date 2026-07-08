import AsyncStorage from "@react-native-async-storage/async-storage";
import { Loader } from "@/components/Loader";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { router } from "expo-router";
import { ChevronLeft, PieChart as PieIcon } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CACHE_KEY = "analytics_cache_v1";

export default function ExpenseBreakdown() {
  const { colors, theme } = useTheme();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const isDark = theme === "dark";
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const loadCachedAnalytics = async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        setAnalytics(JSON.parse(cached));
        setLoading(false);
      }
    } catch (error) {
      console.log("Failed to load cached analytics:", error);
    }
  };

  const fetchAnalytics = async () => {
    setIsFetching(true);
    try {
      const res = await api.get("/users/analytics");
      setAnalytics(res.data);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(res.data));
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadCachedAnalytics();
    fetchAnalytics();
  }, []);

  if (!analytics && loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Loader size={48} />
          <Text style={styles.loadingText}>Loading breakdown...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const categoryBreakdown = analytics?.categoryBreakdown || [];
  const total = categoryBreakdown.reduce((sum, item) => sum + item.amount, 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Expense Breakdown</Text>
          <Text style={styles.subtitle}>All categories for this month</Text>
        </View>
        <View style={styles.headerIcon}>
          <PieIcon size={18} color={colors.primary} />
        </View>
      </View>

      {isFetching && (
        <View style={styles.refreshBadge}>
          <Loader size={18} color="#fff" />
          <Text style={styles.refreshText}>Refreshing...</Text>
        </View>
      )}

      <FlatList
        data={categoryBreakdown}
        keyExtractor={(item, index) => `${item.category}-${index}`}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No expense data yet.</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const percent = total ? Math.round((item.amount / total) * 100) : 0;
          return (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.colorDot, { backgroundColor: getColor(index) }]} />
                <View>
                  <Text style={styles.rowTitle}>{item.category}</Text>
                  <Text style={styles.rowSub}>{percent}% of total</Text>
                </View>
              </View>
              <Text style={styles.rowValue}>₹{item.amount.toLocaleString()}</Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const getColor = (index) => {
  const colors = [
    "#6366F1",
    "#8B5CF6",
    "#EC4899",
    "#10B981",
    "#F59E0B",
    "#3B82F6",
  ];
  return colors[index % colors.length];
};

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    headerIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? "rgba(99,102,241,0.15)" : "#EEF2FF",
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: isDark ? "rgba(99,102,241,0.35)" : "#E0E7FF",
    },
    refreshBadge: {
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 20,
      marginBottom: 8,
    },
    refreshText: {
      color: "white",
      fontSize: 12,
      fontWeight: "600",
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 14,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    colorDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    rowTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    rowSub: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    rowValue: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    emptyState: {
      padding: 40,
      alignItems: "center",
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: colors.textSecondary,
    },
  });
