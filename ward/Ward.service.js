import Ward from "../ward/Ward.schema.js";
import Zone from "../zone/Zone.schema.js";

export const createWard = async (data) => {
  const { zonename, wardname, totalbins, activebins, inactivebins, status } =
    data;

  const zoneExist = await Zone.findOne({ zonename });
  if (!zoneExist) throw new Error("Selected Zone does not exist!");

  const formattedWard = wardname?.trim().toLowerCase();

  const exist = await Ward.findOne({
    wardname: new RegExp(`^${formattedWard}$`, "i"),
  });

  if (exist) throw new Error("Ward already exists!");

  

  

  return await Ward.create({
    zonename,
    wardname: formattedWard.charAt(0).toUpperCase() + formattedWard.slice(1),
    totalbins,
    activebins,
    inactivebins,
    status,
  });
};

// ---------------- Ward List -------------------

export const getWards = async () => {
  return await Ward.find().sort({ createdAt: -1 });
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
      ((w.totalbins - w.activebins) / w.totalbins) * 100
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