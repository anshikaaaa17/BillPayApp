import api from "./api";

export const billService = {

  async getOutstandingBills(userId) {
    return await api.get(`/bills/outstanding/${userId}`);
  },

  async getAllBillers() {
    return await api.get("/bills/all");
  },

  async linkBiller(userId, billerCode, accountNumber, nickname = null) {
    return await api.post("/bills/link", {
      user_id: userId,
      biller_code: billerCode,
      account_number: accountNumber,
      nickname,
    });
  },

  async getLinkedBillers(userId) {
    return await api.get(`/bills/linked/${userId}`);
  },
};