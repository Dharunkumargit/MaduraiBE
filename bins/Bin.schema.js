import mongoose from "mongoose";

const binSchema = new mongoose.Schema(
  {
    zone: { type: String, required: true },
    ward: { type: String, required: true },
    street: { type: String, required: true },

    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },

    bintype: { type: String, required: true },
    capacity: { type: String, required: true },

    
   

    filled: { type: Number, default: 0 },

    binid: { type: String, unique: true },

    location: { type: String },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Full"],
      default: "Active",
    },
    

    lastcollected: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Bin", binSchema);