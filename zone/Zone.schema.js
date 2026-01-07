import mongoose from "mongoose";

const ZoneSchema = new mongoose.Schema(
  {
    zonename: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    totalbins: {
      type: Number,
      required: true,
    },

    activebins: {
      type: Number,
      required: true,
      default: 0,
    },

    inactivebins: {
      type: Number,
      required: true,
      default: 0,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
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
