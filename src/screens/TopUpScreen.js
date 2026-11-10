import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Btn, Card, SectionLabel, AlertBox } from "../components/UI";
import { TOPUP_METHODS, TOPUP_AMOUNTS } from "../utils/constants";

export default function TopUpScreen({ navigation }) {
  const { t } = useTheme();
  const { user, topUpWallet } = useAuth();
  const [method, setMethod]   = useState(TOPUP_METHODS[0]);
  const [amount, setAmount]   = useState("");
  const [custom, setCustom]   = useState(false);
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const selected = parseFloat(amount) || 0;

  const ICONS = { paynow: "qr-code-outline", card: "card-outline", bank: "business-outline", nets: "wallet-outline" };

  const handleProceed = () => {
    if (selected <= 0 || selected > 2000) { setError("Enter an amount between SGD 1 and SGD 2,000"); return; }
    setError(""); setStep(2);
  };

  const handleTopUp = async () => {
    setLoading(true);
    await topUpWallet(selected);
    setLoading(false);
    setStep(3);
  };

  if (step === 3) return (
    <View style={{ flex: 1, backgroundColor: t.bg, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: t.successBg,
                     alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <Ionicons name="checkmark" size={40} color={t.success} />
      </View>
      <Text style={{ fontSize: 20, fontWeight: "500", color: t.text, marginBottom: 8, textAlign: "center" }}>Wallet topped up!</Text>
      <Text style={{ fontSize: 14, color: t.textSub, textAlign: "center", marginBottom: 6 }}>SGD {selected.toFixed(2)} added via {method.label}</Text>
      <Text style={{ fontSize: 16, fontWeight: "500", color: t.primary, marginBottom: 32 }}>New balance: SGD {user?.walletBalance?.toFixed(2)}</Text>
      <Btn label="Back to home" onPress={() => navigation.navigate("Main", { screen: "Home" })} />
      <View style={{ marginTop: 10 }}><Btn label="Top up again" onPress={() => { setStep(1); setAmount(""); }} variant="outline" /></View>
    </View>
  );

  if (step === 2) return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 24 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: Platform.OS === "ios" ? 48 : 16, marginBottom: 28 }}>
        <TouchableOpacity onPress={() => setStep(1)}>
          <Ionicons name="arrow-back" size={24} color={t.textSub} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "500", color: t.text }}>Confirm top up</Text>
      </View>
      <Card style={{ padding: 16, marginBottom: 16 }}>
        {[["Top up amount", "SGD " + selected.toFixed(2)], ["Payment method", method.label],
          ["Processing time", method.id === "paynow" ? "Instant" : "1-2 business days"],
          ["Fee", "Free"], ["New wallet balance", "SGD " + (user.walletBalance + selected).toFixed(2)],
        ].map(([k, v], i, arr) => (
          <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 9,
                                  borderBottomWidth: i < arr.length - 1 ? 0.5 : 0, borderBottomColor: t.border }}>
            <Text style={{ fontSize: 13, color: t.textSub }}>{k}</Text>
            <Text style={{ fontSize: 13, fontWeight: i === arr.length - 1 ? "500" : "400",
                           color: i === arr.length - 1 ? t.primary : t.text }}>{v}</Text>
          </View>
        ))}
      </Card>
      {method.id === "paynow" && (
        <Card style={{ padding: 16, marginBottom: 16, alignItems: "center" }}>
          <Text style={{ fontSize: 13, color: t.textSub, marginBottom: 12 }}>Scan this PayNow QR to complete top up</Text>
          <View style={{ width: 160, height: 160, borderRadius: 12, backgroundColor: t.surface2,
                         alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: t.border }}>
            <Ionicons name="qr-code" size={100} color={t.text} />
          </View>
          <Text style={{ fontSize: 11, color: t.textHint, marginTop: 10, textAlign: "center" }}>UEN: 202312345A - BillPay Pte Ltd</Text>
        </Card>
      )}
      <Btn label={loading ? "Processing..." : "Top up SGD " + selected.toFixed(2)} onPress={handleTopUp} loading={loading} />
      <View style={{ marginTop: 10 }}><Btn label="Cancel" onPress={() => setStep(1)} variant="ghost" /></View>
    </ScrollView>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 24 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: Platform.OS === "ios" ? 48 : 16, marginBottom: 24 }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={t.textSub} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "500", color: t.text }}>Top up wallet</Text>
      </View>
      <Card style={{ padding: 16, marginBottom: 20, backgroundColor: t.primary }}>
        <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>Current wallet balance</Text>
        <Text style={{ fontSize: 28, fontWeight: "500", color: "#FFFFFF" }}>SGD {user?.walletBalance?.toFixed(2) || "0.00"}</Text>
      </Card>
      <SectionLabel text="Select amount" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {TOPUP_AMOUNTS.map(a => (
          <TouchableOpacity key={a} onPress={() => { setAmount(String(a)); setCustom(false); setError(""); }}
            style={{ paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1.5,
                     borderColor: amount === String(a) && !custom ? t.primary : t.border,
                     backgroundColor: amount === String(a) && !custom ? t.primaryBg : t.surface }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: amount === String(a) && !custom ? t.primary : t.text }}>${a}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={() => { setCustom(true); setAmount(""); }}
          style={{ paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1.5,
                   borderColor: custom ? t.primary : t.border, backgroundColor: custom ? t.primaryBg : t.surface }}>
          <Text style={{ fontSize: 14, fontWeight: "500", color: custom ? t.primary : t.text }}>Custom</Text>
        </TouchableOpacity>
      </View>
      {custom && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: "500", color: t.textSub, marginBottom: 5 }}>Enter amount (SGD)</Text>
          <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: t.primary,
                         borderRadius: 10, backgroundColor: t.inputBg, paddingHorizontal: 14 }}>
            <Text style={{ fontSize: 16, color: t.textSub, marginRight: 4 }}>$</Text>
            <TextInput value={amount} onChangeText={v => { setAmount(v); setError(""); }} placeholder="0.00"
              keyboardType="decimal-pad" placeholderTextColor={t.textHint}
              style={{ flex: 1, paddingVertical: 12, fontSize: 18, fontWeight: "500", color: t.primary }} />
          </View>
        </View>
      )}
      <AlertBox message={error} />
      <SectionLabel text="Payment method" />
      <Card style={{ marginBottom: 20, overflow: "hidden" }}>
        {TOPUP_METHODS.map((m, i) => (
          <TouchableOpacity key={m.id} onPress={() => setMethod(m)}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
                     borderBottomWidth: i < TOPUP_METHODS.length - 1 ? 0.5 : 0, borderBottomColor: t.border,
                     backgroundColor: method.id === m.id ? t.primaryBg : "transparent" }}>
            <View style={{ width: 36, height: 36, borderRadius: 9,
                           backgroundColor: method.id === m.id ? t.primary : t.surface2,
                           alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={ICONS[m.id]} size={18} color={method.id === m.id ? "#fff" : t.textSub} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "500", color: method.id === m.id ? t.primary : t.text }}>{m.label}</Text>
              <Text style={{ fontSize: 12, color: t.textHint }}>{m.description}</Text>
            </View>
            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2,
                           borderColor: method.id === m.id ? t.primary : t.border,
                           backgroundColor: method.id === m.id ? t.primary : "transparent",
                           alignItems: "center", justifyContent: "center" }}>
              {method.id === m.id && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" }} />}
            </View>
          </TouchableOpacity>
        ))}
      </Card>
      <Btn label="Continue" onPress={handleProceed} disabled={!amount || selected <= 0} />
    </ScrollView>
  );
}