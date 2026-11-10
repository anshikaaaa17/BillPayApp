/**
 * LinkBillerScreen.js
 * User browses all billers and links their account number
 * This is the core "integrated" feature of the app
 */
import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Btn, Card, SectionLabel, AlertBox, Badge } from "../components/UI";
import api from "../services/api";

const CATEGORIES = ["All","Utilities","Telecoms","Finance","Housing","Insurance","Entertainment","Education","Transport","Food & Dining","Travel"];

export default function LinkBillerScreen({ navigation }) {
  const { t, mode }  = useTheme();
  const { user }     = useAuth();

  const [allBillers, setAllBillers]       = useState([]);
  const [linkedBillers, setLinkedBillers] = useState([]);
  const [filter, setFilter]               = useState("All");
  const [search, setSearch]               = useState("");
  const [loading, setLoading]             = useState(true);
  const [selected, setSelected]           = useState(null);
  const [accountNo, setAccountNo]         = useState("");
  const [nickname, setNickname]           = useState("");
  const [linking, setLinking]             = useState(false);
  const [error, setError]                 = useState("");
  const [success, setSuccess]             = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [all, linked] = await Promise.all([
        api.get("/bills/all"),
        api.get(`/bills/linked/${user.id}`),
      ]);
      setAllBillers(all);
      setLinkedBillers(linked);
    } catch (err) {
      setError("Could not load billers. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    if (!accountNo.trim()) { setError("Enter your account number"); return; }
    setLinking(true);
    setError(""); setSuccess("");
    try {
      const result = await api.post("/bills/link", {
        user_id:        user.id,
        biller_code:    selected.biller_code,
        account_number: accountNo.trim(),
        nickname:       nickname.trim() || selected.name,
      });
      setSuccess(`${selected.name} linked successfully!`);
      setSelected(null); setAccountNo(""); setNickname("");
      await fetchData(); // refresh linked list
    } catch (err) {
      setError(err.message || "Failed to link biller");
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (linkedId, billerName) => {
    try {
      await api.delete(`/bills/unlink/${linkedId}?user_id=${user.id}`);
      setSuccess(`${billerName} unlinked`);
      await fetchData();
    } catch (err) {
      setError("Failed to unlink: " + err.message);
    }
  };

  const linkedCodes = linkedBillers.map(b => b.biller_code);

  const filtered = allBillers.filter(b => {
    const matchCat    = filter === "All" || b.category === filter;
    const matchSearch = b.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const bgColor = (b) => mode === "dark"
    ? b.color + "33"
    : b.color + "22";

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
        <View style={{ backgroundColor: t.primary, padding: 20, paddingTop: Platform.OS === "ios" ? 56 : 40, paddingBottom: 24 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 2 }}>
            Manage billers
          </Text>
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "500" }}>
            Link Biller Account
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 6, lineHeight: 18 }}>
            Link your biller account number once — we fetch your bills automatically
          </Text>
        </View>

        <View style={{ padding: 16, gap: 14 }}>
          <AlertBox message={error} type="danger" />
          <AlertBox message={success} type="success" />

          {/* Linked billers */}
          {linkedBillers.length > 0 && (
            <>
              <SectionLabel text={`Your linked billers (${linkedBillers.length})`} />
              <Card style={{ overflow: "hidden", padding: 0 }}>
                {linkedBillers.map((lb, i) => (
                  <View key={lb.id}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
                             borderBottomWidth: i < linkedBillers.length - 1 ? 0.5 : 0,
                             borderBottomColor: t.border }}>
                    <View style={{ width: 38, height: 38, borderRadius: 10,
                                   backgroundColor: lb.color + "22",
                                   alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name={lb.icon} size={20} color={lb.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "500", color: t.text }}>{lb.nickname}</Text>
                      <Text style={{ fontSize: 12, color: t.textHint }}>{lb.account_number} · {lb.category}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ backgroundColor: t.successBg, paddingHorizontal: 8,
                                     paddingVertical: 3, borderRadius: 99 }}>
                        <Text style={{ fontSize: 11, color: t.success, fontWeight: "500" }}>Linked</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleUnlink(lb.id, lb.name)}>
                        <Ionicons name="close-circle-outline" size={20} color={t.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </Card>
            </>
          )}

          {/* Search */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10,
                         backgroundColor: t.surface, borderRadius: 10, padding: 10,
                         borderWidth: 1, borderColor: t.border }}>
            <Ionicons name="search-outline" size={18} color={t.textHint} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search billers..."
              placeholderTextColor={t.textHint}
              style={{ flex: 1, fontSize: 14, color: t.text }}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close" size={18} color={t.textHint} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Category filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}>
            {CATEGORIES.map(c => (
              <TouchableOpacity key={c} onPress={() => setFilter(c)}
                style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 99,
                         borderWidth: 1,
                         backgroundColor: filter === c ? t.primary : t.surface,
                         borderColor: filter === c ? t.primary : t.border }}>
                <Text style={{ fontSize: 12, fontWeight: "500",
                               color: filter === c ? "#fff" : t.textSub }}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Biller list */}
          <SectionLabel text={`Available billers (${filtered.length})`} />

          {loading ? (
            <View style={{ padding: 32, alignItems: "center" }}>
              <ActivityIndicator color={t.primary} size="large" />
              <Text style={{ fontSize: 13, color: t.textSub, marginTop: 12 }}>Loading billers...</Text>
            </View>
          ) : (
            <Card style={{ overflow: "hidden", padding: 0 }}>
              {filtered.length === 0 ? (
                <View style={{ padding: 32, alignItems: "center" }}>
                  <Ionicons name="search-outline" size={32} color={t.textHint} />
                  <Text style={{ fontSize: 13, color: t.textHint, marginTop: 8 }}>No billers found</Text>
                </View>
              ) : filtered.map((b, i) => {
                const isLinked = linkedCodes.includes(b.biller_code);
                return (
                  <TouchableOpacity key={b.biller_code}
                    onPress={() => { if (!isLinked) { setSelected(b); setError(""); setSuccess(""); }}}
                    style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
                             borderBottomWidth: i < filtered.length - 1 ? 0.5 : 0,
                             borderBottomColor: t.border,
                             backgroundColor: selected?.biller_code === b.biller_code ? t.primaryBg : "transparent" }}>
                    <View style={{ width: 40, height: 40, borderRadius: 11,
                                   backgroundColor: bgColor(b),
                                   alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name={b.icon} size={20} color={b.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "500", color: t.text }}>{b.name}</Text>
                      <Badge cat={b.category} />
                    </View>
                    {isLinked ? (
                      <View style={{ backgroundColor: t.successBg, paddingHorizontal: 8,
                                     paddingVertical: 3, borderRadius: 99 }}>
                        <Text style={{ fontSize: 11, color: t.success, fontWeight: "500" }}>✓ Linked</Text>
                      </View>
                    ) : (
                      <Ionicons name="add-circle-outline" size={22}
                        color={selected?.biller_code === b.biller_code ? t.primary : t.textHint} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </Card>
          )}

          {/* Account number form — shows when biller selected */}
          {selected && (
            <Card style={{ padding: 16, borderWidth: 1.5, borderColor: t.primary }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <View style={{ width: 40, height: 40, borderRadius: 11,
                               backgroundColor: bgColor(selected),
                               alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={selected.icon} size={20} color={selected.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "500", color: t.text }}>{selected.name}</Text>
                  <Badge cat={selected.category} />
                </View>
                <TouchableOpacity onPress={() => setSelected(null)}>
                  <Ionicons name="close" size={20} color={t.textHint} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 13, fontWeight: "500", color: t.textSub, marginBottom: 5 }}>
                Your {selected.name} account number *
              </Text>
              <View style={{ borderWidth: 1.5, borderColor: t.primary, borderRadius: 10,
                             backgroundColor: t.inputBg, marginBottom: 14 }}>
                <TextInput
                  value={accountNo}
                  onChangeText={v => { setAccountNo(v); setError(""); }}
                  placeholder="e.g. 1234-5678-90"
                  placeholderTextColor={t.textHint}
                  style={{ paddingVertical: Platform.OS === "ios" ? 12 : 10,
                           paddingHorizontal: 14, fontSize: 15, color: t.text,
                           fontFamily: "monospace" }}
                />
              </View>

              <Text style={{ fontSize: 13, fontWeight: "500", color: t.textSub, marginBottom: 5 }}>
                Nickname (optional)
              </Text>
              <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 10,
                             backgroundColor: t.inputBg, marginBottom: 16 }}>
                <TextInput
                  value={nickname}
                  onChangeText={setNickname}
                  placeholder={`e.g. Home electricity`}
                  placeholderTextColor={t.textHint}
                  style={{ paddingVertical: Platform.OS === "ios" ? 12 : 10,
                           paddingHorizontal: 14, fontSize: 14, color: t.text }}
                />
              </View>

              <View style={{ backgroundColor: t.primaryBg, borderRadius: 10, padding: 10, marginBottom: 14 }}>
                <Text style={{ fontSize: 12, color: t.primary, lineHeight: 18 }}>
                  Your account number is used to fetch your outstanding bill automatically.
                  It is stored securely and never shared.
                </Text>
              </View>

              <Btn
                label={linking ? "Linking..." : `Link ${selected.name}`}
                onPress={handleLink}
                loading={linking}
              />
            </Card>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
