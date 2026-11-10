import api from "./api";

export const mlService = {

  async categorize(billerName) {
    return await api.post("/categorize/", { biller_name: billerName });
    // Returns: { category: "Utilities", confidence: 0.97, method: "rule" }
  },
};