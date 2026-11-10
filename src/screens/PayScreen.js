import React, { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Btn, Card, Badge, AlertBox } from "../components/UI";
import { mlService } from "../services/mlService";
import api from "../services/api";

export default function PayScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t, mode } = useTheme();
  const { user }    = useAuth();

  const [linkedBillers, setLinkedBillers] = useState([]);
  const [outstandingBills, setOutstanding] = useState([]);
  const [loadingBills, setLoadingBills]   = useState(true);
  const [biller, setBiller]               = useState(null);
  const [amount, setAmount]               = useState("");
  const [ref, setRef]                     = useState("");
  const [mlResult, setMlResult]           = useState(null);
  const [mlLoading, setMlLoading]         = useState(false);
  const [error, setError]                 = useState("");
  const [showPicker, setShowPicker]       = useState(false);
  const [payMode, setPayMode]             = useState("linked"); // linked | manual

  useEffect(() => { fetchLinkedBills(); }, []);

  const fetchLinkedBills = async () => {
    setLoadingBills(true);
    try {
      const [linkedRes, outstandingRes] = await Promise.all([
        api.get(`/bills/linked/${user.id}`),
        api.get(`/bills/outstanding/${user.id}`),
      ]);
      setLinkedBillers(linkedRes);

      // Match outstanding amounts with linked billers
      const bills = outstandingRes.bills || [];
      setOutstanding(bills);

      // Auto-select first bill
      if (bills.length > 0 && bills[0].status !== "fetch_failed") {
        selectBill(bills[0]);
      }
    } catch (err) {
      console.log("Pay: using manual mode (backend offline)");
    } finally {
      setLoadingBills(false);
    }
  };

  const selectBill = (bill) => {
    setBiller({
      id:       bill.biller_code,
      name:     bill.biller_name,
      category: bill.biller_category,
      icon:     bill.biller_icon || "receipt",
      color:    bill.biller_color || "#6B7280",
    });
    setAmount(bill.amount?.toFixed(2) || "");
    setRef(`REF-${bill.biller_code}-${Date.now().toString().slice(-6)}`);
    runML(bill.biller_name);
    setShowPicker(false);
  };

  // Guards against out-of-order responses when the user keeps typing
  const mlRequestId = useRef(0);

  const runML = async (billerName) => {
    const requestId = ++mlRequestId.current;
    setMlLoading(true); setMlResult(null);
    try {
      const result = await mlService.categorize(billerName);
      if (requestId !== mlRequestId.current) return;   // a newer request superseded this one
      setMlResult({ category: result.category, confidence: Math.round(result.confidence * 100), method: result.method });
    } catch (err) {
      if (requestId !== mlRequestId.current) return;
      setMlResult(null);
      setError("Could not categorise this biller. Is the backend running?");
    } finally {
      if (requestId === mlRequestId.current) setMlLoading(false);
    }
  };

  // Debounce manual typing so we send one request when the user pauses,
  // instead of one per keystroke.
  const mlTimer = useRef(null);
  const runMLDebounced = (billerName) => {
    if (mlTimer.current) clearTimeout(mlTimer.current);
    mlTimer.current = setTimeout(() => runML(billerName), 500);
  };

  const handleProceed = () => {
    if (!biller) { setError("Select a biller first"); return; }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError("Enter a valid amount"); return;
    }
    navigation.navigate("Confirm", {
      biller, amount: parseFloat(amount), ref,
      category: mlResult?.category, confidence: mlResult?.confidence,
    });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ backgroundColor: t.primary, padding: 20, paddingTop: insets.top + 12, paddingBottom: 24 }}>
        <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 2 }}>New payment</Text>
        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "500" }}>Pay a bill</Text>
      </View>

      <View style={{ padding: 16, gap: 12 }}>
        <AlertBox message={error} type="danger" />

        {/* Mode toggle */}
        <View style={{ flexDirection: "row", backgroundColor: t.surface2, borderRadius: 10, padding: 4 }}>
          {[["linked","My bills"],["manual","Manual entry"]].map(([mode_, label]) => (
            <TouchableOpacity key={mode_} onPress={() => { setPayMode(mode_); setError(""); }}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center",
                       backgroundColor: payMode === mode_ ? t.primary : "transparent" }}>
              <Text style={{ fontSize: 13, fontWeight: "500",
                             color: payMode === mode_ ? "#fff" : t.textSub }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Linked bills tab */}
        {payMode === "linked" && (
          <Card style={{ padding: 14 }}>
            <Text style={{ fontSize: 11, fontWeight: "500", color: t.textHint,
                           letterSpacing: 0.4, marginBottom: 10 }}>SELECT BILL</Text>
            {loadingBills ? (
              <View style={{ alignItems: "center", padding: 16 }}>
                <ActivityIndicator color={t.primary} />
                <Text style={{ fontSize: 13, color: t.textSub, marginTop: 8 }}>Fetching your bills...</Text>
              </View>
            ) : outstandingBills.length === 0 ? (
              <View style={{ alignItems: "center", padding: 16 }}>
                <Ionicons name="receipt-outline" size={32} color={t.textHint} />
                <Text style={{ fontSize: 13, color: t.textSub, marginTop: 8, textAlign: "center" }}>
                  No linked billers yet
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate("LinkBiller")}
                  style={{ marginTop: 10, backgroundColor: t.primary, borderRadius: 8,
                           paddingVertical: 8, paddingHorizontal: 16 }}>
                  <Text style={{ color: "#fff", fontSize: 13, fontWeight: "500" }}>Link a biller</Text>
                </TouchableOpacity>
              </View>
            ) : (
              outstandingBills.filter(b => b.status !== "fetch_failed").map((bill, i) => (
                <TouchableOpacity key={bill.biller_code + i}
                  onPress={() => selectBill(bill)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12,
                           marginBottom: i < outstandingBills.length - 1 ? 8 : 0,
                           borderRadius: 10, borderWidth: 1.5,
                           borderColor: biller?.id === bill.biller_code ? t.primary : t.border,
                           backgroundColor: biller?.id === bill.biller_code ? t.primaryBg : t.surface2 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 9,
                                 backgroundColor: (bill.biller_color || "#6B7280") + "22",
                                 alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={bill.biller_icon || "receipt"} size={18}
                      color={bill.biller_color || "#6B7280"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "500",
                                   color: biller?.id === bill.biller_code ? t.primary : t.text }}>
                      {bill.nickname || bill.biller_name}
                    </Text>
                    <Badge cat={bill.biller_category} />
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 15, fontWeight: "600",
                                   color: biller?.id === bill.biller_code ? t.primary : t.text }}>
                      SGD {bill.amount?.toFixed(2)}
                    </Text>
                    <Text style={{ fontSize: 11, color: t.danger }}>Due {bill.due_date}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </Card>
        )}

        {/* Manual entry tab */}
        {payMode === "manual" && (
          <Card style={{ padding: 14 }}>
            <Text style={{ fontSize: 11, fontWeight: "500", color: t.textHint,
                           letterSpacing: 0.4, marginBottom: 10 }}>ENTER BILLER NAME</Text>
            <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 10,
                           backgroundColor: t.inputBg, marginBottom: 12 }}>
              <TextInput
                placeholder="e.g. SP Power, Netflix..."
                placeholderTextColor={t.textHint}
                onChangeText={v => {
                  setBiller({ id: "MANUAL", name: v, category: "Unknown", icon: "receipt", color: "#6B7280" });
                  setError("");
                  if (v.trim().length > 2) runMLDebounced(v.trim());
                }}
                style={{ paddingVertical: Platform.OS === "ios" ? 12 : 10,
                         paddingHorizontal: 14, fontSize: 14, color: t.text }}
              />
            </View>
          </Card>
        )}

        {/* Amount + reference */}
        {biller && (
          <Card style={{ padding: 14 }}>
            <Text style={{ fontSize: 11, fontWeight: "500", color: t.textHint,
                           letterSpacing: 0.4, marginBottom: 12 }}>PAYMENT DETAILS</Text>
            <Text style={{ fontSize: 13, fontWeight: "500", color: t.textSub, marginBottom: 5 }}>
              Bill reference
            </Text>
            <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 10,
                           backgroundColor: t.inputBg, marginBottom: 14 }}>
              <TextInput value={ref} onChangeText={setRef} placeholder="Reference number"
                placeholderTextColor={t.textHint}
                style={{ paddingVertical: Platform.OS === "ios" ? 12 : 10,
                         paddingHorizontal: 14, fontSize: 14, color: t.text }} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: "500", color: t.textSub, marginBottom: 5 }}>
              Amount (SGD)
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.5,
                           borderColor: t.primary, borderRadius: 10, backgroundColor: t.inputBg,
                           paddingHorizontal: 14 }}>
              <Text style={{ fontSize: 16, color: t.textSub, marginRight: 4 }}>$</Text>
              <TextInput value={amount} onChangeText={v => { setAmount(v); setError(""); }}
                placeholder="0.00" keyboardType="decimal-pad" placeholderTextColor={t.textHint}
                style={{ flex: 1, paddingVertical: Platform.OS === "ios" ? 12 : 10,
                         fontSize: 20, fontWeight: "500", color: t.primary }} />
            </View>
          </Card>
        )}

        {/* ML result */}
        {biller && (
          <View style={{ backgroundColor: mlLoading ? t.surface2 : t.primaryBg,
                         borderWidth: 1, borderColor: mlLoading ? t.border : t.primary,
                         borderRadius: 14, padding: 14 }}>
            <Text style={{ fontSize: 11, fontWeight: "500", color: t.textHint,
                           letterSpacing: 0.4, marginBottom: 8 }}>SMART CATEGORISATION</Text>
            {mlLoading ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <ActivityIndicator size="small" color={t.primary} />
                <Text style={{ fontSize: 13, color: t.textSub }}>ML engine analysing...</Text>
              </View>
            ) : mlResult ? (
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, color: t.textSub }}>Detected:</Text>
                  <Badge cat={mlResult.category} />
                  {mlResult.method === "local" &&
                    <Text style={{ fontSize: 10, color: t.textHint }}>(offline)</Text>}
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 12, color: t.textSub }}>Confidence:</Text>
                  <Text style={{ fontSize: 13, fontWeight: "500", color: t.success }}>{mlResult.confidence}%</Text>
                  <View style={{ flex: 1, height: 4, backgroundColor: t.border, borderRadius: 99 }}>
                    <View style={{ width: `${mlResult.confidence}%`, height: "100%",
                                   backgroundColor: t.success, borderRadius: 99 }} />
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        )}

        <Btn label="Review and confirm" onPress={handleProceed}
          disabled={!biller || !mlResult || mlLoading} />
        <Btn label="Link a new biller" onPress={() => navigation.navigate("LinkBiller")} variant="ghost" />
      </View>
    </ScrollView>
  );
}
