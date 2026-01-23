import BinDailyData from "./bindaily.schema.js";
import Bin from "../bins/Bin.schema.js";




export const getBinsByDateOrLive = async (fromDate, toDate) => {
  const today = new Date();


  // CASE: No date provided → return live
  if (!fromDate) {
    const bins = await Bin.find().sort({ binid: 1 });
    return bins.map(bin => ({
      binid: bin.binid,
      zone:bin.zone,
      ward:bin.ward,
      fill_level: bin.filled,
      status: bin.status,
      clearedCount: bin.clearedCount,
      totalClearedAmount: bin.totalClearedAmount,
      date: today
    }));
  }

  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);

  const to = toDate ? new Date(toDate) : new Date(from);
  to.setHours(23, 59, 59, 999);

  // Check if snapshot exists
  const data = await BinDailyData.find({ date: { $gte: from, $lte: to } }).sort({ date: 1, binid: 1 });

  // If no snapshot and range includes today → return live data for today
  if (!data.length && from <= today && to >= today) {
    const bins = await Bin.find().sort({ binid: 1 });
    return bins.map(bin => ({
      binid: bin.binid,
       zone:bin.zone,
      ward:bin.ward,
      fill_level: bin.filled,
      status: bin.status,
      clearedCount: bin.clearedCount,
      totalClearedAmount: bin.totalClearedAmount,
      date: today
    }));
  }

  // Otherwise return snapshot
  return data;
};






export const getBinsByMonth = async (zone, ward, year, month) => {
  // Default to current month/year if not provided
  const now = new Date();
  const targetYear = year ? Number(year) : now.getFullYear();
  const targetMonth = month ? Number(month) : now.getMonth() + 1; // JS months 0-11

  const start = new Date(targetYear, targetMonth - 1, 1);
  const end = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

  return BinDailyData.find({
    zone,
    ward,
    date: { $gte: start, $lte: end },
  }).sort({ date: 1, binid: 1 });
};

