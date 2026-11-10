/**
 * SQLite Local Storage â€” BillPayApp
 * CCDS26-0127 | Anshika Uppal
 *
 * Uses expo-sqlite to store data locally on the device.
 * Works offline â€” syncs with FastAPI backend when connected.
 *
 * Tables:
 *   users        â€” logged in user profile
 *   transactions â€” payment history
 *   billers      â€” linked biller accounts
 *   topups       â€” wallet top up history
 *   ml_cache     â€” cached ML categorisation results
 */

import * as SQLite from "expo-sqlite";

let db = null;

// â”€â”€ Open / Create Database â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function openDatabase() {
  if (db) return db;
  db = await SQLite.openDatabaseAsync("billpay.db");
  await createTables();
  return db;
}

// â”€â”€ Create Tables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function createTables() {
  const database = await openDatabase();

  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id             INTEGER PRIMARY KEY,
      name           TEXT NOT NULL,
      email          TEXT UNIQUE NOT NULL,
      phone          TEXT,
      provider       TEXT DEFAULT 'email',
      wallet_balance REAL DEFAULT 0.0,
      initials       TEXT,
      created_at     TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id      INTEGER,
      transaction_id TEXT UNIQUE,
      user_id        INTEGER,
      biller_code    TEXT,
      biller_name    TEXT NOT NULL,
      amount         REAL NOT NULL,
      reference      TEXT,
      category       TEXT,
      ml_confidence  REAL,
      ml_method      TEXT,
      status         TEXT DEFAULT 'success',
      payment_method TEXT DEFAULT 'direct',
      date           TEXT,
      created_at     TEXT DEFAULT (datetime('now')),
      synced         INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS linked_billers (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER,
      biller_code    TEXT NOT NULL,
      biller_name    TEXT NOT NULL,
      account_number TEXT,
      nickname       TEXT,
      icon           TEXT,
      color          TEXT,
      created_at     TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS topups (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER,
      amount     REAL NOT NULL,
      method     TEXT,
      status     TEXT DEFAULT 'success',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ml_cache (
      biller_name TEXT PRIMARY KEY,
      category    TEXT NOT NULL,
      confidence  REAL,
      method      TEXT,
      cached_at   TEXT DEFAULT (datetime('now'))
    );
  `);

  console.log("[SQLite] Tables created / verified");
}

// â”€â”€ USER OPERATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function saveUser(user) {
  const database = await openDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO users
       (id, name, email, phone, provider, wallet_balance, initials)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      user.name,
      user.email,
      user.phone || null,
      user.provider || "email",
      user.walletBalance || user.wallet_balance || 0,
      user.initials || user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2),
    ]
  );
  console.log("[SQLite] User saved:", user.email);
}

export async function getUser(userId) {
  const database = await openDatabase();
  return await database.getFirstAsync(
    "SELECT * FROM users WHERE id = ?", [userId]
  );
}

export async function updateWalletBalance(userId, newBalance) {
  const database = await openDatabase();
  await database.runAsync(
    "UPDATE users SET wallet_balance = ? WHERE id = ?",
    [newBalance, userId]
  );
}

// â”€â”€ TRANSACTION OPERATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function saveTransaction(txn) {
  const database = await openDatabase();
  await database.runAsync(
    `INSERT OR IGNORE INTO transactions
       (transaction_id, user_id, biller_code, biller_name, amount,
        reference, category, ml_confidence, ml_method, status,
        payment_method, date, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      txn.transaction_id || `LOCAL-${Date.now()}`,
      txn.user_id,
      txn.biller_code || null,
      txn.biller_name,
      txn.amount,
      txn.reference || null,
      txn.category || null,
      txn.ml_confidence || null,
      txn.ml_method || null,
      txn.status || "success",
      txn.payment_method || "direct",
      txn.date || new Date().toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" }),
      txn.synced ? 1 : 0,
    ]
  );
  console.log("[SQLite] Transaction saved:", txn.biller_name, txn.amount);
}

