import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Btn, Card, SectionLabel } from "../components/UI";

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t, mode, toggle } = useTheme();
  const { user, logout } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);

  // Every row below either performs a real action or is explicitly marked as
  // read-only. Nothing here displays data the backend cannot actually provide.
  const sections = [
    { title: "Account", items: [
      { iconName: "person-outline", label: "Personal details", sub: user?.email,
        action: () => navigation.navigate("PersonalDetails") },
      { iconName: "lock-closed-outline", label: "Change password", sub: "Update your password",
        action: () => navigation.navigate("ChangePassword") },
    ]},
    { title: "Preferences", items: [
      { iconName: mode === "dark" ? "sunny-outline" : "moon-outline",
        label: mode === "dark" ? "Light mode" : "Dark mode",
        sub: "Currently " + mode + " mode", action: toggle },
      { iconName: "cash-outline", label: "Currency", sub: "SGD — Singapore Dollar", readOnly: true },
    ]},
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ backgroundColor: t.primary, padding: 20, paddingTop: insets.top + 12, paddingBottom: 28 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.2)",
                           alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 20, fontWeight: "500", color: "#fff" }}>{user?.initials}</Text>
            </View>
            <View>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "500", marginBottom: 2 }}>{user?.name}</Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>{user?.email}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate("TopUp")}
            style={{ backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, padding: 12, marginTop: 14 }}>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginBottom: 2 }}>Wallet balance</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: "#fff", fontSize: 20, fontWeight: "500" }}>SGD {user?.walletBalance?.toFixed(2)}</Text>
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>Top up +</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ padding: 16, gap: 16 }}>
          {sections.map(sec => (
            <View key={sec.title}>
              <SectionLabel text={sec.title} />
              <Card style={{ overflow: "hidden", padding: 0 }}>
                {sec.items.map((item, i) => (
                  <TouchableOpacity key={item.label} onPress={item.action || undefined}
                    disabled={!item.action}
                    activeOpacity={item.action ? 0.6 : 1}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
                             borderBottomWidth: i < sec.items.length - 1 ? 0.5 : 0, borderBottomColor: t.border }}>
                    <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: t.primaryBg,
                                   alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name={item.iconName} size={18} color={t.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "500", color: t.text, marginBottom: 1 }}>{item.label}</Text>
                      {item.sub && <Text style={{ fontSize: 12, color: t.textHint }}>{item.sub}</Text>}
                    </View>
                    {!item.readOnly && (
                      <Ionicons name="chevron-forward" size={16} color={t.textHint} />
                    )}
                  </TouchableOpacity>
                ))}
              </Card>
            </View>
          ))}
          <Btn label="Sign out" onPress={() => setShowConfirm(true)} variant="danger" />
        </View>
      </ScrollView>

      {showConfirm && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                       backgroundColor: t.overlay, justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: t.surface, borderRadius: 24, padding: 24, margin: 12, marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: "500", color: t.text, textAlign: "center", marginBottom: 8 }}>Sign out?</Text>
            <Text style={{ fontSize: 14, color: t.textSub, textAlign: "center", marginBottom: 24 }}>
              You will need to sign in again to access your bills.
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}><Btn label="Cancel" onPress={() => setShowConfirm(false)} variant="ghost" /></View>
              <View style={{ flex: 1 }}><Btn label="Sign out" onPress={logout} variant="danger" /></View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}