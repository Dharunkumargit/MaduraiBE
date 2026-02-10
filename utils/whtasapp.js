import axios from "axios";

const KWIC_API_KEY = "6752cd5a54b5c67b93e010b2";
const BASE_URL = "https://app.kwic.in/api/v1/message/send";

class WhatsAppService {
  static async sendMessage({ mobile, templateId, variables }) {
    try {
      const payload = {
        mobile_number: mobile,
        template_id: templateId,
        variable: variables,
      };

      const response = await axios.post(BASE_URL, payload, {
        headers: {
          Authorization: `Bearer ${KWIC_API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      console.log("✅ WhatsApp sent:", mobile);
      return response.data;
    } catch (error) {
      console.error(
        "❌ WhatsApp failed:",
        error.response?.data || error.message
      );
      throw new Error("WhatsApp delivery failed");
    }
  }
}

export default WhatsAppService;