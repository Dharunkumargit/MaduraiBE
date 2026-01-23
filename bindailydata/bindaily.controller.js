import { getBinsByDateOrLive, getBinsByMonth } from "./bindaily.service.js";




export const getBinsByDateController = async (req, res) => {
  try {
    const { from, to } = req.query;

    const data = await getBinsByDateOrLive(from, to);
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};




export const getBinsByMonthController = async (req, res) => {
  try {
    const { zone, ward, year, month } = req.query;
    const data = await getBinsByMonth(zone, ward, Number(year), Number(month));
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
