import api from "./api";

export const insightService = {

  async getInsights(userId, months = 1) {
    return await api.get(`/insights/${userId}?months=${months}`);
    // Returns: { total_spend, by_category, ml_accuracy, num_transactions }
  },

  async getMonthly(userId, months = 5) {
    return await api.get(`/insights/${userId}/monthly?months=${months}`);
    // Returns: { months: [{ label, total, count, is_current }], change_pct, ... }
  },
};