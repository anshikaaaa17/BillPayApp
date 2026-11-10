import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Card, Badge } from "../components/UI";
import { getCat } from "../utils/constants";
import api from "../services/api";

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t, mode, toggle } = useTheme();
  const { user, refreshUser } = useAuth();

  const [bills, setBills]         = useState([]);
  const [spend, setSpend]         = useState([]);
  const [totalSpend, setTotal]    = useState(0);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [noLinked, setNoLinked]   = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Re-read the wallet balance from the backend so it never drifts from the DB
      refreshUser();

      const [billsRes, insightsRes] = await Promise.all([
        api.get(`/bills/outstanding/${user.id}`),
        api.get(`/insights/${user.id}`),
      ]);

      if (billsRes.count === 0) {
        setNoLinked(true);
        setBills([]);
      } else {
        setNoLinked(false);
        setBills(billsRes.bills.filter(b => b.status !== "fetch_failed"));
      }

      if (insightsRes.by_category) {
        const spendArr = Object.entries(insightsRes.by_category).map(([cat, amt]) => ({
          cat, amt, pct: Math.round((amt / insightsRes.total_spend) * 100),
        }));
        setSpend(spendArr);
        setTotal(insightsRes.total_spend);
      }
    } catch (err) {
      setNoLinked(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Re-fetch whenever Home regains focus (e.g. returning from Top Up or Confirm)
  useEffect(() => {
    const unsub = navigation.addListener("focus", fetchData);
    return unsub;
  }, [navigation, fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />}>

      {/* Header */}
      <View style={{ backgroundColor: t.primary, padding: 20, paddingTop: insets.top + 12, paddingBottom: 28 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>Good morning,</Text>
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "500", marginTop: 2 }}>
              {user?.name?.split(" ")[0]}
            </Text>
          </View>
          <TouchableOpacity onPress={toggle}
            style={{ width: 40, height: 40, borderRadius: 20,
                     backgroundColor: "rgba(255,255,255,0.2)",
                     alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={mode === "dark" ? "sunny" : "moon"} size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Wallet balance */}
        <View style={{ backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 16, padding: 16, marginTop: 16 }}>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, letterSpacing: 0.5 }}>WALLET BALANCE</Text>
          <Text style={{ color: "#fff", fontSize: 30, fontWeight: "600", marginTop: 4 }}>
            SGD {user?.walletBalance?.toFixed(2) || "0.00"}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate("TopUp")}
            style={{ backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 8,
                     paddingVertical: 7, paddingHorizontal: 14, marginTop: 12, alignSelf: "flex-start" }}>
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "500" }}>+ Top up</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick actions */}
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: "500", color: t.text, marginBottom: 12 }}>Quick actions</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {[
            { label: "Pay bill",   icon: "card-outline",      action: () => navigation.navigate("Pay")      },
            { label: "Link biller",icon: "link-outline",      action: () => navigation.navigate("LinkBiller")},
            { label: "Top up",     icon: "wallet-outline",    action: () => navigation.navigate("TopUp")    },
            { label: "History",    icon: "time-outline",      action: () => navigation.navigate("History")  },
          ].map(q => (
            <TouchableOpacity key={q.label} onPress={q.action}
              style={{ flex: 1, backgroundColor: t.surface, borderRadius: 12, padding: 12,
                       alignItems: "center", borderWidth: 0.5, borderColor: t.border }}>
              <Ionicons name={q.icon} size={22} color={t.primary} />
              <Text style={{ fontSize: 10, fontWeight: "500", color: t.textSub,
                             textAlign: "center", marginTop: 4 }}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Upcoming bills */}
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between",
                       alignItems: "center", marginBottom: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: "500", color: t.text }}>Upcoming bills</Text>
          <TouchableOpacity onPress={() => navigation.navigate("LinkBiller")}>
            <Text style={{ fontSize: 13, color: t.primary }}>+ Link biller</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <Card style={{ padding: 32, alignItems: "center" }}>
            <ActivityIndicator color={t.primary} />
            <Text style={{ fontSize: 13, color: t.textSub, marginTop: 10 }}>
              Fetching your bills...
            </Text>
          </Card>
        ) : noLinked ? (
          <Card style={{ padding: 24, alignItems: "center" }}>
            <Ionicons name="receipt-outline" size={40} color={t.textHint} />
            <Text style={{ fontSize: 14, fontWeight: "500", color: t.text,
                           marginTop: 12, marginBottom: 6, textAlign: "center" }}>
              No bills linked yet
            </Text>
            <Text style={{ fontSize: 13, color: t.textSub, textAlign: "center",
                           marginBottom: 16, lineHeight: 18 }}>
              Link your biller accounts to automatically fetch outstanding bills
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("LinkBiller")}
              style={{ backgroundColor: t.primary, borderRadius: 10,
                       paddingVertical: 10, paddingHorizontal: 20 }}>
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "500" }}>Link a biller</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <Card style={{ overflow: "hidden", padding: 0 }}>
            {bills.map((bill, i) => (
              <TouchableOpacity key={bill.biller_code + i}
                onPress={() => navigation.navigate("Pay")}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
                         borderBottomWidth: i < bills.length - 1 ? 0.5 : 0,
                         borderBottomColor: t.border }}>
                <View style={{ width: 40, height: 40, borderRadius: 12,
                               backgroundColor: (bill.biller_color || "#6B7280") + "22",
                               alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={bill.biller_icon || "receipt"} size={20}
                    color={bill.biller_color || "#6B7280"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: t.text, marginBottom: 3 }}>
                    {bill.nickname || bill.biller_name}
                  </Text>
                  <Badge cat={bill.biller_category} />
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: t.text, marginBottom: 2 }}>
                    SGD {bill.amount?.toFixed(2)}
                  </Text>
                  <Text style={{ fontSize: 11,
                                 color: bill.due_in_days <= 3 ? t.danger : t.warning }}>
                    Due in {bill.due_in_days}d
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </Card>
        )}
      </View>

      {/* Spend summary */}
      {spend.length > 0 && (
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: "500", color: t.text, marginBottom: 10 }}>
            This month · SGD {totalSpend.toFixed(2)}
          </Text>
          <Card style={{ padding: 14 }}>
            {spend.slice(0, 5).map(s => {
              const c = getCat(s.cat, mode);
              return (
                <View key={s.cat} style={{ flexDirection: "row", alignItems: "center",
                                           gap: 8, marginBottom: 10 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.text }} />
                  <Text numberOfLines={1} ellipsizeMode="tail"
                        style={{ fontSize: 12, color: t.textSub, width: 96 }}>{s.cat}</Text>
                  <View style={{ flex: 1, height: 6, backgroundColor: t.surface2,
                                 borderRadius: 99, overflow: "hidden" }}>
                    <View style={{ width: `${s.pct}%`, height: "100%",
                                   backgroundColor: c.text, borderRadius: 99 }} />
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: "500", color: t.text,
                                 width: 52, textAlign: "right" }}>
                    ${s.amt.toLocaleString()}
                  </Text>
                </View>
              );
            })}
          </Card>
        </View>
      )}
    </ScrollView>
  );
}
