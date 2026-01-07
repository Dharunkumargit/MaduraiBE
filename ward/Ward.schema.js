import mongoose from "mongoose";

const WardSchema = new mongoose.Schema(
  {
    zonename: {
      type: String,
      required: true,
      trim: true,
    },
    wardname: {
      type: String,
      required: true,
      trim: true,
      unique: true, 
    },
    totalbins: { type: Number, required: true },
    activebins: { type: Number, default:0 },
    inactivebins: { type: Number, default:0 },
    status: {
      type: String,
      required: true,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);

const Ward = mongoose.model("Ward", WardSchema);
export default Ward;