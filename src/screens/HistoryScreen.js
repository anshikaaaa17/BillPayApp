import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Card, Badge } from "../components/UI";
import { paymentService } from "../services/paymentService";

const BILLER_ICONS = {
  SP_POWER:  { icon: "flash",          color: "#3B82F6", bg: "#EFF6FF", dbg: "#1E3A5F" },
  PUB_WATER: { icon: "water",          color: "#0EA5E9", bg: "#F0F9FF", dbg: "#0C2D48" },
  SINGTEL:   { icon: "cellular",       color: "#8B5CF6", bg: "#F5F3FF", dbg: "#2E1065" },
  STARHUB:   { icon: "wifi",           color: "#7C3AED", bg: "#EDE9FE", dbg: "#2E1065" },
  HDB_RENT:  { icon: "home",           color: "#F59E0B", bg: "#FFFBEB", dbg: "#451A03" },
  DBS_LOAN:  { icon: "business",       color: "#10B981", bg: "#ECFDF5", dbg: "#064E3B" },
  UOB_CARD:  { icon: "card",           color: "#059669", bg: "#ECFDF5", dbg: "#064E3B" },
  NTUC_INS:  { icon: "shield",         color: "#EF4444", bg: "#FEF2F2", dbg: "#450A0A" },
  NETFLIX:   { icon: "tv",             color: "#DC2626", bg: "#FEF2F2", dbg: "#450A0A" },
  SPOTIFY:   { icon: "musical-notes",  color: "#16A34A", bg: "#F0FDF4", dbg: "#052E16" },
  NUS_FEES:  { icon: "school",         color: "#D97706", bg: "#FFFBEB", dbg: "#451A03" },
  SBS:       { icon: "bus",            color: "#0284C7", bg: "#F0F9FF", dbg: "#0C2D48" },
  GRAB:      { icon: "car",            color: "#16A34A", bg: "#F0FDF4", dbg: "#052E16" },
};

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { t, mode } = useTheme();
  const { user }    = useAuth();
  const [filter, setFilter]         = useState("All");
  const [transactions, setTxns]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  const cats = ["All", "Utilities", "Finance", "Telecoms", "Entertainment", "Insurance"];

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await paymentService.getHistory(user.id);
      const mapped = (data || []).map(t => ({
        ...t,
        ...(BILLER_ICONS[t.biller_code] || { icon: "receipt", color: "#6B7280", bg: "#F2F4F7", dbg: "#252837" }),
      }));
      setTxns(mapped);
    } catch (err) {
      setTxns([]);
      setError("Could not load transactions. Check the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === "All" ? transactions : transactions.filter(tx => tx.category === filter);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ backgroundColor: t.primary, padding: 20, paddingTop: insets.top + 12, paddingBottom: 24 }}>
        <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 2 }}>All payments</Text>
        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "500" }}>History</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ paddingVertical: 12 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {cats.map(c => (
          <TouchableOpacity key={c} onPress={() => setFilter(c)}
            style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1,
                     backgroundColor: filter === c ? t.primary : t.surface,
                     borderColor: filter === c ? t.primary : t.border }}>
            <Text style={{ fontSize: 13, fontWeight: "500", color: filter === c ? "#fff" : t.textSub }}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 16 }}>
        {loading ? (
          <View style={{ padding: 32, alignItems: "center" }}>
            <ActivityIndicator color={t.primary} />
            <Text style={{ fontSize: 13, color: t.textHint, marginTop: 8 }}>Loading history...</Text>
          </View>
        ) : (
          <Card style={{ overflow: "hidden", padding: 0 }}>
            {filtered.length === 0 ? (
              <View style={{ padding: 32, alignItems: "center" }}>
                <Ionicons name={error ? "cloud-offline-outline" : "receipt-outline"} size={32} color={error ? "#EF4444" : t.textHint} />
                <Text style={{ fontSize: 13, color: error ? "#EF4444" : t.textHint, marginTop: 8, textAlign: "center" }}>
                  {error || "No transactions yet. Pay a bill to see it here."}
                </Text>
              </View>
            ) : filtered.map((tx, i) => (
              <View key={tx.id || i}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
                         borderBottomWidth: i < filtered.length - 1 ? 0.5 : 0, borderBottomColor: t.border }}>
                <View style={{ width: 40, height: 40, borderRadius: 11,
                               backgroundColor: mode === "dark" ? tx.dbg : tx.bg,
                               alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={tx.icon} size={20} color={tx.iconColor || tx.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: t.text, marginBottom: 4 }}>{tx.biller || tx.biller_name}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontSize: 11, color: t.textHint }}>{tx.date || tx.created_at?.split("T")[0]}</Text>
                    <Badge cat={tx.category} />
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: t.text, marginBottom: 2 }}>-${tx.amount?.toFixed(2)}</Text>
                  <Text style={{ fontSize: 11, color: t.success, fontWeight: "500" }}>Success</Text>
                </View>
              </View>
            ))}
          </Card>
        )}
      </View>
    </ScrollView>
  );
}