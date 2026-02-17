import axios from "axios";

class WhatsAppService {
  static async sendMessage({ mobile, templateId, variables }) {
    try {
      const response = await axios.post(
        "https://api.gupshup.io/sm/api/v1/msg",
        {
          channel: "whatsapp",
          source: "919342571277",
          destination: mobile,
          template: {
            id: templateId,
            params: Object.values(variables)
          }
        },
        {
          headers: {
            "Content-Type": "application/json",
            apikey: "6752cd5a54b5c67b93e010b2" // ✅ Your API key
          }
        }
      );

      console.log("✅ WhatsApp Sent:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ WhatsApp Error:", error.response?.data || error.message);
      return null;
    }
  }
}

export default WhatsAppService;