export async function getTransactions(userId, limit = 50) {
  const database = await openDatabase();
  return await database.getAllAsync(
    `SELECT * FROM transactions
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, limit]
  );
}

export async function getTransactionsByCategory(userId, category) {
  const database = await openDatabase();
  return await database.getAllAsync(
    `SELECT * FROM transactions
     WHERE user_id = ? AND category = ?
     ORDER BY created_at DESC`,
    [userId, category]
  );
}

export async function getSpendByCategory(userId, daysBack = 30) {
  const database = await openDatabase();
  const since = new Date();
  since.setDate(since.getDate() - daysBack);
  return await database.getAllAsync(
    `SELECT category, SUM(amount) as total, COUNT(*) as count
     FROM transactions
     WHERE user_id = ?
       AND status = 'success'
       AND created_at >= ?
     GROUP BY category
     ORDER BY total DESC`,
    [userId, since.toISOString()]
  );
}

export async function getTotalSpend(userId, daysBack = 30) {
  const database = await openDatabase();
  const since = new Date();
  since.setDate(since.getDate() - daysBack);
  const result = await database.getFirstAsync(
    `SELECT SUM(amount) as total, COUNT(*) as count
     FROM transactions
     WHERE user_id = ? AND status = 'success' AND created_at >= ?`,
    [userId, since.toISOString()]
  );
  return result;
}

// â”€â”€ LINKED BILLERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function saveLinkedBiller(biller) {
  const database = await openDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO linked_billers
       (user_id, biller_code, biller_name, account_number, nickname, icon, color)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      biller.user_id,
      biller.biller_code,
      biller.biller_name || biller.name,
      biller.account_number || null,
      biller.nickname || biller.biller_name || biller.name,
      biller.icon || null,
      biller.color || null,
    ]
  );
}

export async function getLinkedBillers(userId) {
  const database = await openDatabase();
  return await database.getAllAsync(
    "SELECT * FROM linked_billers WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
}

// â”€â”€ TOP UP HISTORY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function saveTopUp(topup) {
  const database = await openDatabase();
  await database.runAsync(
    `INSERT INTO topups (user_id, amount, method, status)
     VALUES (?, ?, ?, ?)`,
    [topup.user_id, topup.amount, topup.method, topup.status || "success"]
  );
}

// â”€â”€ ML CACHE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getCachedCategory(billerName) {
  const database = await openDatabase();
  return await database.getFirstAsync(
    "SELECT * FROM ml_cache WHERE biller_name = ?",
    [billerName]
  );
}

export async function cacheCategory(billerName, category, confidence, method) {
  const database = await openDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO ml_cache
       (biller_name, category, confidence, method)
     VALUES (?, ?, ?, ?)`,
    [billerName, category, confidence, method]
  );
}

// â”€â”€ SYNC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getUnsyncedTransactions(userId) {
  const database = await openDatabase();
  return await database.getAllAsync(
    "SELECT * FROM transactions WHERE user_id = ? AND synced = 0",
    [userId]
  );
}

export async function markSynced(transactionId) {
  const database = await openDatabase();
  await database.runAsync(
    "UPDATE transactions SET synced = 1 WHERE transaction_id = ?",
    [transactionId]
  );
}

// â”€â”€ UTILITY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function clearAllData() {
  const database = await openDatabase();
  await database.execAsync(`
    DELETE FROM transactions;
    DELETE FROM linked_billers;
    DELETE FROM topups;
    DELETE FROM ml_cache;
  `);
  console.log("[SQLite] All data cleared");
}

export async function getDatabaseStats() {
  const database = await openDatabase();
  const txnCount    = await database.getFirstAsync("SELECT COUNT(*) as c FROM transactions");
  const billerCount = await database.getFirstAsync("SELECT COUNT(*) as c FROM linked_billers");
  const cacheCount  = await database.getFirstAsync("SELECT COUNT(*) as c FROM ml_cache");
  return {
    transactions:   txnCount?.c || 0,
    linkedBillers:  billerCount?.c || 0,
    mlCacheEntries: cacheCount?.c || 0,
  };
}