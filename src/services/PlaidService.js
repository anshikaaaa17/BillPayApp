/**
 * Plaid Open Banking — React Native Integration
 * CCDS26-0127 | BillPay App
 *
 * Installation:
 *   npx expo install react-native-plaid-link-sdk
 *   npm install react-native-plaid-link-sdk
 *
 * Note: Plaid Link requires a development build (not Expo Go)
 * For FYP demo use EAS Build:
 *   npm install -g eas-cli
 *   eas build --profile development --platform android
 */

import { useState, useCallback } from 'react';
import { create, open } from 'react-native-plaid-link-sdk';
import api from './api';

// ── Plaid Service ─────────────────────────────────────────────────────────────

export const plaidService = {

  /**
   * Step 1: Get link token from our FastAPI backend
   * The link token is used to initialise Plaid Link UI
   */
  async getLinkToken(userId) {
    const data = await api.post(`/plaid/link-token?user_id=${userId}`);
    return data.link_token;
  },

  /**
   * Step 2: Exchange public token for access token
   * Called after user successfully logs into their bank via Plaid Link
   */
  async exchangeToken(userId, publicToken) {
    return await api.post('/plaid/exchange', {
      user_id:      userId,
      public_token: publicToken,
    });
  },

  /**
   * Step 3: Fetch transactions (runs through ML engine on backend)
   */
  async getTransactions(userId, daysBack = 90) {
    return await api.get(`/plaid/transactions/${userId}?days_back=${daysBack}`);
  },

  /**
   * Fetch bank account balances
   */
  async getAccounts(userId) {
    return await api.get(`/plaid/accounts/${userId}`);
  },

  /**
   * Connect sandbox bank (development only — no real bank needed)
   */
  async connectSandbox(userId) {
    return await api.post(`/plaid/sandbox/connect/${userId}`);
  },

  /**
   * Check if user has connected a bank
   */
  async getStatus(userId) {
    return await api.get(`/plaid/status/${userId}`);
  },
};


// ── usePlaidLink Hook ─────────────────────────────────────────────────────────

export function usePlaidLink(userId, onSuccess) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const openPlaidLink = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get link token from backend
      const linkToken = await plaidService.getLinkToken(userId);

      // Configure Plaid Link
      create({
        token: linkToken,
        onSuccess: async (success) => {
          const { publicToken, metadata } = success;

          // Exchange public token for access token
          await plaidService.exchangeToken(userId, publicToken);

          // Notify parent component
          if (onSuccess) {
            onSuccess({
              institutionName: metadata?.institution?.name || 'Bank',
              accountCount:    metadata?.accounts?.length || 0,
            });
          }
        },
        onExit: (exit) => {
          if (exit.error) {
            setError(`Plaid error: ${exit.error.displayMessage}`);
          }
          setLoading(false);
        },
        onEvent: (event) => {
          console.log('Plaid event:', event.eventName);
        },
      });

      // Open the Plaid Link UI
      open({ onSuccess: () => setLoading(false) });

    } catch (err) {
      setError(err.message || 'Failed to open Plaid Link');
      setLoading(false);
    }
  }, [userId, onSuccess]);

  return { openPlaidLink, loading, error };
}
