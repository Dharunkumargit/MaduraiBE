// BinDailyData.schema.js
import mongoose from "mongoose";

const BinDailyDataSchema = new mongoose.Schema({
  binid: String,
  zone: String,
  ward: String,
  date: Date,       // the day this snapshot belongs to (midnight)
  fill_level: Number,
  status: String,
  clearedCount: Number,
  totalClearedAmount: Number,
});

export default mongoose.model("BinDailyData", BinDailyDataSchema);
