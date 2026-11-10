import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Btn, Input, Card, AlertBox, PasswordStrength } from "../components/UI";

export default function ChangePasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useTheme();
  const { changePassword } = useAuth();

  const [current, setCurrent] = useState("");
  const [next, setNext]       = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors]   = useState({});
  const [formErr, setFormErr] = useState("");
  const [done, setDone]       = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const e = {};
    if (!current)             e.current = "Enter your current password";
    if (next.length < 8)      e.next    = "New password must be at least 8 characters";
    if (next !== confirm)     e.confirm = "Passwords do not match";
    if (next && next === current) e.next = "New password must be different";
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    setFormErr("");
    try {
      await changePassword(current, next);
      setDone(true);
    } catch (err) {
      setFormErr(err.message || "Could not change password.");
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <View style={{ flex: 1, backgroundColor: t.bg, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: t.successBg,
                     alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <Ionicons name="checkmark" size={38} color={t.success} />
      </View>
      <Text style={{ fontSize: 20, fontWeight: "500", color: t.text, marginBottom: 10, textAlign: "center" }}>
        Password changed
      </Text>
      <Text style={{ fontSize: 14, color: t.textSub, textAlign: "center", marginBottom: 32, lineHeight: 20 }}>
        Use your new password the next time you sign in.
      </Text>
      <Btn label="Back to profile" onPress={() => navigation.goBack()} />
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={{ backgroundColor: t.primary, padding: 20, paddingTop: insets.top + 12, paddingBottom: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>Account</Text>
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "500" }}>Change password</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <AlertBox message={formErr} type="danger" />

        <Card style={{ padding: 16, marginBottom: 12 }}>
          <Input label="Current password" value={current}
                 onChangeText={v => { setCurrent(v); setErrors({}); setFormErr(""); }}
                 placeholder="Enter current password" secureTextEntry error={errors.current} />

          <Input label="New password" value={next}
                 onChangeText={v => { setNext(v); setErrors({}); }}
                 placeholder="Min 8 characters" secureTextEntry error={errors.next} />
          <PasswordStrength password={next} />

          <Input label="Confirm new password" value={confirm}
                 onChangeText={v => { setConfirm(v); setErrors({}); }}
                 placeholder="Repeat new password" secureTextEntry error={errors.confirm} />
        </Card>

        <Btn label={loading ? "Changing..." : "Change password"}
             onPress={handleSubmit} loading={loading} />

        <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}
          style={{ alignItems: "center", marginTop: 18 }}>
          <Text style={{ fontSize: 13, color: t.primary, fontWeight: "500" }}>
            Forgotten your current password?
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
