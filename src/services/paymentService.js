import api from "./api";

export const paymentService = {

  async payBill({ userId, billerCode, billerName, amount, reference, paymentMethod = "direct" }) {
    return await api.post("/payments/pay", {
      user_id:        userId,
      biller_code:    billerCode,
      biller_name:    billerName,
      amount,
      reference,
      payment_method: paymentMethod,
    });
  },

  async topUpWallet(userId, amount, method) {
    return await api.post("/payments/topup", {
      user_id: userId,
      amount,
      method,
    });
  },

  async getHistory(userId, limit = 50) {
    return await api.get(`/payments/history/${userId}?limit=${limit}`);
  },
};