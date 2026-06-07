window.EnglishTrainerServices = {
  async createPayOSCheckout(packageId, currentUser) {
    // TODO: Replace this with a backend endpoint.
    // Example future flow:
    // return fetch("/api/payos/create-checkout", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ packageId, username: currentUser.username })
    // }).then(response => response.json());
    return {
      ok: false,
      message: "PayOS chưa được tích hợp. Hãy nối backend tạo link VietQR tại đây.",
      packageId,
      username: currentUser?.username || "guest"
    };
  },

  async analyzeGrammarDeeply(payload) {
    // TODO: Replace this with a backend endpoint that calls an AI API.
    // Never expose API keys directly in browser JavaScript.
    return {
      ok: false,
      message: "AI API chưa được tích hợp. Bản hiện tại dùng phân tích lỗi cục bộ.",
      payload
    };
  }
};
