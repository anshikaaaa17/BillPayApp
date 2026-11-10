import api from "./api";

export const authService = {

  async login(email, password) {
    const data = await api.post("/auth/login", { email, password });
    return data.user;
  },

  async register({ name, email, phone, password }) {
    const data = await api.post("/auth/register", { name, email, phone, password });
    return data.user;
  },

  async getUser(userId) {
    const data = await api.get(`/auth/user/${userId}`);
    return data.user || data;
  },

  async updateProfile(userId, { name, phone }) {
    const data = await api.put(`/auth/user/${userId}`, { name, phone });
    return data.user;
  },

  async changePassword(userId, currentPassword, newPassword) {
    return await api.post("/auth/change-password", {
      user_id:          userId,
      current_password: currentPassword,
      new_password:     newPassword,
    });
  },

  async loginWithGoogle(googleToken, name, email) {
    const data = await api.post("/auth/google", { token: googleToken, name, email });
    return data.user;
  },

  async sendOtp(email) {
    // Returns { message, delivery } — the code itself is never sent to the client
    return await api.post("/auth/send-otp", { email });
  },

  async resetPassword(email, otp, newPassword) {
    await api.post("/auth/reset-password", {
      email, otp, new_password: newPassword,
    });
  },
};