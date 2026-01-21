import Bin from "../bins/Bin.schema.js";
import { v4 as uuidv4 } from "uuid";
import { getLocationFromLatLong } from "../utils/getLocationFromLatLong.js";
import { createEscalation } from "../Service/Escalation_service.js";

let binCounter = 0;

const generateBinId = () => {
  binCounter += 1;
  return `MSB${String(binCounter).padStart(3, "0")}`;
};

export const addBin = async (data) => {
  const binid = generateBinId();

  const geoLocation = await getLocationFromLatLong(
    data.latitude,
    data.longitude
  );

  const location = `${data.street}, ${geoLocation}`;

  const bin = await Bin.create({
    ...data,
    binid,
    location,

  
  });

  await createEscalation({
    binid: bin.binid,
    zone: bin.zone,
    ward: bin.ward,
    engineer: "Not Assigned",
    escalationlevel: "Level 1",
  });

  return bin;
};

export const getAllBins = () => Bin.find().sort({ createdAt: -1 });

export const getBinById = (id) => Bin.findById(id);

export const updateBinService = async (id, data) => {
  if (data.filled >= 100) {
    data.status = "Full";
  } else {
    data.status = "Active";
  }

  data.lastcollected = new Date();

  return Bin.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
};

export const deleteBin = (id) => Bin.findByIdAndDelete(id);

export const getBinReport = async () => {
  const bins = await Bin.find().sort({ createdAt: -1 });

  // Group bins by zone + ward for aggregated report
  const reportMap = {};

  bins.forEach((bin) => {
    const key = `${bin.zone}-${bin.ward}`;

    if (!reportMap[key]) {
      reportMap[key] = {
        binIds: [],
        totalBins: 0,
        activeAlerts: 0,
        cleared: 0,
        totalResponseTime: 0, // in minutes
        escalations: 0,
        totalGarbage: 0, // in tons
      };
    }

    const group = reportMap[key];

    group.binIds.push(bin.binid);
    group.totalBins += 1;
    group.activeAlerts += bin.status === "Active" ? 1 : 0;
    group.cleared += bin.filled >= 100 ? 1 : 0;

    // Assume response time stored in bin.responseTime (minutes)
    // For now, if not present, assume 30 mins
    group.totalResponseTime += bin.responseTime ? parseInt(bin.responseTime) : 30;

    // Escalations - if you store escalation count per bin, use it
    group.escalations += bin.escalations || 0;

    // Garbage collected - assume bin.garbageCollected stored in kg
    group.totalGarbage += bin.garbageCollected ? bin.garbageCollected / 1000 : 0;
  });

  // Convert map to array with proper fields
  const report = Object.keys(reportMap).map((key, index) => {
    const group = reportMap[key];

    return {
      id: index + 1,
      binid: group.binIds.join(", "), // show all bin IDs
      wardno: key.split("-")[1],
      zone: key.split("-")[0],
      totalBins: group.totalBins,
      activeAlerts: group.activeAlerts,
      cleared: group.cleared,
      responseTime: `${Math.round(group.totalResponseTime / group.totalBins)} mins`, // avg
      compliance: `${Math.round((group.cleared / group.totalBins) * 100)}%`,
      escalations: group.escalations,
      garbage: `${group.totalGarbage.toFixed(2)} Tons`,
    };
  });

  return report;
};