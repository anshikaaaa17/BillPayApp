import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Btn, Input, Card, AlertBox } from "../components/UI";

export default function PersonalDetailsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useTheme();
  const { user, updateProfile } = useAuth();

  const [name, setName]       = useState(user?.name || "");
  const [phone, setPhone]     = useState(user?.phone || "");
  const [errors, setErrors]   = useState({});
  const [formErr, setFormErr] = useState("");
  const [saved, setSaved]     = useState(false);
  const [loading, setLoading] = useState(false);

  const dirty = name !== (user?.name || "") || phone !== (user?.phone || "");

  const handleSave = async () => {
    if (name.trim().length < 2) { setErrors({ name: "Enter your full name" }); return; }
    setLoading(true);
    setFormErr("");
    setSaved(false);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() });
      setSaved(true);
    } catch (err) {
      setFormErr(err.message || "Could not save changes.");
    } finally {
      setLoading(false);
    }
  };

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
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "500" }}>Personal details</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <AlertBox message={formErr} type="danger" />
        {saved && !dirty && <AlertBox message="Your details have been updated." type="success" />}

        <Card style={{ padding: 16, marginBottom: 12 }}>
          <Input label="Full name" value={name}
                 onChangeText={v => { setName(v); setErrors({}); setSaved(false); }}
                 placeholder="Your full name" autoCapitalize="words" error={errors.name} />

          <Input label="Mobile number" value={phone}
                 onChangeText={v => { setPhone(v); setSaved(false); }}
                 placeholder="+65 9123 4567" keyboardType="phone-pad" />

          <Text style={{ fontSize: 13, fontWeight: "500", color: t.text, marginBottom: 6 }}>Email address</Text>
          <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 10,
                         backgroundColor: t.surface2, paddingVertical: 12, paddingHorizontal: 14 }}>
            <Text style={{ fontSize: 14, color: t.textHint }}>{user?.email}</Text>
          </View>
          <Text style={{ fontSize: 11, color: t.textHint, marginTop: 6 }}>
            Email cannot be changed — it identifies your account at sign in.
          </Text>
        </Card>

        <Btn label={loading ? "Saving..." : "Save changes"}
             onPress={handleSave} loading={loading} disabled={!dirty || loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
