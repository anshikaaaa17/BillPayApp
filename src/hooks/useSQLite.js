/**
 * useSQLite â€” Custom React hook
 * Wraps SQLite operations with loading and error state
 * Makes it easy to use SQLite from any screen
 */

import { useState, useEffect, useCallback } from "react";
import {
  openDatabase,
  getTransactions,
  getSpendByCategory,
  getTotalSpend,
  getLinkedBillers,
  getDatabaseStats,
} from "../services/database";

// â”€â”€ useTransactions hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function useTransactions(userId, limit = 50) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await openDatabase();
      const txns = await getTransactions(userId, limit);
      setTransactions(txns);
    } catch (err) {
      setError(err.message);
      console.error("[useSQLite] Transaction load error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, limit]);

  useEffect(() => { load(); }, [load]);

  return { transactions, loading, error, refresh: load };
}

// â”€â”€ useSpendInsights hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function useSpendInsights(userId, daysBack = 30) {
  const [byCategory, setByCategory] = useState([]);
  const [totalSpend, setTotalSpend] = useState(0);
  const [txnCount, setTxnCount]     = useState(0);
  const [loading, setLoading]       = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await openDatabase();
      const [cats, total] = await Promise.all([
        getSpendByCategory(userId, daysBack),
        getTotalSpend(userId, daysBack),
      ]);
      setByCategory(cats);
      setTotalSpend(total?.total || 0);
      setTxnCount(total?.count || 0);
    } catch (err) {
      console.error("[useSQLite] Insights load error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, daysBack]);

  useEffect(() => { load(); }, [load]);

  return { byCategory, totalSpend, txnCount, loading, refresh: load };
}

// â”€â”€ useLinkedBillers hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function useLinkedBillers(userId) {
  const [billers, setBillers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await openDatabase();
      const data = await getLinkedBillers(userId);
      setBillers(data);
    } catch (err) {
      console.error("[useSQLite] Billers load error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  return { billers, loading, refresh: load };
}

// â”€â”€ useDatabaseStats hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function useDatabaseStats() {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await openDatabase();
        const s = await getDatabaseStats();
        setStats(s);
      } catch (err) {
        console.error("[useSQLite] Stats error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { stats, loading };
}