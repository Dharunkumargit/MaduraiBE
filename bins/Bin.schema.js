import mongoose from "mongoose";

const historySchema = new mongoose.Schema(
  {
    timestamp: { type: Date, required: true },
    image_url: String,
    fill_level: { type: Number, default: 0 },
  },
  { _id: false },
);

const binSchema = new mongoose.Schema(
  {
    zone: { type: String, required: true },
    ward: { type: String, required: true },
    street: { type: String, required: true },

    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },

    bintype: { type: String, required: true },

    // 🔥 FIXED → must be Number
    capacity: { type: Number, required: true },

    filled: { type: Number, default: 0 },

    binid: { type: String, unique: true, required: true },

    location: String,

    status: {
      type: String,
      enum: ["Active", "Inactive", "Full"],
      default: "Active",
    },

    history: [historySchema],

    lastReportedAt: Date,

    lastCollectedAt: Date,

    // ✅ Metrics
    clearedCount: { type: Number, default: 0 },
    totalClearedAmount: { type: Number, default: 0 }, // kg
    totalClearTimeMins: { type: Number, default: 0 },
    avgClearTimeMins: { type: Number, default: 0 },
    lastFullAt: Date,
    lastClearedAt: Date,
  },
  { timestamps: true },
);

export default mongoose.model("Bin", binSchema);
