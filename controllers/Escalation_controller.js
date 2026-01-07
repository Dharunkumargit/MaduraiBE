import * as EscalationService from "../Service/Escalation_service.js";

export const getEscalations = async (req, res) => {
  try {
    const data = await EscalationService.getAllEscalations();
    res.status(200).json({
      success: true,
      total: data.length,
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};