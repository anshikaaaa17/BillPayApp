import React, { createContext, useContext, useState } from "react";
import { authService } from "../services/authService";
import { paymentService } from "../services/paymentService";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const OFFLINE_MSG = "Cannot reach the server. Check the backend is running and BASE_URL in src/services/api.js matches your current IP.";

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(false);

  const loginWithEmail = async (email, password) => {
    setLoading(true);
    try {
      const u = await authService.login(email, password);
      setUser({ ...u, walletBalance: u.wallet_balance, initials: getInitials(u.name) });
    } catch (err) {
      if (err.status === 0) throw new Error(OFFLINE_MSG);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // NOTE: server-side Google token verification is not implemented (see /auth/google).
  // The app sends a placeholder token; the backend creates or returns the matching user.
  const loginWithGoogle = async (googleToken = "demo-google-token", name = "Google User", email = "user@gmail.com") => {
    setLoading(true);
    try {
      const u = await authService.loginWithGoogle(googleToken, name, email);
      setUser({ ...u, walletBalance: u.wallet_balance, initials: getInitials(u.name), provider: "google" });
    } catch (err) {
      if (err.status === 0) throw new Error(OFFLINE_MSG);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async ({ name, email, phone, password }) => {
    setLoading(true);
    try {
      const u = await authService.register({ name, email, phone, password });
      setUser({ ...u, walletBalance: u.wallet_balance, initials: getInitials(u.name) });
    } catch (err) {
      if (err.status === 0) throw new Error(OFFLINE_MSG);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async (email) => {
    try {
      return await authService.sendOtp(email);
    } catch (err) {
      if (err.status === 0) throw new Error(OFFLINE_MSG);
      throw err;
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    try {
      await authService.resetPassword(email, otp, newPassword);
    } catch (err) {
      if (err.status === 0) throw new Error(OFFLINE_MSG);
      throw err;
    }
  };

  const topUpWallet = async (amount, method = "paynow") => {
    const result = await paymentService.topUpWallet(user.id, amount, method);
    setUser(prev => ({ ...prev, walletBalance: result.new_balance }));
    return result;
  };

  // Re-read the authoritative balance from the backend
  const refreshUser = async () => {
    if (!user?.id) return;
    try {
      const u = await authService.getUser(user.id);
      setUser(prev => ({ ...prev, ...u, walletBalance: u.wallet_balance }));
    } catch (err) {
      // Non-fatal: keep last known state
    }
  };

  const updateProfile = async ({ name, phone }) => {
    const updated = await authService.updateProfile(user.id, { name, phone });
    setUser(prev => ({
      ...prev, ...updated,
      walletBalance: updated.wallet_balance,
      initials: getInitials(updated.name),
    }));
    return updated;
  };

  const changePassword = async (currentPassword, newPassword) => {
    return await authService.changePassword(user.id, currentPassword, newPassword);
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{
      user, loading, loginWithEmail, loginWithGoogle,
      register, sendOtp, resetPassword, topUpWallet, refreshUser,
      updateProfile, changePassword, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

function getInitials(name) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}