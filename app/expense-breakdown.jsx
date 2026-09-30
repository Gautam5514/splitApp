import { useBottomSpacing } from "@/hooks/useSafeSpacing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Loader } from "@/components/Loader";
import { ChartSkeleton, RowListSkeleton } from "@/components/ui/Skeleton";
import { Block, IconCircle, ListRow, RoundButton, ScreenHeader, useDesign } from "@/components/ui/Design";
import { PieChart as PieIcon } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
    FlatList,
    StyleSheet,
    View,
} from "react-native";
import { Text } from "@/components/ui/Typography";
import { api } from "@/lib/api";
import { SafeAreaView } from "react-native-safe-area-context";

const CACHE_KEY = "analytics_cache_v1";

export default function ExpenseBreakdown() {
  const { colors } = useDesign();
  const bottomSpacing = useBottomSpacing(32);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const styles = useMemo(() => getStyles(colors), [colors]);

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
        <View style={{ paddingTop: 16 }}>
          <ChartSkeleton height={200} />
          <View style={{ height: 12 }} />
          <RowListSkeleton count={5} />
        </View>
      </SafeAreaView>
    );
  }

  const categoryBreakdown = analytics?.categoryBreakdown || [];
  const total = categoryBreakdown.reduce((sum, item) => sum + item.amount, 0);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader
        back
        title="Expense Breakdown"
        subtitle="All categories for this month"
        right={
          <RoundButton label="Breakdown">
            <PieIcon size={18} color={colors.primary} />
          </RoundButton>
        }
      />

      {isFetching && (
        <View style={styles.refreshBadge}>
          <Loader size={18} color={colors.onPrimary} />
          <Text style={styles.refreshText}>Refreshing...</Text>
        </View>
      )}

      <FlatList
        data={categoryBreakdown}
        keyExtractor={(item, index) => `${item.category}-${index}`}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomSpacing }]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No expense data yet.</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const percent = total ? Math.round((item.amount / total) * 100) : 0;
          return (
            <Block style={styles.rowBlock} padded={false}>
              <ListRow
                leading={
                  <IconCircle tint={getColor(index) + "22"}>
                    <View style={[styles.colorDot, { backgroundColor: getColor(index) }]} />
                  </IconCircle>
                }
                title={item.category}
                subtitle={`${percent}% of total`}
                trailing={<Text style={styles.rowValue}>₹{item.amount.toLocaleString()}</Text>}
              />
            </Block>
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

const getStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      color: colors.onPrimary,
      fontSize: 12,
      fontWeight: "600",
    },
    listContent: {
      paddingBottom: 40,
    },
    rowBlock: {
      marginBottom: 12,
    },
    colorDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
    },
    rowValue: {
      fontSize: 15,
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