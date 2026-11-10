import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Btn, Card, Badge } from "../components/UI";
import { paymentService } from "../services/paymentService";
import { saveTransaction } from "../services/database";

export default function ConfirmScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { t, mode }      = useTheme();
  const { user, refreshUser } = useAuth();
  const [status, setStatus] = useState("idle");
  const [txnId, setTxnId]   = useState("");
  const [errMsg, setErrMsg] = useState("");
  // Default to wallet when it covers the bill, otherwise direct
  const [payMethod, setPayMethod] = useState(
    (user?.walletBalance ?? 0) >= (route?.params?.amount ?? 0) ? "wallet" : "direct"
  );
  const payData = route?.params;

  const pay = async () => {
    setStatus("processing");
    setErrMsg("");
    try {
      // A payment is only successful if the backend recorded it. There is no
      // local simulation fallback: faking success here would tell the user a
      // bill was paid when no transaction exists server-side.
      const result = await paymentService.payBill({
        userId:        user.id,
        billerCode:    payData.biller.id,
        billerName:    payData.biller.name,
        amount:        payData.amount,
        reference:     payData.ref,
        paymentMethod: payMethod,
      });

      setTxnId(result.transaction_id);

      // Mirror into local SQLite for offline history
      await saveTransaction({
        transaction_id: result.transaction_id,
        user_id:        user.id,
        biller_code:    payData.biller.id,
        biller_name:    payData.biller.name,
        amount:         payData.amount,
        reference:      payData.ref,
        category:       result.category || payData.category,
        ml_confidence:  result.ml_confidence ?? payData.confidence / 100,
        ml_method:      result.ml_method || "unknown",
        status:         "success",
        payment_method: payMethod,
        synced:         true,
      });

      // Wallet payments change the balance server-side — pull the new value
      if (payMethod === "wallet") await refreshUser();

      setStatus("success");
    } catch (err) {
      setErrMsg(
        err?.status === 0
          ? "Cannot reach the server. The payment was not made."
          : err?.message || "Payment failed."
      );
      setStatus("failed");
    }
  };

  if (!payData) return (
    <View style={{ flex: 1, backgroundColor: t.bg, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <Ionicons name="card-outline" size={48} color={t.textHint} />
      <Text style={{ fontSize: 14, color: t.textSub, textAlign: "center", marginTop: 12, marginBottom: 24 }}>
        No payment in progress.
      </Text>
      <Btn label="Pay a bill" onPress={() => navigation.navigate("Main", { screen: "Pay" })} />
    </View>
  );

  if (status === "success") return (
    <View style={{ flex: 1, backgroundColor: t.bg, alignItems: "center", justifyContent: "center", padding: 28 }}>
      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: t.successBg,
                     alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <Ionicons name="checkmark" size={44} color={t.success} />
      </View>
      <Text style={{ fontSize: 22, fontWeight: "500", color: t.text, marginBottom: 6 }}>Payment successful!</Text>
      <Text style={{ fontSize: 13, color: t.textSub, marginBottom: 24 }}>{txnId}</Text>
      <Text style={{ fontSize: 11, color: t.textHint, marginBottom: 20 }}>Saved to local storage</Text>
      <Card style={{ width: "100%", padding: 16, marginBottom: 24 }}>
        {[
          ["Biller",     payData.biller.name],
          ["Amount",     `SGD ${payData.amount.toFixed(2)}`],
          ["Reference",  payData.ref],
          ["Category",   payData.category],
          ["Confidence", `${payData.confidence}%`],
        ].map(([k, v], i, arr) => (
          <View key={k} style={{ flexDirection: "row", justifyContent: "space-between",
                                  paddingVertical: 8, borderBottomWidth: i < arr.length - 1 ? 0.5 : 0,
                                  borderBottomColor: t.border }}>
            <Text style={{ fontSize: 13, color: t.textSub }}>{k}</Text>
            <Text style={{ fontSize: 13, fontWeight: "500", color: t.text }}>{v}</Text>
          </View>
        ))}
      </Card>
      <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
        <View style={{ flex: 1 }}><Btn label="Home" onPress={() => navigation.navigate("Main", { screen: "Home" })} variant="ghost" /></View>
        <View style={{ flex: 1 }}><Btn label="History" onPress={() => navigation.navigate("Main", { screen: "History" })} /></View>
      </View>
    </View>
  );

  if (status === "failed") return (
    <View style={{ flex: 1, backgroundColor: t.bg, alignItems: "center", justifyContent: "center", padding: 28 }}>
      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: t.dangerBg,
                     alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <Ionicons name="close" size={44} color={t.danger} />
      </View>
      <Text style={{ fontSize: 20, fontWeight: "500", color: t.text, marginBottom: 8 }}>Payment failed</Text>
      <Text style={{ fontSize: 14, color: t.textSub, textAlign: "center", marginBottom: 28, lineHeight: 20 }}>
        {errMsg || "The payment could not be completed. Please retry."}
      </Text>
      <Btn label="Retry payment" onPress={pay} />
      <View style={{ marginTop: 10, width: "100%" }}>
        <Btn label="Cancel" onPress={() => navigation.navigate("Main", { screen: "Pay" })} variant="ghost" />
      </View>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ backgroundColor: t.primary, padding: 20, paddingTop: insets.top + 12, paddingBottom: 24 }}>
        <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 2 }}>Review payment</Text>
        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "500" }}>Confirm and pay</Text>
      </View>
      <View style={{ padding: 16, gap: 12 }}>
        <Card style={{ padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12,
                         paddingBottom: 14, marginBottom: 14, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
            <View style={{ width: 48, height: 48, borderRadius: 12,
                           backgroundColor: mode === "dark" ? payData.biller.dbg : payData.biller.bg,
                           alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={payData.biller.icon} size={24} color={payData.biller.color} />
            </View>
            <View>
              <Text style={{ fontSize: 16, fontWeight: "500", color: t.text, marginBottom: 4 }}>
                {payData.biller.name}
              </Text>
              <Badge cat={payData.category} />
            </View>
          </View>
          {[
            ["Amount",      `SGD ${payData.amount.toFixed(2)}`, true],
            ["Reference",   payData.ref,                        false],
            ["Date",        new Date().toLocaleDateString("en-SG", {day:"2-digit",month:"short",year:"numeric"}), false],
            ["ML category", payData.category,                   false],
            ["Confidence",  `${payData.confidence}%`,           false],
          ].map(([k, v, bold], i) => (
            <View key={k} style={{ flexDirection: "row", justifyContent: "space-between",
                                    paddingVertical: 8, borderBottomWidth: i < 4 ? 0.5 : 0,
                                    borderBottomColor: t.border }}>
              <Text style={{ fontSize: 13, color: t.textSub }}>{k}</Text>
              <Text style={{ fontSize: 13, fontWeight: bold ? "600" : "400",
                             color: bold ? t.primary : t.text }}>{v}</Text>
            </View>
          ))}
        </Card>

        <Card style={{ padding: 16 }}>
          <Text style={{ fontSize: 12, color: t.textSub, marginBottom: 10, letterSpacing: 0.5 }}>
            PAYMENT METHOD
          </Text>
          {[
            { id: "wallet", label: "Wallet balance", sub: `SGD ${(user?.walletBalance ?? 0).toFixed(2)} available` },
            { id: "direct", label: "Direct payment", sub: "Charged to your bank or card" },
          ].map(m => {
            const selected     = payMethod === m.id;
            const insufficient = m.id === "wallet" && (user?.walletBalance ?? 0) < payData.amount;
            return (
              <TouchableOpacity key={m.id} disabled={insufficient}
                onPress={() => setPayMethod(m.id)}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12,
                         paddingHorizontal: 12, borderRadius: 10, marginBottom: 8,
                         opacity: insufficient ? 0.45 : 1,
                         borderWidth: 1.5,
                         borderColor: selected ? t.primary : t.border,
                         backgroundColor: selected ? t.primaryBg : "transparent" }}>
                <Ionicons name={selected ? "radio-button-on" : "radio-button-off"}
                          size={20} color={selected ? t.primary : t.textHint} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: t.text }}>{m.label}</Text>
                  <Text style={{ fontSize: 12, color: insufficient ? t.danger : t.textSub, marginTop: 2 }}>
                    {insufficient ? "Insufficient balance — top up first" : m.sub}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </Card>

        <View style={{ backgroundColor: t.successBg, borderRadius: 12, padding: 12,
                       flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="shield-checkmark-outline" size={16} color={t.success} />
          <Text style={{ fontSize: 12, color: t.success, flex: 1 }}>
            Secured via payment gateway · Saved locally with SQLite
          </Text>
        </View>

        <Btn
          label={`Pay SGD ${payData.amount.toFixed(2)}`}
          onPress={pay}
          loading={status === "processing"}
        />
        <Btn label="Edit payment" onPress={() => navigation.goBack()} variant="ghost" />
      </View>
    </ScrollView>
  );
}