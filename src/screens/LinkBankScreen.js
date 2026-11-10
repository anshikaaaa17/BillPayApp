/**
 * LinkBankScreen.js
 * Allows users to connect their bank account via Plaid Open Banking
 * Shows connected accounts and fetched transactions with ML categories
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Btn, Card, Badge, SectionLabel, AlertBox } from '../components/UI';
import { plaidService } from '../services/PlaidService';

export default function LinkBankScreen({ navigation }) {
  const insets       = useSafeAreaInsets();
  const { t, mode }  = useTheme();
  const { user }     = useAuth();

  const [connected, setConnected]     = useState(false);
  const [accounts, setAccounts]       = useState([]);
  const [transactions, setTxns]       = useState([]);
  const [mlAccuracy, setMlAccuracy]   = useState(null);
  const [loading, setLoading]         = useState(false);
  const [fetchingTxns, setFetchingTxns] = useState(false);
  const [error, setError]             = useState('');
  const [sandboxMode, setSandboxMode] = useState(false);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const status = await plaidService.getStatus(user.id);
      setConnected(status.bank_connected);
      if (status.bank_connected) {
        fetchAccounts();
        fetchTransactions();
      }
    } catch (err) {
      // Backend offline — show demo mode
      setSandboxMode(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const data = await plaidService.getAccounts(user.id);
      setAccounts(data.accounts || []);
    } catch (err) {
      console.log('Accounts fetch error:', err.message);
    }
  };

  const fetchTransactions = async () => {
    setFetchingTxns(true);
    try {
      const data = await plaidService.getTransactions(user.id, 90);
      setTxns(data.transactions || []);
      setMlAccuracy(data.ml_accuracy);
    } catch (err) {
      setError('Could not fetch transactions: ' + err.message);
    } finally {
      setFetchingTxns(false);
    }
  };

  const connectSandbox = async () => {
    setLoading(true);
    setError('');
    try {
      await plaidService.connectSandbox(user.id);
      setConnected(true);
      setSandboxMode(true);
      await fetchAccounts();
      await fetchTransactions();
    } catch (err) {
      setError('Sandbox connection failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Real Plaid Link — requires development build (not Expo Go)
  const connectRealBank = () => {
    setError('Real Plaid Link requires a development build.\nUse "Connect Sandbox Bank" for testing.');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Header */}
      <View style={{ backgroundColor: t.primary, padding: 20, paddingTop: insets.top + 12, paddingBottom: 28 }}>
        <TouchableOpacity onPress={() => navigation.goBack()}
          style={{ marginBottom: 12 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 2 }}>
          Open Banking
        </Text>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '500' }}>
          Link Bank Account
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 6, lineHeight: 18 }}>
          Securely connect your bank to automatically fetch outstanding bills
        </Text>
      </View>

      <View style={{ padding: 16, gap: 14 }}>
        <AlertBox message={error} type="danger" />

        {/* Connection status */}
        <Card style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22,
                           backgroundColor: connected ? t.successBg : t.surface2,
                           alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons
                name={connected ? 'checkmark-circle' : 'link-outline'}
                size={24}
                color={connected ? t.success : t.textHint}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: t.text }}>
                {connected ? 'Bank account connected' : 'No bank connected yet'}
              </Text>
              <Text style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>
                {connected
                  ? sandboxMode ? 'Sandbox (First Platypus Bank)' : 'Real bank via Plaid'
                  : 'Connect to fetch bills automatically'}
              </Text>
            </View>
            {connected && (
              <View style={{ backgroundColor: t.successBg, paddingHorizontal: 8,
                             paddingVertical: 3, borderRadius: 99 }}>
                <Text style={{ fontSize: 11, fontWeight: '500', color: t.success }}>Active</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Connect buttons */}
        {!connected && (
          <>
            <View style={{ backgroundColor: t.primaryBg, borderRadius: 14, padding: 14,
                           borderWidth: 1, borderColor: t.primary }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: t.primary, marginBottom: 6 }}>
                How it works
              </Text>
              {[
                'Tap "Connect Bank" below',
                'Login to your bank securely via Plaid',
                'App fetches your outstanding bills automatically',
                'ML engine categorises every transaction',
              ].map((step, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 4, alignItems: 'flex-start' }}>
                  <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: t.primary,
                                 alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                    <Text style={{ fontSize: 10, color: '#fff', fontWeight: '500' }}>{i + 1}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: t.textSub, flex: 1, lineHeight: 18 }}>{step}</Text>
                </View>
              ))}
            </View>

            <Btn
              label={loading ? 'Connecting...' : 'Connect Sandbox Bank (Demo)'}
              onPress={connectSandbox}
              loading={loading}
            />

            <Btn
              label="Connect Real Bank (Requires Build)"
              onPress={connectRealBank}
              variant="outline"
            />

            <Text style={{ fontSize: 11, color: t.textHint, textAlign: 'center', lineHeight: 16 }}>
              Secured by Plaid — your bank credentials are never stored on our servers.
              Plaid is used by thousands of fintech apps worldwide.
            </Text>
          </>
        )}

        {/* Connected accounts */}
        {connected && accounts.length > 0 && (
          <>
            <SectionLabel text="Connected accounts" />
            <Card style={{ overflow: 'hidden', padding: 0 }}>
              {accounts.map((acc, i) => (
                <View key={acc.account_id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
                           borderBottomWidth: i < accounts.length - 1 ? 0.5 : 0,
                           borderBottomColor: t.border }}>
                  <View style={{ width: 38, height: 38, borderRadius: 10,
                                 backgroundColor: t.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="business-outline" size={20} color={t.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: t.text }}>{acc.name}</Text>
                    <Text style={{ fontSize: 12, color: t.textHint }}>****{acc.mask} · {acc.type}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: t.primary }}>
                    {acc.currency} {acc.balance?.toLocaleString()}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Transactions with ML categories */}
        {connected && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <SectionLabel text={`Transactions (${transactions.length})`} />
              {mlAccuracy !== null && (
                <View style={{ backgroundColor: t.successBg, paddingHorizontal: 10,
                               paddingVertical: 4, borderRadius: 99 }}>
                  <Text style={{ fontSize: 11, fontWeight: '500', color: t.success }}>
                    ML accuracy: {(mlAccuracy * 100).toFixed(1)}%
                  </Text>
                </View>
              )}
            </View>

            {fetchingTxns ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <ActivityIndicator color={t.primary} size="large" />
                <Text style={{ fontSize: 13, color: t.textSub, marginTop: 12 }}>
                  Fetching and categorising transactions...
                </Text>
              </View>
            ) : (
              <Card style={{ overflow: 'hidden', padding: 0 }}>
                {transactions.slice(0, 20).map((txn, i) => (
                  <View key={txn.plaid?.id || i}
                    style={{ padding: 14, borderBottomWidth: i < Math.min(transactions.length, 20) - 1 ? 0.5 : 0,
                             borderBottomColor: t.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: t.text }} numberOfLines={1}>
                          {txn.plaid?.merchant || txn.plaid?.name}
                        </Text>
                        <Text style={{ fontSize: 11, color: t.textHint, marginTop: 1 }}>{txn.plaid?.date}</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: t.text }}>
                        SGD {txn.plaid?.amount?.toFixed(2)}
                      </Text>
                    </View>

                    {/* ML result vs Plaid ground truth */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="hardware-chip-outline" size={12} color={t.primary} />
                        <Text style={{ fontSize: 10, color: t.primary, fontWeight: '500' }}>ML:</Text>
                        <Badge cat={txn.model?.category} />
                        <Text style={{ fontSize: 10, color: t.textHint }}>
                          {Math.round((txn.model?.confidence || 0) * 100)}%
                        </Text>
                      </View>

                      {txn.comparison?.comparable && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons
                            name={txn.comparison.match ? 'checkmark-circle' : 'close-circle'}
                            size={14}
                            color={txn.comparison.match ? t.success : t.danger}
                          />
                          <Text style={{ fontSize: 10,
                                         color: txn.comparison.match ? t.success : t.danger }}>
                            {txn.comparison.match ? 'Correct' : `Actual: ${txn.plaid?.mapped_category}`}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}

                {transactions.length > 20 && (
                  <View style={{ padding: 12, alignItems: 'center',
                                 backgroundColor: t.surface2 }}>
                    <Text style={{ fontSize: 12, color: t.textSub }}>
                      Showing 20 of {transactions.length} transactions
                    </Text>
                  </View>
                )}
              </Card>
            )}

            <Btn
              label="Refresh transactions"
              onPress={fetchTransactions}
              variant="outline"
              loading={fetchingTxns}
            />

            <Btn
              label="Disconnect bank"
              onPress={() => { setConnected(false); setAccounts([]); setTxns([]); }}
              variant="ghost"
            />
          </>
        )}

        {/* How Plaid works — for FYP documentation */}
        <Card style={{ padding: 14, marginTop: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '500', color: t.textSub, marginBottom: 8 }}>
            About Plaid Open Banking
          </Text>
          {[
            ['Security', 'Your bank credentials go directly to Plaid, never to our server'],
            ['Standard', 'Plaid is used by Venmo, Robinhood, Coinbase and 7,000+ apps'],
            ['Singapore', 'Plaid supports SGD and Singapore banking institutions'],
            ['FYP scope', 'Sandbox mode gives realistic transaction data for ML training'],
          ].map(([title, desc]) => (
            <View key={title} style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
              <Ionicons name="information-circle-outline" size={14} color={t.primary} style={{ marginTop: 1 }} />
              <Text style={{ fontSize: 12, color: t.textSub, flex: 1, lineHeight: 17 }}>
                <Text style={{ fontWeight: '500', color: t.text }}>{title}: </Text>
                {desc}
              </Text>
            </View>
          ))}
        </Card>
      </View>
    </ScrollView>
  );
}
