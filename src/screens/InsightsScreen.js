import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/UI";
import { getCat } from "../utils/constants";
import { insightService } from "../services/insightService";

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const { t, mode } = useTheme();
  const { user }    = useAuth();
  const [data, setData]       = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const bars   = monthly?.months || [];
  const maxBar = bars.length ? Math.max(...bars.map(b => b.total), 1) : 1;

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [result, monthlyResult] = await Promise.all([
        insightService.getInsights(user.id),
        insightService.getMonthly(user.id, 5),
      ]);
      setData(result);
      setMonthly(monthlyResult);
    } catch (err) {
      setData(null);
      setMonthly(null);
      setError("Could not load insights. Check the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const spendItems = data && data.total_spend > 0
    ? Object.entries(data.by_category).map(([cat, amt]) => ({
        cat, amt, pct: Math.round((amt / data.total_spend) * 100),
      }))
    : [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ backgroundColor: t.primary, padding: 20, paddingTop: insets.top + 12, paddingBottom: 24 }}>
        <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 2 }}>Your spending</Text>
        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "500" }}>Insights</Text>
      </View>

      {loading ? (
        <View style={{ padding: 48, alignItems: "center" }}>
          <ActivityIndicator color={t.primary} size="large" />
          <Text style={{ fontSize: 13, color: t.textHint, marginTop: 12 }}>Loading insights...</Text>
        </View>
      ) : (
        <View style={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[
              [`${monthly?.current_label || "This month"} spend`,
                `SGD ${(data?.total_spend ?? 0).toLocaleString()}`, t.primary],
              [monthly?.prev_label ? `vs ${monthly.prev_label}` : "vs prev",
                monthly?.change_pct === null || monthly?.change_pct === undefined
                  ? "—"
                  : `${monthly.change_pct > 0 ? "+" : ""}${monthly.change_pct}%`,
                (monthly?.change_pct ?? 0) > 0 ? t.danger : t.success],
              ["Transactions", `${data?.num_transactions ?? 0}`, t.warning],
              ["ML accuracy",
                data?.ml_accuracy === null || data?.ml_accuracy === undefined
                  ? "—"
                  : `${(data.ml_accuracy * 100).toFixed(1)}%`,
                t.primary],
            ].map(([label, val, color]) => (
              <Card key={label} style={{ flex: 1, padding: 12 }}>
                <Text style={{ fontSize: 10, color: t.textSub, marginBottom: 4 }}>{label}</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color }}>{val}</Text>
              </Card>
            ))}
          </View>

          <Card style={{ padding: 14 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: t.text, marginBottom: 16 }}>Monthly overview</Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, height: 100 }}>
              {bars.map((b, i) => (
                <View key={`${b.year}-${b.month}`} style={{ flex: 1, alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 9, color: b.is_current ? t.primary : t.textHint }}>
                    {b.total >= 1000 ? `$${(b.total / 1000).toFixed(1)}k` : `$${Math.round(b.total)}`}
                  </Text>
                  <View style={{ width: "100%",
                                 height: Math.max(2, Math.round((b.total / maxBar) * 72)),
                                 backgroundColor: b.is_current ? t.primary : t.border, borderRadius: 6 }} />
                  <Text style={{ fontSize: 10, color: b.is_current ? t.primary : t.textHint,
                                 fontWeight: b.is_current ? "600" : "400" }}>{b.label}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Card style={{ padding: 14 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: t.text, marginBottom: 12 }}>By category</Text>
            {spendItems.length === 0 && (
              <Text style={{ fontSize: 12, color: t.textHint, paddingVertical: 8 }}>
                No spending recorded in this period yet.
              </Text>
            )}
            {spendItems.map(s => {
              const c = getCat(s.cat, mode);
              return (
                <View key={s.cat} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.text }} />
                  <Text style={{ fontSize: 12, color: t.textSub, width: 95 }}>{s.cat}</Text>
                  <View style={{ flex: 1, height: 6, backgroundColor: t.surface2, borderRadius: 99, overflow: "hidden" }}>
                    <View style={{ width: `${s.pct}%`, height: "100%", backgroundColor: c.text, borderRadius: 99 }} />
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: "500", color: t.text, width: 52, textAlign: "right" }}>
                    ${s.amt.toLocaleString()}
                  </Text>
                </View>
              );
            })}
          </Card>

          <View style={{ backgroundColor: t.primaryBg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: t.primary }}>
            <Text style={{ fontSize: 13, fontWeight: "500", color: t.primary, marginBottom: 10 }}>
              ML categorisation accuracy
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={{ fontSize: 32, fontWeight: "600", color: t.primary }}>
                {data?.ml_accuracy === null || data?.ml_accuracy === undefined
                  ? "—"
                  : `${(data.ml_accuracy * 100).toFixed(1)}%`}
              </Text>
              <View style={{ flex: 1 }}>
                <View style={{ height: 7, backgroundColor: t.border, borderRadius: 99, overflow: "hidden" }}>
                  <View style={{ width: `${(data?.ml_accuracy || 0) * 100}%`, height: "100%",
                                 backgroundColor: t.primary, borderRadius: 99 }} />
                </View>
                <Text style={{ fontSize: 11, color: t.textSub, marginTop: 4 }}>
                  {data?.num_transactions ?? 0} transactions · rule-based + ML ensemble
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}