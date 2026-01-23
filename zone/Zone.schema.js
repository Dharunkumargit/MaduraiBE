import mongoose from "mongoose";

const ZoneSchema = new mongoose.Schema(
  {
    zonename: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    // store alerts INSIDE zone
    alerts: [
      {
        alertTime: Date,
        clearedTime: Date,
      }
    ]

  },
  { timestamps: true }
);

const Zone = mongoose.model("Zone", ZoneSchema);
export default Zone;
