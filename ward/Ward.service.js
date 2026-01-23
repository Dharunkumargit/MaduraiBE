import Ward from "../ward/Ward.schema.js";
import Zone from "../zone/Zone.schema.js";
import Bin from "../bins/Bin.schema.js";

export const createWard = async (data) => {
  const { zonename, wardname, status } = data;

  const zoneExist = await Zone.findOne({ zonename });
  if (!zoneExist) throw new Error("Selected Zone does not exist!");

  const formattedWard = wardname.trim().toLowerCase();

  const exist = await Ward.findOne({
    zonename,
    wardname: new RegExp(`^${formattedWard}$`, "i"),
  });

  if (exist) throw new Error("Ward already exists!");

  return Ward.create({
    zonename,
    wardname: formattedWard.charAt(0).toUpperCase() + formattedWard.slice(1),
    status,
  });
};

// ---------------- Ward List -------------------

export const getWards = async () => {
  const wardStats = await Bin.aggregate([
    {
      $group: {
        _id: {
          zone: "$zone",
          ward: "$ward",
        },

        // ---- BIN COUNTS ----
        totalbins: { $sum: 1 },

        activebins: {
          $sum: {
            $cond: [{ $eq: ["$status", "Active"] }, 1, 0],
          },
        },

        inactivebins: {
          $sum: {
            $cond: [{ $ne: ["$status", "Active"] }, 1, 0],
          },
        },

        // ---- CLEARED DATA ----
        totalClearedCount: {
          $sum: { $ifNull: ["$clearedCount", 0] },
        },

        totalClearedWeight: {
          $sum: { $ifNull: ["$totalClearedAmount", 0] },
        },

        avgClearTime: {
          $avg: {
            $cond: [
              { $gt: ["$avgClearTimeMins", 0] },
              "$avgClearTimeMins",
              null,
            ],
          },
        },
      },
    },
  ]);

  const wards = await Ward.find().lean();

  return wards.map((w) => {
    const stat = wardStats.find(
      (s) => s._id.zone === w.zonename && s._id.ward === w.wardname,
    );

    return {
      _id: w._id,
      zonename: w.zonename,
      wardname: w.wardname,
      status: w.status,

      // bins
      totalbins: stat?.totalbins || 0,
      activebins: stat?.activebins || 0,
      inactivebins: stat?.inactivebins || 0,

      // cleared
      clearedCount: stat?.totalClearedCount || 0,
      clearedWeightKg: stat ? stat.totalClearedWeight / 1000 : "0.00" || 0,
      avgClearTime: stat?.avgClearTime ? Math.round(stat.avgClearTime) : 0,
    };
  });
};

// -------- Ward Wise Report Same Logic ---------

export const getWardReport = async () => {
  const wards = await Ward.find().sort({ createdAt: -1 }).lean();

  return wards.map((w, index) => ({
    id: index + 1,
    wardname: w.wardname,
    zone: w.zonename,
    totalBins: w.totalbins,
    activeAlerts: w.activebins,
    cleared: w.activebins,
    responseTime:
      w.activebins === 0
        ? "15 mins"
        : w.activebins < w.totalbins / 3
          ? "30 mins"
          : w.activebins < w.totalbins / 2
            ? "45 mins"
            : "60 mins",
    compliance: `${Math.round(
      ((w.totalbins - w.activebins) / w.totalbins) * 100,
    )}%`,
    escalations: w.inactivebins,
    garbage: `${Math.round(w.totalbins * 0.5)} Tons`,
  }));
};

export const updateWard = async (id, data) => {
  const { zonename, wardname, totalbins, activebins, inactivebins, status } =
    data;

  const ward = await Ward.findById(id);
  if (!ward) throw new Error("Ward not found!");

  // Validate zone
  const zoneExist = await Zone.findOne({ zonename });
  if (!zoneExist) throw new Error("Selected Zone does not exist!");

  // Check duplicate ward name (excluding current)
  if (wardname) {
    const formattedWard = wardname.trim().toLowerCase();

    const exist = await Ward.findOne({
      wardname: new RegExp(`^${formattedWard}$`, "i"),
      _id: { $ne: id },
    });

    if (exist) throw new Error("Ward name already exists!");
  }

  ward.zonename = zonename;
  ward.wardname = wardname
    ? wardname.charAt(0).toUpperCase() + wardname.slice(1)
    : ward.wardname;
  ward.totalbins = totalbins;
  ward.activebins = activebins;
  ward.inactivebins = inactivebins;
  ward.status = status;

  return await ward.save();
};

// ---------------- DELETE ----------------
export const deleteWard = async (id) => {
  const ward = await Ward.findById(id);
  if (!ward) throw new Error("Ward not found!");

  await Ward.findByIdAndDelete(id);
};
